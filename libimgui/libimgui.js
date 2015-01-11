

/*

TODO:

- make possible to use multiple instance in a single page (put everything in an object)

- make "here" resilient against passing the yielded function to other functions. Currently 
  it only works if it's called within the closure.

- remove "body" patching.

- let event-handling render not build Vnodes.

- add assertions to check input params.

- garbage collect view states.

- perhaps remove try-finally, since exception handling does not seems to be common in JS (and slow...)

- make some elements both accept string and block (e.g. p).

*/

var h = require('virtual-dom/h');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var createElement = require('virtual-dom/create-element');
var VirtualText = require('virtual-dom/vnode/vtext');
var VirtualNode = require('virtual-dom/vnode/vnode');

var GUI = {
    event: null,
    app: null,
    model: null,
    focus: [],
    node: null,
    handlers: [],
    extras: {},
    timers: {},
    ids: 0
}

function init(app, model, root) {
    GUI.app = app;
    GUI.model = model;
    GUI.root = root;
}
    
function setup(app, model, root) {
    init(app, model, root);
    mount(renderOnce());
}


function renderOnce() {
    GUI.handlers = {};
    GUI.extras = {};
    GUI.focus = [];
    GUI.ids = 0;
    GUI.app(GUI.model);
    // SO: root *must* be a div
    if (GUI.root) {
	return new VirtualNode("div", {id: GUI.root}, GUI.focus);
    }
    else {
	return new VirtualNode("body", {}, GUI.focus);
    }
}

function mount(node) {
    var container = GUI.root ? document.getElementById(GUI.root) : document.body;
    if (GUI.node !== null) {
	patch(container, diff(GUI.node, node));
    }
    else {
	container.parentNode.replaceChild(createElement(node), container);
    }
    GUI.node = node;


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
    return namedComponent(fname, func, state);
}

function named(fname, comp) {
    callStack.push(fname);
    try {
	var args = [];
	for (var i = 2; i < arguments.length; i++) {
	    args.push(arguments[i]);
	}
	return comp.apply(null, args);
    }
    finally {
	callStack.pop();
    }
}

function namedComponent(fname, func, state) {
    state = state || {};
    return function() {
	var model = arguments[0]; // first argument *must* be a model
	callStack.push([fname, objectId(model)].toString());
	try {
	    var key = callStack.toString();
	    if (!memo[key]) {
		memo[key] = clone(state);
		memo[key].__owner = key
	    }
	    var self = memo[key];
	    return func.apply(null, [self].concat(Array.prototype.slice.call(arguments)));
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
    GUI.event = e;
    doRender();
}



// Render functions



function on(elt, events, attrs, block) {
    attrs = attrs || {};
    var id = attrs["id"] || ("id" + GUI.ids++);
    attrs["id"] = id;

    if (events.length > 0) {
	GUI.handlers[id] = [];
	for (var i = 0; i < events.length; i++) {
	    GUI.handlers[id].push(events[i]);
	}
    }

    return withElement(elt, attrs, function() {
	var event = GUI.event;
	if (event && event.target.getAttribute('id') === id) {
	    GUI.event = undefined; // maybe do in toplevel???
	    return block(event); // let it be handled
	}
	return block();
    });
}




function here(func, block) {
    var pos = GUI.focus.length;
    block(function() {
	var parent = GUI.focus;
	GUI.focus = [];
	try {
	    func.apply(null, arguments);
	}
	finally {
	    for (var i = 0; i < GUI.focus.length; i++) {
		parent.splice(pos + i, 0, GUI.focus[i]);
	    }
	    GUI.focus = parent;
	}
    });
}

function withElement(elt, attrs, func) {
    // TODO: if GUI.pretend, don't build vnodes
    var parent = GUI.focus;
    GUI.focus = [];
    try {
	return func();
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



// Basic widgets

var basicInputs = {
    textBox: {type: 'text', event: 'input'},
    spinBox: {type: 'number', event: 'input'},
    slider: {type: 'range', event: 'input'},
    emailBox: {type: 'email', event: 'input'},
    searchBox: {type: 'search', event: 'input'},
    datePicker: {type: 'date', event: 'change'},
    colorPicker: {type: 'color', event: 'change'},
    dateTimePicker: {type: 'datetime', event: 'change'},
    localDateTimePicker: {type: 'datetime-local', event: 'change'},
    monthPicker: {type: 'week', event: 'change'},
    weekPicker: {type: 'week', event: 'change'},
    timePicker: {type: 'time', event: 'change'}
}

function addInputElements(obj) {
    for (var name in basicInputs) {
	if (basicInputs.hasOwnProperty(name)) {
	    (function (name) {
		obj[name] = function (value, attrs) {
		    attrs = attrs || {};
		    attrs['type'] = basicInputs[name].type;
		    attrs['value'] = value;
		    
		    return on("input", [basicInputs[name].event], attrs, function(ev) {
			return ev ? ev.target.value : value;
		    });
		}
	    })(name);
	}
    }
}

function textarea(value, attrs) {
    attrs = attrs || {};
    
    return on("textarea", ["keyup", "blur"], attrs, function(ev) {
	var newValue = ev ? ev.target.value : value;
	text(value);
	return newValue;
    });
}

function checkbox(value) {
    var attrs = {type: "checkbox"};
    if (value) {
	attrs["checked"] = "true";
    }
    
    return on("input", ["click"], attrs, function(ev) {
	return ev ? ev.target.checked : value;
    });
}


function after(id, delay) {
    if (GUI.timers.hasOwnProperty(id)) {
	if (GUI.timers[id]) {
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
    return on("button", ["click"], {}, function(ev) {
	text(label);
	return ev !== undefined;
    });
}


function select(value, x, y, z) {
    //idClass, attrs, block

    function option(optValue, label) {
	var attrs = {value: optValue};
	if (optValue === value) {
	    attrs['selected'] = true;
	}
	label = label || optValue;
	return withElement("option", attrs, function () {
	    text(label);
	});
    }
    
    var block = extractBlock(arguments);
    return on("select", ["change"], defaultAttrs(x, y, z), function(ev) {
	block(option);
	return ev  
	    ? ev.target.options[ev.target.selectedIndex].value
	    : value;
    });
}

function radioGroup(value,  x, y, z) {
    var result = value;
    var name = name + (GUI.ids++);
    function radio(radioValue) {
	var attrs = {type: "radio", name: name};
	if (radioValue === value) {
	    attrs['checked'] = true;
	}
	return on("input", ["click"], attrs, function (ev) {
	    if (ev) {
		result = radioValue;
	    }
	    return radioValue;
	});
    }

    var block = extractBlock(arguments);
    block(radio);
    return result;
}

function label(txt) {
    // FIXME: this is extremely brittle.
    var id = "id" + (GUI.ids + 1); // NB: not ++ !!
    return withElement("label", {"for": id}, function () {
	 text(txt);
    });
}

function text(txt) {
    GUI.focus.push(new VirtualText(txt));
}

function br() {
    withElement("br", {}, function() {});
}

// Block level elements


function defaultAttrs(x, y, z) {
    
    if (typeof x === "function") {
	return {};
    }

    var attrs = {};
    var idClass;
    if (typeof x === "string") {
	idClass = x;
	if (typeof y == "object") {
	    attrs = y;
	}
    }
    else if (typeof x === "object") {
	attrs = x;
    }

    if (!idClass) {
	return attrs;
    }
    
    var hash = idClass.indexOf("#");
    var dot = idClass.indexOf(".");
    if (dot > -1) {
	attrs['className'] = idClass.slice(dot + 1, hash > -1 ? hash : idClass.length);
    }
    if (hash > -1) {
	attrs['id'] = idClass.slice(hash + 1);
    }
    return attrs;
}

function addInlineElements(obj) {
    var elts = ["a", "p", "span", "h1", "h2", "h3", "h4"];
    for (var i = 0; i < elts.length; i++) {
	obj[elts[i]] = function (elt) {
	    return function (txt, idClass, attrs) {
		withElement(elt, defaultAttrs(idClass, attrs), function() {
		    text(txt);
		});
	    }
	}(elts[i]);
    }
}

function extractBlock(args) {
    for (var i = 0; i < args.length; i++) {
	if ((typeof args[i]) === "function") {
	    return args[i];
	}
    }
    return function() {};
}

function addBlockElements(obj) {
    var elts = ["section", "div", "ul", "ol", "li", "header", "footer", "code", "pre",
		"dl", "dt", "dd", "fieldset"];
    for (var i = 0; i < elts.length; i++) {
	obj[elts[i]] = function (elt) {
	    return function (x, y, z) {
		var block = function() {};
		for (var i = 0; i < arguments.length; i++) {
		    if ((typeof arguments[i]) === "function") {
			block = arguments[i];
		    }
		}
		return withElement(elt, defaultAttrs(x, y, z), extractBlock(arguments));
	    }
	}(elts[i]);
    }
}

var libimgui = {
    setup: setup,
    init: init,
    component: component,
    clone: clone,
    textarea: textarea,
    select: select,
    radioGroup: radioGroup,
    text: text,
    label: label,
    checkbox: checkbox,
    button: button,
    here: here,
    after: after,
    on: on,
    br: br,
    dealWithIt: dealWithIt,
    callStack: callStack,
    memo: memo,
    named: named
};

addBlockElements(libimgui);
addInlineElements(libimgui);
addInputElements(libimgui);

module.exports = libimgui;

