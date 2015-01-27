

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

- separate widgets in other lib

- remove dep on jwerty (use proceed pattern)

- allow event delegation via root, not just document.

- make document injectable

*/

// var h = require('virtual-dom/h');
// var diff = require('virtual-dom/diff');
// var patch = require('virtual-dom/patch');
// var createElement = require('virtual-dom/create-element');
// var VirtualText = require('virtual-dom/vnode/vtext');
// var VirtualNode = require('virtual-dom/vnode/vnode');
var jwerty = require('jwerty').jwerty;

var GUI = {
    event: null,
    app: null,
    model: null,
    focus: [],
    node: null,
    extras: {},
    timers: {},
    handlers: {},
    ids: 0
}

function init(app, model, root) {
    GUI.app = app;
    GUI.model = model;
    GUI.root = root;
}

function register(event, id) {
    // only add one handler to root, per event type.
    if (!GUI.handlers.hasOwnProperty(event)) {
	GUI.handlers[event] = [];
	var r = document.getElementById(GUI.root);
	r.addEventListener(event, function (e) {
	    e.stopPropagation(); // don't leak upwards
	    var id = e.target.getAttribute('id');
	    if (GUI.handlers[event].indexOf(id) > -1) {
		GUI.event = e;
		doRender();
	    }
	}, false);
    }
    GUI.handlers[event].push(id);
}

function resetHandlers() {
    for (var k in GUI.handlers) {
	if (GUI.handlers.hasOwnProperty(k)) {
	    GUI.handlers[k] = [];
	}
    }
}

function setup(app, model, root) {
    init(app, model, root);
    mount(renderOnce());
}


function renderOnce() {
    resetHandlers();
    GUI.extras = {};
    GUI.focus = [];
    GUI.ids = 0;
    GUI.app(GUI.model);
}

function mount(node) {
    var active = document.activeElement;
    var container = document.getElementById(GUI.root);
    if (GUI.node !== null) {
	reconcileKids(container, container.childNodes, GUI.focus);
    }
    else {
	while (container.firstChild) {
	    container.removeChild(container.firstChild);
	}
	for (var i = 0; i < GUI.focus.length; i++) {
	    container.appendChild(build(GUI.focus[i]));
	}
    }
    GUI.node = node;

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


function getCallerLoc(offset) {
    var stack = new Error().stack.split('\n');
    var line = stack[(offset || 1) + 1];
    //console.log("last / = " + line.lastIndexOf("/"));
    if (line[line.length - 1] === ')') {
	line = line.slice(0, line.length - 1);
    }
    return line.slice(line.lastIndexOf('/') + 1);
}
 

function component(state, func) {
    var fname = func.name || func.toString();
    return namedComponent(fname, func, state);
}

function named(fname, comp) {
    callStack.push(fname);
    try {
	var args = Array.prototype.slice.call(arguments, 2);
	// for (var i = 2; i < arguments.length; i++) {
	//     args.push(arguments[i]);
	// }
	return comp.apply(null, args);
    }
    finally {
	callStack.pop();
    }
}

function keyOf(value) {
    if (value === null) {
	return "";
    }

    if (value === undefined) {
	return "";
    }

    if (value.constructor === Array) {
	return objectId(value);
    }

    if (typeof value === "object") {
	return objectId(value);
    }

    return "";
}

function namedComponent(fname, func, state) {
    state = state || {};
    return function() {
	var model = arguments[0]; // first argument *must* be a model
	callStack.push([fname, keyOf(model), getCallerLoc(2)].toString());
	try {
	    var key = callStack.toString();
	    if (!memo[key]) {
		memo[key] = clone(state);
	    }
	    var self = memo[key];
	    return func.apply(null, [self].concat(Array.prototype.slice.call(arguments)));
	}
	finally {
	    callStack.pop();
	}
    };
}

/*
vdom element
{tag:
 attrs: {} etc.
 kids: [] }

*/

function compat(d, v) {
    //console.log("Compat? ");
    //console.log("d = " + d.nodeValue);
    //console.log("v = " + JSON.stringify(v));
    return (d.nodeType === Node.TEXT_NODE && (typeof v !== 'object'))
	|| (d.tagName === v.tag.toUpperCase());
}

// function setAttributeHook(dom, name, value) {
//     function parseBoolean(v) {
// 	if (!v) {
// 	    return false;
// 	}
// 	return v.toString().toLowerCase() === 'true';
//     }
//     // if (name === 'checked') {
//     // 	dom.checked = parseBoolean(value);
//     // }
//     // if (name === 'selected') {
//     // 	dom.selected = parseBoolean(value);
//     // }
//     if (name === 'value') {
// 	dom.value = value;
//     }
// }

// function removeAttributeHook(dom, name) {
//     // if (name === 'checked') {
//     // 	dom.checked = false;
//     // }
//     // if (name === 'selected') {
//     // 	dom.selected = false;
//     // }
//     if (name === 'value') {
// 	dom.value = '';
//     }
// }

function reconcile(dom, vdom) {
    if (!compat(dom, vdom)) {
	throw "Can only reconcile compatible nodes";
    }
    
    // Text nodes
    if (typeof vdom !== 'object') {
	if (dom.nodeValue !== vdom) {
	    dom.nodeValue = vdom.toString();
	}
	return;
    }


    // Element nodes
    var vattrs = vdom.attrs || {};
    for (var vattr in vattrs) {
	if (vattrs.hasOwnProperty(vattr)) {
	    if (dom.hasAttribute(vattr)) {
		var dattr = dom.getAttribute(vattr);
		if (dattr !== vattrs[vattr].toString()) { 
		    console.log("Updating attribute: " + vattr + " = " + vattrs[vattr]);
		    dom.setAttribute(vattr, vattrs[vattr]);
		}
	    }
	    else {
		console.log("Adding attribute: " + vattr + " = " + vattrs[vattr]);
		dom.setAttribute(vattr, vattrs[vattr]);
	    }
	}
    }
    
    for (var i = 0; i < dom.attributes.length; i++) {
	var dattr = dom.attributes[i];
	if (!vattrs.hasOwnProperty(dattr.nodeName)) {
	    console.log("Removing attribute: " + dattr.nodeName);
	    dom.removeAttribute(dattr.nodeName);
	}
    }

    reconcileKids(dom, dom.childNodes, vdom.kids);
}

function reconcileKids(dom, dkids, vkids) {
    var len = Math.min(dkids.length, vkids.length);
    
    for (var i = 0; i < len; i++) {
	var dkid = dkids[i];
	var vkid = vkids[i];
	if (compat(dkid, vkid)) {
	    reconcile(dkid, vkid);
	}
	else {
	    console.log("Replacing child");
	    dom.replaceChild(build(vkid), dkid);
	}
    }
    
    if (dkids.length > len) {
	while (dkids.length > len) {
	    console.log("Removing child ");
	    dom.removeChild(dkids[len]);
	}
    }
    else if (vkids.length > len) {
	for (var i = len; i < vkids.length; i++) {
	    console.log("Appending new child ");
	    dom.appendChild(build(vkids[i]));
	}
    }
}

function build(vdom) {
    if (typeof vdom === 'string') {
	return document.createTextNode(vdom);
    }

    var elt = document.createElement(vdom.tag);
    var vattrs = vdom.attrs || {};
    for (var k in vattrs) {
	if (vattrs.hasOwnProperty(k)) {
	    elt.setAttribute(k, vattrs[k]);
	}
    }
    for (var i = 0; i < vdom.kids.length; i++) {
	elt.appendChild(build(vdom.kids[i]));
    }
    return elt;    
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

function isKeyComboEvent(event) {
    return event.indexOf(":") > - 1;
}

function getHandler(event) {
    if (isKeyComboEvent(event)) {
	return keyComboListener(event);
    }
    return dealWithIt;
}
    
function keyComboListener(elt, event) {
    var colon = event.indexOf(":");
    var combo = event.slice(colon + 1);
    event = event.slice(0, colon);
    return function listen(e) {
	if (jwerty.is(combo, e)) {
	    e.stopPropagation();
	    e.preventDefault();
	    e.isKey = function (c) { return jwerty.is(c, this); };
	    e.target.removeEventListener(event, listen, false);
	    dealWithIt(e);
	}
    };
}


function on(elt, events, attrs, block) {
    attrs = attrs || {};
    var id = attrs["id"] || ("id" + GUI.ids++);
    attrs["id"] = id;

    
    //GUI.handlers[id] = [];
    for (var i = 0; i < events.length; i++) {
	register(events[i], id);
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
    return block(function() {
	var parent = GUI.focus;
	GUI.focus = [];
	try {
	    return func.apply(null, arguments);
	}
	finally {
	    for (var i = 0; i < GUI.focus.length; i++) {
		parent.splice(pos + i, 0, GUI.focus[i]);
	    }
	    GUI.focus = parent;
	}
    });
}

function withElement(elt, attrs, func, evs) {
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
	var vnode = {tag: elt, attrs: attrs, kids: GUI.focus};
	parent.push(vnode);
	GUI.focus = parent;
    }    
}



// Basic widgets


function addInputElements(obj) {
    var basicInputs = {
//	textBox: {type: 'text', event: 'input'},
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

function textBox(value, attrs) {
    attrs = attrs || {};
    attrs.type = 'text';
    attrs.value = value;
    attrs.extra = function (elt) {
    	elt.value = value;
    };
    
    
    return on("input", ["input"], attrs, function(ev) {
	return ev ? ev.target.value : value;
    });
}

function checkBox(value, attrs) {
    attrs = attrs || {};
    attrs.type = "checkbox";
    if (value) {
	attrs.checked = "true";
    }
    attrs.extra = function (elt) {
	elt.checked = value;
    };
    
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


function button(label, attrs) {
    return on("button", ["click"], attrs, function(ev) {
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
    var name = 'name' + (GUI.ids++);
    function radio(radioValue, label) {
	var attrs = {type: "radio", name: name};
	if (radioValue === value) {
	    attrs['checked'] = true;
	}
	return on("label", [], {}, function () {
	    on("input", ["click"], attrs, function (ev) {
		if (ev) {
		    result = radioValue;
		}
		return radioValue;
	    })
	    text(label || radioValue);
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
    GUI.focus.push(txt);
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
	attrs['class'] = idClass.slice(dot + 1, hash > -1 ? hash : idClass.length);
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
		"dl", "dt", "dd", "fieldset", "table", "td", "tr", "th", "thead"];
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


function install(obj) {
    for (var k in this) {
	if (this.hasOwnProperty(k)) {
	    obj[k] = this[k];
	}
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
    checkBox: checkBox,
    textBox: textBox,
    button: button,
    here: here,
    after: after,
    on: on,
    br: br,
    dealWithIt: dealWithIt,
    callStack: callStack,
    memo: memo,
    named: named,
    install: install
};

addBlockElements(libimgui);
addInlineElements(libimgui);
addInputElements(libimgui);

module.exports = libimgui;

