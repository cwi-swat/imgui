!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.gridsApp=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

"use strict";


var imgui = require('../libimgui');
imgui.install(window);


var data = [
    [{text: 6.0}, {text: 9.5}, {text: "=(A1 + B1) / 2"}],
    [{text: 9.0}, {text: 7.0}, {text: ""}],
    [{text: 5.0}, {text: 3.5}, {text: ""}]
];

function run() {
    setup(theGrid, data, 'root');
}

function theGrid() {
    h3("Grids example");
    grid(10, 10, data, cell);
    br();

    h4("Model");
    //editableValue(data);

    h4("View state");
    //editableValue(memo);

}

var grid = component({}, function grid(self, h, w, data, renderCell) {
    // data = array of rows

    table(function() {
	for (var k = 0; k < w; k++) {
	    col({width: "110px"});
	}
	for (var i = 0; i < data.length && i < h; i++) {
	    var row = data[i];
	    tr({height: "20px"}, function() {
		for (var j = 0; j < row.length && j < w; j++) {
		    td(function() {
			renderCell(row[j]);
		    });
		}
		for (var l = 0; l < w - row.length; l++) {
		    td(function() {
			renderCell({text: " "});
		    });
		}
	    });
	}
	for (var i = data.length; i < h - data.length; i++) {
	    tr({height: "20px"}, function () {
		for (var j = 0; j < w; j++) {
		    td(function() {
			renderCell({text: " "});
		    });
		}
	    });
	}
    });
    
    return data;
});


var cell = component({editing: false}, function cell(self, c) {
    function setFocus(elt) { elt.focus(); }
    
    if (self.editing) {
	on("input", ["input", "focusout"], {type: "text", value: c.text}, function (ev) {
	    if (ev) {
		if (ev.type === 'focusout') {
		    self.editing = false;
		    c.text = ev.target.value;
		}
		if (ev.type === 'input') {
		    c.text = ev.target.value;
		}
	    }
	});
    }
    else {
	on("span", ["click"], {}, function (ev) {
	    if (ev) {
		self.editing = true;
	    }
	    text(c.text);
	});
    }
});


function editableValue(value) {
    if (value === null) {
	text("null");
	return null;
    }

    if (value === undefined) {
	text("undefined");
	return;
    }

    if (value.constructor === Array) {
	return editableList(value, editableValue);
    }

    if (typeof value === "object") {
	return editableObject(value, editableValue);
    }

    if (typeof value === "number") {
	return parseInt(textBox(value));
    }

    if (typeof value === "string") {
	return textBox(value);
    }

    if (typeof value === "boolean") {
	return checkBox(value);
    }

    throw "Unsupported value: " + value;
}



function editableObject(obj, render) {
    table(".table-bordered", function() {
	thead(function() {
	    tr(function () {
		th(function () { text("Property"); });
		th(function () { text("Value"); });		
	    });
	});
	for (var k in obj) {
	    if (obj.hasOwnProperty(k)) {
		tr(function () {
		    td(function() {
			text(k + ":");
		    });
		    td(function() {
			obj[k] = render(obj[k]);
		    });
		});
	    }
	}
    });
    return obj;
}


function editableList(xs, renderx, newx) {

    function move(idx, dir) {
	var elt = xs[idx];
        xs.splice(idx, 1);
        xs.splice(idx + dir, 0, elt);
    }

    table(function () {
        if (newx && xs.length == 0 && button(" + ")) {
	    tr(function() {
		td(function () {
		    xs[0] = clone(newx);
		});
	    });
        }
	    
	// iterate over a copy
	var elts = xs.slice(0);
	
        for (var idx = 0; idx < elts.length; idx++) {
	    tr(function() {
		td(function () {
                    renderx(elts[idx]);
		});

		td(function() {
                    if (newx && button(" + ")) {
			xs.splice(idx + 1, 0, clone(newx));
                    }
		});
		
                td(function() {
		    if (button(" - ")) {
			xs.splice(idx, 1);
                    }
		});

		td(function() {
                    if (idx > 0 && button(" ^ ")) {
			move(idx, -1);
                    }
		});

		td(function() {
                    if (idx < xs.length - 1 && button(" v ")) {
			move(idx, +1);
                    }
		});
            });
	    
        }
    });

    return xs;
}


var editableLabel = component({editing: false}, function editableLabel(self, _, txt) {
    var result = txt;

    function setFocus(elt) {
	elt.focus();
    }
    
    if (self.editing) {
	on("input", ["blur"], {type: "text", value: txt, extra: setFocus}, function (ev) {
	    if (ev) {
		self.editing = false;
		result = ev.target.value;
	    }
	});
    }
    else {
	on("span", ["dblclick"], {}, function (ev) {
	    if (ev) {
		self.editing = true;
	    }
	    text(txt);
	});
    }

    return result;
});

		  
module.exports = run;




},{"../libimgui":2}],2:[function(require,module,exports){


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
    if (typeof vdom !== 'object') {
	return document.createTextNode(vdom.toString());
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
	attrs.extra = function (elt) {
	    elt.checked = (radioValue === value);
	};
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
		"dl", "dt", "dd", "fieldset", "table", "td", "tr", "th", "col", "thead"];
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


},{"jwerty":3}],3:[function(require,module,exports){
/*
 * jwerty - Awesome handling of keyboard events
 *
 * jwerty is a JS lib which allows you to bind, fire and assert key combination
 * strings against elements and events. It normalises the poor std api into
 * something easy to use and clear.
 *
 * This code is licensed under the MIT
 * For the full license see: http://keithamus.mit-license.org/
 * For more information see: http://keithamus.github.com/jwerty
 *
 * @author Keith Cirkel ('keithamus') <jwerty@keithcirkel.co.uk>
 * @license http://keithamus.mit-license.org/
 * @copyright Copyright © 2011, Keith Cirkel
 *
 */
(function (global, exports) {
    
    // Helper methods & vars:
    var $d = global.document
    ,   $ = (global.jQuery || global.Zepto || global.ender || $d)
    ,   $$
    ,   $b
    ,   ke = 'keydown';
    
    function realTypeOf(v, s) {
        return (v === null) ? s === 'null'
        : (v === undefined) ? s === 'undefined'
        : (v.is && v instanceof $) ? s === 'element'
        : Object.prototype.toString.call(v).toLowerCase().indexOf(s) > 7;
    }
    
    if ($ === $d) {
        $$ = function (selector, context) {
            return selector ? $.querySelector(selector, context || $) : $;
        };
        
        $b = function (e, fn) { e.addEventListener(ke, fn, false); };
        $f = function (e, jwertyEv) {
            var ret = document.createEvent('Event')
            ,   i;
            
            ret.initEvent(ke, true, true);
            
            for (i in jwertyEv) ret[i] = jwertyEv[i];
            
            return (e || $).dispatchEvent(ret);
        }
    } else {
        $$ = function (selector, context, fn) { return $(selector || $d, context); };
        $b = function (e, fn) { $(e).bind(ke + '.jwerty', fn); };
        $f = function (e, ob) { $(e || $d).trigger($.Event(ke, ob)); };
    }
    
    // Private
    var _modProps = { 16: 'shiftKey', 17: 'ctrlKey', 18: 'altKey', 91: 'metaKey' };
    
    // Generate key mappings for common keys that are not printable.
    var _keys = {
        
        // MOD aka toggleable keys
        mods: {
            // Shift key, ⇧
            '⇧': 16, shift: 16,
            // CTRL key, on Mac: ⌃
            '⌃': 17, ctrl: 17,
            // ALT key, on Mac: ⌥ (Alt)
            '⌥': 18, alt: 18, option: 18,
            // META, on Mac: ⌘ (CMD), on Windows (Win), on Linux (Super)
            '⌘': 91, meta: 91, cmd: 91, 'super': 91, win: 91
        },
        
        // Normal keys
        keys: {
            // Backspace key, on Mac: ⌫ (Backspace)
            '⌫': 8, backspace: 8,
            // Tab Key, on Mac: ⇥ (Tab), on Windows ⇥⇥
            '⇥': 9, '⇆': 9, tab: 9,
            // Return key, ↩
            '↩': 13, 'return': 13, enter: 13, '⌅': 13,
            // Pause/Break key
            'pause': 19, 'pause-break': 19,
            // Caps Lock key, ⇪
            '⇪': 20, caps: 20, 'caps-lock': 20,
            // Escape key, on Mac: ⎋, on Windows: Esc
            '⎋': 27, escape: 27, esc: 27,
            // Space key
            space: 32,
            // Page-Up key, or pgup, on Mac: ↖
            '↖': 33, pgup: 33, 'page-up': 33,
            // Page-Down key, or pgdown, on Mac: ↘
            '↘': 34, pgdown: 34, 'page-down': 34,
            // END key, on Mac: ⇟
            '⇟': 35, end: 35,
            // HOME key, on Mac: ⇞
            '⇞': 36, home: 36,
            // Insert key, or ins
            ins: 45, insert: 45,
            // Delete key, on Mac: ⌫ (Delete)
            del: 46, 'delete': 46,
            
            // Left Arrow Key, or ←
            '←': 37, left: 37, 'arrow-left': 37,
            // Up Arrow Key, or ↑
            '↑': 38, up: 38, 'arrow-up': 38,
            // Right Arrow Key, or →
            '→': 39, right: 39, 'arrow-right': 39,
            // Up Arrow Key, or ↓
            '↓': 40, down: 40, 'arrow-down': 40,
            
            // odities, printing characters that come out wrong:
            // Num-Multiply, or *
            '*': 106, star: 106, asterisk: 106, multiply: 106,
            // Num-Plus or +
            '+': 107, 'plus': 107,
            // Num-Subtract, or -
            '-': 109, subtract: 109,
            // Semicolon
            ';': 186, semicolon:186,
            // = or equals
            '=': 187, 'equals': 187,
            // Comma, or ,
            ',': 188, comma: 188,
            //'-': 189, //???
            // Period, or ., or full-stop
            '.': 190, period: 190, 'full-stop': 190,
            // Slash, or /, or forward-slash
            '/': 191, slash: 191, 'forward-slash': 191,
            // Tick, or `, or back-quote 
            '`': 192, tick: 192, 'back-quote': 192,
            // Open bracket, or [
            '[': 219, 'open-bracket': 219,
            // Back slash, or \
            '\\': 220, 'back-slash': 220,
            // Close backet, or ]
            ']': 221, 'close-bracket': 221,
            // Apostraphe, or Quote, or '
            '\'': 222, quote: 222, apostraphe: 222
        }
        
    };
    
    // To minimise code bloat, add all of the NUMPAD 0-9 keys in a loop
    i = 95, n = 0;
    while(++i < 106) {
        _keys.keys['num-' + n] = i;
        ++n;
    }
    
    // To minimise code bloat, add all of the top row 0-9 keys in a loop
    i = 47, n = 0;
    while(++i < 58) {
        _keys.keys[n] = i;
        ++n;
    }
    
    // To minimise code bloat, add all of the F1-F25 keys in a loop
    i = 111, n = 1;
    while(++i < 136) {
        _keys.keys['f' + n] = i;
        ++n;
    }
    
    // To minimise code bloat, add all of the letters of the alphabet in a loop
    var i = 64;
    while(++i < 91) {
        _keys.keys[String.fromCharCode(i).toLowerCase()] = i;
    }
    
    function JwertyCode(jwertyCode) {
        var i
        ,   c
        ,   n
        ,   z
        ,   keyCombo
        ,   optionals
        ,   jwertyCodeFragment
        ,   rangeMatches
        ,   rangeI;
        
        // In-case we get called with an instance of ourselves, just return that.
        if (jwertyCode instanceof JwertyCode) return jwertyCode;
        
        // If jwertyCode isn't an array, cast it as a string and split into array.
        if (!realTypeOf(jwertyCode, 'array')) {
            jwertyCode = (String(jwertyCode)).replace(/\s/g, '').toLowerCase().
                match(/(?:\+,|[^,])+/g);
        }
        
        // Loop through each key sequence in jwertyCode
        for (i = 0, c = jwertyCode.length; i < c; ++i) {
            
            // If the key combo at this part of the sequence isn't an array,
            // cast as a string and split into an array.
            if (!realTypeOf(jwertyCode[i], 'array')) {
                jwertyCode[i] = String(jwertyCode[i])
                    .match(/(?:\+\/|[^\/])+/g);
            }
            
            // Parse the key optionals in this sequence
            optionals = [], n = jwertyCode[i].length;
            while (n--) {
                
                // Begin creating the object for this key combo
                var jwertyCodeFragment = jwertyCode[i][n];
                
                keyCombo = {
                    jwertyCombo: String(jwertyCodeFragment),
                    shiftKey: false,
                    ctrlKey: false,
                    altKey: false,
                    metaKey: false
                }
                
                // If jwertyCodeFragment isn't an array then cast as a string
                // and split it into one.
                if (!realTypeOf(jwertyCodeFragment, 'array')) {
                    jwertyCodeFragment = String(jwertyCodeFragment).toLowerCase()
                        .match(/(?:(?:[^\+])+|\+\+|^\+$)/g);
                }
                
                z = jwertyCodeFragment.length;
                while (z--) {
                    
                    // Normalise matching errors
                    if (jwertyCodeFragment[z] === '++') jwertyCodeFragment[z] = '+';
                    
                    // Inject either keyCode or ctrl/meta/shift/altKey into keyCombo
                    if (jwertyCodeFragment[z] in _keys.mods) {
                        keyCombo[_modProps[_keys.mods[jwertyCodeFragment[z]]]] = true;
                    } else if(jwertyCodeFragment[z] in _keys.keys) {
                        keyCombo.keyCode = _keys.keys[jwertyCodeFragment[z]];
                    } else {
                        rangeMatches = jwertyCodeFragment[z].match(/^\[([^-]+\-?[^-]*)-([^-]+\-?[^-]*)\]$/);
                    }
                }
                if (realTypeOf(keyCombo.keyCode, 'undefined')) {
                    // If we picked up a range match earlier...
                    if (rangeMatches && (rangeMatches[1] in _keys.keys) && (rangeMatches[2] in _keys.keys)) {
                        rangeMatches[2] = _keys.keys[rangeMatches[2]];
                        rangeMatches[1] = _keys.keys[rangeMatches[1]];
                        
                        // Go from match 1 and capture all key-comobs up to match 2
                        for (rangeI = rangeMatches[1]; rangeI < rangeMatches[2]; ++rangeI) {
                            optionals.push({
                                altKey: keyCombo.altKey,
                                shiftKey: keyCombo.shiftKey,
                                metaKey: keyCombo.metaKey,
                                ctrlKey: keyCombo.ctrlKey,
                                keyCode: rangeI,
                                jwertyCombo: String(jwertyCodeFragment)
                            });
                            
                        }
                        keyCombo.keyCode = rangeI;
                    // Inject either keyCode or ctrl/meta/shift/altKey into keyCombo
                    } else {
                        keyCombo.keyCode = 0;
                    }
                }
                optionals.push(keyCombo);
            
            }
            this[i] = optionals;
        }
        this.length = i;
        return this;
    }
    
    var jwerty = exports.jwerty = {        
        /**
         * jwerty.event
         *
         * `jwerty.event` will return a function, which expects the first
         *  argument to be a key event. When the key event matches `jwertyCode`,
         *  `callbackFunction` is fired. `jwerty.event` is used by `jwerty.key`
         *  to bind the function it returns. `jwerty.event` is useful for
         *  attaching to your own event listeners. It can be used as a decorator
         *  method to encapsulate functionality that you only want to fire after
         *  a specific key combo. If `callbackContext` is specified then it will
         *  be supplied as `callbackFunction`'s context - in other words, the
         *  keyword `this` will be set to `callbackContext` inside the
         *  `callbackFunction` function.
         *
         *   @param {Mixed} jwertyCode can be an array, or string of key
         *      combinations, which includes optinals and or sequences
         *   @param {Function} callbackFucntion is a function (or boolean) which
         *      is fired when jwertyCode is matched. Return false to
         *      preventDefault()
         *   @param {Object} callbackContext (Optional) The context to call
         *      `callback` with (i.e this)
         *      
         */
        event: function (jwertyCode, callbackFunction, callbackContext /*? this */) {
            
            // Construct a function out of callbackFunction, if it is a boolean.
            if (realTypeOf(callbackFunction, 'boolean')) {
                var bool = callbackFunction;
                callbackFunction = function () { return bool; }
            }
            
            jwertyCode = new JwertyCode(jwertyCode);
            
            // Initialise in-scope vars.
            var i = 0
            ,   c = jwertyCode.length - 1
            ,   returnValue
            ,   jwertyCodeIs;
            
            // This is the event listener function that gets returned...
            return function (event) {
                
                // if jwertyCodeIs returns truthy (string)...
                if ((jwertyCodeIs = jwerty.is(jwertyCode, event, i))) {
                    // ... and this isn't the last key in the sequence,
                    // incriment the key in sequence to check.
                    if (i < c) {
                        ++i;
                        return;
                    // ... and this is the last in the sequence (or the only
                    // one in sequence), then fire the callback
                    } else {
                        returnValue = callbackFunction.call(
                            callbackContext || this, event, jwertyCodeIs);
                        
                        // If the callback returned false, then we should run
                        // preventDefault();
                        if (returnValue === false) event.preventDefault();
                        
                        // Reset i for the next sequence to fire.
                        i = 0;
                        return;
                    }
                }
                
                // If the event didn't hit this time, we should reset i to 0,
                // that is, unless this combo was the first in the sequence,
                // in which case we should reset i to 1.
                i = jwerty.is(jwertyCode, event) ? 1 : 0;
            }
        },
        
        /**
         * jwerty.is
         *
         * `jwerty.is` will return a boolean value, based on if `event` matches
         *  `jwertyCode`. `jwerty.is` is called by `jwerty.event` to check
         *  whether or not to fire the callback. `event` can be a DOM event, or
         *  a jQuery/Zepto/Ender manufactured event. The properties of
         *  `jwertyCode` (speficially ctrlKey, altKey, metaKey, shiftKey and
         *  keyCode) should match `jwertyCode`'s properties - if they do, then
         *  `jwerty.is` will return `true`. If they don't, `jwerty.is` will
         *  return `false`.
         *
         *   @param {Mixed} jwertyCode can be an array, or string of key
         *      combinations, which includes optinals and or sequences
         *   @param {KeyboardEvent} event is the KeyboardEvent to assert against
         *   @param {Integer} i (Optional) checks the `i` key in jwertyCode
         *      sequence
         *      
         */
        is: function (jwertyCode, event, i /*? 0*/) {
            jwertyCode = new JwertyCode(jwertyCode);
            // Default `i` to 0
            i = i || 0;
            // We are only interesting in `i` of jwertyCode;
            jwertyCode = jwertyCode[i];
            // jQuery stores the *real* event in `originalEvent`, which we use
            // because it does annoything stuff to `metaKey`
            event = event.originalEvent || event;
            
            // We'll look at each optional in this jwertyCode sequence...
            var key
            ,   n = jwertyCode.length
            ,   returnValue = false;
            
            // Loop through each fragment of jwertyCode
            while (n--) {
                returnValue = jwertyCode[n].jwertyCombo;
                // For each property in the jwertyCode object, compare to `event`
                for (var p in jwertyCode[n]) {
                    // ...except for jwertyCode.jwertyCombo...
                    if (p !== 'jwertyCombo' && event[p] != jwertyCode[n][p]) returnValue = false;
                }
                // If this jwertyCode optional wasn't falsey, then we can return early.
                if (returnValue !== false) return returnValue;
            }
            return returnValue;
        },
        
        /**
         * jwerty.key
         *
         *  `jwerty.key` will attach an event listener and fire
         *   `callbackFunction` when `jwertyCode` matches. The event listener is
         *   attached to `document`, meaning it will listen for any key events
         *   on the page (a global shortcut listener). If `callbackContext` is
         *   specified then it will be supplied as `callbackFunction`'s context
         *   - in other words, the keyword `this` will be set to
         *   `callbackContext` inside the `callbackFunction` function.
         *
         *   @param {Mixed} jwertyCode can be an array, or string of key
         *      combinations, which includes optinals and or sequences
         *   @param {Function} callbackFunction is a function (or boolean) which
         *      is fired when jwertyCode is matched. Return false to
         *      preventDefault()
         *   @param {Object} callbackContext (Optional) The context to call
         *      `callback` with (i.e this)
         *   @param {Mixed} selector can be a string, jQuery/Zepto/Ender object,
         *      or an HTML*Element on which to bind the eventListener
         *   @param {Mixed} selectorContext can be a string, jQuery/Zepto/Ender
         *      object, or an HTML*Element on which to scope the selector
         *  
         */
        key: function (jwertyCode, callbackFunction, callbackContext /*? this */, selector /*? document */, selectorContext /*? body */) {
            // Because callbackContext is optional, we should check if the
            // `callbackContext` is a string or element, and if it is, then the
            // function was called without a context, and `callbackContext` is
            // actually `selector`
            var realSelector = realTypeOf(callbackContext, 'element') || realTypeOf(callbackContext, 'string') ? callbackContext : selector
            // If `callbackContext` is undefined, or if we skipped it (and
            // therefore it is `realSelector`), set context to `global`.
            ,   realcallbackContext = realSelector === callbackContext ? global : callbackContext
            // Finally if we did skip `callbackContext`, then shift
            // `selectorContext` to the left (take it from `selector`)
            ,    realSelectorContext = realSelector === callbackContext ? selector : selectorContext;
            
            // If `realSelector` is already a jQuery/Zepto/Ender/DOM element,
            // then just use it neat, otherwise find it in DOM using $$()
            $b(realTypeOf(realSelector, 'element') ?
               realSelector : $$(realSelector, realSelectorContext)
            , jwerty.event(jwertyCode, callbackFunction, realcallbackContext));
        },
        
        /**
         * jwerty.fire
         *
         * `jwerty.fire` will construct a keyup event to fire, based on
         *  `jwertyCode`. The event will be fired against `selector`.
         *  `selectorContext` is used to search for `selector` within
         *  `selectorContext`, similar to jQuery's
         *  `$('selector', 'context')`.
         *
         *   @param {Mixed} jwertyCode can be an array, or string of key
         *      combinations, which includes optinals and or sequences
         *   @param {Mixed} selector can be a string, jQuery/Zepto/Ender object,
         *      or an HTML*Element on which to bind the eventListener
         *   @param {Mixed} selectorContext can be a string, jQuery/Zepto/Ender
         *      object, or an HTML*Element on which to scope the selector
         *  
         */
        fire: function (jwertyCode, selector /*? document */, selectorContext /*? body */, i) {
            jwertyCode = new JwertyCode(jwertyCode);
            var realI = realTypeOf(selectorContext, 'number') ? selectorContext : i;
            
            // If `realSelector` is already a jQuery/Zepto/Ender/DOM element,
            // then just use it neat, otherwise find it in DOM using $$()
            $f(realTypeOf(selector, 'element') ?
                selector : $$(selector, selectorContext)
            , jwertyCode[realI || 0][0]);
        },
        
        KEYS: _keys
    };
    
}(this, (typeof module !== 'undefined' && module.exports ? module.exports : this)));
},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImdyaWQuanMiLCIuLi9saWJpbWd1aS9saWJpbWd1aS5qcyIsIi4uL2xpYmltZ3VpL25vZGVfbW9kdWxlcy9qd2VydHkvandlcnR5LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxdUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuXCJ1c2Ugc3RyaWN0XCI7XG5cblxudmFyIGltZ3VpID0gcmVxdWlyZSgnLi4vbGliaW1ndWknKTtcbmltZ3VpLmluc3RhbGwod2luZG93KTtcblxuXG52YXIgZGF0YSA9IFtcbiAgICBbe3RleHQ6IDYuMH0sIHt0ZXh0OiA5LjV9LCB7dGV4dDogXCI9KEExICsgQjEpIC8gMlwifV0sXG4gICAgW3t0ZXh0OiA5LjB9LCB7dGV4dDogNy4wfSwge3RleHQ6IFwiXCJ9XSxcbiAgICBbe3RleHQ6IDUuMH0sIHt0ZXh0OiAzLjV9LCB7dGV4dDogXCJcIn1dXG5dO1xuXG5mdW5jdGlvbiBydW4oKSB7XG4gICAgc2V0dXAodGhlR3JpZCwgZGF0YSwgJ3Jvb3QnKTtcbn1cblxuZnVuY3Rpb24gdGhlR3JpZCgpIHtcbiAgICBoMyhcIkdyaWRzIGV4YW1wbGVcIik7XG4gICAgZ3JpZCgxMCwgMTAsIGRhdGEsIGNlbGwpO1xuICAgIGJyKCk7XG5cbiAgICBoNChcIk1vZGVsXCIpO1xuICAgIC8vZWRpdGFibGVWYWx1ZShkYXRhKTtcblxuICAgIGg0KFwiVmlldyBzdGF0ZVwiKTtcbiAgICAvL2VkaXRhYmxlVmFsdWUobWVtbyk7XG5cbn1cblxudmFyIGdyaWQgPSBjb21wb25lbnQoe30sIGZ1bmN0aW9uIGdyaWQoc2VsZiwgaCwgdywgZGF0YSwgcmVuZGVyQ2VsbCkge1xuICAgIC8vIGRhdGEgPSBhcnJheSBvZiByb3dzXG5cbiAgICB0YWJsZShmdW5jdGlvbigpIHtcblx0Zm9yICh2YXIgayA9IDA7IGsgPCB3OyBrKyspIHtcblx0ICAgIGNvbCh7d2lkdGg6IFwiMTEwcHhcIn0pO1xuXHR9XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5sZW5ndGggJiYgaSA8IGg7IGkrKykge1xuXHQgICAgdmFyIHJvdyA9IGRhdGFbaV07XG5cdCAgICB0cih7aGVpZ2h0OiBcIjIwcHhcIn0sIGZ1bmN0aW9uKCkge1xuXHRcdGZvciAodmFyIGogPSAwOyBqIDwgcm93Lmxlbmd0aCAmJiBqIDwgdzsgaisrKSB7XG5cdFx0ICAgIHRkKGZ1bmN0aW9uKCkge1xuXHRcdFx0cmVuZGVyQ2VsbChyb3dbal0pO1xuXHRcdCAgICB9KTtcblx0XHR9XG5cdFx0Zm9yICh2YXIgbCA9IDA7IGwgPCB3IC0gcm93Lmxlbmd0aDsgbCsrKSB7XG5cdFx0ICAgIHRkKGZ1bmN0aW9uKCkge1xuXHRcdFx0cmVuZGVyQ2VsbCh7dGV4dDogXCIgXCJ9KTtcblx0XHQgICAgfSk7XG5cdFx0fVxuXHQgICAgfSk7XG5cdH1cblx0Zm9yICh2YXIgaSA9IGRhdGEubGVuZ3RoOyBpIDwgaCAtIGRhdGEubGVuZ3RoOyBpKyspIHtcblx0ICAgIHRyKHtoZWlnaHQ6IFwiMjBweFwifSwgZnVuY3Rpb24gKCkge1xuXHRcdGZvciAodmFyIGogPSAwOyBqIDwgdzsgaisrKSB7XG5cdFx0ICAgIHRkKGZ1bmN0aW9uKCkge1xuXHRcdFx0cmVuZGVyQ2VsbCh7dGV4dDogXCIgXCJ9KTtcblx0XHQgICAgfSk7XG5cdFx0fVxuXHQgICAgfSk7XG5cdH1cbiAgICB9KTtcbiAgICBcbiAgICByZXR1cm4gZGF0YTtcbn0pO1xuXG5cbnZhciBjZWxsID0gY29tcG9uZW50KHtlZGl0aW5nOiBmYWxzZX0sIGZ1bmN0aW9uIGNlbGwoc2VsZiwgYykge1xuICAgIGZ1bmN0aW9uIHNldEZvY3VzKGVsdCkgeyBlbHQuZm9jdXMoKTsgfVxuICAgIFxuICAgIGlmIChzZWxmLmVkaXRpbmcpIHtcblx0b24oXCJpbnB1dFwiLCBbXCJpbnB1dFwiLCBcImZvY3Vzb3V0XCJdLCB7dHlwZTogXCJ0ZXh0XCIsIHZhbHVlOiBjLnRleHR9LCBmdW5jdGlvbiAoZXYpIHtcblx0ICAgIGlmIChldikge1xuXHRcdGlmIChldi50eXBlID09PSAnZm9jdXNvdXQnKSB7XG5cdFx0ICAgIHNlbGYuZWRpdGluZyA9IGZhbHNlO1xuXHRcdCAgICBjLnRleHQgPSBldi50YXJnZXQudmFsdWU7XG5cdFx0fVxuXHRcdGlmIChldi50eXBlID09PSAnaW5wdXQnKSB7XG5cdFx0ICAgIGMudGV4dCA9IGV2LnRhcmdldC52YWx1ZTtcblx0XHR9XG5cdCAgICB9XG5cdH0pO1xuICAgIH1cbiAgICBlbHNlIHtcblx0b24oXCJzcGFuXCIsIFtcImNsaWNrXCJdLCB7fSwgZnVuY3Rpb24gKGV2KSB7XG5cdCAgICBpZiAoZXYpIHtcblx0XHRzZWxmLmVkaXRpbmcgPSB0cnVlO1xuXHQgICAgfVxuXHQgICAgdGV4dChjLnRleHQpO1xuXHR9KTtcbiAgICB9XG59KTtcblxuXG5mdW5jdGlvbiBlZGl0YWJsZVZhbHVlKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG5cdHRleHQoXCJudWxsXCIpO1xuXHRyZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuXHR0ZXh0KFwidW5kZWZpbmVkXCIpO1xuXHRyZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHZhbHVlLmNvbnN0cnVjdG9yID09PSBBcnJheSkge1xuXHRyZXR1cm4gZWRpdGFibGVMaXN0KHZhbHVlLCBlZGl0YWJsZVZhbHVlKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiKSB7XG5cdHJldHVybiBlZGl0YWJsZU9iamVjdCh2YWx1ZSwgZWRpdGFibGVWYWx1ZSk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIikge1xuXHRyZXR1cm4gcGFyc2VJbnQodGV4dEJveCh2YWx1ZSkpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpIHtcblx0cmV0dXJuIHRleHRCb3godmFsdWUpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwiYm9vbGVhblwiKSB7XG5cdHJldHVybiBjaGVja0JveCh2YWx1ZSk7XG4gICAgfVxuXG4gICAgdGhyb3cgXCJVbnN1cHBvcnRlZCB2YWx1ZTogXCIgKyB2YWx1ZTtcbn1cblxuXG5cbmZ1bmN0aW9uIGVkaXRhYmxlT2JqZWN0KG9iaiwgcmVuZGVyKSB7XG4gICAgdGFibGUoXCIudGFibGUtYm9yZGVyZWRcIiwgZnVuY3Rpb24oKSB7XG5cdHRoZWFkKGZ1bmN0aW9uKCkge1xuXHQgICAgdHIoZnVuY3Rpb24gKCkge1xuXHRcdHRoKGZ1bmN0aW9uICgpIHsgdGV4dChcIlByb3BlcnR5XCIpOyB9KTtcblx0XHR0aChmdW5jdGlvbiAoKSB7IHRleHQoXCJWYWx1ZVwiKTsgfSk7XHRcdFxuXHQgICAgfSk7XG5cdH0pO1xuXHRmb3IgKHZhciBrIGluIG9iaikge1xuXHQgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrKSkge1xuXHRcdHRyKGZ1bmN0aW9uICgpIHtcblx0XHQgICAgdGQoZnVuY3Rpb24oKSB7XG5cdFx0XHR0ZXh0KGsgKyBcIjpcIik7XG5cdFx0ICAgIH0pO1xuXHRcdCAgICB0ZChmdW5jdGlvbigpIHtcblx0XHRcdG9ialtrXSA9IHJlbmRlcihvYmpba10pO1xuXHRcdCAgICB9KTtcblx0XHR9KTtcblx0ICAgIH1cblx0fVxuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG59XG5cblxuZnVuY3Rpb24gZWRpdGFibGVMaXN0KHhzLCByZW5kZXJ4LCBuZXd4KSB7XG5cbiAgICBmdW5jdGlvbiBtb3ZlKGlkeCwgZGlyKSB7XG5cdHZhciBlbHQgPSB4c1tpZHhdO1xuICAgICAgICB4cy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgeHMuc3BsaWNlKGlkeCArIGRpciwgMCwgZWx0KTtcbiAgICB9XG5cbiAgICB0YWJsZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChuZXd4ICYmIHhzLmxlbmd0aCA9PSAwICYmIGJ1dHRvbihcIiArIFwiKSkge1xuXHQgICAgdHIoZnVuY3Rpb24oKSB7XG5cdFx0dGQoZnVuY3Rpb24gKCkge1xuXHRcdCAgICB4c1swXSA9IGNsb25lKG5ld3gpO1xuXHRcdH0pO1xuXHQgICAgfSk7XG4gICAgICAgIH1cblx0ICAgIFxuXHQvLyBpdGVyYXRlIG92ZXIgYSBjb3B5XG5cdHZhciBlbHRzID0geHMuc2xpY2UoMCk7XG5cdFxuICAgICAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBlbHRzLmxlbmd0aDsgaWR4KyspIHtcblx0ICAgIHRyKGZ1bmN0aW9uKCkge1xuXHRcdHRkKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyeChlbHRzW2lkeF0pO1xuXHRcdH0pO1xuXG5cdFx0dGQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXd4ICYmIGJ1dHRvbihcIiArIFwiKSkge1xuXHRcdFx0eHMuc3BsaWNlKGlkeCArIDEsIDAsIGNsb25lKG5ld3gpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXHRcdH0pO1xuXHRcdFxuICAgICAgICAgICAgICAgIHRkKGZ1bmN0aW9uKCkge1xuXHRcdCAgICBpZiAoYnV0dG9uKFwiIC0gXCIpKSB7XG5cdFx0XHR4cy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXHRcdH0pO1xuXG5cdFx0dGQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpZHggPiAwICYmIGJ1dHRvbihcIiBeIFwiKSkge1xuXHRcdFx0bW92ZShpZHgsIC0xKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXHRcdH0pO1xuXG5cdFx0dGQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpZHggPCB4cy5sZW5ndGggLSAxICYmIGJ1dHRvbihcIiB2IFwiKSkge1xuXHRcdFx0bW92ZShpZHgsICsxKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXHRcdH0pO1xuICAgICAgICAgICAgfSk7XG5cdCAgICBcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHhzO1xufVxuXG5cbnZhciBlZGl0YWJsZUxhYmVsID0gY29tcG9uZW50KHtlZGl0aW5nOiBmYWxzZX0sIGZ1bmN0aW9uIGVkaXRhYmxlTGFiZWwoc2VsZiwgXywgdHh0KSB7XG4gICAgdmFyIHJlc3VsdCA9IHR4dDtcblxuICAgIGZ1bmN0aW9uIHNldEZvY3VzKGVsdCkge1xuXHRlbHQuZm9jdXMoKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKHNlbGYuZWRpdGluZykge1xuXHRvbihcImlucHV0XCIsIFtcImJsdXJcIl0sIHt0eXBlOiBcInRleHRcIiwgdmFsdWU6IHR4dCwgZXh0cmE6IHNldEZvY3VzfSwgZnVuY3Rpb24gKGV2KSB7XG5cdCAgICBpZiAoZXYpIHtcblx0XHRzZWxmLmVkaXRpbmcgPSBmYWxzZTtcblx0XHRyZXN1bHQgPSBldi50YXJnZXQudmFsdWU7XG5cdCAgICB9XG5cdH0pO1xuICAgIH1cbiAgICBlbHNlIHtcblx0b24oXCJzcGFuXCIsIFtcImRibGNsaWNrXCJdLCB7fSwgZnVuY3Rpb24gKGV2KSB7XG5cdCAgICBpZiAoZXYpIHtcblx0XHRzZWxmLmVkaXRpbmcgPSB0cnVlO1xuXHQgICAgfVxuXHQgICAgdGV4dCh0eHQpO1xuXHR9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufSk7XG5cblx0XHQgIFxubW9kdWxlLmV4cG9ydHMgPSBydW47XG5cblxuXG4iLCJcblxuLypcblxuVE9ETzpcblxuLSBtYWtlIHBvc3NpYmxlIHRvIHVzZSBtdWx0aXBsZSBpbnN0YW5jZSBpbiBhIHNpbmdsZSBwYWdlIChwdXQgZXZlcnl0aGluZyBpbiBhbiBvYmplY3QpXG5cbi0gbWFrZSBcImhlcmVcIiByZXNpbGllbnQgYWdhaW5zdCBwYXNzaW5nIHRoZSB5aWVsZGVkIGZ1bmN0aW9uIHRvIG90aGVyIGZ1bmN0aW9ucy4gQ3VycmVudGx5IFxuICBpdCBvbmx5IHdvcmtzIGlmIGl0J3MgY2FsbGVkIHdpdGhpbiB0aGUgY2xvc3VyZS5cblxuLSByZW1vdmUgXCJib2R5XCIgcGF0Y2hpbmcuXG5cbi0gbGV0IGV2ZW50LWhhbmRsaW5nIHJlbmRlciBub3QgYnVpbGQgVm5vZGVzLlxuXG4tIGFkZCBhc3NlcnRpb25zIHRvIGNoZWNrIGlucHV0IHBhcmFtcy5cblxuLSBnYXJiYWdlIGNvbGxlY3QgdmlldyBzdGF0ZXMuXG5cbi0gcGVyaGFwcyByZW1vdmUgdHJ5LWZpbmFsbHksIHNpbmNlIGV4Y2VwdGlvbiBoYW5kbGluZyBkb2VzIG5vdCBzZWVtcyB0byBiZSBjb21tb24gaW4gSlMgKGFuZCBzbG93Li4uKVxuXG4tIG1ha2Ugc29tZSBlbGVtZW50cyBib3RoIGFjY2VwdCBzdHJpbmcgYW5kIGJsb2NrIChlLmcuIHApLlxuXG4tIHNlcGFyYXRlIHdpZGdldHMgaW4gb3RoZXIgbGliXG5cbi0gcmVtb3ZlIGRlcCBvbiBqd2VydHkgKHVzZSBwcm9jZWVkIHBhdHRlcm4pXG5cbi0gYWxsb3cgZXZlbnQgZGVsZWdhdGlvbiB2aWEgcm9vdCwgbm90IGp1c3QgZG9jdW1lbnQuXG5cbi0gbWFrZSBkb2N1bWVudCBpbmplY3RhYmxlXG5cbiovXG5cbi8vIHZhciBoID0gcmVxdWlyZSgndmlydHVhbC1kb20vaCcpO1xuLy8gdmFyIGRpZmYgPSByZXF1aXJlKCd2aXJ0dWFsLWRvbS9kaWZmJyk7XG4vLyB2YXIgcGF0Y2ggPSByZXF1aXJlKCd2aXJ0dWFsLWRvbS9wYXRjaCcpO1xuLy8gdmFyIGNyZWF0ZUVsZW1lbnQgPSByZXF1aXJlKCd2aXJ0dWFsLWRvbS9jcmVhdGUtZWxlbWVudCcpO1xuLy8gdmFyIFZpcnR1YWxUZXh0ID0gcmVxdWlyZSgndmlydHVhbC1kb20vdm5vZGUvdnRleHQnKTtcbi8vIHZhciBWaXJ0dWFsTm9kZSA9IHJlcXVpcmUoJ3ZpcnR1YWwtZG9tL3Zub2RlL3Zub2RlJyk7XG52YXIgandlcnR5ID0gcmVxdWlyZSgnandlcnR5JykuandlcnR5O1xuXG52YXIgR1VJID0ge1xuICAgIGV2ZW50OiBudWxsLFxuICAgIGFwcDogbnVsbCxcbiAgICBtb2RlbDogbnVsbCxcbiAgICBmb2N1czogW10sXG4gICAgbm9kZTogbnVsbCxcbiAgICBleHRyYXM6IHt9LFxuICAgIHRpbWVyczoge30sXG4gICAgaGFuZGxlcnM6IHt9LFxuICAgIGlkczogMFxufVxuXG5mdW5jdGlvbiBpbml0KGFwcCwgbW9kZWwsIHJvb3QpIHtcbiAgICBHVUkuYXBwID0gYXBwO1xuICAgIEdVSS5tb2RlbCA9IG1vZGVsO1xuICAgIEdVSS5yb290ID0gcm9vdDtcbn1cblxuZnVuY3Rpb24gcmVnaXN0ZXIoZXZlbnQsIGlkKSB7XG4gICAgLy8gb25seSBhZGQgb25lIGhhbmRsZXIgdG8gcm9vdCwgcGVyIGV2ZW50IHR5cGUuXG4gICAgaWYgKCFHVUkuaGFuZGxlcnMuaGFzT3duUHJvcGVydHkoZXZlbnQpKSB7XG5cdEdVSS5oYW5kbGVyc1tldmVudF0gPSBbXTtcblx0dmFyIHIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChHVUkucm9vdCk7XG5cdHIuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgZnVuY3Rpb24gKGUpIHtcblx0ICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIGRvbid0IGxlYWsgdXB3YXJkc1xuXHQgICAgdmFyIGlkID0gZS50YXJnZXQuZ2V0QXR0cmlidXRlKCdpZCcpO1xuXHQgICAgaWYgKEdVSS5oYW5kbGVyc1tldmVudF0uaW5kZXhPZihpZCkgPiAtMSkge1xuXHRcdEdVSS5ldmVudCA9IGU7XG5cdFx0ZG9SZW5kZXIoKTtcblx0ICAgIH1cblx0fSwgZmFsc2UpO1xuICAgIH1cbiAgICBHVUkuaGFuZGxlcnNbZXZlbnRdLnB1c2goaWQpO1xufVxuXG5mdW5jdGlvbiByZXNldEhhbmRsZXJzKCkge1xuICAgIGZvciAodmFyIGsgaW4gR1VJLmhhbmRsZXJzKSB7XG5cdGlmIChHVUkuaGFuZGxlcnMuaGFzT3duUHJvcGVydHkoaykpIHtcblx0ICAgIEdVSS5oYW5kbGVyc1trXSA9IFtdO1xuXHR9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzZXR1cChhcHAsIG1vZGVsLCByb290KSB7XG4gICAgaW5pdChhcHAsIG1vZGVsLCByb290KTtcbiAgICBtb3VudChyZW5kZXJPbmNlKCkpO1xufVxuXG5cbmZ1bmN0aW9uIHJlbmRlck9uY2UoKSB7XG4gICAgcmVzZXRIYW5kbGVycygpO1xuICAgIEdVSS5leHRyYXMgPSB7fTtcbiAgICBHVUkuZm9jdXMgPSBbXTtcbiAgICBHVUkuaWRzID0gMDtcbiAgICBHVUkuYXBwKEdVSS5tb2RlbCk7XG59XG5cbmZ1bmN0aW9uIG1vdW50KG5vZGUpIHtcbiAgICB2YXIgYWN0aXZlID0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudDtcbiAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoR1VJLnJvb3QpO1xuICAgIGlmIChHVUkubm9kZSAhPT0gbnVsbCkge1xuXHRyZWNvbmNpbGVLaWRzKGNvbnRhaW5lciwgY29udGFpbmVyLmNoaWxkTm9kZXMsIEdVSS5mb2N1cyk7XG4gICAgfVxuICAgIGVsc2Uge1xuXHR3aGlsZSAoY29udGFpbmVyLmZpcnN0Q2hpbGQpIHtcblx0ICAgIGNvbnRhaW5lci5yZW1vdmVDaGlsZChjb250YWluZXIuZmlyc3RDaGlsZCk7XG5cdH1cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBHVUkuZm9jdXMubGVuZ3RoOyBpKyspIHtcblx0ICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChidWlsZChHVUkuZm9jdXNbaV0pKTtcblx0fVxuICAgIH1cbiAgICBHVUkubm9kZSA9IG5vZGU7XG5cbiAgICBmb3IgKHZhciBpZCBpbiBHVUkuZXh0cmFzKSB7XG5cdGlmIChHVUkuZXh0cmFzLmhhc093blByb3BlcnR5KGlkKSkge1xuXHQgICAgdmFyIGRvU29tZXRoaW5nID0gR1VJLmV4dHJhc1tpZF07XG5cdCAgICB2YXIgZWx0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuXHQgICAgZG9Tb21ldGhpbmcoZWx0KTtcblx0fVxuICAgIH1cbiAgICBcbn1cblxuZnVuY3Rpb24gZG9SZW5kZXIoKSB7XG4gICAgLy8gdHdpY2U6IG9uZSB0byBoYW5kbGUgZXZlbnQsIG9uZSB0byBzeW5jIHZpZXcuXG4gICAgdmFyIF8gPSByZW5kZXJPbmNlKCk7XG4gICAgdmFyIG5vZGUgPSByZW5kZXJPbmNlKCk7XG4gICAgbW91bnQobm9kZSk7XG59XG5cblxuXG5cblxudmFyIGNhbGxTdGFjayA9IFtdO1xuXG4vLyB3ZSBzaG91bGQgc29tZWhvdyBnYXJiYWdlIGNvbGxlY3QgdGhpcy5cbnZhciBtZW1vID0ge307XG5cblxuZnVuY3Rpb24gZ2V0Q2FsbGVyTG9jKG9mZnNldCkge1xuICAgIHZhciBzdGFjayA9IG5ldyBFcnJvcigpLnN0YWNrLnNwbGl0KCdcXG4nKTtcbiAgICB2YXIgbGluZSA9IHN0YWNrWyhvZmZzZXQgfHwgMSkgKyAxXTtcbiAgICAvL2NvbnNvbGUubG9nKFwibGFzdCAvID0gXCIgKyBsaW5lLmxhc3RJbmRleE9mKFwiL1wiKSk7XG4gICAgaWYgKGxpbmVbbGluZS5sZW5ndGggLSAxXSA9PT0gJyknKSB7XG5cdGxpbmUgPSBsaW5lLnNsaWNlKDAsIGxpbmUubGVuZ3RoIC0gMSk7XG4gICAgfVxuICAgIHJldHVybiBsaW5lLnNsaWNlKGxpbmUubGFzdEluZGV4T2YoJy8nKSArIDEpO1xufVxuIFxuXG5mdW5jdGlvbiBjb21wb25lbnQoc3RhdGUsIGZ1bmMpIHtcbiAgICB2YXIgZm5hbWUgPSBmdW5jLm5hbWUgfHwgZnVuYy50b1N0cmluZygpO1xuICAgIHJldHVybiBuYW1lZENvbXBvbmVudChmbmFtZSwgZnVuYywgc3RhdGUpO1xufVxuXG5mdW5jdGlvbiBuYW1lZChmbmFtZSwgY29tcCkge1xuICAgIGNhbGxTdGFjay5wdXNoKGZuYW1lKTtcbiAgICB0cnkge1xuXHR2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG5cdC8vIGZvciAodmFyIGkgPSAyOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG5cdC8vICAgICBhcmdzLnB1c2goYXJndW1lbnRzW2ldKTtcblx0Ly8gfVxuXHRyZXR1cm4gY29tcC5hcHBseShudWxsLCBhcmdzKTtcbiAgICB9XG4gICAgZmluYWxseSB7XG5cdGNhbGxTdGFjay5wb3AoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGtleU9mKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG5cdHJldHVybiBcIlwiO1xuICAgIH1cblxuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG5cdHJldHVybiBcIlwiO1xuICAgIH1cblxuICAgIGlmICh2YWx1ZS5jb25zdHJ1Y3RvciA9PT0gQXJyYXkpIHtcblx0cmV0dXJuIG9iamVjdElkKHZhbHVlKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiKSB7XG5cdHJldHVybiBvYmplY3RJZCh2YWx1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIFwiXCI7XG59XG5cbmZ1bmN0aW9uIG5hbWVkQ29tcG9uZW50KGZuYW1lLCBmdW5jLCBzdGF0ZSkge1xuICAgIHN0YXRlID0gc3RhdGUgfHwge307XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuXHR2YXIgbW9kZWwgPSBhcmd1bWVudHNbMF07IC8vIGZpcnN0IGFyZ3VtZW50ICptdXN0KiBiZSBhIG1vZGVsXG5cdGNhbGxTdGFjay5wdXNoKFtmbmFtZSwga2V5T2YobW9kZWwpLCBnZXRDYWxsZXJMb2MoMildLnRvU3RyaW5nKCkpO1xuXHR0cnkge1xuXHQgICAgdmFyIGtleSA9IGNhbGxTdGFjay50b1N0cmluZygpO1xuXHQgICAgaWYgKCFtZW1vW2tleV0pIHtcblx0XHRtZW1vW2tleV0gPSBjbG9uZShzdGF0ZSk7XG5cdCAgICB9XG5cdCAgICB2YXIgc2VsZiA9IG1lbW9ba2V5XTtcblx0ICAgIHJldHVybiBmdW5jLmFwcGx5KG51bGwsIFtzZWxmXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuXHR9XG5cdGZpbmFsbHkge1xuXHQgICAgY2FsbFN0YWNrLnBvcCgpO1xuXHR9XG4gICAgfTtcbn1cblxuLypcbnZkb20gZWxlbWVudFxue3RhZzpcbiBhdHRyczoge30gZXRjLlxuIGtpZHM6IFtdIH1cblxuKi9cblxuZnVuY3Rpb24gY29tcGF0KGQsIHYpIHtcbiAgICAvL2NvbnNvbGUubG9nKFwiQ29tcGF0PyBcIik7XG4gICAgLy9jb25zb2xlLmxvZyhcImQgPSBcIiArIGQubm9kZVZhbHVlKTtcbiAgICAvL2NvbnNvbGUubG9nKFwidiA9IFwiICsgSlNPTi5zdHJpbmdpZnkodikpO1xuICAgIHJldHVybiAoZC5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUgJiYgKHR5cGVvZiB2ICE9PSAnb2JqZWN0JykpXG5cdHx8IChkLnRhZ05hbWUgPT09IHYudGFnLnRvVXBwZXJDYXNlKCkpO1xufVxuXG4vLyBmdW5jdGlvbiBzZXRBdHRyaWJ1dGVIb29rKGRvbSwgbmFtZSwgdmFsdWUpIHtcbi8vICAgICBmdW5jdGlvbiBwYXJzZUJvb2xlYW4odikge1xuLy8gXHRpZiAoIXYpIHtcbi8vIFx0ICAgIHJldHVybiBmYWxzZTtcbi8vIFx0fVxuLy8gXHRyZXR1cm4gdi50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkgPT09ICd0cnVlJztcbi8vICAgICB9XG4vLyAgICAgLy8gaWYgKG5hbWUgPT09ICdjaGVja2VkJykge1xuLy8gICAgIC8vIFx0ZG9tLmNoZWNrZWQgPSBwYXJzZUJvb2xlYW4odmFsdWUpO1xuLy8gICAgIC8vIH1cbi8vICAgICAvLyBpZiAobmFtZSA9PT0gJ3NlbGVjdGVkJykge1xuLy8gICAgIC8vIFx0ZG9tLnNlbGVjdGVkID0gcGFyc2VCb29sZWFuKHZhbHVlKTtcbi8vICAgICAvLyB9XG4vLyAgICAgaWYgKG5hbWUgPT09ICd2YWx1ZScpIHtcbi8vIFx0ZG9tLnZhbHVlID0gdmFsdWU7XG4vLyAgICAgfVxuLy8gfVxuXG4vLyBmdW5jdGlvbiByZW1vdmVBdHRyaWJ1dGVIb29rKGRvbSwgbmFtZSkge1xuLy8gICAgIC8vIGlmIChuYW1lID09PSAnY2hlY2tlZCcpIHtcbi8vICAgICAvLyBcdGRvbS5jaGVja2VkID0gZmFsc2U7XG4vLyAgICAgLy8gfVxuLy8gICAgIC8vIGlmIChuYW1lID09PSAnc2VsZWN0ZWQnKSB7XG4vLyAgICAgLy8gXHRkb20uc2VsZWN0ZWQgPSBmYWxzZTtcbi8vICAgICAvLyB9XG4vLyAgICAgaWYgKG5hbWUgPT09ICd2YWx1ZScpIHtcbi8vIFx0ZG9tLnZhbHVlID0gJyc7XG4vLyAgICAgfVxuLy8gfVxuXG5mdW5jdGlvbiByZWNvbmNpbGUoZG9tLCB2ZG9tKSB7XG4gICAgaWYgKCFjb21wYXQoZG9tLCB2ZG9tKSkge1xuXHR0aHJvdyBcIkNhbiBvbmx5IHJlY29uY2lsZSBjb21wYXRpYmxlIG5vZGVzXCI7XG4gICAgfVxuICAgIFxuICAgIC8vIFRleHQgbm9kZXNcbiAgICBpZiAodHlwZW9mIHZkb20gIT09ICdvYmplY3QnKSB7XG5cdGlmIChkb20ubm9kZVZhbHVlICE9PSB2ZG9tKSB7XG5cdCAgICBkb20ubm9kZVZhbHVlID0gdmRvbS50b1N0cmluZygpO1xuXHR9XG5cdHJldHVybjtcbiAgICB9XG5cblxuICAgIC8vIEVsZW1lbnQgbm9kZXNcbiAgICB2YXIgdmF0dHJzID0gdmRvbS5hdHRycyB8fCB7fTtcbiAgICBmb3IgKHZhciB2YXR0ciBpbiB2YXR0cnMpIHtcblx0aWYgKHZhdHRycy5oYXNPd25Qcm9wZXJ0eSh2YXR0cikpIHtcblx0ICAgIGlmIChkb20uaGFzQXR0cmlidXRlKHZhdHRyKSkge1xuXHRcdHZhciBkYXR0ciA9IGRvbS5nZXRBdHRyaWJ1dGUodmF0dHIpO1xuXHRcdGlmIChkYXR0ciAhPT0gdmF0dHJzW3ZhdHRyXS50b1N0cmluZygpKSB7IFxuXHRcdCAgICBjb25zb2xlLmxvZyhcIlVwZGF0aW5nIGF0dHJpYnV0ZTogXCIgKyB2YXR0ciArIFwiID0gXCIgKyB2YXR0cnNbdmF0dHJdKTtcblx0XHQgICAgZG9tLnNldEF0dHJpYnV0ZSh2YXR0ciwgdmF0dHJzW3ZhdHRyXSk7XG5cdFx0fVxuXHQgICAgfVxuXHQgICAgZWxzZSB7XG5cdFx0Y29uc29sZS5sb2coXCJBZGRpbmcgYXR0cmlidXRlOiBcIiArIHZhdHRyICsgXCIgPSBcIiArIHZhdHRyc1t2YXR0cl0pO1xuXHRcdGRvbS5zZXRBdHRyaWJ1dGUodmF0dHIsIHZhdHRyc1t2YXR0cl0pO1xuXHQgICAgfVxuXHR9XG4gICAgfVxuICAgIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZG9tLmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcblx0dmFyIGRhdHRyID0gZG9tLmF0dHJpYnV0ZXNbaV07XG5cdGlmICghdmF0dHJzLmhhc093blByb3BlcnR5KGRhdHRyLm5vZGVOYW1lKSkge1xuXHQgICAgY29uc29sZS5sb2coXCJSZW1vdmluZyBhdHRyaWJ1dGU6IFwiICsgZGF0dHIubm9kZU5hbWUpO1xuXHQgICAgZG9tLnJlbW92ZUF0dHJpYnV0ZShkYXR0ci5ub2RlTmFtZSk7XG5cdH1cbiAgICB9XG5cbiAgICByZWNvbmNpbGVLaWRzKGRvbSwgZG9tLmNoaWxkTm9kZXMsIHZkb20ua2lkcyk7XG59XG5cbmZ1bmN0aW9uIHJlY29uY2lsZUtpZHMoZG9tLCBka2lkcywgdmtpZHMpIHtcbiAgICB2YXIgbGVuID0gTWF0aC5taW4oZGtpZHMubGVuZ3RoLCB2a2lkcy5sZW5ndGgpO1xuICAgIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcblx0dmFyIGRraWQgPSBka2lkc1tpXTtcblx0dmFyIHZraWQgPSB2a2lkc1tpXTtcblx0aWYgKGNvbXBhdChka2lkLCB2a2lkKSkge1xuXHQgICAgcmVjb25jaWxlKGRraWQsIHZraWQpO1xuXHR9XG5cdGVsc2Uge1xuXHQgICAgY29uc29sZS5sb2coXCJSZXBsYWNpbmcgY2hpbGRcIik7XG5cdCAgICBkb20ucmVwbGFjZUNoaWxkKGJ1aWxkKHZraWQpLCBka2lkKTtcblx0fVxuICAgIH1cbiAgICBcbiAgICBpZiAoZGtpZHMubGVuZ3RoID4gbGVuKSB7XG5cdHdoaWxlIChka2lkcy5sZW5ndGggPiBsZW4pIHtcblx0ICAgIGNvbnNvbGUubG9nKFwiUmVtb3ZpbmcgY2hpbGQgXCIpO1xuXHQgICAgZG9tLnJlbW92ZUNoaWxkKGRraWRzW2xlbl0pO1xuXHR9XG4gICAgfVxuICAgIGVsc2UgaWYgKHZraWRzLmxlbmd0aCA+IGxlbikge1xuXHRmb3IgKHZhciBpID0gbGVuOyBpIDwgdmtpZHMubGVuZ3RoOyBpKyspIHtcblx0ICAgIGNvbnNvbGUubG9nKFwiQXBwZW5kaW5nIG5ldyBjaGlsZCBcIik7XG5cdCAgICBkb20uYXBwZW5kQ2hpbGQoYnVpbGQodmtpZHNbaV0pKTtcblx0fVxuICAgIH1cbn1cblxuZnVuY3Rpb24gYnVpbGQodmRvbSkge1xuICAgIGlmICh0eXBlb2YgdmRvbSAhPT0gJ29iamVjdCcpIHtcblx0cmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHZkb20udG9TdHJpbmcoKSk7XG4gICAgfVxuXG4gICAgdmFyIGVsdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodmRvbS50YWcpO1xuICAgIHZhciB2YXR0cnMgPSB2ZG9tLmF0dHJzIHx8IHt9O1xuICAgIGZvciAodmFyIGsgaW4gdmF0dHJzKSB7XG5cdGlmICh2YXR0cnMuaGFzT3duUHJvcGVydHkoaykpIHtcblx0ICAgIGVsdC5zZXRBdHRyaWJ1dGUoaywgdmF0dHJzW2tdKTtcblx0fVxuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZkb20ua2lkcy5sZW5ndGg7IGkrKykge1xuXHRlbHQuYXBwZW5kQ2hpbGQoYnVpbGQodmRvbS5raWRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBlbHQ7ICAgIFxufVxuXG52YXIgX19uZXh0X29iamlkPTE7XG5mdW5jdGlvbiBvYmplY3RJZChvYmopIHtcbiAgICBpZiAob2JqPT1udWxsKSByZXR1cm4gbnVsbDtcbiAgICBpZiAob2JqLl9fb2JqX2lkPT1udWxsKSBvYmouX19vYmpfaWQ9X19uZXh0X29iamlkKys7XG4gICAgcmV0dXJuIG9iai5fX29ial9pZDtcbn1cblxuZnVuY3Rpb24gY2xvbmUob2JqKSB7XG4gICAgaWYgKG51bGwgPT0gb2JqIHx8IFwib2JqZWN0XCIgIT0gdHlwZW9mIG9iaikgcmV0dXJuIG9iajtcbiAgICB2YXIgY29weSA9IG9iai5jb25zdHJ1Y3RvcigpO1xuICAgIGZvciAodmFyIGF0dHIgaW4gb2JqKSB7XG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoYXR0cikpIGNvcHlbYXR0cl0gPSBvYmpbYXR0cl07XG4gICAgfVxuICAgIHJldHVybiBjb3B5O1xufVxuXG4vLyBFdmVudCBoYW5kbGluZ1xuXG5mdW5jdGlvbiBkZWFsV2l0aEl0KGUpIHtcbiAgICBHVUkuZXZlbnQgPSBlO1xuICAgIGRvUmVuZGVyKCk7XG59XG5cblxuXG4vLyBSZW5kZXIgZnVuY3Rpb25zXG5cbmZ1bmN0aW9uIGlzS2V5Q29tYm9FdmVudChldmVudCkge1xuICAgIHJldHVybiBldmVudC5pbmRleE9mKFwiOlwiKSA+IC0gMTtcbn1cblxuZnVuY3Rpb24gZ2V0SGFuZGxlcihldmVudCkge1xuICAgIGlmIChpc0tleUNvbWJvRXZlbnQoZXZlbnQpKSB7XG5cdHJldHVybiBrZXlDb21ib0xpc3RlbmVyKGV2ZW50KTtcbiAgICB9XG4gICAgcmV0dXJuIGRlYWxXaXRoSXQ7XG59XG4gICAgXG5mdW5jdGlvbiBrZXlDb21ib0xpc3RlbmVyKGVsdCwgZXZlbnQpIHtcbiAgICB2YXIgY29sb24gPSBldmVudC5pbmRleE9mKFwiOlwiKTtcbiAgICB2YXIgY29tYm8gPSBldmVudC5zbGljZShjb2xvbiArIDEpO1xuICAgIGV2ZW50ID0gZXZlbnQuc2xpY2UoMCwgY29sb24pO1xuICAgIHJldHVybiBmdW5jdGlvbiBsaXN0ZW4oZSkge1xuXHRpZiAoandlcnR5LmlzKGNvbWJvLCBlKSkge1xuXHQgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0ICAgIGUucHJldmVudERlZmF1bHQoKTtcblx0ICAgIGUuaXNLZXkgPSBmdW5jdGlvbiAoYykgeyByZXR1cm4gandlcnR5LmlzKGMsIHRoaXMpOyB9O1xuXHQgICAgZS50YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgbGlzdGVuLCBmYWxzZSk7XG5cdCAgICBkZWFsV2l0aEl0KGUpO1xuXHR9XG4gICAgfTtcbn1cblxuXG5mdW5jdGlvbiBvbihlbHQsIGV2ZW50cywgYXR0cnMsIGJsb2NrKSB7XG4gICAgYXR0cnMgPSBhdHRycyB8fCB7fTtcbiAgICB2YXIgaWQgPSBhdHRyc1tcImlkXCJdIHx8IChcImlkXCIgKyBHVUkuaWRzKyspO1xuICAgIGF0dHJzW1wiaWRcIl0gPSBpZDtcblxuICAgIFxuICAgIC8vR1VJLmhhbmRsZXJzW2lkXSA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG5cdHJlZ2lzdGVyKGV2ZW50c1tpXSwgaWQpO1xuICAgIH1cblxuICAgIHJldHVybiB3aXRoRWxlbWVudChlbHQsIGF0dHJzLCBmdW5jdGlvbigpIHtcblx0dmFyIGV2ZW50ID0gR1VJLmV2ZW50O1xuXHRpZiAoZXZlbnQgJiYgZXZlbnQudGFyZ2V0LmdldEF0dHJpYnV0ZSgnaWQnKSA9PT0gaWQpIHtcblx0ICAgIEdVSS5ldmVudCA9IHVuZGVmaW5lZDsgLy8gbWF5YmUgZG8gaW4gdG9wbGV2ZWw/Pz9cblx0ICAgIHJldHVybiBibG9jayhldmVudCk7IC8vIGxldCBpdCBiZSBoYW5kbGVkXG5cdH1cblx0cmV0dXJuIGJsb2NrKCk7XG4gICAgfSk7XG59XG5cblxuXG5cbmZ1bmN0aW9uIGhlcmUoZnVuYywgYmxvY2spIHtcbiAgICB2YXIgcG9zID0gR1VJLmZvY3VzLmxlbmd0aDtcbiAgICByZXR1cm4gYmxvY2soZnVuY3Rpb24oKSB7XG5cdHZhciBwYXJlbnQgPSBHVUkuZm9jdXM7XG5cdEdVSS5mb2N1cyA9IFtdO1xuXHR0cnkge1xuXHQgICAgcmV0dXJuIGZ1bmMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcblx0fVxuXHRmaW5hbGx5IHtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgR1VJLmZvY3VzLmxlbmd0aDsgaSsrKSB7XG5cdFx0cGFyZW50LnNwbGljZShwb3MgKyBpLCAwLCBHVUkuZm9jdXNbaV0pO1xuXHQgICAgfVxuXHQgICAgR1VJLmZvY3VzID0gcGFyZW50O1xuXHR9XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHdpdGhFbGVtZW50KGVsdCwgYXR0cnMsIGZ1bmMsIGV2cykge1xuICAgIC8vIFRPRE86IGlmIEdVSS5wcmV0ZW5kLCBkb24ndCBidWlsZCB2bm9kZXNcbiAgICB2YXIgcGFyZW50ID0gR1VJLmZvY3VzO1xuICAgIEdVSS5mb2N1cyA9IFtdO1xuICAgIHRyeSB7XG5cdHJldHVybiBmdW5jKCk7XG4gICAgfVxuICAgIGZpbmFsbHkge1xuXHRpZiAoYXR0cnMgJiYgYXR0cnNbJ2V4dHJhJ10pIHtcblx0ICAgIEdVSS5leHRyYXNbYXR0cnNbJ2lkJ11dID0gYXR0cnNbJ2V4dHJhJ107XG5cdCAgICBkZWxldGUgYXR0cnNbJ2V4dHJhJ107XG5cdH1cblx0dmFyIHZub2RlID0ge3RhZzogZWx0LCBhdHRyczogYXR0cnMsIGtpZHM6IEdVSS5mb2N1c307XG5cdHBhcmVudC5wdXNoKHZub2RlKTtcblx0R1VJLmZvY3VzID0gcGFyZW50O1xuICAgIH0gICAgXG59XG5cblxuXG4vLyBCYXNpYyB3aWRnZXRzXG5cblxuZnVuY3Rpb24gYWRkSW5wdXRFbGVtZW50cyhvYmopIHtcbiAgICB2YXIgYmFzaWNJbnB1dHMgPSB7XG4vL1x0dGV4dEJveDoge3R5cGU6ICd0ZXh0JywgZXZlbnQ6ICdpbnB1dCd9LFxuXHRzcGluQm94OiB7dHlwZTogJ251bWJlcicsIGV2ZW50OiAnaW5wdXQnfSxcblx0c2xpZGVyOiB7dHlwZTogJ3JhbmdlJywgZXZlbnQ6ICdpbnB1dCd9LFxuXHRlbWFpbEJveDoge3R5cGU6ICdlbWFpbCcsIGV2ZW50OiAnaW5wdXQnfSxcblx0c2VhcmNoQm94OiB7dHlwZTogJ3NlYXJjaCcsIGV2ZW50OiAnaW5wdXQnfSxcblx0ZGF0ZVBpY2tlcjoge3R5cGU6ICdkYXRlJywgZXZlbnQ6ICdjaGFuZ2UnfSxcblx0Y29sb3JQaWNrZXI6IHt0eXBlOiAnY29sb3InLCBldmVudDogJ2NoYW5nZSd9LFxuXHRkYXRlVGltZVBpY2tlcjoge3R5cGU6ICdkYXRldGltZScsIGV2ZW50OiAnY2hhbmdlJ30sXG5cdGxvY2FsRGF0ZVRpbWVQaWNrZXI6IHt0eXBlOiAnZGF0ZXRpbWUtbG9jYWwnLCBldmVudDogJ2NoYW5nZSd9LFxuXHRtb250aFBpY2tlcjoge3R5cGU6ICd3ZWVrJywgZXZlbnQ6ICdjaGFuZ2UnfSxcblx0d2Vla1BpY2tlcjoge3R5cGU6ICd3ZWVrJywgZXZlbnQ6ICdjaGFuZ2UnfSxcblx0dGltZVBpY2tlcjoge3R5cGU6ICd0aW1lJywgZXZlbnQ6ICdjaGFuZ2UnfVxuICAgIH1cbiAgICBcblxuICAgIGZvciAodmFyIG5hbWUgaW4gYmFzaWNJbnB1dHMpIHtcblx0aWYgKGJhc2ljSW5wdXRzLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG5cdCAgICAoZnVuY3Rpb24gKG5hbWUpIHtcblx0XHRvYmpbbmFtZV0gPSBmdW5jdGlvbiAodmFsdWUsIGF0dHJzKSB7XG5cdFx0ICAgIGF0dHJzID0gYXR0cnMgfHwge307XG5cdFx0ICAgIGF0dHJzWyd0eXBlJ10gPSBiYXNpY0lucHV0c1tuYW1lXS50eXBlO1xuXHRcdCAgICBhdHRyc1sndmFsdWUnXSA9IHZhbHVlO1xuXHRcdCAgICBcblx0XHQgICAgcmV0dXJuIG9uKFwiaW5wdXRcIiwgW2Jhc2ljSW5wdXRzW25hbWVdLmV2ZW50XSwgYXR0cnMsIGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRyZXR1cm4gZXYgPyBldi50YXJnZXQudmFsdWUgOiB2YWx1ZTtcblx0XHQgICAgfSk7XG5cdFx0fVxuXHQgICAgfSkobmFtZSk7XG5cdH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHRleHRhcmVhKHZhbHVlLCBhdHRycykge1xuICAgIGF0dHJzID0gYXR0cnMgfHwge307XG4gICAgXG4gICAgcmV0dXJuIG9uKFwidGV4dGFyZWFcIiwgW1wia2V5dXBcIiwgXCJibHVyXCJdLCBhdHRycywgZnVuY3Rpb24oZXYpIHtcblx0dmFyIG5ld1ZhbHVlID0gZXYgPyBldi50YXJnZXQudmFsdWUgOiB2YWx1ZTtcblx0dGV4dCh2YWx1ZSk7XG5cdHJldHVybiBuZXdWYWx1ZTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gdGV4dEJveCh2YWx1ZSwgYXR0cnMpIHtcbiAgICBhdHRycyA9IGF0dHJzIHx8IHt9O1xuICAgIGF0dHJzLnR5cGUgPSAndGV4dCc7XG4gICAgYXR0cnMudmFsdWUgPSB2YWx1ZTtcbiAgICBhdHRycy5leHRyYSA9IGZ1bmN0aW9uIChlbHQpIHtcbiAgICBcdGVsdC52YWx1ZSA9IHZhbHVlO1xuICAgIH07XG4gICAgXG4gICAgXG4gICAgcmV0dXJuIG9uKFwiaW5wdXRcIiwgW1wiaW5wdXRcIl0sIGF0dHJzLCBmdW5jdGlvbihldikge1xuXHRyZXR1cm4gZXYgPyBldi50YXJnZXQudmFsdWUgOiB2YWx1ZTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gY2hlY2tCb3godmFsdWUsIGF0dHJzKSB7XG4gICAgYXR0cnMgPSBhdHRycyB8fCB7fTtcbiAgICBhdHRycy50eXBlID0gXCJjaGVja2JveFwiO1xuICAgIGlmICh2YWx1ZSkge1xuXHRhdHRycy5jaGVja2VkID0gXCJ0cnVlXCI7XG4gICAgfVxuICAgIGF0dHJzLmV4dHJhID0gZnVuY3Rpb24gKGVsdCkge1xuXHRlbHQuY2hlY2tlZCA9IHZhbHVlO1xuICAgIH07XG4gICAgXG4gICAgcmV0dXJuIG9uKFwiaW5wdXRcIiwgW1wiY2xpY2tcIl0sIGF0dHJzLCBmdW5jdGlvbihldikge1xuXHRyZXR1cm4gZXYgPyBldi50YXJnZXQuY2hlY2tlZCA6IHZhbHVlO1xuICAgIH0pO1xufVxuXG5cbmZ1bmN0aW9uIGFmdGVyKGlkLCBkZWxheSkge1xuICAgIGlmIChHVUkudGltZXJzLmhhc093blByb3BlcnR5KGlkKSkge1xuXHRpZiAoR1VJLnRpbWVyc1tpZF0pIHtcblx0ICAgIHJldHVybiB0cnVlO1xuXHR9XG5cdHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZWxzZSB7XG5cdEdVSS50aW1lcnNbaWRdID0gZmFsc2U7XG5cdHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHQgICAgR1VJLnRpbWVyc1tpZF0gPSB0cnVlO1xuXHQgICAgZG9SZW5kZXIoKTtcblx0fSwgZGVsYXkpO1xuICAgIH1cbn1cblxuXG5mdW5jdGlvbiBidXR0b24obGFiZWwsIGF0dHJzKSB7XG4gICAgcmV0dXJuIG9uKFwiYnV0dG9uXCIsIFtcImNsaWNrXCJdLCBhdHRycywgZnVuY3Rpb24oZXYpIHtcblx0dGV4dChsYWJlbCk7XG5cdHJldHVybiBldiAhPT0gdW5kZWZpbmVkO1xuICAgIH0pO1xufVxuXG5cbmZ1bmN0aW9uIHNlbGVjdCh2YWx1ZSwgeCwgeSwgeikge1xuICAgIC8vaWRDbGFzcywgYXR0cnMsIGJsb2NrXG5cbiAgICBmdW5jdGlvbiBvcHRpb24ob3B0VmFsdWUsIGxhYmVsKSB7XG5cdHZhciBhdHRycyA9IHt2YWx1ZTogb3B0VmFsdWV9O1xuXHRpZiAob3B0VmFsdWUgPT09IHZhbHVlKSB7XG5cdCAgICBhdHRyc1snc2VsZWN0ZWQnXSA9IHRydWU7XG5cdH1cblx0bGFiZWwgPSBsYWJlbCB8fCBvcHRWYWx1ZTtcblx0cmV0dXJuIHdpdGhFbGVtZW50KFwib3B0aW9uXCIsIGF0dHJzLCBmdW5jdGlvbiAoKSB7XG5cdCAgICB0ZXh0KGxhYmVsKTtcblx0fSk7XG4gICAgfVxuICAgIFxuICAgIHZhciBibG9jayA9IGV4dHJhY3RCbG9jayhhcmd1bWVudHMpO1xuICAgIHJldHVybiBvbihcInNlbGVjdFwiLCBbXCJjaGFuZ2VcIl0sIGRlZmF1bHRBdHRycyh4LCB5LCB6KSwgZnVuY3Rpb24oZXYpIHtcblx0YmxvY2sob3B0aW9uKTtcblx0cmV0dXJuIGV2ICBcblx0ICAgID8gZXYudGFyZ2V0Lm9wdGlvbnNbZXYudGFyZ2V0LnNlbGVjdGVkSW5kZXhdLnZhbHVlXG5cdCAgICA6IHZhbHVlO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiByYWRpb0dyb3VwKHZhbHVlLCAgeCwgeSwgeikge1xuICAgIHZhciByZXN1bHQgPSB2YWx1ZTtcbiAgICB2YXIgbmFtZSA9ICduYW1lJyArIChHVUkuaWRzKyspO1xuICAgIGZ1bmN0aW9uIHJhZGlvKHJhZGlvVmFsdWUsIGxhYmVsKSB7XG5cdHZhciBhdHRycyA9IHt0eXBlOiBcInJhZGlvXCIsIG5hbWU6IG5hbWV9O1xuXHRpZiAocmFkaW9WYWx1ZSA9PT0gdmFsdWUpIHtcblx0ICAgIGF0dHJzWydjaGVja2VkJ10gPSB0cnVlO1xuXHR9XG5cdGF0dHJzLmV4dHJhID0gZnVuY3Rpb24gKGVsdCkge1xuXHQgICAgZWx0LmNoZWNrZWQgPSAocmFkaW9WYWx1ZSA9PT0gdmFsdWUpO1xuXHR9O1xuXHRyZXR1cm4gb24oXCJsYWJlbFwiLCBbXSwge30sIGZ1bmN0aW9uICgpIHtcblx0ICAgIG9uKFwiaW5wdXRcIiwgW1wiY2xpY2tcIl0sIGF0dHJzLCBmdW5jdGlvbiAoZXYpIHtcblx0XHRpZiAoZXYpIHtcblx0XHQgICAgcmVzdWx0ID0gcmFkaW9WYWx1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIHJhZGlvVmFsdWU7XG5cdCAgICB9KVxuXHQgICAgdGV4dChsYWJlbCB8fCByYWRpb1ZhbHVlKTtcblx0ICAgIHJldHVybiByYWRpb1ZhbHVlO1xuXHR9KTtcbiAgICB9XG5cbiAgICB2YXIgYmxvY2sgPSBleHRyYWN0QmxvY2soYXJndW1lbnRzKTtcbiAgICBibG9jayhyYWRpbyk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gbGFiZWwodHh0KSB7XG4gICAgLy8gRklYTUU6IHRoaXMgaXMgZXh0cmVtZWx5IGJyaXR0bGUuXG4gICAgdmFyIGlkID0gXCJpZFwiICsgKEdVSS5pZHMgKyAxKTsgLy8gTkI6IG5vdCArKyAhIVxuICAgIHJldHVybiB3aXRoRWxlbWVudChcImxhYmVsXCIsIHtcImZvclwiOiBpZH0sIGZ1bmN0aW9uICgpIHtcblx0IHRleHQodHh0KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gdGV4dCh0eHQpIHtcbiAgICBHVUkuZm9jdXMucHVzaCh0eHQpO1xufVxuXG5mdW5jdGlvbiBicigpIHtcbiAgICB3aXRoRWxlbWVudChcImJyXCIsIHt9LCBmdW5jdGlvbigpIHt9KTtcbn1cblxuLy8gQmxvY2sgbGV2ZWwgZWxlbWVudHNcblxuXG5mdW5jdGlvbiBkZWZhdWx0QXR0cnMoeCwgeSwgeikge1xuICAgIFxuICAgIGlmICh0eXBlb2YgeCA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdHJldHVybiB7fTtcbiAgICB9XG5cbiAgICB2YXIgYXR0cnMgPSB7fTtcbiAgICB2YXIgaWRDbGFzcztcbiAgICBpZiAodHlwZW9mIHggPT09IFwic3RyaW5nXCIpIHtcblx0aWRDbGFzcyA9IHg7XG5cdGlmICh0eXBlb2YgeSA9PSBcIm9iamVjdFwiKSB7XG5cdCAgICBhdHRycyA9IHk7XG5cdH1cbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIHggPT09IFwib2JqZWN0XCIpIHtcblx0YXR0cnMgPSB4O1xuICAgIH1cblxuICAgIGlmICghaWRDbGFzcykge1xuXHRyZXR1cm4gYXR0cnM7XG4gICAgfVxuICAgIFxuICAgIHZhciBoYXNoID0gaWRDbGFzcy5pbmRleE9mKFwiI1wiKTtcbiAgICB2YXIgZG90ID0gaWRDbGFzcy5pbmRleE9mKFwiLlwiKTtcbiAgICBpZiAoZG90ID4gLTEpIHtcblx0YXR0cnNbJ2NsYXNzJ10gPSBpZENsYXNzLnNsaWNlKGRvdCArIDEsIGhhc2ggPiAtMSA/IGhhc2ggOiBpZENsYXNzLmxlbmd0aCk7XG4gICAgfVxuICAgIGlmIChoYXNoID4gLTEpIHtcblx0YXR0cnNbJ2lkJ10gPSBpZENsYXNzLnNsaWNlKGhhc2ggKyAxKTtcbiAgICB9XG4gICAgcmV0dXJuIGF0dHJzO1xufVxuXG5mdW5jdGlvbiBhZGRJbmxpbmVFbGVtZW50cyhvYmopIHtcbiAgICB2YXIgZWx0cyA9IFtcImFcIiwgXCJwXCIsIFwic3BhblwiLCBcImgxXCIsIFwiaDJcIiwgXCJoM1wiLCBcImg0XCJdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWx0cy5sZW5ndGg7IGkrKykge1xuXHRvYmpbZWx0c1tpXV0gPSBmdW5jdGlvbiAoZWx0KSB7XG5cdCAgICByZXR1cm4gZnVuY3Rpb24gKHR4dCwgaWRDbGFzcywgYXR0cnMpIHtcblx0XHR3aXRoRWxlbWVudChlbHQsIGRlZmF1bHRBdHRycyhpZENsYXNzLCBhdHRycyksIGZ1bmN0aW9uKCkge1xuXHRcdCAgICB0ZXh0KHR4dCk7XG5cdFx0fSk7XG5cdCAgICB9XG5cdH0oZWx0c1tpXSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBleHRyYWN0QmxvY2soYXJncykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuXHRpZiAoKHR5cGVvZiBhcmdzW2ldKSA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdCAgICByZXR1cm4gYXJnc1tpXTtcblx0fVxuICAgIH1cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7fTtcbn1cblxuZnVuY3Rpb24gYWRkQmxvY2tFbGVtZW50cyhvYmopIHtcbiAgICB2YXIgZWx0cyA9IFtcInNlY3Rpb25cIiwgXCJkaXZcIiwgXCJ1bFwiLCBcIm9sXCIsIFwibGlcIiwgXCJoZWFkZXJcIiwgXCJmb290ZXJcIiwgXCJjb2RlXCIsIFwicHJlXCIsXG5cdFx0XCJkbFwiLCBcImR0XCIsIFwiZGRcIiwgXCJmaWVsZHNldFwiLCBcInRhYmxlXCIsIFwidGRcIiwgXCJ0clwiLCBcInRoXCIsIFwiY29sXCIsIFwidGhlYWRcIl07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbHRzLmxlbmd0aDsgaSsrKSB7XG5cdG9ialtlbHRzW2ldXSA9IGZ1bmN0aW9uIChlbHQpIHtcblx0ICAgIHJldHVybiBmdW5jdGlvbiAoeCwgeSwgeikge1xuXHRcdHZhciBibG9jayA9IGZ1bmN0aW9uKCkge307XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHQgICAgaWYgKCh0eXBlb2YgYXJndW1lbnRzW2ldKSA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRibG9jayA9IGFyZ3VtZW50c1tpXTtcblx0XHQgICAgfVxuXHRcdH1cblx0XHRyZXR1cm4gd2l0aEVsZW1lbnQoZWx0LCBkZWZhdWx0QXR0cnMoeCwgeSwgeiksIGV4dHJhY3RCbG9jayhhcmd1bWVudHMpKTtcblx0ICAgIH1cblx0fShlbHRzW2ldKTtcbiAgICB9XG59XG5cblxuZnVuY3Rpb24gaW5zdGFsbChvYmopIHtcbiAgICBmb3IgKHZhciBrIGluIHRoaXMpIHtcblx0aWYgKHRoaXMuaGFzT3duUHJvcGVydHkoaykpIHtcblx0ICAgIG9ialtrXSA9IHRoaXNba107XG5cdH1cbiAgICB9XG59XG5cblxudmFyIGxpYmltZ3VpID0ge1xuICAgIHNldHVwOiBzZXR1cCxcbiAgICBpbml0OiBpbml0LFxuICAgIGNvbXBvbmVudDogY29tcG9uZW50LFxuICAgIGNsb25lOiBjbG9uZSxcbiAgICB0ZXh0YXJlYTogdGV4dGFyZWEsXG4gICAgc2VsZWN0OiBzZWxlY3QsXG4gICAgcmFkaW9Hcm91cDogcmFkaW9Hcm91cCxcbiAgICB0ZXh0OiB0ZXh0LFxuICAgIGxhYmVsOiBsYWJlbCxcbiAgICBjaGVja0JveDogY2hlY2tCb3gsXG4gICAgdGV4dEJveDogdGV4dEJveCxcbiAgICBidXR0b246IGJ1dHRvbixcbiAgICBoZXJlOiBoZXJlLFxuICAgIGFmdGVyOiBhZnRlcixcbiAgICBvbjogb24sXG4gICAgYnI6IGJyLFxuICAgIGRlYWxXaXRoSXQ6IGRlYWxXaXRoSXQsXG4gICAgY2FsbFN0YWNrOiBjYWxsU3RhY2ssXG4gICAgbWVtbzogbWVtbyxcbiAgICBuYW1lZDogbmFtZWQsXG4gICAgaW5zdGFsbDogaW5zdGFsbFxufTtcblxuYWRkQmxvY2tFbGVtZW50cyhsaWJpbWd1aSk7XG5hZGRJbmxpbmVFbGVtZW50cyhsaWJpbWd1aSk7XG5hZGRJbnB1dEVsZW1lbnRzKGxpYmltZ3VpKTtcblxubW9kdWxlLmV4cG9ydHMgPSBsaWJpbWd1aTtcblxuIiwiLypcbiAqIGp3ZXJ0eSAtIEF3ZXNvbWUgaGFuZGxpbmcgb2Yga2V5Ym9hcmQgZXZlbnRzXG4gKlxuICogandlcnR5IGlzIGEgSlMgbGliIHdoaWNoIGFsbG93cyB5b3UgdG8gYmluZCwgZmlyZSBhbmQgYXNzZXJ0IGtleSBjb21iaW5hdGlvblxuICogc3RyaW5ncyBhZ2FpbnN0IGVsZW1lbnRzIGFuZCBldmVudHMuIEl0IG5vcm1hbGlzZXMgdGhlIHBvb3Igc3RkIGFwaSBpbnRvXG4gKiBzb21ldGhpbmcgZWFzeSB0byB1c2UgYW5kIGNsZWFyLlxuICpcbiAqIFRoaXMgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgTUlUXG4gKiBGb3IgdGhlIGZ1bGwgbGljZW5zZSBzZWU6IGh0dHA6Ly9rZWl0aGFtdXMubWl0LWxpY2Vuc2Uub3JnL1xuICogRm9yIG1vcmUgaW5mb3JtYXRpb24gc2VlOiBodHRwOi8va2VpdGhhbXVzLmdpdGh1Yi5jb20vandlcnR5XG4gKlxuICogQGF1dGhvciBLZWl0aCBDaXJrZWwgKCdrZWl0aGFtdXMnKSA8andlcnR5QGtlaXRoY2lya2VsLmNvLnVrPlxuICogQGxpY2Vuc2UgaHR0cDovL2tlaXRoYW11cy5taXQtbGljZW5zZS5vcmcvXG4gKiBAY29weXJpZ2h0IENvcHlyaWdodCDCqSAyMDExLCBLZWl0aCBDaXJrZWxcbiAqXG4gKi9cbihmdW5jdGlvbiAoZ2xvYmFsLCBleHBvcnRzKSB7XG4gICAgXG4gICAgLy8gSGVscGVyIG1ldGhvZHMgJiB2YXJzOlxuICAgIHZhciAkZCA9IGdsb2JhbC5kb2N1bWVudFxuICAgICwgICAkID0gKGdsb2JhbC5qUXVlcnkgfHwgZ2xvYmFsLlplcHRvIHx8IGdsb2JhbC5lbmRlciB8fCAkZClcbiAgICAsICAgJCRcbiAgICAsICAgJGJcbiAgICAsICAga2UgPSAna2V5ZG93bic7XG4gICAgXG4gICAgZnVuY3Rpb24gcmVhbFR5cGVPZih2LCBzKSB7XG4gICAgICAgIHJldHVybiAodiA9PT0gbnVsbCkgPyBzID09PSAnbnVsbCdcbiAgICAgICAgOiAodiA9PT0gdW5kZWZpbmVkKSA/IHMgPT09ICd1bmRlZmluZWQnXG4gICAgICAgIDogKHYuaXMgJiYgdiBpbnN0YW5jZW9mICQpID8gcyA9PT0gJ2VsZW1lbnQnXG4gICAgICAgIDogT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHYpLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihzKSA+IDc7XG4gICAgfVxuICAgIFxuICAgIGlmICgkID09PSAkZCkge1xuICAgICAgICAkJCA9IGZ1bmN0aW9uIChzZWxlY3RvciwgY29udGV4dCkge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGVjdG9yID8gJC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yLCBjb250ZXh0IHx8ICQpIDogJDtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgICRiID0gZnVuY3Rpb24gKGUsIGZuKSB7IGUuYWRkRXZlbnRMaXN0ZW5lcihrZSwgZm4sIGZhbHNlKTsgfTtcbiAgICAgICAgJGYgPSBmdW5jdGlvbiAoZSwgandlcnR5RXYpIHtcbiAgICAgICAgICAgIHZhciByZXQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKVxuICAgICAgICAgICAgLCAgIGk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldC5pbml0RXZlbnQoa2UsIHRydWUsIHRydWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKGkgaW4gandlcnR5RXYpIHJldFtpXSA9IGp3ZXJ0eUV2W2ldO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gKGUgfHwgJCkuZGlzcGF0Y2hFdmVudChyZXQpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgJCQgPSBmdW5jdGlvbiAoc2VsZWN0b3IsIGNvbnRleHQsIGZuKSB7IHJldHVybiAkKHNlbGVjdG9yIHx8ICRkLCBjb250ZXh0KTsgfTtcbiAgICAgICAgJGIgPSBmdW5jdGlvbiAoZSwgZm4pIHsgJChlKS5iaW5kKGtlICsgJy5qd2VydHknLCBmbik7IH07XG4gICAgICAgICRmID0gZnVuY3Rpb24gKGUsIG9iKSB7ICQoZSB8fCAkZCkudHJpZ2dlcigkLkV2ZW50KGtlLCBvYikpOyB9O1xuICAgIH1cbiAgICBcbiAgICAvLyBQcml2YXRlXG4gICAgdmFyIF9tb2RQcm9wcyA9IHsgMTY6ICdzaGlmdEtleScsIDE3OiAnY3RybEtleScsIDE4OiAnYWx0S2V5JywgOTE6ICdtZXRhS2V5JyB9O1xuICAgIFxuICAgIC8vIEdlbmVyYXRlIGtleSBtYXBwaW5ncyBmb3IgY29tbW9uIGtleXMgdGhhdCBhcmUgbm90IHByaW50YWJsZS5cbiAgICB2YXIgX2tleXMgPSB7XG4gICAgICAgIFxuICAgICAgICAvLyBNT0QgYWthIHRvZ2dsZWFibGUga2V5c1xuICAgICAgICBtb2RzOiB7XG4gICAgICAgICAgICAvLyBTaGlmdCBrZXksIOKHp1xuICAgICAgICAgICAgJ+KHpyc6IDE2LCBzaGlmdDogMTYsXG4gICAgICAgICAgICAvLyBDVFJMIGtleSwgb24gTWFjOiDijINcbiAgICAgICAgICAgICfijIMnOiAxNywgY3RybDogMTcsXG4gICAgICAgICAgICAvLyBBTFQga2V5LCBvbiBNYWM6IOKMpSAoQWx0KVxuICAgICAgICAgICAgJ+KMpSc6IDE4LCBhbHQ6IDE4LCBvcHRpb246IDE4LFxuICAgICAgICAgICAgLy8gTUVUQSwgb24gTWFjOiDijJggKENNRCksIG9uIFdpbmRvd3MgKFdpbiksIG9uIExpbnV4IChTdXBlcilcbiAgICAgICAgICAgICfijJgnOiA5MSwgbWV0YTogOTEsIGNtZDogOTEsICdzdXBlcic6IDkxLCB3aW46IDkxXG4gICAgICAgIH0sXG4gICAgICAgIFxuICAgICAgICAvLyBOb3JtYWwga2V5c1xuICAgICAgICBrZXlzOiB7XG4gICAgICAgICAgICAvLyBCYWNrc3BhY2Uga2V5LCBvbiBNYWM6IOKMqyAoQmFja3NwYWNlKVxuICAgICAgICAgICAgJ+KMqyc6IDgsIGJhY2tzcGFjZTogOCxcbiAgICAgICAgICAgIC8vIFRhYiBLZXksIG9uIE1hYzog4oelIChUYWIpLCBvbiBXaW5kb3dzIOKHpeKHpVxuICAgICAgICAgICAgJ+KHpSc6IDksICfih4YnOiA5LCB0YWI6IDksXG4gICAgICAgICAgICAvLyBSZXR1cm4ga2V5LCDihqlcbiAgICAgICAgICAgICfihqknOiAxMywgJ3JldHVybic6IDEzLCBlbnRlcjogMTMsICfijIUnOiAxMyxcbiAgICAgICAgICAgIC8vIFBhdXNlL0JyZWFrIGtleVxuICAgICAgICAgICAgJ3BhdXNlJzogMTksICdwYXVzZS1icmVhayc6IDE5LFxuICAgICAgICAgICAgLy8gQ2FwcyBMb2NrIGtleSwg4oeqXG4gICAgICAgICAgICAn4oeqJzogMjAsIGNhcHM6IDIwLCAnY2Fwcy1sb2NrJzogMjAsXG4gICAgICAgICAgICAvLyBFc2NhcGUga2V5LCBvbiBNYWM6IOKOiywgb24gV2luZG93czogRXNjXG4gICAgICAgICAgICAn4o6LJzogMjcsIGVzY2FwZTogMjcsIGVzYzogMjcsXG4gICAgICAgICAgICAvLyBTcGFjZSBrZXlcbiAgICAgICAgICAgIHNwYWNlOiAzMixcbiAgICAgICAgICAgIC8vIFBhZ2UtVXAga2V5LCBvciBwZ3VwLCBvbiBNYWM6IOKGllxuICAgICAgICAgICAgJ+KGlic6IDMzLCBwZ3VwOiAzMywgJ3BhZ2UtdXAnOiAzMyxcbiAgICAgICAgICAgIC8vIFBhZ2UtRG93biBrZXksIG9yIHBnZG93biwgb24gTWFjOiDihphcbiAgICAgICAgICAgICfihpgnOiAzNCwgcGdkb3duOiAzNCwgJ3BhZ2UtZG93bic6IDM0LFxuICAgICAgICAgICAgLy8gRU5EIGtleSwgb24gTWFjOiDih59cbiAgICAgICAgICAgICfih58nOiAzNSwgZW5kOiAzNSxcbiAgICAgICAgICAgIC8vIEhPTUUga2V5LCBvbiBNYWM6IOKHnlxuICAgICAgICAgICAgJ+KHnic6IDM2LCBob21lOiAzNixcbiAgICAgICAgICAgIC8vIEluc2VydCBrZXksIG9yIGluc1xuICAgICAgICAgICAgaW5zOiA0NSwgaW5zZXJ0OiA0NSxcbiAgICAgICAgICAgIC8vIERlbGV0ZSBrZXksIG9uIE1hYzog4oyrIChEZWxldGUpXG4gICAgICAgICAgICBkZWw6IDQ2LCAnZGVsZXRlJzogNDYsXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIExlZnQgQXJyb3cgS2V5LCBvciDihpBcbiAgICAgICAgICAgICfihpAnOiAzNywgbGVmdDogMzcsICdhcnJvdy1sZWZ0JzogMzcsXG4gICAgICAgICAgICAvLyBVcCBBcnJvdyBLZXksIG9yIOKGkVxuICAgICAgICAgICAgJ+KGkSc6IDM4LCB1cDogMzgsICdhcnJvdy11cCc6IDM4LFxuICAgICAgICAgICAgLy8gUmlnaHQgQXJyb3cgS2V5LCBvciDihpJcbiAgICAgICAgICAgICfihpInOiAzOSwgcmlnaHQ6IDM5LCAnYXJyb3ctcmlnaHQnOiAzOSxcbiAgICAgICAgICAgIC8vIFVwIEFycm93IEtleSwgb3Ig4oaTXG4gICAgICAgICAgICAn4oaTJzogNDAsIGRvd246IDQwLCAnYXJyb3ctZG93bic6IDQwLFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBvZGl0aWVzLCBwcmludGluZyBjaGFyYWN0ZXJzIHRoYXQgY29tZSBvdXQgd3Jvbmc6XG4gICAgICAgICAgICAvLyBOdW0tTXVsdGlwbHksIG9yICpcbiAgICAgICAgICAgICcqJzogMTA2LCBzdGFyOiAxMDYsIGFzdGVyaXNrOiAxMDYsIG11bHRpcGx5OiAxMDYsXG4gICAgICAgICAgICAvLyBOdW0tUGx1cyBvciArXG4gICAgICAgICAgICAnKyc6IDEwNywgJ3BsdXMnOiAxMDcsXG4gICAgICAgICAgICAvLyBOdW0tU3VidHJhY3QsIG9yIC1cbiAgICAgICAgICAgICctJzogMTA5LCBzdWJ0cmFjdDogMTA5LFxuICAgICAgICAgICAgLy8gU2VtaWNvbG9uXG4gICAgICAgICAgICAnOyc6IDE4Niwgc2VtaWNvbG9uOjE4NixcbiAgICAgICAgICAgIC8vID0gb3IgZXF1YWxzXG4gICAgICAgICAgICAnPSc6IDE4NywgJ2VxdWFscyc6IDE4NyxcbiAgICAgICAgICAgIC8vIENvbW1hLCBvciAsXG4gICAgICAgICAgICAnLCc6IDE4OCwgY29tbWE6IDE4OCxcbiAgICAgICAgICAgIC8vJy0nOiAxODksIC8vPz8/XG4gICAgICAgICAgICAvLyBQZXJpb2QsIG9yIC4sIG9yIGZ1bGwtc3RvcFxuICAgICAgICAgICAgJy4nOiAxOTAsIHBlcmlvZDogMTkwLCAnZnVsbC1zdG9wJzogMTkwLFxuICAgICAgICAgICAgLy8gU2xhc2gsIG9yIC8sIG9yIGZvcndhcmQtc2xhc2hcbiAgICAgICAgICAgICcvJzogMTkxLCBzbGFzaDogMTkxLCAnZm9yd2FyZC1zbGFzaCc6IDE5MSxcbiAgICAgICAgICAgIC8vIFRpY2ssIG9yIGAsIG9yIGJhY2stcXVvdGUgXG4gICAgICAgICAgICAnYCc6IDE5MiwgdGljazogMTkyLCAnYmFjay1xdW90ZSc6IDE5MixcbiAgICAgICAgICAgIC8vIE9wZW4gYnJhY2tldCwgb3IgW1xuICAgICAgICAgICAgJ1snOiAyMTksICdvcGVuLWJyYWNrZXQnOiAyMTksXG4gICAgICAgICAgICAvLyBCYWNrIHNsYXNoLCBvciBcXFxuICAgICAgICAgICAgJ1xcXFwnOiAyMjAsICdiYWNrLXNsYXNoJzogMjIwLFxuICAgICAgICAgICAgLy8gQ2xvc2UgYmFja2V0LCBvciBdXG4gICAgICAgICAgICAnXSc6IDIyMSwgJ2Nsb3NlLWJyYWNrZXQnOiAyMjEsXG4gICAgICAgICAgICAvLyBBcG9zdHJhcGhlLCBvciBRdW90ZSwgb3IgJ1xuICAgICAgICAgICAgJ1xcJyc6IDIyMiwgcXVvdGU6IDIyMiwgYXBvc3RyYXBoZTogMjIyXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgfTtcbiAgICBcbiAgICAvLyBUbyBtaW5pbWlzZSBjb2RlIGJsb2F0LCBhZGQgYWxsIG9mIHRoZSBOVU1QQUQgMC05IGtleXMgaW4gYSBsb29wXG4gICAgaSA9IDk1LCBuID0gMDtcbiAgICB3aGlsZSgrK2kgPCAxMDYpIHtcbiAgICAgICAgX2tleXMua2V5c1snbnVtLScgKyBuXSA9IGk7XG4gICAgICAgICsrbjtcbiAgICB9XG4gICAgXG4gICAgLy8gVG8gbWluaW1pc2UgY29kZSBibG9hdCwgYWRkIGFsbCBvZiB0aGUgdG9wIHJvdyAwLTkga2V5cyBpbiBhIGxvb3BcbiAgICBpID0gNDcsIG4gPSAwO1xuICAgIHdoaWxlKCsraSA8IDU4KSB7XG4gICAgICAgIF9rZXlzLmtleXNbbl0gPSBpO1xuICAgICAgICArK247XG4gICAgfVxuICAgIFxuICAgIC8vIFRvIG1pbmltaXNlIGNvZGUgYmxvYXQsIGFkZCBhbGwgb2YgdGhlIEYxLUYyNSBrZXlzIGluIGEgbG9vcFxuICAgIGkgPSAxMTEsIG4gPSAxO1xuICAgIHdoaWxlKCsraSA8IDEzNikge1xuICAgICAgICBfa2V5cy5rZXlzWydmJyArIG5dID0gaTtcbiAgICAgICAgKytuO1xuICAgIH1cbiAgICBcbiAgICAvLyBUbyBtaW5pbWlzZSBjb2RlIGJsb2F0LCBhZGQgYWxsIG9mIHRoZSBsZXR0ZXJzIG9mIHRoZSBhbHBoYWJldCBpbiBhIGxvb3BcbiAgICB2YXIgaSA9IDY0O1xuICAgIHdoaWxlKCsraSA8IDkxKSB7XG4gICAgICAgIF9rZXlzLmtleXNbU3RyaW5nLmZyb21DaGFyQ29kZShpKS50b0xvd2VyQ2FzZSgpXSA9IGk7XG4gICAgfVxuICAgIFxuICAgIGZ1bmN0aW9uIEp3ZXJ0eUNvZGUoandlcnR5Q29kZSkge1xuICAgICAgICB2YXIgaVxuICAgICAgICAsICAgY1xuICAgICAgICAsICAgblxuICAgICAgICAsICAgelxuICAgICAgICAsICAga2V5Q29tYm9cbiAgICAgICAgLCAgIG9wdGlvbmFsc1xuICAgICAgICAsICAgandlcnR5Q29kZUZyYWdtZW50XG4gICAgICAgICwgICByYW5nZU1hdGNoZXNcbiAgICAgICAgLCAgIHJhbmdlSTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluLWNhc2Ugd2UgZ2V0IGNhbGxlZCB3aXRoIGFuIGluc3RhbmNlIG9mIG91cnNlbHZlcywganVzdCByZXR1cm4gdGhhdC5cbiAgICAgICAgaWYgKGp3ZXJ0eUNvZGUgaW5zdGFuY2VvZiBKd2VydHlDb2RlKSByZXR1cm4gandlcnR5Q29kZTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIGp3ZXJ0eUNvZGUgaXNuJ3QgYW4gYXJyYXksIGNhc3QgaXQgYXMgYSBzdHJpbmcgYW5kIHNwbGl0IGludG8gYXJyYXkuXG4gICAgICAgIGlmICghcmVhbFR5cGVPZihqd2VydHlDb2RlLCAnYXJyYXknKSkge1xuICAgICAgICAgICAgandlcnR5Q29kZSA9IChTdHJpbmcoandlcnR5Q29kZSkpLnJlcGxhY2UoL1xccy9nLCAnJykudG9Mb3dlckNhc2UoKS5cbiAgICAgICAgICAgICAgICBtYXRjaCgvKD86XFwrLHxbXixdKSsvZyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIExvb3AgdGhyb3VnaCBlYWNoIGtleSBzZXF1ZW5jZSBpbiBqd2VydHlDb2RlXG4gICAgICAgIGZvciAoaSA9IDAsIGMgPSBqd2VydHlDb2RlLmxlbmd0aDsgaSA8IGM7ICsraSkge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJZiB0aGUga2V5IGNvbWJvIGF0IHRoaXMgcGFydCBvZiB0aGUgc2VxdWVuY2UgaXNuJ3QgYW4gYXJyYXksXG4gICAgICAgICAgICAvLyBjYXN0IGFzIGEgc3RyaW5nIGFuZCBzcGxpdCBpbnRvIGFuIGFycmF5LlxuICAgICAgICAgICAgaWYgKCFyZWFsVHlwZU9mKGp3ZXJ0eUNvZGVbaV0sICdhcnJheScpKSB7XG4gICAgICAgICAgICAgICAgandlcnR5Q29kZVtpXSA9IFN0cmluZyhqd2VydHlDb2RlW2ldKVxuICAgICAgICAgICAgICAgICAgICAubWF0Y2goLyg/OlxcK1xcL3xbXlxcL10pKy9nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUGFyc2UgdGhlIGtleSBvcHRpb25hbHMgaW4gdGhpcyBzZXF1ZW5jZVxuICAgICAgICAgICAgb3B0aW9uYWxzID0gW10sIG4gPSBqd2VydHlDb2RlW2ldLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlIChuLS0pIHtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBCZWdpbiBjcmVhdGluZyB0aGUgb2JqZWN0IGZvciB0aGlzIGtleSBjb21ib1xuICAgICAgICAgICAgICAgIHZhciBqd2VydHlDb2RlRnJhZ21lbnQgPSBqd2VydHlDb2RlW2ldW25dO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGtleUNvbWJvID0ge1xuICAgICAgICAgICAgICAgICAgICBqd2VydHlDb21ibzogU3RyaW5nKGp3ZXJ0eUNvZGVGcmFnbWVudCksXG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0S2V5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgY3RybEtleTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGFsdEtleTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG1ldGFLZXk6IGZhbHNlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIElmIGp3ZXJ0eUNvZGVGcmFnbWVudCBpc24ndCBhbiBhcnJheSB0aGVuIGNhc3QgYXMgYSBzdHJpbmdcbiAgICAgICAgICAgICAgICAvLyBhbmQgc3BsaXQgaXQgaW50byBvbmUuXG4gICAgICAgICAgICAgICAgaWYgKCFyZWFsVHlwZU9mKGp3ZXJ0eUNvZGVGcmFnbWVudCwgJ2FycmF5JykpIHtcbiAgICAgICAgICAgICAgICAgICAgandlcnR5Q29kZUZyYWdtZW50ID0gU3RyaW5nKGp3ZXJ0eUNvZGVGcmFnbWVudCkudG9Mb3dlckNhc2UoKVxuICAgICAgICAgICAgICAgICAgICAgICAgLm1hdGNoKC8oPzooPzpbXlxcK10pK3xcXCtcXCt8XlxcKyQpL2cpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB6ID0gandlcnR5Q29kZUZyYWdtZW50Lmxlbmd0aDtcbiAgICAgICAgICAgICAgICB3aGlsZSAoei0tKSB7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBOb3JtYWxpc2UgbWF0Y2hpbmcgZXJyb3JzXG4gICAgICAgICAgICAgICAgICAgIGlmIChqd2VydHlDb2RlRnJhZ21lbnRbel0gPT09ICcrKycpIGp3ZXJ0eUNvZGVGcmFnbWVudFt6XSA9ICcrJztcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEluamVjdCBlaXRoZXIga2V5Q29kZSBvciBjdHJsL21ldGEvc2hpZnQvYWx0S2V5IGludG8ga2V5Q29tYm9cbiAgICAgICAgICAgICAgICAgICAgaWYgKGp3ZXJ0eUNvZGVGcmFnbWVudFt6XSBpbiBfa2V5cy5tb2RzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlDb21ib1tfbW9kUHJvcHNbX2tleXMubW9kc1tqd2VydHlDb2RlRnJhZ21lbnRbel1dXV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYoandlcnR5Q29kZUZyYWdtZW50W3pdIGluIF9rZXlzLmtleXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleUNvbWJvLmtleUNvZGUgPSBfa2V5cy5rZXlzW2p3ZXJ0eUNvZGVGcmFnbWVudFt6XV07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZU1hdGNoZXMgPSBqd2VydHlDb2RlRnJhZ21lbnRbel0ubWF0Y2goL15cXFsoW14tXStcXC0/W14tXSopLShbXi1dK1xcLT9bXi1dKilcXF0kLyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHJlYWxUeXBlT2Yoa2V5Q29tYm8ua2V5Q29kZSwgJ3VuZGVmaW5lZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHdlIHBpY2tlZCB1cCBhIHJhbmdlIG1hdGNoIGVhcmxpZXIuLi5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJhbmdlTWF0Y2hlcyAmJiAocmFuZ2VNYXRjaGVzWzFdIGluIF9rZXlzLmtleXMpICYmIChyYW5nZU1hdGNoZXNbMl0gaW4gX2tleXMua2V5cykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlTWF0Y2hlc1syXSA9IF9rZXlzLmtleXNbcmFuZ2VNYXRjaGVzWzJdXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlTWF0Y2hlc1sxXSA9IF9rZXlzLmtleXNbcmFuZ2VNYXRjaGVzWzFdXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR28gZnJvbSBtYXRjaCAxIGFuZCBjYXB0dXJlIGFsbCBrZXktY29tb2JzIHVwIHRvIG1hdGNoIDJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAocmFuZ2VJID0gcmFuZ2VNYXRjaGVzWzFdOyByYW5nZUkgPCByYW5nZU1hdGNoZXNbMl07ICsrcmFuZ2VJKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uYWxzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbHRLZXk6IGtleUNvbWJvLmFsdEtleSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hpZnRLZXk6IGtleUNvbWJvLnNoaWZ0S2V5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRhS2V5OiBrZXlDb21iby5tZXRhS2V5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdHJsS2V5OiBrZXlDb21iby5jdHJsS2V5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlDb2RlOiByYW5nZUksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGp3ZXJ0eUNvbWJvOiBTdHJpbmcoandlcnR5Q29kZUZyYWdtZW50KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAga2V5Q29tYm8ua2V5Q29kZSA9IHJhbmdlSTtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5qZWN0IGVpdGhlciBrZXlDb2RlIG9yIGN0cmwvbWV0YS9zaGlmdC9hbHRLZXkgaW50byBrZXlDb21ib1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5Q29tYm8ua2V5Q29kZSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3B0aW9uYWxzLnB1c2goa2V5Q29tYm8pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzW2ldID0gb3B0aW9uYWxzO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubGVuZ3RoID0gaTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIFxuICAgIHZhciBqd2VydHkgPSBleHBvcnRzLmp3ZXJ0eSA9IHsgICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogandlcnR5LmV2ZW50XG4gICAgICAgICAqXG4gICAgICAgICAqIGBqd2VydHkuZXZlbnRgIHdpbGwgcmV0dXJuIGEgZnVuY3Rpb24sIHdoaWNoIGV4cGVjdHMgdGhlIGZpcnN0XG4gICAgICAgICAqICBhcmd1bWVudCB0byBiZSBhIGtleSBldmVudC4gV2hlbiB0aGUga2V5IGV2ZW50IG1hdGNoZXMgYGp3ZXJ0eUNvZGVgLFxuICAgICAgICAgKiAgYGNhbGxiYWNrRnVuY3Rpb25gIGlzIGZpcmVkLiBgandlcnR5LmV2ZW50YCBpcyB1c2VkIGJ5IGBqd2VydHkua2V5YFxuICAgICAgICAgKiAgdG8gYmluZCB0aGUgZnVuY3Rpb24gaXQgcmV0dXJucy4gYGp3ZXJ0eS5ldmVudGAgaXMgdXNlZnVsIGZvclxuICAgICAgICAgKiAgYXR0YWNoaW5nIHRvIHlvdXIgb3duIGV2ZW50IGxpc3RlbmVycy4gSXQgY2FuIGJlIHVzZWQgYXMgYSBkZWNvcmF0b3JcbiAgICAgICAgICogIG1ldGhvZCB0byBlbmNhcHN1bGF0ZSBmdW5jdGlvbmFsaXR5IHRoYXQgeW91IG9ubHkgd2FudCB0byBmaXJlIGFmdGVyXG4gICAgICAgICAqICBhIHNwZWNpZmljIGtleSBjb21iby4gSWYgYGNhbGxiYWNrQ29udGV4dGAgaXMgc3BlY2lmaWVkIHRoZW4gaXQgd2lsbFxuICAgICAgICAgKiAgYmUgc3VwcGxpZWQgYXMgYGNhbGxiYWNrRnVuY3Rpb25gJ3MgY29udGV4dCAtIGluIG90aGVyIHdvcmRzLCB0aGVcbiAgICAgICAgICogIGtleXdvcmQgYHRoaXNgIHdpbGwgYmUgc2V0IHRvIGBjYWxsYmFja0NvbnRleHRgIGluc2lkZSB0aGVcbiAgICAgICAgICogIGBjYWxsYmFja0Z1bmN0aW9uYCBmdW5jdGlvbi5cbiAgICAgICAgICpcbiAgICAgICAgICogICBAcGFyYW0ge01peGVkfSBqd2VydHlDb2RlIGNhbiBiZSBhbiBhcnJheSwgb3Igc3RyaW5nIG9mIGtleVxuICAgICAgICAgKiAgICAgIGNvbWJpbmF0aW9ucywgd2hpY2ggaW5jbHVkZXMgb3B0aW5hbHMgYW5kIG9yIHNlcXVlbmNlc1xuICAgICAgICAgKiAgIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrRnVjbnRpb24gaXMgYSBmdW5jdGlvbiAob3IgYm9vbGVhbikgd2hpY2hcbiAgICAgICAgICogICAgICBpcyBmaXJlZCB3aGVuIGp3ZXJ0eUNvZGUgaXMgbWF0Y2hlZC4gUmV0dXJuIGZhbHNlIHRvXG4gICAgICAgICAqICAgICAgcHJldmVudERlZmF1bHQoKVxuICAgICAgICAgKiAgIEBwYXJhbSB7T2JqZWN0fSBjYWxsYmFja0NvbnRleHQgKE9wdGlvbmFsKSBUaGUgY29udGV4dCB0byBjYWxsXG4gICAgICAgICAqICAgICAgYGNhbGxiYWNrYCB3aXRoIChpLmUgdGhpcylcbiAgICAgICAgICogICAgICBcbiAgICAgICAgICovXG4gICAgICAgIGV2ZW50OiBmdW5jdGlvbiAoandlcnR5Q29kZSwgY2FsbGJhY2tGdW5jdGlvbiwgY2FsbGJhY2tDb250ZXh0IC8qPyB0aGlzICovKSB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENvbnN0cnVjdCBhIGZ1bmN0aW9uIG91dCBvZiBjYWxsYmFja0Z1bmN0aW9uLCBpZiBpdCBpcyBhIGJvb2xlYW4uXG4gICAgICAgICAgICBpZiAocmVhbFR5cGVPZihjYWxsYmFja0Z1bmN0aW9uLCAnYm9vbGVhbicpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGJvb2wgPSBjYWxsYmFja0Z1bmN0aW9uO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrRnVuY3Rpb24gPSBmdW5jdGlvbiAoKSB7IHJldHVybiBib29sOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGp3ZXJ0eUNvZGUgPSBuZXcgSndlcnR5Q29kZShqd2VydHlDb2RlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGlzZSBpbi1zY29wZSB2YXJzLlxuICAgICAgICAgICAgdmFyIGkgPSAwXG4gICAgICAgICAgICAsICAgYyA9IGp3ZXJ0eUNvZGUubGVuZ3RoIC0gMVxuICAgICAgICAgICAgLCAgIHJldHVyblZhbHVlXG4gICAgICAgICAgICAsICAgandlcnR5Q29kZUlzO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUaGlzIGlzIHRoZSBldmVudCBsaXN0ZW5lciBmdW5jdGlvbiB0aGF0IGdldHMgcmV0dXJuZWQuLi5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBpZiBqd2VydHlDb2RlSXMgcmV0dXJucyB0cnV0aHkgKHN0cmluZykuLi5cbiAgICAgICAgICAgICAgICBpZiAoKGp3ZXJ0eUNvZGVJcyA9IGp3ZXJ0eS5pcyhqd2VydHlDb2RlLCBldmVudCwgaSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIC4uLiBhbmQgdGhpcyBpc24ndCB0aGUgbGFzdCBrZXkgaW4gdGhlIHNlcXVlbmNlLFxuICAgICAgICAgICAgICAgICAgICAvLyBpbmNyaW1lbnQgdGhlIGtleSBpbiBzZXF1ZW5jZSB0byBjaGVjay5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPCBjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK2k7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIC8vIC4uLiBhbmQgdGhpcyBpcyB0aGUgbGFzdCBpbiB0aGUgc2VxdWVuY2UgKG9yIHRoZSBvbmx5XG4gICAgICAgICAgICAgICAgICAgIC8vIG9uZSBpbiBzZXF1ZW5jZSksIHRoZW4gZmlyZSB0aGUgY2FsbGJhY2tcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZhbHVlID0gY2FsbGJhY2tGdW5jdGlvbi5jYWxsKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrQ29udGV4dCB8fCB0aGlzLCBldmVudCwgandlcnR5Q29kZUlzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIGNhbGxiYWNrIHJldHVybmVkIGZhbHNlLCB0aGVuIHdlIHNob3VsZCBydW5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmV0dXJuVmFsdWUgPT09IGZhbHNlKSBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXNldCBpIGZvciB0aGUgbmV4dCBzZXF1ZW5jZSB0byBmaXJlLlxuICAgICAgICAgICAgICAgICAgICAgICAgaSA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIGV2ZW50IGRpZG4ndCBoaXQgdGhpcyB0aW1lLCB3ZSBzaG91bGQgcmVzZXQgaSB0byAwLFxuICAgICAgICAgICAgICAgIC8vIHRoYXQgaXMsIHVubGVzcyB0aGlzIGNvbWJvIHdhcyB0aGUgZmlyc3QgaW4gdGhlIHNlcXVlbmNlLFxuICAgICAgICAgICAgICAgIC8vIGluIHdoaWNoIGNhc2Ugd2Ugc2hvdWxkIHJlc2V0IGkgdG8gMS5cbiAgICAgICAgICAgICAgICBpID0gandlcnR5LmlzKGp3ZXJ0eUNvZGUsIGV2ZW50KSA/IDEgOiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGp3ZXJ0eS5pc1xuICAgICAgICAgKlxuICAgICAgICAgKiBgandlcnR5LmlzYCB3aWxsIHJldHVybiBhIGJvb2xlYW4gdmFsdWUsIGJhc2VkIG9uIGlmIGBldmVudGAgbWF0Y2hlc1xuICAgICAgICAgKiAgYGp3ZXJ0eUNvZGVgLiBgandlcnR5LmlzYCBpcyBjYWxsZWQgYnkgYGp3ZXJ0eS5ldmVudGAgdG8gY2hlY2tcbiAgICAgICAgICogIHdoZXRoZXIgb3Igbm90IHRvIGZpcmUgdGhlIGNhbGxiYWNrLiBgZXZlbnRgIGNhbiBiZSBhIERPTSBldmVudCwgb3JcbiAgICAgICAgICogIGEgalF1ZXJ5L1plcHRvL0VuZGVyIG1hbnVmYWN0dXJlZCBldmVudC4gVGhlIHByb3BlcnRpZXMgb2ZcbiAgICAgICAgICogIGBqd2VydHlDb2RlYCAoc3BlZmljaWFsbHkgY3RybEtleSwgYWx0S2V5LCBtZXRhS2V5LCBzaGlmdEtleSBhbmRcbiAgICAgICAgICogIGtleUNvZGUpIHNob3VsZCBtYXRjaCBgandlcnR5Q29kZWAncyBwcm9wZXJ0aWVzIC0gaWYgdGhleSBkbywgdGhlblxuICAgICAgICAgKiAgYGp3ZXJ0eS5pc2Agd2lsbCByZXR1cm4gYHRydWVgLiBJZiB0aGV5IGRvbid0LCBgandlcnR5LmlzYCB3aWxsXG4gICAgICAgICAqICByZXR1cm4gYGZhbHNlYC5cbiAgICAgICAgICpcbiAgICAgICAgICogICBAcGFyYW0ge01peGVkfSBqd2VydHlDb2RlIGNhbiBiZSBhbiBhcnJheSwgb3Igc3RyaW5nIG9mIGtleVxuICAgICAgICAgKiAgICAgIGNvbWJpbmF0aW9ucywgd2hpY2ggaW5jbHVkZXMgb3B0aW5hbHMgYW5kIG9yIHNlcXVlbmNlc1xuICAgICAgICAgKiAgIEBwYXJhbSB7S2V5Ym9hcmRFdmVudH0gZXZlbnQgaXMgdGhlIEtleWJvYXJkRXZlbnQgdG8gYXNzZXJ0IGFnYWluc3RcbiAgICAgICAgICogICBAcGFyYW0ge0ludGVnZXJ9IGkgKE9wdGlvbmFsKSBjaGVja3MgdGhlIGBpYCBrZXkgaW4gandlcnR5Q29kZVxuICAgICAgICAgKiAgICAgIHNlcXVlbmNlXG4gICAgICAgICAqICAgICAgXG4gICAgICAgICAqL1xuICAgICAgICBpczogZnVuY3Rpb24gKGp3ZXJ0eUNvZGUsIGV2ZW50LCBpIC8qPyAwKi8pIHtcbiAgICAgICAgICAgIGp3ZXJ0eUNvZGUgPSBuZXcgSndlcnR5Q29kZShqd2VydHlDb2RlKTtcbiAgICAgICAgICAgIC8vIERlZmF1bHQgYGlgIHRvIDBcbiAgICAgICAgICAgIGkgPSBpIHx8IDA7XG4gICAgICAgICAgICAvLyBXZSBhcmUgb25seSBpbnRlcmVzdGluZyBpbiBgaWAgb2YgandlcnR5Q29kZTtcbiAgICAgICAgICAgIGp3ZXJ0eUNvZGUgPSBqd2VydHlDb2RlW2ldO1xuICAgICAgICAgICAgLy8galF1ZXJ5IHN0b3JlcyB0aGUgKnJlYWwqIGV2ZW50IGluIGBvcmlnaW5hbEV2ZW50YCwgd2hpY2ggd2UgdXNlXG4gICAgICAgICAgICAvLyBiZWNhdXNlIGl0IGRvZXMgYW5ub3l0aGluZyBzdHVmZiB0byBgbWV0YUtleWBcbiAgICAgICAgICAgIGV2ZW50ID0gZXZlbnQub3JpZ2luYWxFdmVudCB8fCBldmVudDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gV2UnbGwgbG9vayBhdCBlYWNoIG9wdGlvbmFsIGluIHRoaXMgandlcnR5Q29kZSBzZXF1ZW5jZS4uLlxuICAgICAgICAgICAgdmFyIGtleVxuICAgICAgICAgICAgLCAgIG4gPSBqd2VydHlDb2RlLmxlbmd0aFxuICAgICAgICAgICAgLCAgIHJldHVyblZhbHVlID0gZmFsc2U7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIExvb3AgdGhyb3VnaCBlYWNoIGZyYWdtZW50IG9mIGp3ZXJ0eUNvZGVcbiAgICAgICAgICAgIHdoaWxlIChuLS0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm5WYWx1ZSA9IGp3ZXJ0eUNvZGVbbl0uandlcnR5Q29tYm87XG4gICAgICAgICAgICAgICAgLy8gRm9yIGVhY2ggcHJvcGVydHkgaW4gdGhlIGp3ZXJ0eUNvZGUgb2JqZWN0LCBjb21wYXJlIHRvIGBldmVudGBcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBwIGluIGp3ZXJ0eUNvZGVbbl0pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gLi4uZXhjZXB0IGZvciBqd2VydHlDb2RlLmp3ZXJ0eUNvbWJvLi4uXG4gICAgICAgICAgICAgICAgICAgIGlmIChwICE9PSAnandlcnR5Q29tYm8nICYmIGV2ZW50W3BdICE9IGp3ZXJ0eUNvZGVbbl1bcF0pIHJldHVyblZhbHVlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIElmIHRoaXMgandlcnR5Q29kZSBvcHRpb25hbCB3YXNuJ3QgZmFsc2V5LCB0aGVuIHdlIGNhbiByZXR1cm4gZWFybHkuXG4gICAgICAgICAgICAgICAgaWYgKHJldHVyblZhbHVlICE9PSBmYWxzZSkgcmV0dXJuIHJldHVyblZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJldHVyblZhbHVlO1xuICAgICAgICB9LFxuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGp3ZXJ0eS5rZXlcbiAgICAgICAgICpcbiAgICAgICAgICogIGBqd2VydHkua2V5YCB3aWxsIGF0dGFjaCBhbiBldmVudCBsaXN0ZW5lciBhbmQgZmlyZVxuICAgICAgICAgKiAgIGBjYWxsYmFja0Z1bmN0aW9uYCB3aGVuIGBqd2VydHlDb2RlYCBtYXRjaGVzLiBUaGUgZXZlbnQgbGlzdGVuZXIgaXNcbiAgICAgICAgICogICBhdHRhY2hlZCB0byBgZG9jdW1lbnRgLCBtZWFuaW5nIGl0IHdpbGwgbGlzdGVuIGZvciBhbnkga2V5IGV2ZW50c1xuICAgICAgICAgKiAgIG9uIHRoZSBwYWdlIChhIGdsb2JhbCBzaG9ydGN1dCBsaXN0ZW5lcikuIElmIGBjYWxsYmFja0NvbnRleHRgIGlzXG4gICAgICAgICAqICAgc3BlY2lmaWVkIHRoZW4gaXQgd2lsbCBiZSBzdXBwbGllZCBhcyBgY2FsbGJhY2tGdW5jdGlvbmAncyBjb250ZXh0XG4gICAgICAgICAqICAgLSBpbiBvdGhlciB3b3JkcywgdGhlIGtleXdvcmQgYHRoaXNgIHdpbGwgYmUgc2V0IHRvXG4gICAgICAgICAqICAgYGNhbGxiYWNrQ29udGV4dGAgaW5zaWRlIHRoZSBgY2FsbGJhY2tGdW5jdGlvbmAgZnVuY3Rpb24uXG4gICAgICAgICAqXG4gICAgICAgICAqICAgQHBhcmFtIHtNaXhlZH0gandlcnR5Q29kZSBjYW4gYmUgYW4gYXJyYXksIG9yIHN0cmluZyBvZiBrZXlcbiAgICAgICAgICogICAgICBjb21iaW5hdGlvbnMsIHdoaWNoIGluY2x1ZGVzIG9wdGluYWxzIGFuZCBvciBzZXF1ZW5jZXNcbiAgICAgICAgICogICBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja0Z1bmN0aW9uIGlzIGEgZnVuY3Rpb24gKG9yIGJvb2xlYW4pIHdoaWNoXG4gICAgICAgICAqICAgICAgaXMgZmlyZWQgd2hlbiBqd2VydHlDb2RlIGlzIG1hdGNoZWQuIFJldHVybiBmYWxzZSB0b1xuICAgICAgICAgKiAgICAgIHByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICogICBAcGFyYW0ge09iamVjdH0gY2FsbGJhY2tDb250ZXh0IChPcHRpb25hbCkgVGhlIGNvbnRleHQgdG8gY2FsbFxuICAgICAgICAgKiAgICAgIGBjYWxsYmFja2Agd2l0aCAoaS5lIHRoaXMpXG4gICAgICAgICAqICAgQHBhcmFtIHtNaXhlZH0gc2VsZWN0b3IgY2FuIGJlIGEgc3RyaW5nLCBqUXVlcnkvWmVwdG8vRW5kZXIgb2JqZWN0LFxuICAgICAgICAgKiAgICAgIG9yIGFuIEhUTUwqRWxlbWVudCBvbiB3aGljaCB0byBiaW5kIHRoZSBldmVudExpc3RlbmVyXG4gICAgICAgICAqICAgQHBhcmFtIHtNaXhlZH0gc2VsZWN0b3JDb250ZXh0IGNhbiBiZSBhIHN0cmluZywgalF1ZXJ5L1plcHRvL0VuZGVyXG4gICAgICAgICAqICAgICAgb2JqZWN0LCBvciBhbiBIVE1MKkVsZW1lbnQgb24gd2hpY2ggdG8gc2NvcGUgdGhlIHNlbGVjdG9yXG4gICAgICAgICAqICBcbiAgICAgICAgICovXG4gICAgICAgIGtleTogZnVuY3Rpb24gKGp3ZXJ0eUNvZGUsIGNhbGxiYWNrRnVuY3Rpb24sIGNhbGxiYWNrQ29udGV4dCAvKj8gdGhpcyAqLywgc2VsZWN0b3IgLyo/IGRvY3VtZW50ICovLCBzZWxlY3RvckNvbnRleHQgLyo/IGJvZHkgKi8pIHtcbiAgICAgICAgICAgIC8vIEJlY2F1c2UgY2FsbGJhY2tDb250ZXh0IGlzIG9wdGlvbmFsLCB3ZSBzaG91bGQgY2hlY2sgaWYgdGhlXG4gICAgICAgICAgICAvLyBgY2FsbGJhY2tDb250ZXh0YCBpcyBhIHN0cmluZyBvciBlbGVtZW50LCBhbmQgaWYgaXQgaXMsIHRoZW4gdGhlXG4gICAgICAgICAgICAvLyBmdW5jdGlvbiB3YXMgY2FsbGVkIHdpdGhvdXQgYSBjb250ZXh0LCBhbmQgYGNhbGxiYWNrQ29udGV4dGAgaXNcbiAgICAgICAgICAgIC8vIGFjdHVhbGx5IGBzZWxlY3RvcmBcbiAgICAgICAgICAgIHZhciByZWFsU2VsZWN0b3IgPSByZWFsVHlwZU9mKGNhbGxiYWNrQ29udGV4dCwgJ2VsZW1lbnQnKSB8fCByZWFsVHlwZU9mKGNhbGxiYWNrQ29udGV4dCwgJ3N0cmluZycpID8gY2FsbGJhY2tDb250ZXh0IDogc2VsZWN0b3JcbiAgICAgICAgICAgIC8vIElmIGBjYWxsYmFja0NvbnRleHRgIGlzIHVuZGVmaW5lZCwgb3IgaWYgd2Ugc2tpcHBlZCBpdCAoYW5kXG4gICAgICAgICAgICAvLyB0aGVyZWZvcmUgaXQgaXMgYHJlYWxTZWxlY3RvcmApLCBzZXQgY29udGV4dCB0byBgZ2xvYmFsYC5cbiAgICAgICAgICAgICwgICByZWFsY2FsbGJhY2tDb250ZXh0ID0gcmVhbFNlbGVjdG9yID09PSBjYWxsYmFja0NvbnRleHQgPyBnbG9iYWwgOiBjYWxsYmFja0NvbnRleHRcbiAgICAgICAgICAgIC8vIEZpbmFsbHkgaWYgd2UgZGlkIHNraXAgYGNhbGxiYWNrQ29udGV4dGAsIHRoZW4gc2hpZnRcbiAgICAgICAgICAgIC8vIGBzZWxlY3RvckNvbnRleHRgIHRvIHRoZSBsZWZ0ICh0YWtlIGl0IGZyb20gYHNlbGVjdG9yYClcbiAgICAgICAgICAgICwgICAgcmVhbFNlbGVjdG9yQ29udGV4dCA9IHJlYWxTZWxlY3RvciA9PT0gY2FsbGJhY2tDb250ZXh0ID8gc2VsZWN0b3IgOiBzZWxlY3RvckNvbnRleHQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIElmIGByZWFsU2VsZWN0b3JgIGlzIGFscmVhZHkgYSBqUXVlcnkvWmVwdG8vRW5kZXIvRE9NIGVsZW1lbnQsXG4gICAgICAgICAgICAvLyB0aGVuIGp1c3QgdXNlIGl0IG5lYXQsIG90aGVyd2lzZSBmaW5kIGl0IGluIERPTSB1c2luZyAkJCgpXG4gICAgICAgICAgICAkYihyZWFsVHlwZU9mKHJlYWxTZWxlY3RvciwgJ2VsZW1lbnQnKSA/XG4gICAgICAgICAgICAgICByZWFsU2VsZWN0b3IgOiAkJChyZWFsU2VsZWN0b3IsIHJlYWxTZWxlY3RvckNvbnRleHQpXG4gICAgICAgICAgICAsIGp3ZXJ0eS5ldmVudChqd2VydHlDb2RlLCBjYWxsYmFja0Z1bmN0aW9uLCByZWFsY2FsbGJhY2tDb250ZXh0KSk7XG4gICAgICAgIH0sXG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogandlcnR5LmZpcmVcbiAgICAgICAgICpcbiAgICAgICAgICogYGp3ZXJ0eS5maXJlYCB3aWxsIGNvbnN0cnVjdCBhIGtleXVwIGV2ZW50IHRvIGZpcmUsIGJhc2VkIG9uXG4gICAgICAgICAqICBgandlcnR5Q29kZWAuIFRoZSBldmVudCB3aWxsIGJlIGZpcmVkIGFnYWluc3QgYHNlbGVjdG9yYC5cbiAgICAgICAgICogIGBzZWxlY3RvckNvbnRleHRgIGlzIHVzZWQgdG8gc2VhcmNoIGZvciBgc2VsZWN0b3JgIHdpdGhpblxuICAgICAgICAgKiAgYHNlbGVjdG9yQ29udGV4dGAsIHNpbWlsYXIgdG8galF1ZXJ5J3NcbiAgICAgICAgICogIGAkKCdzZWxlY3RvcicsICdjb250ZXh0JylgLlxuICAgICAgICAgKlxuICAgICAgICAgKiAgIEBwYXJhbSB7TWl4ZWR9IGp3ZXJ0eUNvZGUgY2FuIGJlIGFuIGFycmF5LCBvciBzdHJpbmcgb2Yga2V5XG4gICAgICAgICAqICAgICAgY29tYmluYXRpb25zLCB3aGljaCBpbmNsdWRlcyBvcHRpbmFscyBhbmQgb3Igc2VxdWVuY2VzXG4gICAgICAgICAqICAgQHBhcmFtIHtNaXhlZH0gc2VsZWN0b3IgY2FuIGJlIGEgc3RyaW5nLCBqUXVlcnkvWmVwdG8vRW5kZXIgb2JqZWN0LFxuICAgICAgICAgKiAgICAgIG9yIGFuIEhUTUwqRWxlbWVudCBvbiB3aGljaCB0byBiaW5kIHRoZSBldmVudExpc3RlbmVyXG4gICAgICAgICAqICAgQHBhcmFtIHtNaXhlZH0gc2VsZWN0b3JDb250ZXh0IGNhbiBiZSBhIHN0cmluZywgalF1ZXJ5L1plcHRvL0VuZGVyXG4gICAgICAgICAqICAgICAgb2JqZWN0LCBvciBhbiBIVE1MKkVsZW1lbnQgb24gd2hpY2ggdG8gc2NvcGUgdGhlIHNlbGVjdG9yXG4gICAgICAgICAqICBcbiAgICAgICAgICovXG4gICAgICAgIGZpcmU6IGZ1bmN0aW9uIChqd2VydHlDb2RlLCBzZWxlY3RvciAvKj8gZG9jdW1lbnQgKi8sIHNlbGVjdG9yQ29udGV4dCAvKj8gYm9keSAqLywgaSkge1xuICAgICAgICAgICAgandlcnR5Q29kZSA9IG5ldyBKd2VydHlDb2RlKGp3ZXJ0eUNvZGUpO1xuICAgICAgICAgICAgdmFyIHJlYWxJID0gcmVhbFR5cGVPZihzZWxlY3RvckNvbnRleHQsICdudW1iZXInKSA/IHNlbGVjdG9yQ29udGV4dCA6IGk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIElmIGByZWFsU2VsZWN0b3JgIGlzIGFscmVhZHkgYSBqUXVlcnkvWmVwdG8vRW5kZXIvRE9NIGVsZW1lbnQsXG4gICAgICAgICAgICAvLyB0aGVuIGp1c3QgdXNlIGl0IG5lYXQsIG90aGVyd2lzZSBmaW5kIGl0IGluIERPTSB1c2luZyAkJCgpXG4gICAgICAgICAgICAkZihyZWFsVHlwZU9mKHNlbGVjdG9yLCAnZWxlbWVudCcpID9cbiAgICAgICAgICAgICAgICBzZWxlY3RvciA6ICQkKHNlbGVjdG9yLCBzZWxlY3RvckNvbnRleHQpXG4gICAgICAgICAgICAsIGp3ZXJ0eUNvZGVbcmVhbEkgfHwgMF1bMF0pO1xuICAgICAgICB9LFxuICAgICAgICBcbiAgICAgICAgS0VZUzogX2tleXNcbiAgICB9O1xuICAgIFxufSh0aGlzLCAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMgPyBtb2R1bGUuZXhwb3J0cyA6IHRoaXMpKSk7Il19
