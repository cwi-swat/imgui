
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
		console.log("Installing handler for " + events[i] + " on " + id);
		var elt = document.getElementById(id);
		elt.addEventListener(events[i], dealWithIt, false);
	    }
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
var memo = {};
function component(state, func) {
    var fname = func.name || func.toString();
    return function() {
	var model = arguments[0]; // first arguments *must* be a model
	callStack.push([fname, objectId(model)].toString());
	try {
	    var key = callStack.toString();
	    console.log("Key = " + key);
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
    var id = "id" + GUI.ids++;
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
    var parent = GUI.focus;
    GUI.focus = [];
    try {
	yield;
    }
    finally {
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


function* textbox(value) {
    for (var ev of when("input", "blur", {type: "text", value: value})) {
	if (ev) {
	    yield ev.target.value;
	}
    }
}

function* ul() {
    for (var _ of withElement("ul")) {
	yield;
    }
}

function* div() {
    for (var _ of withElement("div")) {
	yield;
    }
}

function* li() {
    for (var _ of withElement("li")) {
	yield;
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

module.exports = {
    setup: setup,
    component: component,
    ul: ul,
    li: li,
    p: p,
    div: div,
    clone: clone,
    textbox: textbox,
    text: text,
    checkbox: checkbox,
    button: button,
    dealWithIt: dealWithIt,
    callStack: callStack,
    memo: memo
};
