
var h = require('virtual-dom/h');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var createElement = require('virtual-dom/create-element');
var VirtualText = require('virtual-dom/vnode/vtext');

var GUI = {
    event: null,
    root: null,
    app: null,
    model: null,
    focus: [],
    node: null,
    handlers: [],
    extras: {},
    timers: {},
    ids: 0
}

function setup(root, app, model) {
    GUI.root = document.getElementById(root);
    GUI.app = app;
    GUI.model = model;
    mount(renderOnce());
}


function renderOnce() {
    GUI.handlers = {};
    GUI.extras = {};
    GUI.focus = [];
    GUI.ids = 0;
    GUI.app(GUI.model);
    return GUI.focus[0];
}

function mount(node) {
    var k = GUI.root.childNodes[0];

    if (GUI.node !== null) {
	patch(k, diff(GUI.node, node));
    }
    else {
	GUI.root.replaceChild(createElement(node), k);
    }

    // this seems expensive....
    for (var id in GUI.handlers) {
	if (GUI.handlers.hasOwnProperty(id)) {
	    var events = GUI.handlers[id];
	    for (var i = 0; i < events.length; i++) {
		var elt = document.getElementById(id);
		elt.addEventListener(events[i], dealWithIt, false);
	    }
	}
    }

    for (var id in GUI.extras) {
	if (GUI.extras.hasOwnProperty(id)) {
	    var doSomething = GUI.extras[id];
	    var elt = document.getElementById(id);
	    doSomething(elt);
	}
    }
    
    GUI.node = node;
}

function doRender() {
    // twice: one to handle event, one to sync view.
    var _ = renderOnce();
    var node = renderOnce();
    mount(node);
}





var callStack = [];

// we should somehow garbage collect this.
var memo = {};

function component(state, func) {
    var fname = func.name || func.toString();
    return function() {
	var model = arguments[0]; // first arguments *must* be a model
	callStack.push([fname, objectId(model)].toString());
	try {
	    var key = callStack.toString();
	    if (!memo[key]) {
		memo[key] = clone(state);
		memo[key].__owner = key
	    }
	    var mval = memo[key];
	    // state becomes "this"
	    return func.apply(mval, arguments);
	}
	finally {
	    callStack.pop();
	}
    };
}

var __next_objid=1;
function objectId(obj) {
    if (obj==null) return null;
    if (obj.__obj_id==null) obj.__obj_id=__next_objid++;
    return obj.__obj_id;
}

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

// Event handling

function dealWithIt(e) {
    //e.preventDefault(); // messes with checkbox?
    GUI.event = e;
    doRender();
}



// Render functions

function* on(elt, events, attrs) {
    attrs = attrs || {};
    var id = attrs["id"] || ("id" + GUI.ids++);
    attrs["id"] = id;

    if (events.length > 0) {
	GUI.handlers[id] = [];
	for (var i = 0; i < events.length; i++) {
	    GUI.handlers[id].push(events[i]);
	}
    }

    for (var _ of withElement(elt, attrs)) {
	var event = GUI.event;
	if (event && event.target.getAttribute('id') === id) {
	    GUI.event = undefined; // maybe do in toplevel???
	    yield event; // let it be handled
	}
	else {
	    yield undefined;
	}
    }
}


function* withElement(elt, attrs) {
    // TODO: if GUI.pretend, just yield.
    var parent = GUI.focus;
    GUI.focus = [];
    try {
	yield;
    }
    finally {
	if (attrs && attrs['extra']) {
	    GUI.extras[attrs['id']] = attrs['extra'];
	    delete attrs['extra'];
	}
	var vnode = h(elt, attrs, GUI.focus);
	parent.push(vnode);
	GUI.focus = parent;
    }    
}



function* when(elt, event, attrs) {
    for (var ev of on(elt, [event], attrs)) {
	if (ev && ev.type == event) {
	    yield ev;
	}
	else {
	    yield;
	}
    }
}


// Basic widgets


function* textbox(value, attrs) {
    attrs = attrs || {};
    attrs['type'] = 'text';
    attrs['value'] = value;
    
    for (var ev of when("input", "blur", attrs)) {
	if (ev) {
	    yield ev.target.value;
	}
    }
}

function* checkbox(value) {
    var attrs = {type: "checkbox"};
    if (value) {
	attrs["checked"] = "true";
    }
    
    for (var ev of when("input", "click", attrs)) {
	if (ev) {
	    yield ev.target.checked;
	}
    }
}

function after(id, delay) {
    if (GUI.timers.hasOwnProperty(id)) {
	if (GUI.timers[id]) {
	    //delete GUI.timers[id]; // don't reinstall
	    return true;
	}
	return false;
    }
    else {
	GUI.timers[id] = false;
	window.setTimeout(function() {
	    GUI.timers[id] = true;
	    doRender();
	}, delay);
    }
}

function button(label) {
    var result = false;
    
    for (var ev of when("button", "click", {})) {
	if (ev) {
	    result = true;
	}
	text(label);
    }

    return result;
}

function text(txt) {
    GUI.focus.push(new VirtualText(txt));
}

function p(txt, attrs) {
    for (var _ of withElement("p", attrs)) {
	text(txt);
    }
}

function span(txt, attrs) {
    for (var _ of withElement("span", attrs)) {
	text(txt);
    }
}

// Block level elements


function defaultAttrs(idClass, givenAttrs) {
    var attrs = givenAttrs || {};
    if (!idClass) {
	return attrs;
    }
    var hash = idClass.indexOf("#");
    var dot = idClass.indexOf(".");
    if (dot > -1) {
	attrs['class'] = idClass.slice(dot + 1, hash > -1 ? hash : idClass.length);
    }
    if (hash > -1) {
	attrs['id'] = idClass.slice(hash + 1);
    }
    return attrs;
}


function addBlockElements(obj) {
    var elts = ["section", "div", "ul", "ol", "li", "header", "footer"];
    for (var i = 0; i < elts.length; i++) {
	obj[elts[i]] = function () {
	    var elt = elts[i];
	    return function* (idClass, attrs) {
		for (var _ of withElement(elt, defaultAttrs(idClass, attrs))) {
		    yield;
		}
	    }
	}();
    }
}

var libimgui = {
    setup: setup,
    component: component,
    p: p,
    clone: clone,
    textbox: textbox,
    text: text,
    checkbox: checkbox,
    button: button,
    when: when,
    after: after,
    on: on,
    dealWithIt: dealWithIt,
    callStack: callStack,
    memo: memo
};

addBlockElements(libimgui);

module.exports = libimgui;

