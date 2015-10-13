!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.streditApp=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){


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
    console.log("Compat? ");
    console.log("d = " + d.nodeValue);
    console.log("v = " + JSON.stringify(v));
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


},{"jwerty":2}],2:[function(require,module,exports){
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
},{}],3:[function(require,module,exports){
"use strict";

var imgui = require('../libimgui');
imgui.install(window);

var model = {
    subtree: {paths: [[]], selected: hole()}
};

function run() {
    setup(streditApp, model, 'root');
}


function pp(tree) {
    function op(tree) {
	return tree.focus ? "[" : "(";
    }

    function cl(tree) {
	return tree.focus ? "]" : ")";
    }

    if (tree.label === null) {
	return op(tree) + cl(tree);
    }


    if (tree.label.match(/[abc]/)) {
	return op(tree) + tree.label + cl(tree);
    }

    if (tree.label === "Add") {
	return op(tree) + pp(tree.kids[0]) + " + " + pp(tree.kids[1]) + cl(tree);
    }

    if (tree.label === "Mul") {
	return op(tree) + pp(tree.kids[0]) + " * " + pp(tree.kids[1]) + cl(tree);
    }

    if (tree.label === "If") {
	return op(tree) + "if " + pp(tree.kids[0]) + " then " + pp(tree.kids[1]) + " else " + pp(tree.kids[2]) + cl(tree);
    }

}


function focused(tree, f) {
    if (tree.focus) {
	delete tree.focus;
	on("span", [], {class: "focus"}, f);
    }
    else {
	f();
    }
}


function renderInfix(tree, symbol, parent, left) {
    function parens(f) {
	if (precedence[parent] > precedence[tree.label]
	    || (tree.label === parent && left && !associatesLeft[parent] )) {
	    text("(");
	    f();
	    text(")");
	}
	else {
	    f();
	}
    }
    
    focused(tree, function () {
	parens(function () {
	    renderTree(tree.kids[0], tree.label, true);
	    text(" " + symbol + " ");
	    renderTree(tree.kids[1], tree.label, false);
	});
    });
}

function renderTree(tree, parent, side) {

    if (tree.label === null) {
	focused(tree, function() { text("<>") });
    }
    else if (tree.label === "Add") {
	renderInfix(tree, "+", parent, side);
    }
    else if (tree.label === "Mul") {
	renderInfix(tree, "*", parent, side);
    }
    else if (tree.label === "Exp") {
	renderInfix(tree, "^", parent, side);
    }
    else if (tree.label === "(") {
	text("(");
	renderTree(tree.kids[0]);
    }
    else {
	focused(tree, function() { text(tree.label); });
    }

}

function keyDiv(keys, body) {
    function setFocus(elt) {
	elt.focus();
    }

    on("div", ["keydown:" + keys.join("/")], {tabindex: 1, extra: setFocus}, body);
}

var streditApp = component({keys: []}, function streditApp(self, model) {
    var tokens = ["a", "b", "c", "Add", "Mul", "Exp", "If"];
    
     for (var i = 0; i < tokens.length; i++) {
    	if (button(tokens[i])) {
    	    model.subtree = entry2(tokens[i], model.subtree);
    	}
    }

    if (button("(")) {
    	model.subtree = open(model.subtree);
    }

    if (button(")")) {
    	model.subtree = close(model.subtree);
    }

    var navs = {
	Up: lift1(up),
	Down: lift1(down),
	Left: lift1(left),
	Right: lift1(right),
	Del: lift1(kill),
	Prom: lift1(promote),
	Next: lift1(next),
	Prev: lift1(previous2)
    };
    for (var n in navs) {
	if (navs.hasOwnProperty(n)) {
	    if (button(n)) {
		model.subtree = navs[n](model.subtree);
	    }
	}
    }

    br();

    var t = hostWithParens(model.subtree);

    keyDiv(["shift+9", "shift+0", "[a-z]", "shift+=", "shift+8", "shift+6", "shift+arrow-up", "[←-↓]", "backspace"],
	   function (ev) {
	       renderTree(t);
	       if (ev) {
		   if (ev.isKey("arrow-up")) {
		       model.subtree = navs.Up(model.subtree);
		   }
		   else if (ev.isKey("arrow-down")) {
		       model.subtree = navs.Down(model.subtree);
		   }
		   else if (ev.isKey("arrow-left")) {
		       model.subtree = navs.Prev(model.subtree);
		   }
		   else if (ev.isKey("arrow-right")) {
		       model.subtree = navs.Next(model.subtree);
		   }
		   else if (ev.isKey('backspace')) {
    		       model.subtree = navs.Del(model.subtree);
		   }
		   else if (ev.isKey('shift+arrow-up')) {
    		       model.subtree = navs.Prom(model.subtree);
		   }
		   else if (ev.isKey('shift+9')) {
    		       model.subtree = open(model.subtree);
		   }
		   else if (ev.isKey('shift+0')) {
    		       model.subtree = close(model.subtree);
		   }
		   else if (ev.isKey('[a-z]')) {
		       var ch = String.fromCharCode(ev.keyCode).toLowerCase();
		       model.subtree = entry2(ch, model.subtree);
		   }
		   else if (ev.isKey('shift+=')) {
		       model.subtree = entry2("Add", model.subtree);
		   }
		   else if (ev.isKey('shift+6')) {
		       model.subtree = entry2("Exp", model.subtree);
		   }
		   else if (ev.isKey('shift+8')) {
		       model.subtree = entry2("Mul", model.subtree);
		   }
		   else {
		       self.keys.push("ugh: " + String.fromCharCode(ev.keyCode));
		   }
	       }	    
	       p(self.keys.join(', '));
	   });
    


    h3("Model.subtree");
    p(JSON.stringify(model.subtree));

    h3("Host");
    p(JSON.stringify(t));
});




var aTree = {
    label: "Some label",
    kids: []
};

function atomic(t) {
    return t.kids.length === 0;
}

function hole() {
    return {label: null, kids: []};
}


function preorder(tree) {
    var l = [];
    for (var i = 0; i < t.kids.length; i++) {
	l = l.concat(preorder(t.kids[i]));
    }
    return l;
}

var aSubTree = {
    path: [], // layers
    selected: aTree
};

function atHole(subtree) {
    return subtree.selected.label === null;
}

var aLayer = {
    label: "a label",
    left: [], // trees
    right: [], // trees
};

function embed(tree, layer) {
    var kids = [];
    for (var i = 0; i < layer.left.length; i++) {
	kids.push(layer.left[i]);
    }
    kids.push(tree); 
    for (var i = 0; i < layer.right.length; i++) {
	kids.push(layer.right[i]);
    }
    return {label: layer.label, kids: kids};
}


function hostWithParens(subtree2) {
    // like host, but inserts open "(" for each level
    // in paths (except outermost).
    
    var t = {label: subtree2.selected.label, kids: subtree2.selected.kids, focus: true};
    for (var i = 0; i < subtree2.paths.length; i++) {
	var path = subtree2.paths[i];
	for (var j = 0; j < path.length; j++) {
	    t = embed(t, path[j]);
	}
	t = {label: "(", kids: [t]};
    }
    return t.kids[0]; // remove outer "("
}


function host(subtree) {
    var t = {label: subtree.selected.label, kids: subtree.selected.kids, focus: true};
    for (var i = 0; i < subtree.path.length; i++) {
	//console.log("layer = " + util.inspect(subtree.path[i], {depth: null}));
	//console.log("t = " + util.inspect(t, {depth: null}));
	t = embed(t, subtree.path[i]);
    }
    //console.log("result t = " + util.inspect(t, {depth: null}));
    return t;
}

function left(subtree) {
    if (isLeftMost(subtree)) {
	return subtree;
    }

    var lab = subtree.path[0].label;

    // get the new tree
    var lft = subtree.path[0].left;
    var last = lft[lft.length - 1];

    // what remains on the left
    var l = lft.slice(0, lft.length - 1);

    // the right
    var r = subtree.path[0].right;

    var ls = subtree.path.slice(1); // tail

    // the old position
    var sel = subtree.selected;
    
    var result = {path: [{label: lab, left: l, right: [sel].concat(r)}].concat(ls), selected: last};
    //console.log("in left: ");
    //console.log(result);
    return result;
}

function right(subtree) {
    if (isRightMost(subtree)) {
	return subtree;
    }
    
    var lab = subtree.path[0].label;

    // get the new tree
    var rght = subtree.path[0].right;
    var first = rght[0];

    // what remains on the right
    var r = rght.slice(1);

    // the left
    var l = subtree.path[0].left;

    var ls = subtree.path.slice(1);

    // the old position
    var sel = subtree.selected;
    // console.log("l = ");
    // console.log(l);
    // console.log(sel);
    // console.log(l.concat([sel]));
    
    var result = {path: [{label: lab, left: l.concat([sel]), right: r}].concat(ls), selected: first};
    // console.log("in right: ");
    // console.log(result);
    return result;
}


function isLeftMost(subtree) {
    return subtree.path.length === 0 || subtree.path[0].left.length === 0;
}

function isRightMost(subtree) {
    return subtree.path.length === 0 || subtree.path[0].right.length === 0;
}

function up(subtree) {
    if (isTopMost(subtree)) {
	return subtree;
    }
    var layer = subtree.path[0];
    var above = subtree.path.slice(1);
    return {path: above, selected: embed(subtree.selected, layer) };
}

function isTopMost(subtree) {
    return subtree.path.length === 0;
}

function down(subtree) {
    if (isBottomMost(subtree)) {
	return subtree;
    }
    var p = subtree.path;
    var lab = subtree.selected.label;
    var t = subtree.selected.kids[0];
    var ts = subtree.selected.kids.slice(1);
    
    return {path: [{label: lab, left: [], right: ts}].concat(p), selected: t};
}

function isBottomMost(subtree) {
    return subtree.selected.kids.length === 0;
}


function rightUp(subtree) {
    while (!isTopMost(subtree) && isRightMost(subtree)) {
	subtree = up(subtree);
    }
    return right(subtree);
}

function leftDown(subtree) {
    while (!isBottomMost(subtree) && isLeftMost(subtree)) {
	subtree = down(subtree);
    }
    return left(subtree);
}

function next(subtree) {
    if (isBottomMost(subtree)) {
	return rightUp(subtree);
    }
    return down(subtree);
}

function previous2(subtree) {
    if (isRightMost(subtree)) {
	return left(subtree);
    }
    return nextSuchThat(function (s) { return isRightMost(s) && isBottomMost(s); }, up(subtree));
}

function previous(subtree) {
    if (isTopMost(subtree)) {
	return leftDown(subtree);
    }
    return up(subtree);
}

function nextSuchThat(pred, subtree) {
    var st2 = next(subtree); // always move.
    while (!isTopMost(st2) && !pred(st2)) {
	st2 = next(st2);
    }
    return pred(st2) ? st2 : subtree;
}

function replace(tree, subtree) {
    return {path: subtree.path, selected: tree};
}


var templates = {
    "(": {label: "(", kids: [hole()] },
    If: {label: "If", kids: [hole(), hole(), hole()]},
    Add: {label: "Add", kids: [hole(), hole()]},
    Mul: {label: "Mul", kids: [hole(), hole()]},
    Exp: {label: "Exp", kids: [hole(), hole()]}
}

function insert(label, subtree) {
    //console.log("Insert: " + label);
    //console.log("Subtree: ");
    //console.log(subtree);
    // this doesn't work: we're moving to next immediately,
    // if there are more holes to be filled.
    if (!templates[label]) { //&& !atHole(subtree) && subtree.selected.kids.length === 0) {
	var l = subtree.selected.label;
	var t = {label: (l === null ? "" : l) + label, kids: []};
	return {path: subtree.path, selected: t};
    }
    var template = templates[label] || {label: label, kids: []};
    return treeInsert(template, subtree);
}

function treeInsert(tree, subtree) {
    if (atHole(subtree)) {
	return replace(tree, subtree);
    }
    return replace(subtree.selected, down(replace(tree, subtree)));
}

function kill(subtree) {
    return replace(hole(), subtree);
}

function promote(subtree) {
    return replace(subtree.selected, up(subtree));
}

function situation(subtree) {
    if (subtree.path.length === 0) {
	return [];
    }
    return subtree.path.slice(0,1);
}

function graft(path, subtree) {
    return {path: path.concat(subtree.path), selected: subtree.selected};
}

function enter(label, subtree) {
    return nextSuchThat(atHole, insert(label, subtree));
}

function entry(label, subtree) {
    return enter(label, reduce(label, subtree));
}

function reduce(label, subtree) {
    while (!isIrreducible(label, subtree)) {
	//console.log("Reducing: " + util.inspect(subtree, {depth: null}));
	subtree = up(subtree);
    }
    return subtree;
}

function isIrreducible(label, subtree) {
    return atHole(subtree)
	|| isTopMost(subtree)
	|| !isRightMost(subtree)
	|| !(isProducable(label, up(subtree).selected.label));
}


var associatesLeft = {
    If: false,
    Add: true,
    Mul: true,
    Exp: false,
    a: false,
    b: false,
    c: false,
    d: false
};


var precedence = {
    If: 1000,
    Add: 100,
    Mul: 200,
    Exp: 300,
    a: 10000,
    b: 10000,
    c: 10000,
    d: 10000
};

function isProducable(op2, op1) {
    // console.log("Checking producable: " + op2 + ", " + op1);
    // console.log("Precedence: " + precedence[op2] + ", " + precedence[op1]);
    var r = (op1 === op2 && associatesLeft[op1]) || precedence[op1] > precedence[op2];
    //console.log("Result: " + r);
    return r;
}






function flatten(subtree2) {
    var path = [];
    //console.log("FLATTEN:");
    //console.log(util.inspect(subtree2, {depth: null}));
    for (var i = 0; i < subtree2.paths.length; i++) {
	path = path.concat(subtree2.paths[i]);
    }
    return {path: path, selected: subtree2.selected};
}

function lift1(s2s) {
    return function (s2) {
	//console.log(s2);
	var s = s2s({path: s2.paths[0], selected: s2.selected});
	return {paths: [s.path].concat(s2.paths.slice(1)), selected: s.selected};
    }
}

function lift2(s2s) {
    return function (x, s2) {
	var s = s2s(x, {path: s2.paths[0], selected: s2.selected});
	return {paths: [s.path].concat(s2.paths.slice(1)), selected: s.selected};
    };
}

var entry2 = lift2(entry);
var right2 = lift1(right);

function open(subtree2) {
    return {paths: [[]].concat(subtree2.paths), selected: subtree2.selected};
}

function close(subtree2) {
    if (subtree2.paths.length <= 1) {
	return subtree2;
    }
    var p = subtree2.paths[0];
    var ps = subtree2.paths.slice(1);
    var t = subtree2.selected;
    var s = host({path: p, selected: t});
    return right2({paths: ps, selected: s});
}

var util = require('util');


function enterString(arr) {
    //console.log("INPUT = " + arr);
    var st = {path: [], selected: hole()};
    for (var i = 0; i < arr.length; i++) {
	//console.log("================> Entering: " + arr[i]);
	st = entry(arr[i], st);
	//console.log("RESULT: ");
	//console.log(util.inspect(st, {depth: null}));
    }
    return st;
}

console.log("EXAMPLE: a * b + c * d");
var example = enterString(["a", "Mul", "b", "Add", "c", "Mul", "d"]);
console.log(util.inspect(host(example), {showHidden: false, depth: null}));


console.log("\n\n\n\nEXAMPLE: * + a b + c d)");
var example2 = enterString(["Mul", "Add", "a", "b", "Add", "c", "d"]);
console.log(util.inspect(host(example2), {showHidden: false, depth: null}));

//console.log("\nSubtree:");
//console.log(util.inspect(example2, {showHidden: false, depth: null}));


// console.log("\n\n\n\nEXAMPLE:  + * a b * c d");
// var example3 = enterString(["Add", "Mul", "a", "b", "Mul", "c", "d"]);
// console.log(util.inspect(host(example3), {showHidden: false, depth: null}));


// console.log("\n\n\n\nEXAMPLE: (a + b) * c");
// var example4 = enterString(["Add", "Mul", "a", "b", "c"]);
// console.log("END RESULT:");
// console.log(util.inspect(host(example4), {showHidden: false, depth: null}));

// console.log("\nSubtree:");
// console.log(util.inspect(example4, {showHidden: false, depth: null}));



function enterBracketedString(arr) {
    var st = {paths: [[]], selected: hole()};
    for (var i = 0; i < arr.length; i++) {
	//console.log("=====> Entering: " + arr[i]);
	if (arr[i] === "(") {
	    st = open(st);
	    //console.log("After open: " + util.inspect(st, {depth: null}));
	    continue;
	}
	if (arr[i] === ")") {
	    st = close(st);
	    continue;
	}
	st = entry2(arr[i], st);
	//console.log("RESULT: ");
	//console.log(st);
    }
    return st;
}




console.log("\n\n\n\nEXAMPLE: (a + b) * (c + d)");
var example3 = enterBracketedString(["(", "a", "Add", "b", ")", "Mul", "(", "c", "Add", "d", ")"]);
console.log("SUBTREE2");
//console.log(util.inspect(example3, {depth: null}));
console.log(util.inspect(host(flatten(example3)), {showHidden: false, depth: null}));


module.exports = run;

},{"../libimgui":1,"util":7}],4:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],5:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],6:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],7:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./support/isBuffer":6,"_process":5,"inherits":4}]},{},[3])(3)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4uL2xpYmltZ3VpL2xpYmltZ3VpLmpzIiwiLi4vbGliaW1ndWkvbm9kZV9tb2R1bGVzL2p3ZXJ0eS9qd2VydHkuanMiLCJzdHJlZGl0LmpzIiwiLi4vLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvc3VwcG9ydC9pc0J1ZmZlckJyb3dzZXIuanMiLCIuLi8uLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMXVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNycEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG5cbi8qXG5cblRPRE86XG5cbi0gbWFrZSBwb3NzaWJsZSB0byB1c2UgbXVsdGlwbGUgaW5zdGFuY2UgaW4gYSBzaW5nbGUgcGFnZSAocHV0IGV2ZXJ5dGhpbmcgaW4gYW4gb2JqZWN0KVxuXG4tIG1ha2UgXCJoZXJlXCIgcmVzaWxpZW50IGFnYWluc3QgcGFzc2luZyB0aGUgeWllbGRlZCBmdW5jdGlvbiB0byBvdGhlciBmdW5jdGlvbnMuIEN1cnJlbnRseSBcbiAgaXQgb25seSB3b3JrcyBpZiBpdCdzIGNhbGxlZCB3aXRoaW4gdGhlIGNsb3N1cmUuXG5cbi0gcmVtb3ZlIFwiYm9keVwiIHBhdGNoaW5nLlxuXG4tIGxldCBldmVudC1oYW5kbGluZyByZW5kZXIgbm90IGJ1aWxkIFZub2Rlcy5cblxuLSBhZGQgYXNzZXJ0aW9ucyB0byBjaGVjayBpbnB1dCBwYXJhbXMuXG5cbi0gZ2FyYmFnZSBjb2xsZWN0IHZpZXcgc3RhdGVzLlxuXG4tIHBlcmhhcHMgcmVtb3ZlIHRyeS1maW5hbGx5LCBzaW5jZSBleGNlcHRpb24gaGFuZGxpbmcgZG9lcyBub3Qgc2VlbXMgdG8gYmUgY29tbW9uIGluIEpTIChhbmQgc2xvdy4uLilcblxuLSBtYWtlIHNvbWUgZWxlbWVudHMgYm90aCBhY2NlcHQgc3RyaW5nIGFuZCBibG9jayAoZS5nLiBwKS5cblxuLSBzZXBhcmF0ZSB3aWRnZXRzIGluIG90aGVyIGxpYlxuXG4tIHJlbW92ZSBkZXAgb24gandlcnR5ICh1c2UgcHJvY2VlZCBwYXR0ZXJuKVxuXG4tIGFsbG93IGV2ZW50IGRlbGVnYXRpb24gdmlhIHJvb3QsIG5vdCBqdXN0IGRvY3VtZW50LlxuXG4tIG1ha2UgZG9jdW1lbnQgaW5qZWN0YWJsZVxuXG4qL1xuXG4vLyB2YXIgaCA9IHJlcXVpcmUoJ3ZpcnR1YWwtZG9tL2gnKTtcbi8vIHZhciBkaWZmID0gcmVxdWlyZSgndmlydHVhbC1kb20vZGlmZicpO1xuLy8gdmFyIHBhdGNoID0gcmVxdWlyZSgndmlydHVhbC1kb20vcGF0Y2gnKTtcbi8vIHZhciBjcmVhdGVFbGVtZW50ID0gcmVxdWlyZSgndmlydHVhbC1kb20vY3JlYXRlLWVsZW1lbnQnKTtcbi8vIHZhciBWaXJ0dWFsVGV4dCA9IHJlcXVpcmUoJ3ZpcnR1YWwtZG9tL3Zub2RlL3Z0ZXh0Jyk7XG4vLyB2YXIgVmlydHVhbE5vZGUgPSByZXF1aXJlKCd2aXJ0dWFsLWRvbS92bm9kZS92bm9kZScpO1xudmFyIGp3ZXJ0eSA9IHJlcXVpcmUoJ2p3ZXJ0eScpLmp3ZXJ0eTtcblxudmFyIEdVSSA9IHtcbiAgICBldmVudDogbnVsbCxcbiAgICBhcHA6IG51bGwsXG4gICAgbW9kZWw6IG51bGwsXG4gICAgZm9jdXM6IFtdLFxuICAgIG5vZGU6IG51bGwsXG4gICAgZXh0cmFzOiB7fSxcbiAgICB0aW1lcnM6IHt9LFxuICAgIGhhbmRsZXJzOiB7fSxcbiAgICBpZHM6IDBcbn1cblxuZnVuY3Rpb24gaW5pdChhcHAsIG1vZGVsLCByb290KSB7XG4gICAgR1VJLmFwcCA9IGFwcDtcbiAgICBHVUkubW9kZWwgPSBtb2RlbDtcbiAgICBHVUkucm9vdCA9IHJvb3Q7XG59XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyKGV2ZW50LCBpZCkge1xuICAgIC8vIG9ubHkgYWRkIG9uZSBoYW5kbGVyIHRvIHJvb3QsIHBlciBldmVudCB0eXBlLlxuICAgIGlmICghR1VJLmhhbmRsZXJzLmhhc093blByb3BlcnR5KGV2ZW50KSkge1xuXHRHVUkuaGFuZGxlcnNbZXZlbnRdID0gW107XG5cdHZhciByID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoR1VJLnJvb3QpO1xuXHRyLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGZ1bmN0aW9uIChlKSB7XG5cdCAgICBlLnN0b3BQcm9wYWdhdGlvbigpOyAvLyBkb24ndCBsZWFrIHVwd2FyZHNcblx0ICAgIHZhciBpZCA9IGUudGFyZ2V0LmdldEF0dHJpYnV0ZSgnaWQnKTtcblx0ICAgIGlmIChHVUkuaGFuZGxlcnNbZXZlbnRdLmluZGV4T2YoaWQpID4gLTEpIHtcblx0XHRHVUkuZXZlbnQgPSBlO1xuXHRcdGRvUmVuZGVyKCk7XG5cdCAgICB9XG5cdH0sIGZhbHNlKTtcbiAgICB9XG4gICAgR1VJLmhhbmRsZXJzW2V2ZW50XS5wdXNoKGlkKTtcbn1cblxuZnVuY3Rpb24gcmVzZXRIYW5kbGVycygpIHtcbiAgICBmb3IgKHZhciBrIGluIEdVSS5oYW5kbGVycykge1xuXHRpZiAoR1VJLmhhbmRsZXJzLmhhc093blByb3BlcnR5KGspKSB7XG5cdCAgICBHVUkuaGFuZGxlcnNba10gPSBbXTtcblx0fVxuICAgIH1cbn1cblxuZnVuY3Rpb24gc2V0dXAoYXBwLCBtb2RlbCwgcm9vdCkge1xuICAgIGluaXQoYXBwLCBtb2RlbCwgcm9vdCk7XG4gICAgbW91bnQocmVuZGVyT25jZSgpKTtcbn1cblxuXG5mdW5jdGlvbiByZW5kZXJPbmNlKCkge1xuICAgIHJlc2V0SGFuZGxlcnMoKTtcbiAgICBHVUkuZXh0cmFzID0ge307XG4gICAgR1VJLmZvY3VzID0gW107XG4gICAgR1VJLmlkcyA9IDA7XG4gICAgR1VJLmFwcChHVUkubW9kZWwpO1xufVxuXG5mdW5jdGlvbiBtb3VudChub2RlKSB7XG4gICAgdmFyIGFjdGl2ZSA9IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQ7XG4gICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKEdVSS5yb290KTtcbiAgICBpZiAoR1VJLm5vZGUgIT09IG51bGwpIHtcblx0cmVjb25jaWxlS2lkcyhjb250YWluZXIsIGNvbnRhaW5lci5jaGlsZE5vZGVzLCBHVUkuZm9jdXMpO1xuICAgIH1cbiAgICBlbHNlIHtcblx0d2hpbGUgKGNvbnRhaW5lci5maXJzdENoaWxkKSB7XG5cdCAgICBjb250YWluZXIucmVtb3ZlQ2hpbGQoY29udGFpbmVyLmZpcnN0Q2hpbGQpO1xuXHR9XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgR1VJLmZvY3VzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoYnVpbGQoR1VJLmZvY3VzW2ldKSk7XG5cdH1cbiAgICB9XG4gICAgR1VJLm5vZGUgPSBub2RlO1xuXG4gICAgZm9yICh2YXIgaWQgaW4gR1VJLmV4dHJhcykge1xuXHRpZiAoR1VJLmV4dHJhcy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcblx0ICAgIHZhciBkb1NvbWV0aGluZyA9IEdVSS5leHRyYXNbaWRdO1xuXHQgICAgdmFyIGVsdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcblx0ICAgIGRvU29tZXRoaW5nKGVsdCk7XG5cdH1cbiAgICB9XG4gICAgXG59XG5cbmZ1bmN0aW9uIGRvUmVuZGVyKCkge1xuICAgIC8vIHR3aWNlOiBvbmUgdG8gaGFuZGxlIGV2ZW50LCBvbmUgdG8gc3luYyB2aWV3LlxuICAgIHZhciBfID0gcmVuZGVyT25jZSgpO1xuICAgIHZhciBub2RlID0gcmVuZGVyT25jZSgpO1xuICAgIG1vdW50KG5vZGUpO1xufVxuXG5cblxuXG5cbnZhciBjYWxsU3RhY2sgPSBbXTtcblxuLy8gd2Ugc2hvdWxkIHNvbWVob3cgZ2FyYmFnZSBjb2xsZWN0IHRoaXMuXG52YXIgbWVtbyA9IHt9O1xuXG5cbmZ1bmN0aW9uIGdldENhbGxlckxvYyhvZmZzZXQpIHtcbiAgICB2YXIgc3RhY2sgPSBuZXcgRXJyb3IoKS5zdGFjay5zcGxpdCgnXFxuJyk7XG4gICAgdmFyIGxpbmUgPSBzdGFja1sob2Zmc2V0IHx8IDEpICsgMV07XG4gICAgLy9jb25zb2xlLmxvZyhcImxhc3QgLyA9IFwiICsgbGluZS5sYXN0SW5kZXhPZihcIi9cIikpO1xuICAgIGlmIChsaW5lW2xpbmUubGVuZ3RoIC0gMV0gPT09ICcpJykge1xuXHRsaW5lID0gbGluZS5zbGljZSgwLCBsaW5lLmxlbmd0aCAtIDEpO1xuICAgIH1cbiAgICByZXR1cm4gbGluZS5zbGljZShsaW5lLmxhc3RJbmRleE9mKCcvJykgKyAxKTtcbn1cbiBcblxuZnVuY3Rpb24gY29tcG9uZW50KHN0YXRlLCBmdW5jKSB7XG4gICAgdmFyIGZuYW1lID0gZnVuYy5uYW1lIHx8IGZ1bmMudG9TdHJpbmcoKTtcbiAgICByZXR1cm4gbmFtZWRDb21wb25lbnQoZm5hbWUsIGZ1bmMsIHN0YXRlKTtcbn1cblxuZnVuY3Rpb24gbmFtZWQoZm5hbWUsIGNvbXApIHtcbiAgICBjYWxsU3RhY2sucHVzaChmbmFtZSk7XG4gICAgdHJ5IHtcblx0dmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuXHQvLyBmb3IgKHZhciBpID0gMjsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuXHQvLyAgICAgYXJncy5wdXNoKGFyZ3VtZW50c1tpXSk7XG5cdC8vIH1cblx0cmV0dXJuIGNvbXAuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgfVxuICAgIGZpbmFsbHkge1xuXHRjYWxsU3RhY2sucG9wKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBrZXlPZih2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuXHRyZXR1cm4gXCJcIjtcbiAgICB9XG5cbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuXHRyZXR1cm4gXCJcIjtcbiAgICB9XG5cbiAgICBpZiAodmFsdWUuY29uc3RydWN0b3IgPT09IEFycmF5KSB7XG5cdHJldHVybiBvYmplY3RJZCh2YWx1ZSk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIikge1xuXHRyZXR1cm4gb2JqZWN0SWQodmFsdWUpO1xuICAgIH1cblxuICAgIHJldHVybiBcIlwiO1xufVxuXG5mdW5jdGlvbiBuYW1lZENvbXBvbmVudChmbmFtZSwgZnVuYywgc3RhdGUpIHtcbiAgICBzdGF0ZSA9IHN0YXRlIHx8IHt9O1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcblx0dmFyIG1vZGVsID0gYXJndW1lbnRzWzBdOyAvLyBmaXJzdCBhcmd1bWVudCAqbXVzdCogYmUgYSBtb2RlbFxuXHRjYWxsU3RhY2sucHVzaChbZm5hbWUsIGtleU9mKG1vZGVsKSwgZ2V0Q2FsbGVyTG9jKDIpXS50b1N0cmluZygpKTtcblx0dHJ5IHtcblx0ICAgIHZhciBrZXkgPSBjYWxsU3RhY2sudG9TdHJpbmcoKTtcblx0ICAgIGlmICghbWVtb1trZXldKSB7XG5cdFx0bWVtb1trZXldID0gY2xvbmUoc3RhdGUpO1xuXHQgICAgfVxuXHQgICAgdmFyIHNlbGYgPSBtZW1vW2tleV07XG5cdCAgICByZXR1cm4gZnVuYy5hcHBseShudWxsLCBbc2VsZl0uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcblx0fVxuXHRmaW5hbGx5IHtcblx0ICAgIGNhbGxTdGFjay5wb3AoKTtcblx0fVxuICAgIH07XG59XG5cbi8qXG52ZG9tIGVsZW1lbnRcbnt0YWc6XG4gYXR0cnM6IHt9IGV0Yy5cbiBraWRzOiBbXSB9XG5cbiovXG5cbmZ1bmN0aW9uIGNvbXBhdChkLCB2KSB7XG4gICAgY29uc29sZS5sb2coXCJDb21wYXQ/IFwiKTtcbiAgICBjb25zb2xlLmxvZyhcImQgPSBcIiArIGQubm9kZVZhbHVlKTtcbiAgICBjb25zb2xlLmxvZyhcInYgPSBcIiArIEpTT04uc3RyaW5naWZ5KHYpKTtcbiAgICByZXR1cm4gKGQubm9kZVR5cGUgPT09IE5vZGUuVEVYVF9OT0RFICYmICh0eXBlb2YgdiAhPT0gJ29iamVjdCcpKVxuXHR8fCAoZC50YWdOYW1lID09PSB2LnRhZy50b1VwcGVyQ2FzZSgpKTtcbn1cblxuLy8gZnVuY3Rpb24gc2V0QXR0cmlidXRlSG9vayhkb20sIG5hbWUsIHZhbHVlKSB7XG4vLyAgICAgZnVuY3Rpb24gcGFyc2VCb29sZWFuKHYpIHtcbi8vIFx0aWYgKCF2KSB7XG4vLyBcdCAgICByZXR1cm4gZmFsc2U7XG4vLyBcdH1cbi8vIFx0cmV0dXJuIHYudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpID09PSAndHJ1ZSc7XG4vLyAgICAgfVxuLy8gICAgIC8vIGlmIChuYW1lID09PSAnY2hlY2tlZCcpIHtcbi8vICAgICAvLyBcdGRvbS5jaGVja2VkID0gcGFyc2VCb29sZWFuKHZhbHVlKTtcbi8vICAgICAvLyB9XG4vLyAgICAgLy8gaWYgKG5hbWUgPT09ICdzZWxlY3RlZCcpIHtcbi8vICAgICAvLyBcdGRvbS5zZWxlY3RlZCA9IHBhcnNlQm9vbGVhbih2YWx1ZSk7XG4vLyAgICAgLy8gfVxuLy8gICAgIGlmIChuYW1lID09PSAndmFsdWUnKSB7XG4vLyBcdGRvbS52YWx1ZSA9IHZhbHVlO1xuLy8gICAgIH1cbi8vIH1cblxuLy8gZnVuY3Rpb24gcmVtb3ZlQXR0cmlidXRlSG9vayhkb20sIG5hbWUpIHtcbi8vICAgICAvLyBpZiAobmFtZSA9PT0gJ2NoZWNrZWQnKSB7XG4vLyAgICAgLy8gXHRkb20uY2hlY2tlZCA9IGZhbHNlO1xuLy8gICAgIC8vIH1cbi8vICAgICAvLyBpZiAobmFtZSA9PT0gJ3NlbGVjdGVkJykge1xuLy8gICAgIC8vIFx0ZG9tLnNlbGVjdGVkID0gZmFsc2U7XG4vLyAgICAgLy8gfVxuLy8gICAgIGlmIChuYW1lID09PSAndmFsdWUnKSB7XG4vLyBcdGRvbS52YWx1ZSA9ICcnO1xuLy8gICAgIH1cbi8vIH1cblxuZnVuY3Rpb24gcmVjb25jaWxlKGRvbSwgdmRvbSkge1xuICAgIGlmICghY29tcGF0KGRvbSwgdmRvbSkpIHtcblx0dGhyb3cgXCJDYW4gb25seSByZWNvbmNpbGUgY29tcGF0aWJsZSBub2Rlc1wiO1xuICAgIH1cbiAgICBcbiAgICAvLyBUZXh0IG5vZGVzXG4gICAgaWYgKHR5cGVvZiB2ZG9tICE9PSAnb2JqZWN0Jykge1xuXHRpZiAoZG9tLm5vZGVWYWx1ZSAhPT0gdmRvbSkge1xuXHQgICAgZG9tLm5vZGVWYWx1ZSA9IHZkb20udG9TdHJpbmcoKTtcblx0fVxuXHRyZXR1cm47XG4gICAgfVxuXG5cbiAgICAvLyBFbGVtZW50IG5vZGVzXG4gICAgdmFyIHZhdHRycyA9IHZkb20uYXR0cnMgfHwge307XG4gICAgZm9yICh2YXIgdmF0dHIgaW4gdmF0dHJzKSB7XG5cdGlmICh2YXR0cnMuaGFzT3duUHJvcGVydHkodmF0dHIpKSB7XG5cdCAgICBpZiAoZG9tLmhhc0F0dHJpYnV0ZSh2YXR0cikpIHtcblx0XHR2YXIgZGF0dHIgPSBkb20uZ2V0QXR0cmlidXRlKHZhdHRyKTtcblx0XHRpZiAoZGF0dHIgIT09IHZhdHRyc1t2YXR0cl0udG9TdHJpbmcoKSkgeyBcblx0XHQgICAgY29uc29sZS5sb2coXCJVcGRhdGluZyBhdHRyaWJ1dGU6IFwiICsgdmF0dHIgKyBcIiA9IFwiICsgdmF0dHJzW3ZhdHRyXSk7XG5cdFx0ICAgIGRvbS5zZXRBdHRyaWJ1dGUodmF0dHIsIHZhdHRyc1t2YXR0cl0pO1xuXHRcdH1cblx0ICAgIH1cblx0ICAgIGVsc2Uge1xuXHRcdGNvbnNvbGUubG9nKFwiQWRkaW5nIGF0dHJpYnV0ZTogXCIgKyB2YXR0ciArIFwiID0gXCIgKyB2YXR0cnNbdmF0dHJdKTtcblx0XHRkb20uc2V0QXR0cmlidXRlKHZhdHRyLCB2YXR0cnNbdmF0dHJdKTtcblx0ICAgIH1cblx0fVxuICAgIH1cbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRvbS5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG5cdHZhciBkYXR0ciA9IGRvbS5hdHRyaWJ1dGVzW2ldO1xuXHRpZiAoIXZhdHRycy5oYXNPd25Qcm9wZXJ0eShkYXR0ci5ub2RlTmFtZSkpIHtcblx0ICAgIGNvbnNvbGUubG9nKFwiUmVtb3ZpbmcgYXR0cmlidXRlOiBcIiArIGRhdHRyLm5vZGVOYW1lKTtcblx0ICAgIGRvbS5yZW1vdmVBdHRyaWJ1dGUoZGF0dHIubm9kZU5hbWUpO1xuXHR9XG4gICAgfVxuXG4gICAgcmVjb25jaWxlS2lkcyhkb20sIGRvbS5jaGlsZE5vZGVzLCB2ZG9tLmtpZHMpO1xufVxuXG5mdW5jdGlvbiByZWNvbmNpbGVLaWRzKGRvbSwgZGtpZHMsIHZraWRzKSB7XG4gICAgdmFyIGxlbiA9IE1hdGgubWluKGRraWRzLmxlbmd0aCwgdmtpZHMubGVuZ3RoKTtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG5cdHZhciBka2lkID0gZGtpZHNbaV07XG5cdHZhciB2a2lkID0gdmtpZHNbaV07XG5cdGlmIChjb21wYXQoZGtpZCwgdmtpZCkpIHtcblx0ICAgIHJlY29uY2lsZShka2lkLCB2a2lkKTtcblx0fVxuXHRlbHNlIHtcblx0ICAgIGNvbnNvbGUubG9nKFwiUmVwbGFjaW5nIGNoaWxkXCIpO1xuXHQgICAgZG9tLnJlcGxhY2VDaGlsZChidWlsZCh2a2lkKSwgZGtpZCk7XG5cdH1cbiAgICB9XG4gICAgXG4gICAgaWYgKGRraWRzLmxlbmd0aCA+IGxlbikge1xuXHR3aGlsZSAoZGtpZHMubGVuZ3RoID4gbGVuKSB7XG5cdCAgICBjb25zb2xlLmxvZyhcIlJlbW92aW5nIGNoaWxkIFwiKTtcblx0ICAgIGRvbS5yZW1vdmVDaGlsZChka2lkc1tsZW5dKTtcblx0fVxuICAgIH1cbiAgICBlbHNlIGlmICh2a2lkcy5sZW5ndGggPiBsZW4pIHtcblx0Zm9yICh2YXIgaSA9IGxlbjsgaSA8IHZraWRzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBjb25zb2xlLmxvZyhcIkFwcGVuZGluZyBuZXcgY2hpbGQgXCIpO1xuXHQgICAgZG9tLmFwcGVuZENoaWxkKGJ1aWxkKHZraWRzW2ldKSk7XG5cdH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkKHZkb20pIHtcbiAgICBpZiAodHlwZW9mIHZkb20gPT09ICdzdHJpbmcnKSB7XG5cdHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh2ZG9tKTtcbiAgICB9XG5cbiAgICB2YXIgZWx0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh2ZG9tLnRhZyk7XG4gICAgdmFyIHZhdHRycyA9IHZkb20uYXR0cnMgfHwge307XG4gICAgZm9yICh2YXIgayBpbiB2YXR0cnMpIHtcblx0aWYgKHZhdHRycy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuXHQgICAgZWx0LnNldEF0dHJpYnV0ZShrLCB2YXR0cnNba10pO1xuXHR9XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmRvbS5raWRzLmxlbmd0aDsgaSsrKSB7XG5cdGVsdC5hcHBlbmRDaGlsZChidWlsZCh2ZG9tLmtpZHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIGVsdDsgICAgXG59XG5cbnZhciBfX25leHRfb2JqaWQ9MTtcbmZ1bmN0aW9uIG9iamVjdElkKG9iaikge1xuICAgIGlmIChvYmo9PW51bGwpIHJldHVybiBudWxsO1xuICAgIGlmIChvYmouX19vYmpfaWQ9PW51bGwpIG9iai5fX29ial9pZD1fX25leHRfb2JqaWQrKztcbiAgICByZXR1cm4gb2JqLl9fb2JqX2lkO1xufVxuXG5mdW5jdGlvbiBjbG9uZShvYmopIHtcbiAgICBpZiAobnVsbCA9PSBvYmogfHwgXCJvYmplY3RcIiAhPSB0eXBlb2Ygb2JqKSByZXR1cm4gb2JqO1xuICAgIHZhciBjb3B5ID0gb2JqLmNvbnN0cnVjdG9yKCk7XG4gICAgZm9yICh2YXIgYXR0ciBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgY29weVthdHRyXSA9IG9ialthdHRyXTtcbiAgICB9XG4gICAgcmV0dXJuIGNvcHk7XG59XG5cbi8vIEV2ZW50IGhhbmRsaW5nXG5cbmZ1bmN0aW9uIGRlYWxXaXRoSXQoZSkge1xuICAgIEdVSS5ldmVudCA9IGU7XG4gICAgZG9SZW5kZXIoKTtcbn1cblxuXG5cbi8vIFJlbmRlciBmdW5jdGlvbnNcblxuZnVuY3Rpb24gaXNLZXlDb21ib0V2ZW50KGV2ZW50KSB7XG4gICAgcmV0dXJuIGV2ZW50LmluZGV4T2YoXCI6XCIpID4gLSAxO1xufVxuXG5mdW5jdGlvbiBnZXRIYW5kbGVyKGV2ZW50KSB7XG4gICAgaWYgKGlzS2V5Q29tYm9FdmVudChldmVudCkpIHtcblx0cmV0dXJuIGtleUNvbWJvTGlzdGVuZXIoZXZlbnQpO1xuICAgIH1cbiAgICByZXR1cm4gZGVhbFdpdGhJdDtcbn1cbiAgICBcbmZ1bmN0aW9uIGtleUNvbWJvTGlzdGVuZXIoZWx0LCBldmVudCkge1xuICAgIHZhciBjb2xvbiA9IGV2ZW50LmluZGV4T2YoXCI6XCIpO1xuICAgIHZhciBjb21ibyA9IGV2ZW50LnNsaWNlKGNvbG9uICsgMSk7XG4gICAgZXZlbnQgPSBldmVudC5zbGljZSgwLCBjb2xvbik7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGxpc3RlbihlKSB7XG5cdGlmIChqd2VydHkuaXMoY29tYm8sIGUpKSB7XG5cdCAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHQgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHQgICAgZS5pc0tleSA9IGZ1bmN0aW9uIChjKSB7IHJldHVybiBqd2VydHkuaXMoYywgdGhpcyk7IH07XG5cdCAgICBlLnRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBsaXN0ZW4sIGZhbHNlKTtcblx0ICAgIGRlYWxXaXRoSXQoZSk7XG5cdH1cbiAgICB9O1xufVxuXG5cbmZ1bmN0aW9uIG9uKGVsdCwgZXZlbnRzLCBhdHRycywgYmxvY2spIHtcbiAgICBhdHRycyA9IGF0dHJzIHx8IHt9O1xuICAgIHZhciBpZCA9IGF0dHJzW1wiaWRcIl0gfHwgKFwiaWRcIiArIEdVSS5pZHMrKyk7XG4gICAgYXR0cnNbXCJpZFwiXSA9IGlkO1xuXG4gICAgXG4gICAgLy9HVUkuaGFuZGxlcnNbaWRdID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyBpKyspIHtcblx0cmVnaXN0ZXIoZXZlbnRzW2ldLCBpZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHdpdGhFbGVtZW50KGVsdCwgYXR0cnMsIGZ1bmN0aW9uKCkge1xuXHR2YXIgZXZlbnQgPSBHVUkuZXZlbnQ7XG5cdGlmIChldmVudCAmJiBldmVudC50YXJnZXQuZ2V0QXR0cmlidXRlKCdpZCcpID09PSBpZCkge1xuXHQgICAgR1VJLmV2ZW50ID0gdW5kZWZpbmVkOyAvLyBtYXliZSBkbyBpbiB0b3BsZXZlbD8/P1xuXHQgICAgcmV0dXJuIGJsb2NrKGV2ZW50KTsgLy8gbGV0IGl0IGJlIGhhbmRsZWRcblx0fVxuXHRyZXR1cm4gYmxvY2soKTtcbiAgICB9KTtcbn1cblxuXG5cblxuZnVuY3Rpb24gaGVyZShmdW5jLCBibG9jaykge1xuICAgIHZhciBwb3MgPSBHVUkuZm9jdXMubGVuZ3RoO1xuICAgIHJldHVybiBibG9jayhmdW5jdGlvbigpIHtcblx0dmFyIHBhcmVudCA9IEdVSS5mb2N1cztcblx0R1VJLmZvY3VzID0gW107XG5cdHRyeSB7XG5cdCAgICByZXR1cm4gZnVuYy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuXHR9XG5cdGZpbmFsbHkge1xuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBHVUkuZm9jdXMubGVuZ3RoOyBpKyspIHtcblx0XHRwYXJlbnQuc3BsaWNlKHBvcyArIGksIDAsIEdVSS5mb2N1c1tpXSk7XG5cdCAgICB9XG5cdCAgICBHVUkuZm9jdXMgPSBwYXJlbnQ7XG5cdH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gd2l0aEVsZW1lbnQoZWx0LCBhdHRycywgZnVuYywgZXZzKSB7XG4gICAgLy8gVE9ETzogaWYgR1VJLnByZXRlbmQsIGRvbid0IGJ1aWxkIHZub2Rlc1xuICAgIHZhciBwYXJlbnQgPSBHVUkuZm9jdXM7XG4gICAgR1VJLmZvY3VzID0gW107XG4gICAgdHJ5IHtcblx0cmV0dXJuIGZ1bmMoKTtcbiAgICB9XG4gICAgZmluYWxseSB7XG5cdGlmIChhdHRycyAmJiBhdHRyc1snZXh0cmEnXSkge1xuXHQgICAgR1VJLmV4dHJhc1thdHRyc1snaWQnXV0gPSBhdHRyc1snZXh0cmEnXTtcblx0ICAgIGRlbGV0ZSBhdHRyc1snZXh0cmEnXTtcblx0fVxuXHR2YXIgdm5vZGUgPSB7dGFnOiBlbHQsIGF0dHJzOiBhdHRycywga2lkczogR1VJLmZvY3VzfTtcblx0cGFyZW50LnB1c2godm5vZGUpO1xuXHRHVUkuZm9jdXMgPSBwYXJlbnQ7XG4gICAgfSAgICBcbn1cblxuXG5cbi8vIEJhc2ljIHdpZGdldHNcblxuXG5mdW5jdGlvbiBhZGRJbnB1dEVsZW1lbnRzKG9iaikge1xuICAgIHZhciBiYXNpY0lucHV0cyA9IHtcbi8vXHR0ZXh0Qm94OiB7dHlwZTogJ3RleHQnLCBldmVudDogJ2lucHV0J30sXG5cdHNwaW5Cb3g6IHt0eXBlOiAnbnVtYmVyJywgZXZlbnQ6ICdpbnB1dCd9LFxuXHRzbGlkZXI6IHt0eXBlOiAncmFuZ2UnLCBldmVudDogJ2lucHV0J30sXG5cdGVtYWlsQm94OiB7dHlwZTogJ2VtYWlsJywgZXZlbnQ6ICdpbnB1dCd9LFxuXHRzZWFyY2hCb3g6IHt0eXBlOiAnc2VhcmNoJywgZXZlbnQ6ICdpbnB1dCd9LFxuXHRkYXRlUGlja2VyOiB7dHlwZTogJ2RhdGUnLCBldmVudDogJ2NoYW5nZSd9LFxuXHRjb2xvclBpY2tlcjoge3R5cGU6ICdjb2xvcicsIGV2ZW50OiAnY2hhbmdlJ30sXG5cdGRhdGVUaW1lUGlja2VyOiB7dHlwZTogJ2RhdGV0aW1lJywgZXZlbnQ6ICdjaGFuZ2UnfSxcblx0bG9jYWxEYXRlVGltZVBpY2tlcjoge3R5cGU6ICdkYXRldGltZS1sb2NhbCcsIGV2ZW50OiAnY2hhbmdlJ30sXG5cdG1vbnRoUGlja2VyOiB7dHlwZTogJ3dlZWsnLCBldmVudDogJ2NoYW5nZSd9LFxuXHR3ZWVrUGlja2VyOiB7dHlwZTogJ3dlZWsnLCBldmVudDogJ2NoYW5nZSd9LFxuXHR0aW1lUGlja2VyOiB7dHlwZTogJ3RpbWUnLCBldmVudDogJ2NoYW5nZSd9XG4gICAgfVxuICAgIFxuXG4gICAgZm9yICh2YXIgbmFtZSBpbiBiYXNpY0lucHV0cykge1xuXHRpZiAoYmFzaWNJbnB1dHMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcblx0ICAgIChmdW5jdGlvbiAobmFtZSkge1xuXHRcdG9ialtuYW1lXSA9IGZ1bmN0aW9uICh2YWx1ZSwgYXR0cnMpIHtcblx0XHQgICAgYXR0cnMgPSBhdHRycyB8fCB7fTtcblx0XHQgICAgYXR0cnNbJ3R5cGUnXSA9IGJhc2ljSW5wdXRzW25hbWVdLnR5cGU7XG5cdFx0ICAgIGF0dHJzWyd2YWx1ZSddID0gdmFsdWU7XG5cdFx0ICAgIFxuXHRcdCAgICByZXR1cm4gb24oXCJpbnB1dFwiLCBbYmFzaWNJbnB1dHNbbmFtZV0uZXZlbnRdLCBhdHRycywgZnVuY3Rpb24oZXYpIHtcblx0XHRcdHJldHVybiBldiA/IGV2LnRhcmdldC52YWx1ZSA6IHZhbHVlO1xuXHRcdCAgICB9KTtcblx0XHR9XG5cdCAgICB9KShuYW1lKTtcblx0fVxuICAgIH1cbn1cblxuZnVuY3Rpb24gdGV4dGFyZWEodmFsdWUsIGF0dHJzKSB7XG4gICAgYXR0cnMgPSBhdHRycyB8fCB7fTtcbiAgICBcbiAgICByZXR1cm4gb24oXCJ0ZXh0YXJlYVwiLCBbXCJrZXl1cFwiLCBcImJsdXJcIl0sIGF0dHJzLCBmdW5jdGlvbihldikge1xuXHR2YXIgbmV3VmFsdWUgPSBldiA/IGV2LnRhcmdldC52YWx1ZSA6IHZhbHVlO1xuXHR0ZXh0KHZhbHVlKTtcblx0cmV0dXJuIG5ld1ZhbHVlO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiB0ZXh0Qm94KHZhbHVlLCBhdHRycykge1xuICAgIGF0dHJzID0gYXR0cnMgfHwge307XG4gICAgYXR0cnMudHlwZSA9ICd0ZXh0JztcbiAgICBhdHRycy52YWx1ZSA9IHZhbHVlO1xuICAgIGF0dHJzLmV4dHJhID0gZnVuY3Rpb24gKGVsdCkge1xuICAgIFx0ZWx0LnZhbHVlID0gdmFsdWU7XG4gICAgfTtcbiAgICBcbiAgICBcbiAgICByZXR1cm4gb24oXCJpbnB1dFwiLCBbXCJpbnB1dFwiXSwgYXR0cnMsIGZ1bmN0aW9uKGV2KSB7XG5cdHJldHVybiBldiA/IGV2LnRhcmdldC52YWx1ZSA6IHZhbHVlO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBjaGVja0JveCh2YWx1ZSwgYXR0cnMpIHtcbiAgICBhdHRycyA9IGF0dHJzIHx8IHt9O1xuICAgIGF0dHJzLnR5cGUgPSBcImNoZWNrYm94XCI7XG4gICAgaWYgKHZhbHVlKSB7XG5cdGF0dHJzLmNoZWNrZWQgPSBcInRydWVcIjtcbiAgICB9XG4gICAgYXR0cnMuZXh0cmEgPSBmdW5jdGlvbiAoZWx0KSB7XG5cdGVsdC5jaGVja2VkID0gdmFsdWU7XG4gICAgfTtcbiAgICBcbiAgICByZXR1cm4gb24oXCJpbnB1dFwiLCBbXCJjbGlja1wiXSwgYXR0cnMsIGZ1bmN0aW9uKGV2KSB7XG5cdHJldHVybiBldiA/IGV2LnRhcmdldC5jaGVja2VkIDogdmFsdWU7XG4gICAgfSk7XG59XG5cblxuZnVuY3Rpb24gYWZ0ZXIoaWQsIGRlbGF5KSB7XG4gICAgaWYgKEdVSS50aW1lcnMuaGFzT3duUHJvcGVydHkoaWQpKSB7XG5cdGlmIChHVUkudGltZXJzW2lkXSkge1xuXHQgICAgcmV0dXJuIHRydWU7XG5cdH1cblx0cmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBlbHNlIHtcblx0R1VJLnRpbWVyc1tpZF0gPSBmYWxzZTtcblx0d2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdCAgICBHVUkudGltZXJzW2lkXSA9IHRydWU7XG5cdCAgICBkb1JlbmRlcigpO1xuXHR9LCBkZWxheSk7XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIGJ1dHRvbihsYWJlbCwgYXR0cnMpIHtcbiAgICByZXR1cm4gb24oXCJidXR0b25cIiwgW1wiY2xpY2tcIl0sIGF0dHJzLCBmdW5jdGlvbihldikge1xuXHR0ZXh0KGxhYmVsKTtcblx0cmV0dXJuIGV2ICE9PSB1bmRlZmluZWQ7XG4gICAgfSk7XG59XG5cblxuZnVuY3Rpb24gc2VsZWN0KHZhbHVlLCB4LCB5LCB6KSB7XG4gICAgLy9pZENsYXNzLCBhdHRycywgYmxvY2tcblxuICAgIGZ1bmN0aW9uIG9wdGlvbihvcHRWYWx1ZSwgbGFiZWwpIHtcblx0dmFyIGF0dHJzID0ge3ZhbHVlOiBvcHRWYWx1ZX07XG5cdGlmIChvcHRWYWx1ZSA9PT0gdmFsdWUpIHtcblx0ICAgIGF0dHJzWydzZWxlY3RlZCddID0gdHJ1ZTtcblx0fVxuXHRsYWJlbCA9IGxhYmVsIHx8IG9wdFZhbHVlO1xuXHRyZXR1cm4gd2l0aEVsZW1lbnQoXCJvcHRpb25cIiwgYXR0cnMsIGZ1bmN0aW9uICgpIHtcblx0ICAgIHRleHQobGFiZWwpO1xuXHR9KTtcbiAgICB9XG4gICAgXG4gICAgdmFyIGJsb2NrID0gZXh0cmFjdEJsb2NrKGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIG9uKFwic2VsZWN0XCIsIFtcImNoYW5nZVwiXSwgZGVmYXVsdEF0dHJzKHgsIHksIHopLCBmdW5jdGlvbihldikge1xuXHRibG9jayhvcHRpb24pO1xuXHRyZXR1cm4gZXYgIFxuXHQgICAgPyBldi50YXJnZXQub3B0aW9uc1tldi50YXJnZXQuc2VsZWN0ZWRJbmRleF0udmFsdWVcblx0ICAgIDogdmFsdWU7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHJhZGlvR3JvdXAodmFsdWUsICB4LCB5LCB6KSB7XG4gICAgdmFyIHJlc3VsdCA9IHZhbHVlO1xuICAgIHZhciBuYW1lID0gJ25hbWUnICsgKEdVSS5pZHMrKyk7XG4gICAgZnVuY3Rpb24gcmFkaW8ocmFkaW9WYWx1ZSwgbGFiZWwpIHtcblx0dmFyIGF0dHJzID0ge3R5cGU6IFwicmFkaW9cIiwgbmFtZTogbmFtZX07XG5cdGlmIChyYWRpb1ZhbHVlID09PSB2YWx1ZSkge1xuXHQgICAgYXR0cnNbJ2NoZWNrZWQnXSA9IHRydWU7XG5cdH1cblx0YXR0cnMuZXh0cmEgPSBmdW5jdGlvbiAoZWx0KSB7XG5cdCAgICBlbHQuY2hlY2tlZCA9IChyYWRpb1ZhbHVlID09PSB2YWx1ZSk7XG5cdH07XG5cdHJldHVybiBvbihcImxhYmVsXCIsIFtdLCB7fSwgZnVuY3Rpb24gKCkge1xuXHQgICAgb24oXCJpbnB1dFwiLCBbXCJjbGlja1wiXSwgYXR0cnMsIGZ1bmN0aW9uIChldikge1xuXHRcdGlmIChldikge1xuXHRcdCAgICByZXN1bHQgPSByYWRpb1ZhbHVlO1xuXHRcdH1cblx0XHRyZXR1cm4gcmFkaW9WYWx1ZTtcblx0ICAgIH0pXG5cdCAgICB0ZXh0KGxhYmVsIHx8IHJhZGlvVmFsdWUpO1xuXHQgICAgcmV0dXJuIHJhZGlvVmFsdWU7XG5cdH0pO1xuICAgIH1cblxuICAgIHZhciBibG9jayA9IGV4dHJhY3RCbG9jayhhcmd1bWVudHMpO1xuICAgIGJsb2NrKHJhZGlvKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBsYWJlbCh0eHQpIHtcbiAgICAvLyBGSVhNRTogdGhpcyBpcyBleHRyZW1lbHkgYnJpdHRsZS5cbiAgICB2YXIgaWQgPSBcImlkXCIgKyAoR1VJLmlkcyArIDEpOyAvLyBOQjogbm90ICsrICEhXG4gICAgcmV0dXJuIHdpdGhFbGVtZW50KFwibGFiZWxcIiwge1wiZm9yXCI6IGlkfSwgZnVuY3Rpb24gKCkge1xuXHQgdGV4dCh0eHQpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiB0ZXh0KHR4dCkge1xuICAgIEdVSS5mb2N1cy5wdXNoKHR4dCk7XG59XG5cbmZ1bmN0aW9uIGJyKCkge1xuICAgIHdpdGhFbGVtZW50KFwiYnJcIiwge30sIGZ1bmN0aW9uKCkge30pO1xufVxuXG4vLyBCbG9jayBsZXZlbCBlbGVtZW50c1xuXG5cbmZ1bmN0aW9uIGRlZmF1bHRBdHRycyh4LCB5LCB6KSB7XG4gICAgXG4gICAgaWYgKHR5cGVvZiB4ID09PSBcImZ1bmN0aW9uXCIpIHtcblx0cmV0dXJuIHt9O1xuICAgIH1cblxuICAgIHZhciBhdHRycyA9IHt9O1xuICAgIHZhciBpZENsYXNzO1xuICAgIGlmICh0eXBlb2YgeCA9PT0gXCJzdHJpbmdcIikge1xuXHRpZENsYXNzID0geDtcblx0aWYgKHR5cGVvZiB5ID09IFwib2JqZWN0XCIpIHtcblx0ICAgIGF0dHJzID0geTtcblx0fVxuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgeCA9PT0gXCJvYmplY3RcIikge1xuXHRhdHRycyA9IHg7XG4gICAgfVxuXG4gICAgaWYgKCFpZENsYXNzKSB7XG5cdHJldHVybiBhdHRycztcbiAgICB9XG4gICAgXG4gICAgdmFyIGhhc2ggPSBpZENsYXNzLmluZGV4T2YoXCIjXCIpO1xuICAgIHZhciBkb3QgPSBpZENsYXNzLmluZGV4T2YoXCIuXCIpO1xuICAgIGlmIChkb3QgPiAtMSkge1xuXHRhdHRyc1snY2xhc3MnXSA9IGlkQ2xhc3Muc2xpY2UoZG90ICsgMSwgaGFzaCA+IC0xID8gaGFzaCA6IGlkQ2xhc3MubGVuZ3RoKTtcbiAgICB9XG4gICAgaWYgKGhhc2ggPiAtMSkge1xuXHRhdHRyc1snaWQnXSA9IGlkQ2xhc3Muc2xpY2UoaGFzaCArIDEpO1xuICAgIH1cbiAgICByZXR1cm4gYXR0cnM7XG59XG5cbmZ1bmN0aW9uIGFkZElubGluZUVsZW1lbnRzKG9iaikge1xuICAgIHZhciBlbHRzID0gW1wiYVwiLCBcInBcIiwgXCJzcGFuXCIsIFwiaDFcIiwgXCJoMlwiLCBcImgzXCIsIFwiaDRcIl07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbHRzLmxlbmd0aDsgaSsrKSB7XG5cdG9ialtlbHRzW2ldXSA9IGZ1bmN0aW9uIChlbHQpIHtcblx0ICAgIHJldHVybiBmdW5jdGlvbiAodHh0LCBpZENsYXNzLCBhdHRycykge1xuXHRcdHdpdGhFbGVtZW50KGVsdCwgZGVmYXVsdEF0dHJzKGlkQ2xhc3MsIGF0dHJzKSwgZnVuY3Rpb24oKSB7XG5cdFx0ICAgIHRleHQodHh0KTtcblx0XHR9KTtcblx0ICAgIH1cblx0fShlbHRzW2ldKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RCbG9jayhhcmdzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG5cdGlmICgodHlwZW9mIGFyZ3NbaV0pID09PSBcImZ1bmN0aW9uXCIpIHtcblx0ICAgIHJldHVybiBhcmdzW2ldO1xuXHR9XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbigpIHt9O1xufVxuXG5mdW5jdGlvbiBhZGRCbG9ja0VsZW1lbnRzKG9iaikge1xuICAgIHZhciBlbHRzID0gW1wic2VjdGlvblwiLCBcImRpdlwiLCBcInVsXCIsIFwib2xcIiwgXCJsaVwiLCBcImhlYWRlclwiLCBcImZvb3RlclwiLCBcImNvZGVcIiwgXCJwcmVcIixcblx0XHRcImRsXCIsIFwiZHRcIiwgXCJkZFwiLCBcImZpZWxkc2V0XCIsIFwidGFibGVcIiwgXCJ0ZFwiLCBcInRyXCIsIFwidGhcIiwgXCJ0aGVhZFwiXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsdHMubGVuZ3RoOyBpKyspIHtcblx0b2JqW2VsdHNbaV1dID0gZnVuY3Rpb24gKGVsdCkge1xuXHQgICAgcmV0dXJuIGZ1bmN0aW9uICh4LCB5LCB6KSB7XG5cdFx0dmFyIGJsb2NrID0gZnVuY3Rpb24oKSB7fTtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdCAgICBpZiAoKHR5cGVvZiBhcmd1bWVudHNbaV0pID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdGJsb2NrID0gYXJndW1lbnRzW2ldO1xuXHRcdCAgICB9XG5cdFx0fVxuXHRcdHJldHVybiB3aXRoRWxlbWVudChlbHQsIGRlZmF1bHRBdHRycyh4LCB5LCB6KSwgZXh0cmFjdEJsb2NrKGFyZ3VtZW50cykpO1xuXHQgICAgfVxuXHR9KGVsdHNbaV0pO1xuICAgIH1cbn1cblxuXG5mdW5jdGlvbiBpbnN0YWxsKG9iaikge1xuICAgIGZvciAodmFyIGsgaW4gdGhpcykge1xuXHRpZiAodGhpcy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuXHQgICAgb2JqW2tdID0gdGhpc1trXTtcblx0fVxuICAgIH1cbn1cblxuXG52YXIgbGliaW1ndWkgPSB7XG4gICAgc2V0dXA6IHNldHVwLFxuICAgIGluaXQ6IGluaXQsXG4gICAgY29tcG9uZW50OiBjb21wb25lbnQsXG4gICAgY2xvbmU6IGNsb25lLFxuICAgIHRleHRhcmVhOiB0ZXh0YXJlYSxcbiAgICBzZWxlY3Q6IHNlbGVjdCxcbiAgICByYWRpb0dyb3VwOiByYWRpb0dyb3VwLFxuICAgIHRleHQ6IHRleHQsXG4gICAgbGFiZWw6IGxhYmVsLFxuICAgIGNoZWNrQm94OiBjaGVja0JveCxcbiAgICB0ZXh0Qm94OiB0ZXh0Qm94LFxuICAgIGJ1dHRvbjogYnV0dG9uLFxuICAgIGhlcmU6IGhlcmUsXG4gICAgYWZ0ZXI6IGFmdGVyLFxuICAgIG9uOiBvbixcbiAgICBicjogYnIsXG4gICAgZGVhbFdpdGhJdDogZGVhbFdpdGhJdCxcbiAgICBjYWxsU3RhY2s6IGNhbGxTdGFjayxcbiAgICBtZW1vOiBtZW1vLFxuICAgIG5hbWVkOiBuYW1lZCxcbiAgICBpbnN0YWxsOiBpbnN0YWxsXG59O1xuXG5hZGRCbG9ja0VsZW1lbnRzKGxpYmltZ3VpKTtcbmFkZElubGluZUVsZW1lbnRzKGxpYmltZ3VpKTtcbmFkZElucHV0RWxlbWVudHMobGliaW1ndWkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGxpYmltZ3VpO1xuXG4iLCIvKlxuICogandlcnR5IC0gQXdlc29tZSBoYW5kbGluZyBvZiBrZXlib2FyZCBldmVudHNcbiAqXG4gKiBqd2VydHkgaXMgYSBKUyBsaWIgd2hpY2ggYWxsb3dzIHlvdSB0byBiaW5kLCBmaXJlIGFuZCBhc3NlcnQga2V5IGNvbWJpbmF0aW9uXG4gKiBzdHJpbmdzIGFnYWluc3QgZWxlbWVudHMgYW5kIGV2ZW50cy4gSXQgbm9ybWFsaXNlcyB0aGUgcG9vciBzdGQgYXBpIGludG9cbiAqIHNvbWV0aGluZyBlYXN5IHRvIHVzZSBhbmQgY2xlYXIuXG4gKlxuICogVGhpcyBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBNSVRcbiAqIEZvciB0aGUgZnVsbCBsaWNlbnNlIHNlZTogaHR0cDovL2tlaXRoYW11cy5taXQtbGljZW5zZS5vcmcvXG4gKiBGb3IgbW9yZSBpbmZvcm1hdGlvbiBzZWU6IGh0dHA6Ly9rZWl0aGFtdXMuZ2l0aHViLmNvbS9qd2VydHlcbiAqXG4gKiBAYXV0aG9yIEtlaXRoIENpcmtlbCAoJ2tlaXRoYW11cycpIDxqd2VydHlAa2VpdGhjaXJrZWwuY28udWs+XG4gKiBAbGljZW5zZSBodHRwOi8va2VpdGhhbXVzLm1pdC1saWNlbnNlLm9yZy9cbiAqIEBjb3B5cmlnaHQgQ29weXJpZ2h0IMKpIDIwMTEsIEtlaXRoIENpcmtlbFxuICpcbiAqL1xuKGZ1bmN0aW9uIChnbG9iYWwsIGV4cG9ydHMpIHtcbiAgICBcbiAgICAvLyBIZWxwZXIgbWV0aG9kcyAmIHZhcnM6XG4gICAgdmFyICRkID0gZ2xvYmFsLmRvY3VtZW50XG4gICAgLCAgICQgPSAoZ2xvYmFsLmpRdWVyeSB8fCBnbG9iYWwuWmVwdG8gfHwgZ2xvYmFsLmVuZGVyIHx8ICRkKVxuICAgICwgICAkJFxuICAgICwgICAkYlxuICAgICwgICBrZSA9ICdrZXlkb3duJztcbiAgICBcbiAgICBmdW5jdGlvbiByZWFsVHlwZU9mKHYsIHMpIHtcbiAgICAgICAgcmV0dXJuICh2ID09PSBudWxsKSA/IHMgPT09ICdudWxsJ1xuICAgICAgICA6ICh2ID09PSB1bmRlZmluZWQpID8gcyA9PT0gJ3VuZGVmaW5lZCdcbiAgICAgICAgOiAodi5pcyAmJiB2IGluc3RhbmNlb2YgJCkgPyBzID09PSAnZWxlbWVudCdcbiAgICAgICAgOiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodikudG9Mb3dlckNhc2UoKS5pbmRleE9mKHMpID4gNztcbiAgICB9XG4gICAgXG4gICAgaWYgKCQgPT09ICRkKSB7XG4gICAgICAgICQkID0gZnVuY3Rpb24gKHNlbGVjdG9yLCBjb250ZXh0KSB7XG4gICAgICAgICAgICByZXR1cm4gc2VsZWN0b3IgPyAkLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IsIGNvbnRleHQgfHwgJCkgOiAkO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgJGIgPSBmdW5jdGlvbiAoZSwgZm4pIHsgZS5hZGRFdmVudExpc3RlbmVyKGtlLCBmbiwgZmFsc2UpOyB9O1xuICAgICAgICAkZiA9IGZ1bmN0aW9uIChlLCBqd2VydHlFdikge1xuICAgICAgICAgICAgdmFyIHJldCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpXG4gICAgICAgICAgICAsICAgaTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0LmluaXRFdmVudChrZSwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZvciAoaSBpbiBqd2VydHlFdikgcmV0W2ldID0gandlcnR5RXZbaV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiAoZSB8fCAkKS5kaXNwYXRjaEV2ZW50KHJldCk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICAkJCA9IGZ1bmN0aW9uIChzZWxlY3RvciwgY29udGV4dCwgZm4pIHsgcmV0dXJuICQoc2VsZWN0b3IgfHwgJGQsIGNvbnRleHQpOyB9O1xuICAgICAgICAkYiA9IGZ1bmN0aW9uIChlLCBmbikgeyAkKGUpLmJpbmQoa2UgKyAnLmp3ZXJ0eScsIGZuKTsgfTtcbiAgICAgICAgJGYgPSBmdW5jdGlvbiAoZSwgb2IpIHsgJChlIHx8ICRkKS50cmlnZ2VyKCQuRXZlbnQoa2UsIG9iKSk7IH07XG4gICAgfVxuICAgIFxuICAgIC8vIFByaXZhdGVcbiAgICB2YXIgX21vZFByb3BzID0geyAxNjogJ3NoaWZ0S2V5JywgMTc6ICdjdHJsS2V5JywgMTg6ICdhbHRLZXknLCA5MTogJ21ldGFLZXknIH07XG4gICAgXG4gICAgLy8gR2VuZXJhdGUga2V5IG1hcHBpbmdzIGZvciBjb21tb24ga2V5cyB0aGF0IGFyZSBub3QgcHJpbnRhYmxlLlxuICAgIHZhciBfa2V5cyA9IHtcbiAgICAgICAgXG4gICAgICAgIC8vIE1PRCBha2EgdG9nZ2xlYWJsZSBrZXlzXG4gICAgICAgIG1vZHM6IHtcbiAgICAgICAgICAgIC8vIFNoaWZ0IGtleSwg4oenXG4gICAgICAgICAgICAn4oenJzogMTYsIHNoaWZ0OiAxNixcbiAgICAgICAgICAgIC8vIENUUkwga2V5LCBvbiBNYWM6IOKMg1xuICAgICAgICAgICAgJ+KMgyc6IDE3LCBjdHJsOiAxNyxcbiAgICAgICAgICAgIC8vIEFMVCBrZXksIG9uIE1hYzog4oylIChBbHQpXG4gICAgICAgICAgICAn4oylJzogMTgsIGFsdDogMTgsIG9wdGlvbjogMTgsXG4gICAgICAgICAgICAvLyBNRVRBLCBvbiBNYWM6IOKMmCAoQ01EKSwgb24gV2luZG93cyAoV2luKSwgb24gTGludXggKFN1cGVyKVxuICAgICAgICAgICAgJ+KMmCc6IDkxLCBtZXRhOiA5MSwgY21kOiA5MSwgJ3N1cGVyJzogOTEsIHdpbjogOTFcbiAgICAgICAgfSxcbiAgICAgICAgXG4gICAgICAgIC8vIE5vcm1hbCBrZXlzXG4gICAgICAgIGtleXM6IHtcbiAgICAgICAgICAgIC8vIEJhY2tzcGFjZSBrZXksIG9uIE1hYzog4oyrIChCYWNrc3BhY2UpXG4gICAgICAgICAgICAn4oyrJzogOCwgYmFja3NwYWNlOiA4LFxuICAgICAgICAgICAgLy8gVGFiIEtleSwgb24gTWFjOiDih6UgKFRhYiksIG9uIFdpbmRvd3Mg4oel4oelXG4gICAgICAgICAgICAn4oelJzogOSwgJ+KHhic6IDksIHRhYjogOSxcbiAgICAgICAgICAgIC8vIFJldHVybiBrZXksIOKGqVxuICAgICAgICAgICAgJ+KGqSc6IDEzLCAncmV0dXJuJzogMTMsIGVudGVyOiAxMywgJ+KMhSc6IDEzLFxuICAgICAgICAgICAgLy8gUGF1c2UvQnJlYWsga2V5XG4gICAgICAgICAgICAncGF1c2UnOiAxOSwgJ3BhdXNlLWJyZWFrJzogMTksXG4gICAgICAgICAgICAvLyBDYXBzIExvY2sga2V5LCDih6pcbiAgICAgICAgICAgICfih6onOiAyMCwgY2FwczogMjAsICdjYXBzLWxvY2snOiAyMCxcbiAgICAgICAgICAgIC8vIEVzY2FwZSBrZXksIG9uIE1hYzog4o6LLCBvbiBXaW5kb3dzOiBFc2NcbiAgICAgICAgICAgICfijosnOiAyNywgZXNjYXBlOiAyNywgZXNjOiAyNyxcbiAgICAgICAgICAgIC8vIFNwYWNlIGtleVxuICAgICAgICAgICAgc3BhY2U6IDMyLFxuICAgICAgICAgICAgLy8gUGFnZS1VcCBrZXksIG9yIHBndXAsIG9uIE1hYzog4oaWXG4gICAgICAgICAgICAn4oaWJzogMzMsIHBndXA6IDMzLCAncGFnZS11cCc6IDMzLFxuICAgICAgICAgICAgLy8gUGFnZS1Eb3duIGtleSwgb3IgcGdkb3duLCBvbiBNYWM6IOKGmFxuICAgICAgICAgICAgJ+KGmCc6IDM0LCBwZ2Rvd246IDM0LCAncGFnZS1kb3duJzogMzQsXG4gICAgICAgICAgICAvLyBFTkQga2V5LCBvbiBNYWM6IOKHn1xuICAgICAgICAgICAgJ+KHnyc6IDM1LCBlbmQ6IDM1LFxuICAgICAgICAgICAgLy8gSE9NRSBrZXksIG9uIE1hYzog4oeeXG4gICAgICAgICAgICAn4oeeJzogMzYsIGhvbWU6IDM2LFxuICAgICAgICAgICAgLy8gSW5zZXJ0IGtleSwgb3IgaW5zXG4gICAgICAgICAgICBpbnM6IDQ1LCBpbnNlcnQ6IDQ1LFxuICAgICAgICAgICAgLy8gRGVsZXRlIGtleSwgb24gTWFjOiDijKsgKERlbGV0ZSlcbiAgICAgICAgICAgIGRlbDogNDYsICdkZWxldGUnOiA0NixcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTGVmdCBBcnJvdyBLZXksIG9yIOKGkFxuICAgICAgICAgICAgJ+KGkCc6IDM3LCBsZWZ0OiAzNywgJ2Fycm93LWxlZnQnOiAzNyxcbiAgICAgICAgICAgIC8vIFVwIEFycm93IEtleSwgb3Ig4oaRXG4gICAgICAgICAgICAn4oaRJzogMzgsIHVwOiAzOCwgJ2Fycm93LXVwJzogMzgsXG4gICAgICAgICAgICAvLyBSaWdodCBBcnJvdyBLZXksIG9yIOKGklxuICAgICAgICAgICAgJ+KGkic6IDM5LCByaWdodDogMzksICdhcnJvdy1yaWdodCc6IDM5LFxuICAgICAgICAgICAgLy8gVXAgQXJyb3cgS2V5LCBvciDihpNcbiAgICAgICAgICAgICfihpMnOiA0MCwgZG93bjogNDAsICdhcnJvdy1kb3duJzogNDAsXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIG9kaXRpZXMsIHByaW50aW5nIGNoYXJhY3RlcnMgdGhhdCBjb21lIG91dCB3cm9uZzpcbiAgICAgICAgICAgIC8vIE51bS1NdWx0aXBseSwgb3IgKlxuICAgICAgICAgICAgJyonOiAxMDYsIHN0YXI6IDEwNiwgYXN0ZXJpc2s6IDEwNiwgbXVsdGlwbHk6IDEwNixcbiAgICAgICAgICAgIC8vIE51bS1QbHVzIG9yICtcbiAgICAgICAgICAgICcrJzogMTA3LCAncGx1cyc6IDEwNyxcbiAgICAgICAgICAgIC8vIE51bS1TdWJ0cmFjdCwgb3IgLVxuICAgICAgICAgICAgJy0nOiAxMDksIHN1YnRyYWN0OiAxMDksXG4gICAgICAgICAgICAvLyBTZW1pY29sb25cbiAgICAgICAgICAgICc7JzogMTg2LCBzZW1pY29sb246MTg2LFxuICAgICAgICAgICAgLy8gPSBvciBlcXVhbHNcbiAgICAgICAgICAgICc9JzogMTg3LCAnZXF1YWxzJzogMTg3LFxuICAgICAgICAgICAgLy8gQ29tbWEsIG9yICxcbiAgICAgICAgICAgICcsJzogMTg4LCBjb21tYTogMTg4LFxuICAgICAgICAgICAgLy8nLSc6IDE4OSwgLy8/Pz9cbiAgICAgICAgICAgIC8vIFBlcmlvZCwgb3IgLiwgb3IgZnVsbC1zdG9wXG4gICAgICAgICAgICAnLic6IDE5MCwgcGVyaW9kOiAxOTAsICdmdWxsLXN0b3AnOiAxOTAsXG4gICAgICAgICAgICAvLyBTbGFzaCwgb3IgLywgb3IgZm9yd2FyZC1zbGFzaFxuICAgICAgICAgICAgJy8nOiAxOTEsIHNsYXNoOiAxOTEsICdmb3J3YXJkLXNsYXNoJzogMTkxLFxuICAgICAgICAgICAgLy8gVGljaywgb3IgYCwgb3IgYmFjay1xdW90ZSBcbiAgICAgICAgICAgICdgJzogMTkyLCB0aWNrOiAxOTIsICdiYWNrLXF1b3RlJzogMTkyLFxuICAgICAgICAgICAgLy8gT3BlbiBicmFja2V0LCBvciBbXG4gICAgICAgICAgICAnWyc6IDIxOSwgJ29wZW4tYnJhY2tldCc6IDIxOSxcbiAgICAgICAgICAgIC8vIEJhY2sgc2xhc2gsIG9yIFxcXG4gICAgICAgICAgICAnXFxcXCc6IDIyMCwgJ2JhY2stc2xhc2gnOiAyMjAsXG4gICAgICAgICAgICAvLyBDbG9zZSBiYWNrZXQsIG9yIF1cbiAgICAgICAgICAgICddJzogMjIxLCAnY2xvc2UtYnJhY2tldCc6IDIyMSxcbiAgICAgICAgICAgIC8vIEFwb3N0cmFwaGUsIG9yIFF1b3RlLCBvciAnXG4gICAgICAgICAgICAnXFwnJzogMjIyLCBxdW90ZTogMjIyLCBhcG9zdHJhcGhlOiAyMjJcbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9O1xuICAgIFxuICAgIC8vIFRvIG1pbmltaXNlIGNvZGUgYmxvYXQsIGFkZCBhbGwgb2YgdGhlIE5VTVBBRCAwLTkga2V5cyBpbiBhIGxvb3BcbiAgICBpID0gOTUsIG4gPSAwO1xuICAgIHdoaWxlKCsraSA8IDEwNikge1xuICAgICAgICBfa2V5cy5rZXlzWydudW0tJyArIG5dID0gaTtcbiAgICAgICAgKytuO1xuICAgIH1cbiAgICBcbiAgICAvLyBUbyBtaW5pbWlzZSBjb2RlIGJsb2F0LCBhZGQgYWxsIG9mIHRoZSB0b3Agcm93IDAtOSBrZXlzIGluIGEgbG9vcFxuICAgIGkgPSA0NywgbiA9IDA7XG4gICAgd2hpbGUoKytpIDwgNTgpIHtcbiAgICAgICAgX2tleXMua2V5c1tuXSA9IGk7XG4gICAgICAgICsrbjtcbiAgICB9XG4gICAgXG4gICAgLy8gVG8gbWluaW1pc2UgY29kZSBibG9hdCwgYWRkIGFsbCBvZiB0aGUgRjEtRjI1IGtleXMgaW4gYSBsb29wXG4gICAgaSA9IDExMSwgbiA9IDE7XG4gICAgd2hpbGUoKytpIDwgMTM2KSB7XG4gICAgICAgIF9rZXlzLmtleXNbJ2YnICsgbl0gPSBpO1xuICAgICAgICArK247XG4gICAgfVxuICAgIFxuICAgIC8vIFRvIG1pbmltaXNlIGNvZGUgYmxvYXQsIGFkZCBhbGwgb2YgdGhlIGxldHRlcnMgb2YgdGhlIGFscGhhYmV0IGluIGEgbG9vcFxuICAgIHZhciBpID0gNjQ7XG4gICAgd2hpbGUoKytpIDwgOTEpIHtcbiAgICAgICAgX2tleXMua2V5c1tTdHJpbmcuZnJvbUNoYXJDb2RlKGkpLnRvTG93ZXJDYXNlKCldID0gaTtcbiAgICB9XG4gICAgXG4gICAgZnVuY3Rpb24gSndlcnR5Q29kZShqd2VydHlDb2RlKSB7XG4gICAgICAgIHZhciBpXG4gICAgICAgICwgICBjXG4gICAgICAgICwgICBuXG4gICAgICAgICwgICB6XG4gICAgICAgICwgICBrZXlDb21ib1xuICAgICAgICAsICAgb3B0aW9uYWxzXG4gICAgICAgICwgICBqd2VydHlDb2RlRnJhZ21lbnRcbiAgICAgICAgLCAgIHJhbmdlTWF0Y2hlc1xuICAgICAgICAsICAgcmFuZ2VJO1xuICAgICAgICBcbiAgICAgICAgLy8gSW4tY2FzZSB3ZSBnZXQgY2FsbGVkIHdpdGggYW4gaW5zdGFuY2Ugb2Ygb3Vyc2VsdmVzLCBqdXN0IHJldHVybiB0aGF0LlxuICAgICAgICBpZiAoandlcnR5Q29kZSBpbnN0YW5jZW9mIEp3ZXJ0eUNvZGUpIHJldHVybiBqd2VydHlDb2RlO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgandlcnR5Q29kZSBpc24ndCBhbiBhcnJheSwgY2FzdCBpdCBhcyBhIHN0cmluZyBhbmQgc3BsaXQgaW50byBhcnJheS5cbiAgICAgICAgaWYgKCFyZWFsVHlwZU9mKGp3ZXJ0eUNvZGUsICdhcnJheScpKSB7XG4gICAgICAgICAgICBqd2VydHlDb2RlID0gKFN0cmluZyhqd2VydHlDb2RlKSkucmVwbGFjZSgvXFxzL2csICcnKS50b0xvd2VyQ2FzZSgpLlxuICAgICAgICAgICAgICAgIG1hdGNoKC8oPzpcXCssfFteLF0pKy9nKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTG9vcCB0aHJvdWdoIGVhY2gga2V5IHNlcXVlbmNlIGluIGp3ZXJ0eUNvZGVcbiAgICAgICAgZm9yIChpID0gMCwgYyA9IGp3ZXJ0eUNvZGUubGVuZ3RoOyBpIDwgYzsgKytpKSB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIElmIHRoZSBrZXkgY29tYm8gYXQgdGhpcyBwYXJ0IG9mIHRoZSBzZXF1ZW5jZSBpc24ndCBhbiBhcnJheSxcbiAgICAgICAgICAgIC8vIGNhc3QgYXMgYSBzdHJpbmcgYW5kIHNwbGl0IGludG8gYW4gYXJyYXkuXG4gICAgICAgICAgICBpZiAoIXJlYWxUeXBlT2YoandlcnR5Q29kZVtpXSwgJ2FycmF5JykpIHtcbiAgICAgICAgICAgICAgICBqd2VydHlDb2RlW2ldID0gU3RyaW5nKGp3ZXJ0eUNvZGVbaV0pXG4gICAgICAgICAgICAgICAgICAgIC5tYXRjaCgvKD86XFwrXFwvfFteXFwvXSkrL2cpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQYXJzZSB0aGUga2V5IG9wdGlvbmFscyBpbiB0aGlzIHNlcXVlbmNlXG4gICAgICAgICAgICBvcHRpb25hbHMgPSBbXSwgbiA9IGp3ZXJ0eUNvZGVbaV0ubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUgKG4tLSkge1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEJlZ2luIGNyZWF0aW5nIHRoZSBvYmplY3QgZm9yIHRoaXMga2V5IGNvbWJvXG4gICAgICAgICAgICAgICAgdmFyIGp3ZXJ0eUNvZGVGcmFnbWVudCA9IGp3ZXJ0eUNvZGVbaV1bbl07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAga2V5Q29tYm8gPSB7XG4gICAgICAgICAgICAgICAgICAgIGp3ZXJ0eUNvbWJvOiBTdHJpbmcoandlcnR5Q29kZUZyYWdtZW50KSxcbiAgICAgICAgICAgICAgICAgICAgc2hpZnRLZXk6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjdHJsS2V5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgYWx0S2V5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgbWV0YUtleTogZmFsc2VcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSWYgandlcnR5Q29kZUZyYWdtZW50IGlzbid0IGFuIGFycmF5IHRoZW4gY2FzdCBhcyBhIHN0cmluZ1xuICAgICAgICAgICAgICAgIC8vIGFuZCBzcGxpdCBpdCBpbnRvIG9uZS5cbiAgICAgICAgICAgICAgICBpZiAoIXJlYWxUeXBlT2YoandlcnR5Q29kZUZyYWdtZW50LCAnYXJyYXknKSkge1xuICAgICAgICAgICAgICAgICAgICBqd2VydHlDb2RlRnJhZ21lbnQgPSBTdHJpbmcoandlcnR5Q29kZUZyYWdtZW50KS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAubWF0Y2goLyg/Oig/OlteXFwrXSkrfFxcK1xcK3xeXFwrJCkvZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHogPSBqd2VydHlDb2RlRnJhZ21lbnQubGVuZ3RoO1xuICAgICAgICAgICAgICAgIHdoaWxlICh6LS0pIHtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIE5vcm1hbGlzZSBtYXRjaGluZyBlcnJvcnNcbiAgICAgICAgICAgICAgICAgICAgaWYgKGp3ZXJ0eUNvZGVGcmFnbWVudFt6XSA9PT0gJysrJykgandlcnR5Q29kZUZyYWdtZW50W3pdID0gJysnO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5qZWN0IGVpdGhlciBrZXlDb2RlIG9yIGN0cmwvbWV0YS9zaGlmdC9hbHRLZXkgaW50byBrZXlDb21ib1xuICAgICAgICAgICAgICAgICAgICBpZiAoandlcnR5Q29kZUZyYWdtZW50W3pdIGluIF9rZXlzLm1vZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleUNvbWJvW19tb2RQcm9wc1tfa2V5cy5tb2RzW2p3ZXJ0eUNvZGVGcmFnbWVudFt6XV1dXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZihqd2VydHlDb2RlRnJhZ21lbnRbel0gaW4gX2tleXMua2V5cykge1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5Q29tYm8ua2V5Q29kZSA9IF9rZXlzLmtleXNbandlcnR5Q29kZUZyYWdtZW50W3pdXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlTWF0Y2hlcyA9IGp3ZXJ0eUNvZGVGcmFnbWVudFt6XS5tYXRjaCgvXlxcWyhbXi1dK1xcLT9bXi1dKiktKFteLV0rXFwtP1teLV0qKVxcXSQvKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmVhbFR5cGVPZihrZXlDb21iby5rZXlDb2RlLCAndW5kZWZpbmVkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgd2UgcGlja2VkIHVwIGEgcmFuZ2UgbWF0Y2ggZWFybGllci4uLlxuICAgICAgICAgICAgICAgICAgICBpZiAocmFuZ2VNYXRjaGVzICYmIChyYW5nZU1hdGNoZXNbMV0gaW4gX2tleXMua2V5cykgJiYgKHJhbmdlTWF0Y2hlc1syXSBpbiBfa2V5cy5rZXlzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2VNYXRjaGVzWzJdID0gX2tleXMua2V5c1tyYW5nZU1hdGNoZXNbMl1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2VNYXRjaGVzWzFdID0gX2tleXMua2V5c1tyYW5nZU1hdGNoZXNbMV1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBHbyBmcm9tIG1hdGNoIDEgYW5kIGNhcHR1cmUgYWxsIGtleS1jb21vYnMgdXAgdG8gbWF0Y2ggMlxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChyYW5nZUkgPSByYW5nZU1hdGNoZXNbMV07IHJhbmdlSSA8IHJhbmdlTWF0Y2hlc1syXTsgKytyYW5nZUkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25hbHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsdEtleToga2V5Q29tYm8uYWx0S2V5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaGlmdEtleToga2V5Q29tYm8uc2hpZnRLZXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGFLZXk6IGtleUNvbWJvLm1ldGFLZXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN0cmxLZXk6IGtleUNvbWJvLmN0cmxLZXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleUNvZGU6IHJhbmdlSSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgandlcnR5Q29tYm86IFN0cmluZyhqd2VydHlDb2RlRnJhZ21lbnQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlDb21iby5rZXlDb2RlID0gcmFuZ2VJO1xuICAgICAgICAgICAgICAgICAgICAvLyBJbmplY3QgZWl0aGVyIGtleUNvZGUgb3IgY3RybC9tZXRhL3NoaWZ0L2FsdEtleSBpbnRvIGtleUNvbWJvXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlDb21iby5rZXlDb2RlID0gMDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvcHRpb25hbHMucHVzaChrZXlDb21ibyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXNbaV0gPSBvcHRpb25hbHM7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sZW5ndGggPSBpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgXG4gICAgdmFyIGp3ZXJ0eSA9IGV4cG9ydHMuandlcnR5ID0geyAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBqd2VydHkuZXZlbnRcbiAgICAgICAgICpcbiAgICAgICAgICogYGp3ZXJ0eS5ldmVudGAgd2lsbCByZXR1cm4gYSBmdW5jdGlvbiwgd2hpY2ggZXhwZWN0cyB0aGUgZmlyc3RcbiAgICAgICAgICogIGFyZ3VtZW50IHRvIGJlIGEga2V5IGV2ZW50LiBXaGVuIHRoZSBrZXkgZXZlbnQgbWF0Y2hlcyBgandlcnR5Q29kZWAsXG4gICAgICAgICAqICBgY2FsbGJhY2tGdW5jdGlvbmAgaXMgZmlyZWQuIGBqd2VydHkuZXZlbnRgIGlzIHVzZWQgYnkgYGp3ZXJ0eS5rZXlgXG4gICAgICAgICAqICB0byBiaW5kIHRoZSBmdW5jdGlvbiBpdCByZXR1cm5zLiBgandlcnR5LmV2ZW50YCBpcyB1c2VmdWwgZm9yXG4gICAgICAgICAqICBhdHRhY2hpbmcgdG8geW91ciBvd24gZXZlbnQgbGlzdGVuZXJzLiBJdCBjYW4gYmUgdXNlZCBhcyBhIGRlY29yYXRvclxuICAgICAgICAgKiAgbWV0aG9kIHRvIGVuY2Fwc3VsYXRlIGZ1bmN0aW9uYWxpdHkgdGhhdCB5b3Ugb25seSB3YW50IHRvIGZpcmUgYWZ0ZXJcbiAgICAgICAgICogIGEgc3BlY2lmaWMga2V5IGNvbWJvLiBJZiBgY2FsbGJhY2tDb250ZXh0YCBpcyBzcGVjaWZpZWQgdGhlbiBpdCB3aWxsXG4gICAgICAgICAqICBiZSBzdXBwbGllZCBhcyBgY2FsbGJhY2tGdW5jdGlvbmAncyBjb250ZXh0IC0gaW4gb3RoZXIgd29yZHMsIHRoZVxuICAgICAgICAgKiAga2V5d29yZCBgdGhpc2Agd2lsbCBiZSBzZXQgdG8gYGNhbGxiYWNrQ29udGV4dGAgaW5zaWRlIHRoZVxuICAgICAgICAgKiAgYGNhbGxiYWNrRnVuY3Rpb25gIGZ1bmN0aW9uLlxuICAgICAgICAgKlxuICAgICAgICAgKiAgIEBwYXJhbSB7TWl4ZWR9IGp3ZXJ0eUNvZGUgY2FuIGJlIGFuIGFycmF5LCBvciBzdHJpbmcgb2Yga2V5XG4gICAgICAgICAqICAgICAgY29tYmluYXRpb25zLCB3aGljaCBpbmNsdWRlcyBvcHRpbmFscyBhbmQgb3Igc2VxdWVuY2VzXG4gICAgICAgICAqICAgQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tGdWNudGlvbiBpcyBhIGZ1bmN0aW9uIChvciBib29sZWFuKSB3aGljaFxuICAgICAgICAgKiAgICAgIGlzIGZpcmVkIHdoZW4gandlcnR5Q29kZSBpcyBtYXRjaGVkLiBSZXR1cm4gZmFsc2UgdG9cbiAgICAgICAgICogICAgICBwcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAqICAgQHBhcmFtIHtPYmplY3R9IGNhbGxiYWNrQ29udGV4dCAoT3B0aW9uYWwpIFRoZSBjb250ZXh0IHRvIGNhbGxcbiAgICAgICAgICogICAgICBgY2FsbGJhY2tgIHdpdGggKGkuZSB0aGlzKVxuICAgICAgICAgKiAgICAgIFxuICAgICAgICAgKi9cbiAgICAgICAgZXZlbnQ6IGZ1bmN0aW9uIChqd2VydHlDb2RlLCBjYWxsYmFja0Z1bmN0aW9uLCBjYWxsYmFja0NvbnRleHQgLyo/IHRoaXMgKi8pIHtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ29uc3RydWN0IGEgZnVuY3Rpb24gb3V0IG9mIGNhbGxiYWNrRnVuY3Rpb24sIGlmIGl0IGlzIGEgYm9vbGVhbi5cbiAgICAgICAgICAgIGlmIChyZWFsVHlwZU9mKGNhbGxiYWNrRnVuY3Rpb24sICdib29sZWFuJykpIHtcbiAgICAgICAgICAgICAgICB2YXIgYm9vbCA9IGNhbGxiYWNrRnVuY3Rpb247XG4gICAgICAgICAgICAgICAgY2FsbGJhY2tGdW5jdGlvbiA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGJvb2w7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgandlcnR5Q29kZSA9IG5ldyBKd2VydHlDb2RlKGp3ZXJ0eUNvZGUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXNlIGluLXNjb3BlIHZhcnMuXG4gICAgICAgICAgICB2YXIgaSA9IDBcbiAgICAgICAgICAgICwgICBjID0gandlcnR5Q29kZS5sZW5ndGggLSAxXG4gICAgICAgICAgICAsICAgcmV0dXJuVmFsdWVcbiAgICAgICAgICAgICwgICBqd2VydHlDb2RlSXM7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRoaXMgaXMgdGhlIGV2ZW50IGxpc3RlbmVyIGZ1bmN0aW9uIHRoYXQgZ2V0cyByZXR1cm5lZC4uLlxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIGlmIGp3ZXJ0eUNvZGVJcyByZXR1cm5zIHRydXRoeSAoc3RyaW5nKS4uLlxuICAgICAgICAgICAgICAgIGlmICgoandlcnR5Q29kZUlzID0gandlcnR5LmlzKGp3ZXJ0eUNvZGUsIGV2ZW50LCBpKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gLi4uIGFuZCB0aGlzIGlzbid0IHRoZSBsYXN0IGtleSBpbiB0aGUgc2VxdWVuY2UsXG4gICAgICAgICAgICAgICAgICAgIC8vIGluY3JpbWVudCB0aGUga2V5IGluIHNlcXVlbmNlIHRvIGNoZWNrLlxuICAgICAgICAgICAgICAgICAgICBpZiAoaSA8IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICsraTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgLy8gLi4uIGFuZCB0aGlzIGlzIHRoZSBsYXN0IGluIHRoZSBzZXF1ZW5jZSAob3IgdGhlIG9ubHlcbiAgICAgICAgICAgICAgICAgICAgLy8gb25lIGluIHNlcXVlbmNlKSwgdGhlbiBmaXJlIHRoZSBjYWxsYmFja1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSBjYWxsYmFja0Z1bmN0aW9uLmNhbGwoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tDb250ZXh0IHx8IHRoaXMsIGV2ZW50LCBqd2VydHlDb2RlSXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgY2FsbGJhY2sgcmV0dXJuZWQgZmFsc2UsIHRoZW4gd2Ugc2hvdWxkIHJ1blxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXR1cm5WYWx1ZSA9PT0gZmFsc2UpIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlc2V0IGkgZm9yIHRoZSBuZXh0IHNlcXVlbmNlIHRvIGZpcmUuXG4gICAgICAgICAgICAgICAgICAgICAgICBpID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgZXZlbnQgZGlkbid0IGhpdCB0aGlzIHRpbWUsIHdlIHNob3VsZCByZXNldCBpIHRvIDAsXG4gICAgICAgICAgICAgICAgLy8gdGhhdCBpcywgdW5sZXNzIHRoaXMgY29tYm8gd2FzIHRoZSBmaXJzdCBpbiB0aGUgc2VxdWVuY2UsXG4gICAgICAgICAgICAgICAgLy8gaW4gd2hpY2ggY2FzZSB3ZSBzaG91bGQgcmVzZXQgaSB0byAxLlxuICAgICAgICAgICAgICAgIGkgPSBqd2VydHkuaXMoandlcnR5Q29kZSwgZXZlbnQpID8gMSA6IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogandlcnR5LmlzXG4gICAgICAgICAqXG4gICAgICAgICAqIGBqd2VydHkuaXNgIHdpbGwgcmV0dXJuIGEgYm9vbGVhbiB2YWx1ZSwgYmFzZWQgb24gaWYgYGV2ZW50YCBtYXRjaGVzXG4gICAgICAgICAqICBgandlcnR5Q29kZWAuIGBqd2VydHkuaXNgIGlzIGNhbGxlZCBieSBgandlcnR5LmV2ZW50YCB0byBjaGVja1xuICAgICAgICAgKiAgd2hldGhlciBvciBub3QgdG8gZmlyZSB0aGUgY2FsbGJhY2suIGBldmVudGAgY2FuIGJlIGEgRE9NIGV2ZW50LCBvclxuICAgICAgICAgKiAgYSBqUXVlcnkvWmVwdG8vRW5kZXIgbWFudWZhY3R1cmVkIGV2ZW50LiBUaGUgcHJvcGVydGllcyBvZlxuICAgICAgICAgKiAgYGp3ZXJ0eUNvZGVgIChzcGVmaWNpYWxseSBjdHJsS2V5LCBhbHRLZXksIG1ldGFLZXksIHNoaWZ0S2V5IGFuZFxuICAgICAgICAgKiAga2V5Q29kZSkgc2hvdWxkIG1hdGNoIGBqd2VydHlDb2RlYCdzIHByb3BlcnRpZXMgLSBpZiB0aGV5IGRvLCB0aGVuXG4gICAgICAgICAqICBgandlcnR5LmlzYCB3aWxsIHJldHVybiBgdHJ1ZWAuIElmIHRoZXkgZG9uJ3QsIGBqd2VydHkuaXNgIHdpbGxcbiAgICAgICAgICogIHJldHVybiBgZmFsc2VgLlxuICAgICAgICAgKlxuICAgICAgICAgKiAgIEBwYXJhbSB7TWl4ZWR9IGp3ZXJ0eUNvZGUgY2FuIGJlIGFuIGFycmF5LCBvciBzdHJpbmcgb2Yga2V5XG4gICAgICAgICAqICAgICAgY29tYmluYXRpb25zLCB3aGljaCBpbmNsdWRlcyBvcHRpbmFscyBhbmQgb3Igc2VxdWVuY2VzXG4gICAgICAgICAqICAgQHBhcmFtIHtLZXlib2FyZEV2ZW50fSBldmVudCBpcyB0aGUgS2V5Ym9hcmRFdmVudCB0byBhc3NlcnQgYWdhaW5zdFxuICAgICAgICAgKiAgIEBwYXJhbSB7SW50ZWdlcn0gaSAoT3B0aW9uYWwpIGNoZWNrcyB0aGUgYGlgIGtleSBpbiBqd2VydHlDb2RlXG4gICAgICAgICAqICAgICAgc2VxdWVuY2VcbiAgICAgICAgICogICAgICBcbiAgICAgICAgICovXG4gICAgICAgIGlzOiBmdW5jdGlvbiAoandlcnR5Q29kZSwgZXZlbnQsIGkgLyo/IDAqLykge1xuICAgICAgICAgICAgandlcnR5Q29kZSA9IG5ldyBKd2VydHlDb2RlKGp3ZXJ0eUNvZGUpO1xuICAgICAgICAgICAgLy8gRGVmYXVsdCBgaWAgdG8gMFxuICAgICAgICAgICAgaSA9IGkgfHwgMDtcbiAgICAgICAgICAgIC8vIFdlIGFyZSBvbmx5IGludGVyZXN0aW5nIGluIGBpYCBvZiBqd2VydHlDb2RlO1xuICAgICAgICAgICAgandlcnR5Q29kZSA9IGp3ZXJ0eUNvZGVbaV07XG4gICAgICAgICAgICAvLyBqUXVlcnkgc3RvcmVzIHRoZSAqcmVhbCogZXZlbnQgaW4gYG9yaWdpbmFsRXZlbnRgLCB3aGljaCB3ZSB1c2VcbiAgICAgICAgICAgIC8vIGJlY2F1c2UgaXQgZG9lcyBhbm5veXRoaW5nIHN0dWZmIHRvIGBtZXRhS2V5YFxuICAgICAgICAgICAgZXZlbnQgPSBldmVudC5vcmlnaW5hbEV2ZW50IHx8IGV2ZW50O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBXZSdsbCBsb29rIGF0IGVhY2ggb3B0aW9uYWwgaW4gdGhpcyBqd2VydHlDb2RlIHNlcXVlbmNlLi4uXG4gICAgICAgICAgICB2YXIga2V5XG4gICAgICAgICAgICAsICAgbiA9IGp3ZXJ0eUNvZGUubGVuZ3RoXG4gICAgICAgICAgICAsICAgcmV0dXJuVmFsdWUgPSBmYWxzZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTG9vcCB0aHJvdWdoIGVhY2ggZnJhZ21lbnQgb2YgandlcnR5Q29kZVxuICAgICAgICAgICAgd2hpbGUgKG4tLSkge1xuICAgICAgICAgICAgICAgIHJldHVyblZhbHVlID0gandlcnR5Q29kZVtuXS5qd2VydHlDb21ibztcbiAgICAgICAgICAgICAgICAvLyBGb3IgZWFjaCBwcm9wZXJ0eSBpbiB0aGUgandlcnR5Q29kZSBvYmplY3QsIGNvbXBhcmUgdG8gYGV2ZW50YFxuICAgICAgICAgICAgICAgIGZvciAodmFyIHAgaW4gandlcnR5Q29kZVtuXSkge1xuICAgICAgICAgICAgICAgICAgICAvLyAuLi5leGNlcHQgZm9yIGp3ZXJ0eUNvZGUuandlcnR5Q29tYm8uLi5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHAgIT09ICdqd2VydHlDb21ibycgJiYgZXZlbnRbcF0gIT0gandlcnR5Q29kZVtuXVtwXSkgcmV0dXJuVmFsdWUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhpcyBqd2VydHlDb2RlIG9wdGlvbmFsIHdhc24ndCBmYWxzZXksIHRoZW4gd2UgY2FuIHJldHVybiBlYXJseS5cbiAgICAgICAgICAgICAgICBpZiAocmV0dXJuVmFsdWUgIT09IGZhbHNlKSByZXR1cm4gcmV0dXJuVmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmV0dXJuVmFsdWU7XG4gICAgICAgIH0sXG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogandlcnR5LmtleVxuICAgICAgICAgKlxuICAgICAgICAgKiAgYGp3ZXJ0eS5rZXlgIHdpbGwgYXR0YWNoIGFuIGV2ZW50IGxpc3RlbmVyIGFuZCBmaXJlXG4gICAgICAgICAqICAgYGNhbGxiYWNrRnVuY3Rpb25gIHdoZW4gYGp3ZXJ0eUNvZGVgIG1hdGNoZXMuIFRoZSBldmVudCBsaXN0ZW5lciBpc1xuICAgICAgICAgKiAgIGF0dGFjaGVkIHRvIGBkb2N1bWVudGAsIG1lYW5pbmcgaXQgd2lsbCBsaXN0ZW4gZm9yIGFueSBrZXkgZXZlbnRzXG4gICAgICAgICAqICAgb24gdGhlIHBhZ2UgKGEgZ2xvYmFsIHNob3J0Y3V0IGxpc3RlbmVyKS4gSWYgYGNhbGxiYWNrQ29udGV4dGAgaXNcbiAgICAgICAgICogICBzcGVjaWZpZWQgdGhlbiBpdCB3aWxsIGJlIHN1cHBsaWVkIGFzIGBjYWxsYmFja0Z1bmN0aW9uYCdzIGNvbnRleHRcbiAgICAgICAgICogICAtIGluIG90aGVyIHdvcmRzLCB0aGUga2V5d29yZCBgdGhpc2Agd2lsbCBiZSBzZXQgdG9cbiAgICAgICAgICogICBgY2FsbGJhY2tDb250ZXh0YCBpbnNpZGUgdGhlIGBjYWxsYmFja0Z1bmN0aW9uYCBmdW5jdGlvbi5cbiAgICAgICAgICpcbiAgICAgICAgICogICBAcGFyYW0ge01peGVkfSBqd2VydHlDb2RlIGNhbiBiZSBhbiBhcnJheSwgb3Igc3RyaW5nIG9mIGtleVxuICAgICAgICAgKiAgICAgIGNvbWJpbmF0aW9ucywgd2hpY2ggaW5jbHVkZXMgb3B0aW5hbHMgYW5kIG9yIHNlcXVlbmNlc1xuICAgICAgICAgKiAgIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrRnVuY3Rpb24gaXMgYSBmdW5jdGlvbiAob3IgYm9vbGVhbikgd2hpY2hcbiAgICAgICAgICogICAgICBpcyBmaXJlZCB3aGVuIGp3ZXJ0eUNvZGUgaXMgbWF0Y2hlZC4gUmV0dXJuIGZhbHNlIHRvXG4gICAgICAgICAqICAgICAgcHJldmVudERlZmF1bHQoKVxuICAgICAgICAgKiAgIEBwYXJhbSB7T2JqZWN0fSBjYWxsYmFja0NvbnRleHQgKE9wdGlvbmFsKSBUaGUgY29udGV4dCB0byBjYWxsXG4gICAgICAgICAqICAgICAgYGNhbGxiYWNrYCB3aXRoIChpLmUgdGhpcylcbiAgICAgICAgICogICBAcGFyYW0ge01peGVkfSBzZWxlY3RvciBjYW4gYmUgYSBzdHJpbmcsIGpRdWVyeS9aZXB0by9FbmRlciBvYmplY3QsXG4gICAgICAgICAqICAgICAgb3IgYW4gSFRNTCpFbGVtZW50IG9uIHdoaWNoIHRvIGJpbmQgdGhlIGV2ZW50TGlzdGVuZXJcbiAgICAgICAgICogICBAcGFyYW0ge01peGVkfSBzZWxlY3RvckNvbnRleHQgY2FuIGJlIGEgc3RyaW5nLCBqUXVlcnkvWmVwdG8vRW5kZXJcbiAgICAgICAgICogICAgICBvYmplY3QsIG9yIGFuIEhUTUwqRWxlbWVudCBvbiB3aGljaCB0byBzY29wZSB0aGUgc2VsZWN0b3JcbiAgICAgICAgICogIFxuICAgICAgICAgKi9cbiAgICAgICAga2V5OiBmdW5jdGlvbiAoandlcnR5Q29kZSwgY2FsbGJhY2tGdW5jdGlvbiwgY2FsbGJhY2tDb250ZXh0IC8qPyB0aGlzICovLCBzZWxlY3RvciAvKj8gZG9jdW1lbnQgKi8sIHNlbGVjdG9yQ29udGV4dCAvKj8gYm9keSAqLykge1xuICAgICAgICAgICAgLy8gQmVjYXVzZSBjYWxsYmFja0NvbnRleHQgaXMgb3B0aW9uYWwsIHdlIHNob3VsZCBjaGVjayBpZiB0aGVcbiAgICAgICAgICAgIC8vIGBjYWxsYmFja0NvbnRleHRgIGlzIGEgc3RyaW5nIG9yIGVsZW1lbnQsIGFuZCBpZiBpdCBpcywgdGhlbiB0aGVcbiAgICAgICAgICAgIC8vIGZ1bmN0aW9uIHdhcyBjYWxsZWQgd2l0aG91dCBhIGNvbnRleHQsIGFuZCBgY2FsbGJhY2tDb250ZXh0YCBpc1xuICAgICAgICAgICAgLy8gYWN0dWFsbHkgYHNlbGVjdG9yYFxuICAgICAgICAgICAgdmFyIHJlYWxTZWxlY3RvciA9IHJlYWxUeXBlT2YoY2FsbGJhY2tDb250ZXh0LCAnZWxlbWVudCcpIHx8IHJlYWxUeXBlT2YoY2FsbGJhY2tDb250ZXh0LCAnc3RyaW5nJykgPyBjYWxsYmFja0NvbnRleHQgOiBzZWxlY3RvclxuICAgICAgICAgICAgLy8gSWYgYGNhbGxiYWNrQ29udGV4dGAgaXMgdW5kZWZpbmVkLCBvciBpZiB3ZSBza2lwcGVkIGl0IChhbmRcbiAgICAgICAgICAgIC8vIHRoZXJlZm9yZSBpdCBpcyBgcmVhbFNlbGVjdG9yYCksIHNldCBjb250ZXh0IHRvIGBnbG9iYWxgLlxuICAgICAgICAgICAgLCAgIHJlYWxjYWxsYmFja0NvbnRleHQgPSByZWFsU2VsZWN0b3IgPT09IGNhbGxiYWNrQ29udGV4dCA/IGdsb2JhbCA6IGNhbGxiYWNrQ29udGV4dFxuICAgICAgICAgICAgLy8gRmluYWxseSBpZiB3ZSBkaWQgc2tpcCBgY2FsbGJhY2tDb250ZXh0YCwgdGhlbiBzaGlmdFxuICAgICAgICAgICAgLy8gYHNlbGVjdG9yQ29udGV4dGAgdG8gdGhlIGxlZnQgKHRha2UgaXQgZnJvbSBgc2VsZWN0b3JgKVxuICAgICAgICAgICAgLCAgICByZWFsU2VsZWN0b3JDb250ZXh0ID0gcmVhbFNlbGVjdG9yID09PSBjYWxsYmFja0NvbnRleHQgPyBzZWxlY3RvciA6IHNlbGVjdG9yQ29udGV4dDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSWYgYHJlYWxTZWxlY3RvcmAgaXMgYWxyZWFkeSBhIGpRdWVyeS9aZXB0by9FbmRlci9ET00gZWxlbWVudCxcbiAgICAgICAgICAgIC8vIHRoZW4ganVzdCB1c2UgaXQgbmVhdCwgb3RoZXJ3aXNlIGZpbmQgaXQgaW4gRE9NIHVzaW5nICQkKClcbiAgICAgICAgICAgICRiKHJlYWxUeXBlT2YocmVhbFNlbGVjdG9yLCAnZWxlbWVudCcpID9cbiAgICAgICAgICAgICAgIHJlYWxTZWxlY3RvciA6ICQkKHJlYWxTZWxlY3RvciwgcmVhbFNlbGVjdG9yQ29udGV4dClcbiAgICAgICAgICAgICwgandlcnR5LmV2ZW50KGp3ZXJ0eUNvZGUsIGNhbGxiYWNrRnVuY3Rpb24sIHJlYWxjYWxsYmFja0NvbnRleHQpKTtcbiAgICAgICAgfSxcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBqd2VydHkuZmlyZVxuICAgICAgICAgKlxuICAgICAgICAgKiBgandlcnR5LmZpcmVgIHdpbGwgY29uc3RydWN0IGEga2V5dXAgZXZlbnQgdG8gZmlyZSwgYmFzZWQgb25cbiAgICAgICAgICogIGBqd2VydHlDb2RlYC4gVGhlIGV2ZW50IHdpbGwgYmUgZmlyZWQgYWdhaW5zdCBgc2VsZWN0b3JgLlxuICAgICAgICAgKiAgYHNlbGVjdG9yQ29udGV4dGAgaXMgdXNlZCB0byBzZWFyY2ggZm9yIGBzZWxlY3RvcmAgd2l0aGluXG4gICAgICAgICAqICBgc2VsZWN0b3JDb250ZXh0YCwgc2ltaWxhciB0byBqUXVlcnknc1xuICAgICAgICAgKiAgYCQoJ3NlbGVjdG9yJywgJ2NvbnRleHQnKWAuXG4gICAgICAgICAqXG4gICAgICAgICAqICAgQHBhcmFtIHtNaXhlZH0gandlcnR5Q29kZSBjYW4gYmUgYW4gYXJyYXksIG9yIHN0cmluZyBvZiBrZXlcbiAgICAgICAgICogICAgICBjb21iaW5hdGlvbnMsIHdoaWNoIGluY2x1ZGVzIG9wdGluYWxzIGFuZCBvciBzZXF1ZW5jZXNcbiAgICAgICAgICogICBAcGFyYW0ge01peGVkfSBzZWxlY3RvciBjYW4gYmUgYSBzdHJpbmcsIGpRdWVyeS9aZXB0by9FbmRlciBvYmplY3QsXG4gICAgICAgICAqICAgICAgb3IgYW4gSFRNTCpFbGVtZW50IG9uIHdoaWNoIHRvIGJpbmQgdGhlIGV2ZW50TGlzdGVuZXJcbiAgICAgICAgICogICBAcGFyYW0ge01peGVkfSBzZWxlY3RvckNvbnRleHQgY2FuIGJlIGEgc3RyaW5nLCBqUXVlcnkvWmVwdG8vRW5kZXJcbiAgICAgICAgICogICAgICBvYmplY3QsIG9yIGFuIEhUTUwqRWxlbWVudCBvbiB3aGljaCB0byBzY29wZSB0aGUgc2VsZWN0b3JcbiAgICAgICAgICogIFxuICAgICAgICAgKi9cbiAgICAgICAgZmlyZTogZnVuY3Rpb24gKGp3ZXJ0eUNvZGUsIHNlbGVjdG9yIC8qPyBkb2N1bWVudCAqLywgc2VsZWN0b3JDb250ZXh0IC8qPyBib2R5ICovLCBpKSB7XG4gICAgICAgICAgICBqd2VydHlDb2RlID0gbmV3IEp3ZXJ0eUNvZGUoandlcnR5Q29kZSk7XG4gICAgICAgICAgICB2YXIgcmVhbEkgPSByZWFsVHlwZU9mKHNlbGVjdG9yQ29udGV4dCwgJ251bWJlcicpID8gc2VsZWN0b3JDb250ZXh0IDogaTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSWYgYHJlYWxTZWxlY3RvcmAgaXMgYWxyZWFkeSBhIGpRdWVyeS9aZXB0by9FbmRlci9ET00gZWxlbWVudCxcbiAgICAgICAgICAgIC8vIHRoZW4ganVzdCB1c2UgaXQgbmVhdCwgb3RoZXJ3aXNlIGZpbmQgaXQgaW4gRE9NIHVzaW5nICQkKClcbiAgICAgICAgICAgICRmKHJlYWxUeXBlT2Yoc2VsZWN0b3IsICdlbGVtZW50JykgP1xuICAgICAgICAgICAgICAgIHNlbGVjdG9yIDogJCQoc2VsZWN0b3IsIHNlbGVjdG9yQ29udGV4dClcbiAgICAgICAgICAgICwgandlcnR5Q29kZVtyZWFsSSB8fCAwXVswXSk7XG4gICAgICAgIH0sXG4gICAgICAgIFxuICAgICAgICBLRVlTOiBfa2V5c1xuICAgIH07XG4gICAgXG59KHRoaXMsICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cyA/IG1vZHVsZS5leHBvcnRzIDogdGhpcykpKTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGltZ3VpID0gcmVxdWlyZSgnLi4vbGliaW1ndWknKTtcbmltZ3VpLmluc3RhbGwod2luZG93KTtcblxudmFyIG1vZGVsID0ge1xuICAgIHN1YnRyZWU6IHtwYXRoczogW1tdXSwgc2VsZWN0ZWQ6IGhvbGUoKX1cbn07XG5cbmZ1bmN0aW9uIHJ1bigpIHtcbiAgICBzZXR1cChzdHJlZGl0QXBwLCBtb2RlbCwgJ3Jvb3QnKTtcbn1cblxuXG5mdW5jdGlvbiBwcCh0cmVlKSB7XG4gICAgZnVuY3Rpb24gb3AodHJlZSkge1xuXHRyZXR1cm4gdHJlZS5mb2N1cyA/IFwiW1wiIDogXCIoXCI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2wodHJlZSkge1xuXHRyZXR1cm4gdHJlZS5mb2N1cyA/IFwiXVwiIDogXCIpXCI7XG4gICAgfVxuXG4gICAgaWYgKHRyZWUubGFiZWwgPT09IG51bGwpIHtcblx0cmV0dXJuIG9wKHRyZWUpICsgY2wodHJlZSk7XG4gICAgfVxuXG5cbiAgICBpZiAodHJlZS5sYWJlbC5tYXRjaCgvW2FiY10vKSkge1xuXHRyZXR1cm4gb3AodHJlZSkgKyB0cmVlLmxhYmVsICsgY2wodHJlZSk7XG4gICAgfVxuXG4gICAgaWYgKHRyZWUubGFiZWwgPT09IFwiQWRkXCIpIHtcblx0cmV0dXJuIG9wKHRyZWUpICsgcHAodHJlZS5raWRzWzBdKSArIFwiICsgXCIgKyBwcCh0cmVlLmtpZHNbMV0pICsgY2wodHJlZSk7XG4gICAgfVxuXG4gICAgaWYgKHRyZWUubGFiZWwgPT09IFwiTXVsXCIpIHtcblx0cmV0dXJuIG9wKHRyZWUpICsgcHAodHJlZS5raWRzWzBdKSArIFwiICogXCIgKyBwcCh0cmVlLmtpZHNbMV0pICsgY2wodHJlZSk7XG4gICAgfVxuXG4gICAgaWYgKHRyZWUubGFiZWwgPT09IFwiSWZcIikge1xuXHRyZXR1cm4gb3AodHJlZSkgKyBcImlmIFwiICsgcHAodHJlZS5raWRzWzBdKSArIFwiIHRoZW4gXCIgKyBwcCh0cmVlLmtpZHNbMV0pICsgXCIgZWxzZSBcIiArIHBwKHRyZWUua2lkc1syXSkgKyBjbCh0cmVlKTtcbiAgICB9XG5cbn1cblxuXG5mdW5jdGlvbiBmb2N1c2VkKHRyZWUsIGYpIHtcbiAgICBpZiAodHJlZS5mb2N1cykge1xuXHRkZWxldGUgdHJlZS5mb2N1cztcblx0b24oXCJzcGFuXCIsIFtdLCB7Y2xhc3M6IFwiZm9jdXNcIn0sIGYpO1xuICAgIH1cbiAgICBlbHNlIHtcblx0ZigpO1xuICAgIH1cbn1cblxuXG5mdW5jdGlvbiByZW5kZXJJbmZpeCh0cmVlLCBzeW1ib2wsIHBhcmVudCwgbGVmdCkge1xuICAgIGZ1bmN0aW9uIHBhcmVucyhmKSB7XG5cdGlmIChwcmVjZWRlbmNlW3BhcmVudF0gPiBwcmVjZWRlbmNlW3RyZWUubGFiZWxdXG5cdCAgICB8fCAodHJlZS5sYWJlbCA9PT0gcGFyZW50ICYmIGxlZnQgJiYgIWFzc29jaWF0ZXNMZWZ0W3BhcmVudF0gKSkge1xuXHQgICAgdGV4dChcIihcIik7XG5cdCAgICBmKCk7XG5cdCAgICB0ZXh0KFwiKVwiKTtcblx0fVxuXHRlbHNlIHtcblx0ICAgIGYoKTtcblx0fVxuICAgIH1cbiAgICBcbiAgICBmb2N1c2VkKHRyZWUsIGZ1bmN0aW9uICgpIHtcblx0cGFyZW5zKGZ1bmN0aW9uICgpIHtcblx0ICAgIHJlbmRlclRyZWUodHJlZS5raWRzWzBdLCB0cmVlLmxhYmVsLCB0cnVlKTtcblx0ICAgIHRleHQoXCIgXCIgKyBzeW1ib2wgKyBcIiBcIik7XG5cdCAgICByZW5kZXJUcmVlKHRyZWUua2lkc1sxXSwgdHJlZS5sYWJlbCwgZmFsc2UpO1xuXHR9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyVHJlZSh0cmVlLCBwYXJlbnQsIHNpZGUpIHtcblxuICAgIGlmICh0cmVlLmxhYmVsID09PSBudWxsKSB7XG5cdGZvY3VzZWQodHJlZSwgZnVuY3Rpb24oKSB7IHRleHQoXCI8PlwiKSB9KTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHJlZS5sYWJlbCA9PT0gXCJBZGRcIikge1xuXHRyZW5kZXJJbmZpeCh0cmVlLCBcIitcIiwgcGFyZW50LCBzaWRlKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHJlZS5sYWJlbCA9PT0gXCJNdWxcIikge1xuXHRyZW5kZXJJbmZpeCh0cmVlLCBcIipcIiwgcGFyZW50LCBzaWRlKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHJlZS5sYWJlbCA9PT0gXCJFeHBcIikge1xuXHRyZW5kZXJJbmZpeCh0cmVlLCBcIl5cIiwgcGFyZW50LCBzaWRlKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHJlZS5sYWJlbCA9PT0gXCIoXCIpIHtcblx0dGV4dChcIihcIik7XG5cdHJlbmRlclRyZWUodHJlZS5raWRzWzBdKTtcbiAgICB9XG4gICAgZWxzZSB7XG5cdGZvY3VzZWQodHJlZSwgZnVuY3Rpb24oKSB7IHRleHQodHJlZS5sYWJlbCk7IH0pO1xuICAgIH1cblxufVxuXG5mdW5jdGlvbiBrZXlEaXYoa2V5cywgYm9keSkge1xuICAgIGZ1bmN0aW9uIHNldEZvY3VzKGVsdCkge1xuXHRlbHQuZm9jdXMoKTtcbiAgICB9XG5cbiAgICBvbihcImRpdlwiLCBbXCJrZXlkb3duOlwiICsga2V5cy5qb2luKFwiL1wiKV0sIHt0YWJpbmRleDogMSwgZXh0cmE6IHNldEZvY3VzfSwgYm9keSk7XG59XG5cbnZhciBzdHJlZGl0QXBwID0gY29tcG9uZW50KHtrZXlzOiBbXX0sIGZ1bmN0aW9uIHN0cmVkaXRBcHAoc2VsZiwgbW9kZWwpIHtcbiAgICB2YXIgdG9rZW5zID0gW1wiYVwiLCBcImJcIiwgXCJjXCIsIFwiQWRkXCIsIFwiTXVsXCIsIFwiRXhwXCIsIFwiSWZcIl07XG4gICAgXG4gICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG9rZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgXHRpZiAoYnV0dG9uKHRva2Vuc1tpXSkpIHtcbiAgICBcdCAgICBtb2RlbC5zdWJ0cmVlID0gZW50cnkyKHRva2Vuc1tpXSwgbW9kZWwuc3VidHJlZSk7XG4gICAgXHR9XG4gICAgfVxuXG4gICAgaWYgKGJ1dHRvbihcIihcIikpIHtcbiAgICBcdG1vZGVsLnN1YnRyZWUgPSBvcGVuKG1vZGVsLnN1YnRyZWUpO1xuICAgIH1cblxuICAgIGlmIChidXR0b24oXCIpXCIpKSB7XG4gICAgXHRtb2RlbC5zdWJ0cmVlID0gY2xvc2UobW9kZWwuc3VidHJlZSk7XG4gICAgfVxuXG4gICAgdmFyIG5hdnMgPSB7XG5cdFVwOiBsaWZ0MSh1cCksXG5cdERvd246IGxpZnQxKGRvd24pLFxuXHRMZWZ0OiBsaWZ0MShsZWZ0KSxcblx0UmlnaHQ6IGxpZnQxKHJpZ2h0KSxcblx0RGVsOiBsaWZ0MShraWxsKSxcblx0UHJvbTogbGlmdDEocHJvbW90ZSksXG5cdE5leHQ6IGxpZnQxKG5leHQpLFxuXHRQcmV2OiBsaWZ0MShwcmV2aW91czIpXG4gICAgfTtcbiAgICBmb3IgKHZhciBuIGluIG5hdnMpIHtcblx0aWYgKG5hdnMuaGFzT3duUHJvcGVydHkobikpIHtcblx0ICAgIGlmIChidXR0b24obikpIHtcblx0XHRtb2RlbC5zdWJ0cmVlID0gbmF2c1tuXShtb2RlbC5zdWJ0cmVlKTtcblx0ICAgIH1cblx0fVxuICAgIH1cblxuICAgIGJyKCk7XG5cbiAgICB2YXIgdCA9IGhvc3RXaXRoUGFyZW5zKG1vZGVsLnN1YnRyZWUpO1xuXG4gICAga2V5RGl2KFtcInNoaWZ0KzlcIiwgXCJzaGlmdCswXCIsIFwiW2Etel1cIiwgXCJzaGlmdCs9XCIsIFwic2hpZnQrOFwiLCBcInNoaWZ0KzZcIiwgXCJzaGlmdCthcnJvdy11cFwiLCBcIlvihpAt4oaTXVwiLCBcImJhY2tzcGFjZVwiXSxcblx0ICAgZnVuY3Rpb24gKGV2KSB7XG5cdCAgICAgICByZW5kZXJUcmVlKHQpO1xuXHQgICAgICAgaWYgKGV2KSB7XG5cdFx0ICAgaWYgKGV2LmlzS2V5KFwiYXJyb3ctdXBcIikpIHtcblx0XHQgICAgICAgbW9kZWwuc3VidHJlZSA9IG5hdnMuVXAobW9kZWwuc3VidHJlZSk7XG5cdFx0ICAgfVxuXHRcdCAgIGVsc2UgaWYgKGV2LmlzS2V5KFwiYXJyb3ctZG93blwiKSkge1xuXHRcdCAgICAgICBtb2RlbC5zdWJ0cmVlID0gbmF2cy5Eb3duKG1vZGVsLnN1YnRyZWUpO1xuXHRcdCAgIH1cblx0XHQgICBlbHNlIGlmIChldi5pc0tleShcImFycm93LWxlZnRcIikpIHtcblx0XHQgICAgICAgbW9kZWwuc3VidHJlZSA9IG5hdnMuUHJldihtb2RlbC5zdWJ0cmVlKTtcblx0XHQgICB9XG5cdFx0ICAgZWxzZSBpZiAoZXYuaXNLZXkoXCJhcnJvdy1yaWdodFwiKSkge1xuXHRcdCAgICAgICBtb2RlbC5zdWJ0cmVlID0gbmF2cy5OZXh0KG1vZGVsLnN1YnRyZWUpO1xuXHRcdCAgIH1cblx0XHQgICBlbHNlIGlmIChldi5pc0tleSgnYmFja3NwYWNlJykpIHtcbiAgICBcdFx0ICAgICAgIG1vZGVsLnN1YnRyZWUgPSBuYXZzLkRlbChtb2RlbC5zdWJ0cmVlKTtcblx0XHQgICB9XG5cdFx0ICAgZWxzZSBpZiAoZXYuaXNLZXkoJ3NoaWZ0K2Fycm93LXVwJykpIHtcbiAgICBcdFx0ICAgICAgIG1vZGVsLnN1YnRyZWUgPSBuYXZzLlByb20obW9kZWwuc3VidHJlZSk7XG5cdFx0ICAgfVxuXHRcdCAgIGVsc2UgaWYgKGV2LmlzS2V5KCdzaGlmdCs5JykpIHtcbiAgICBcdFx0ICAgICAgIG1vZGVsLnN1YnRyZWUgPSBvcGVuKG1vZGVsLnN1YnRyZWUpO1xuXHRcdCAgIH1cblx0XHQgICBlbHNlIGlmIChldi5pc0tleSgnc2hpZnQrMCcpKSB7XG4gICAgXHRcdCAgICAgICBtb2RlbC5zdWJ0cmVlID0gY2xvc2UobW9kZWwuc3VidHJlZSk7XG5cdFx0ICAgfVxuXHRcdCAgIGVsc2UgaWYgKGV2LmlzS2V5KCdbYS16XScpKSB7XG5cdFx0ICAgICAgIHZhciBjaCA9IFN0cmluZy5mcm9tQ2hhckNvZGUoZXYua2V5Q29kZSkudG9Mb3dlckNhc2UoKTtcblx0XHQgICAgICAgbW9kZWwuc3VidHJlZSA9IGVudHJ5MihjaCwgbW9kZWwuc3VidHJlZSk7XG5cdFx0ICAgfVxuXHRcdCAgIGVsc2UgaWYgKGV2LmlzS2V5KCdzaGlmdCs9JykpIHtcblx0XHQgICAgICAgbW9kZWwuc3VidHJlZSA9IGVudHJ5MihcIkFkZFwiLCBtb2RlbC5zdWJ0cmVlKTtcblx0XHQgICB9XG5cdFx0ICAgZWxzZSBpZiAoZXYuaXNLZXkoJ3NoaWZ0KzYnKSkge1xuXHRcdCAgICAgICBtb2RlbC5zdWJ0cmVlID0gZW50cnkyKFwiRXhwXCIsIG1vZGVsLnN1YnRyZWUpO1xuXHRcdCAgIH1cblx0XHQgICBlbHNlIGlmIChldi5pc0tleSgnc2hpZnQrOCcpKSB7XG5cdFx0ICAgICAgIG1vZGVsLnN1YnRyZWUgPSBlbnRyeTIoXCJNdWxcIiwgbW9kZWwuc3VidHJlZSk7XG5cdFx0ICAgfVxuXHRcdCAgIGVsc2Uge1xuXHRcdCAgICAgICBzZWxmLmtleXMucHVzaChcInVnaDogXCIgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGV2LmtleUNvZGUpKTtcblx0XHQgICB9XG5cdCAgICAgICB9XHQgICAgXG5cdCAgICAgICBwKHNlbGYua2V5cy5qb2luKCcsICcpKTtcblx0ICAgfSk7XG4gICAgXG5cblxuICAgIGgzKFwiTW9kZWwuc3VidHJlZVwiKTtcbiAgICBwKEpTT04uc3RyaW5naWZ5KG1vZGVsLnN1YnRyZWUpKTtcblxuICAgIGgzKFwiSG9zdFwiKTtcbiAgICBwKEpTT04uc3RyaW5naWZ5KHQpKTtcbn0pO1xuXG5cblxuXG52YXIgYVRyZWUgPSB7XG4gICAgbGFiZWw6IFwiU29tZSBsYWJlbFwiLFxuICAgIGtpZHM6IFtdXG59O1xuXG5mdW5jdGlvbiBhdG9taWModCkge1xuICAgIHJldHVybiB0LmtpZHMubGVuZ3RoID09PSAwO1xufVxuXG5mdW5jdGlvbiBob2xlKCkge1xuICAgIHJldHVybiB7bGFiZWw6IG51bGwsIGtpZHM6IFtdfTtcbn1cblxuXG5mdW5jdGlvbiBwcmVvcmRlcih0cmVlKSB7XG4gICAgdmFyIGwgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHQua2lkcy5sZW5ndGg7IGkrKykge1xuXHRsID0gbC5jb25jYXQocHJlb3JkZXIodC5raWRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBsO1xufVxuXG52YXIgYVN1YlRyZWUgPSB7XG4gICAgcGF0aDogW10sIC8vIGxheWVyc1xuICAgIHNlbGVjdGVkOiBhVHJlZVxufTtcblxuZnVuY3Rpb24gYXRIb2xlKHN1YnRyZWUpIHtcbiAgICByZXR1cm4gc3VidHJlZS5zZWxlY3RlZC5sYWJlbCA9PT0gbnVsbDtcbn1cblxudmFyIGFMYXllciA9IHtcbiAgICBsYWJlbDogXCJhIGxhYmVsXCIsXG4gICAgbGVmdDogW10sIC8vIHRyZWVzXG4gICAgcmlnaHQ6IFtdLCAvLyB0cmVlc1xufTtcblxuZnVuY3Rpb24gZW1iZWQodHJlZSwgbGF5ZXIpIHtcbiAgICB2YXIga2lkcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGF5ZXIubGVmdC5sZW5ndGg7IGkrKykge1xuXHRraWRzLnB1c2gobGF5ZXIubGVmdFtpXSk7XG4gICAgfVxuICAgIGtpZHMucHVzaCh0cmVlKTsgXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsYXllci5yaWdodC5sZW5ndGg7IGkrKykge1xuXHRraWRzLnB1c2gobGF5ZXIucmlnaHRbaV0pO1xuICAgIH1cbiAgICByZXR1cm4ge2xhYmVsOiBsYXllci5sYWJlbCwga2lkczoga2lkc307XG59XG5cblxuZnVuY3Rpb24gaG9zdFdpdGhQYXJlbnMoc3VidHJlZTIpIHtcbiAgICAvLyBsaWtlIGhvc3QsIGJ1dCBpbnNlcnRzIG9wZW4gXCIoXCIgZm9yIGVhY2ggbGV2ZWxcbiAgICAvLyBpbiBwYXRocyAoZXhjZXB0IG91dGVybW9zdCkuXG4gICAgXG4gICAgdmFyIHQgPSB7bGFiZWw6IHN1YnRyZWUyLnNlbGVjdGVkLmxhYmVsLCBraWRzOiBzdWJ0cmVlMi5zZWxlY3RlZC5raWRzLCBmb2N1czogdHJ1ZX07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdWJ0cmVlMi5wYXRocy5sZW5ndGg7IGkrKykge1xuXHR2YXIgcGF0aCA9IHN1YnRyZWUyLnBhdGhzW2ldO1xuXHRmb3IgKHZhciBqID0gMDsgaiA8IHBhdGgubGVuZ3RoOyBqKyspIHtcblx0ICAgIHQgPSBlbWJlZCh0LCBwYXRoW2pdKTtcblx0fVxuXHR0ID0ge2xhYmVsOiBcIihcIiwga2lkczogW3RdfTtcbiAgICB9XG4gICAgcmV0dXJuIHQua2lkc1swXTsgLy8gcmVtb3ZlIG91dGVyIFwiKFwiXG59XG5cblxuZnVuY3Rpb24gaG9zdChzdWJ0cmVlKSB7XG4gICAgdmFyIHQgPSB7bGFiZWw6IHN1YnRyZWUuc2VsZWN0ZWQubGFiZWwsIGtpZHM6IHN1YnRyZWUuc2VsZWN0ZWQua2lkcywgZm9jdXM6IHRydWV9O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3VidHJlZS5wYXRoLmxlbmd0aDsgaSsrKSB7XG5cdC8vY29uc29sZS5sb2coXCJsYXllciA9IFwiICsgdXRpbC5pbnNwZWN0KHN1YnRyZWUucGF0aFtpXSwge2RlcHRoOiBudWxsfSkpO1xuXHQvL2NvbnNvbGUubG9nKFwidCA9IFwiICsgdXRpbC5pbnNwZWN0KHQsIHtkZXB0aDogbnVsbH0pKTtcblx0dCA9IGVtYmVkKHQsIHN1YnRyZWUucGF0aFtpXSk7XG4gICAgfVxuICAgIC8vY29uc29sZS5sb2coXCJyZXN1bHQgdCA9IFwiICsgdXRpbC5pbnNwZWN0KHQsIHtkZXB0aDogbnVsbH0pKTtcbiAgICByZXR1cm4gdDtcbn1cblxuZnVuY3Rpb24gbGVmdChzdWJ0cmVlKSB7XG4gICAgaWYgKGlzTGVmdE1vc3Qoc3VidHJlZSkpIHtcblx0cmV0dXJuIHN1YnRyZWU7XG4gICAgfVxuXG4gICAgdmFyIGxhYiA9IHN1YnRyZWUucGF0aFswXS5sYWJlbDtcblxuICAgIC8vIGdldCB0aGUgbmV3IHRyZWVcbiAgICB2YXIgbGZ0ID0gc3VidHJlZS5wYXRoWzBdLmxlZnQ7XG4gICAgdmFyIGxhc3QgPSBsZnRbbGZ0Lmxlbmd0aCAtIDFdO1xuXG4gICAgLy8gd2hhdCByZW1haW5zIG9uIHRoZSBsZWZ0XG4gICAgdmFyIGwgPSBsZnQuc2xpY2UoMCwgbGZ0Lmxlbmd0aCAtIDEpO1xuXG4gICAgLy8gdGhlIHJpZ2h0XG4gICAgdmFyIHIgPSBzdWJ0cmVlLnBhdGhbMF0ucmlnaHQ7XG5cbiAgICB2YXIgbHMgPSBzdWJ0cmVlLnBhdGguc2xpY2UoMSk7IC8vIHRhaWxcblxuICAgIC8vIHRoZSBvbGQgcG9zaXRpb25cbiAgICB2YXIgc2VsID0gc3VidHJlZS5zZWxlY3RlZDtcbiAgICBcbiAgICB2YXIgcmVzdWx0ID0ge3BhdGg6IFt7bGFiZWw6IGxhYiwgbGVmdDogbCwgcmlnaHQ6IFtzZWxdLmNvbmNhdChyKX1dLmNvbmNhdChscyksIHNlbGVjdGVkOiBsYXN0fTtcbiAgICAvL2NvbnNvbGUubG9nKFwiaW4gbGVmdDogXCIpO1xuICAgIC8vY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiByaWdodChzdWJ0cmVlKSB7XG4gICAgaWYgKGlzUmlnaHRNb3N0KHN1YnRyZWUpKSB7XG5cdHJldHVybiBzdWJ0cmVlO1xuICAgIH1cbiAgICBcbiAgICB2YXIgbGFiID0gc3VidHJlZS5wYXRoWzBdLmxhYmVsO1xuXG4gICAgLy8gZ2V0IHRoZSBuZXcgdHJlZVxuICAgIHZhciByZ2h0ID0gc3VidHJlZS5wYXRoWzBdLnJpZ2h0O1xuICAgIHZhciBmaXJzdCA9IHJnaHRbMF07XG5cbiAgICAvLyB3aGF0IHJlbWFpbnMgb24gdGhlIHJpZ2h0XG4gICAgdmFyIHIgPSByZ2h0LnNsaWNlKDEpO1xuXG4gICAgLy8gdGhlIGxlZnRcbiAgICB2YXIgbCA9IHN1YnRyZWUucGF0aFswXS5sZWZ0O1xuXG4gICAgdmFyIGxzID0gc3VidHJlZS5wYXRoLnNsaWNlKDEpO1xuXG4gICAgLy8gdGhlIG9sZCBwb3NpdGlvblxuICAgIHZhciBzZWwgPSBzdWJ0cmVlLnNlbGVjdGVkO1xuICAgIC8vIGNvbnNvbGUubG9nKFwibCA9IFwiKTtcbiAgICAvLyBjb25zb2xlLmxvZyhsKTtcbiAgICAvLyBjb25zb2xlLmxvZyhzZWwpO1xuICAgIC8vIGNvbnNvbGUubG9nKGwuY29uY2F0KFtzZWxdKSk7XG4gICAgXG4gICAgdmFyIHJlc3VsdCA9IHtwYXRoOiBbe2xhYmVsOiBsYWIsIGxlZnQ6IGwuY29uY2F0KFtzZWxdKSwgcmlnaHQ6IHJ9XS5jb25jYXQobHMpLCBzZWxlY3RlZDogZmlyc3R9O1xuICAgIC8vIGNvbnNvbGUubG9nKFwiaW4gcmlnaHQ6IFwiKTtcbiAgICAvLyBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgIHJldHVybiByZXN1bHQ7XG59XG5cblxuZnVuY3Rpb24gaXNMZWZ0TW9zdChzdWJ0cmVlKSB7XG4gICAgcmV0dXJuIHN1YnRyZWUucGF0aC5sZW5ndGggPT09IDAgfHwgc3VidHJlZS5wYXRoWzBdLmxlZnQubGVuZ3RoID09PSAwO1xufVxuXG5mdW5jdGlvbiBpc1JpZ2h0TW9zdChzdWJ0cmVlKSB7XG4gICAgcmV0dXJuIHN1YnRyZWUucGF0aC5sZW5ndGggPT09IDAgfHwgc3VidHJlZS5wYXRoWzBdLnJpZ2h0Lmxlbmd0aCA9PT0gMDtcbn1cblxuZnVuY3Rpb24gdXAoc3VidHJlZSkge1xuICAgIGlmIChpc1RvcE1vc3Qoc3VidHJlZSkpIHtcblx0cmV0dXJuIHN1YnRyZWU7XG4gICAgfVxuICAgIHZhciBsYXllciA9IHN1YnRyZWUucGF0aFswXTtcbiAgICB2YXIgYWJvdmUgPSBzdWJ0cmVlLnBhdGguc2xpY2UoMSk7XG4gICAgcmV0dXJuIHtwYXRoOiBhYm92ZSwgc2VsZWN0ZWQ6IGVtYmVkKHN1YnRyZWUuc2VsZWN0ZWQsIGxheWVyKSB9O1xufVxuXG5mdW5jdGlvbiBpc1RvcE1vc3Qoc3VidHJlZSkge1xuICAgIHJldHVybiBzdWJ0cmVlLnBhdGgubGVuZ3RoID09PSAwO1xufVxuXG5mdW5jdGlvbiBkb3duKHN1YnRyZWUpIHtcbiAgICBpZiAoaXNCb3R0b21Nb3N0KHN1YnRyZWUpKSB7XG5cdHJldHVybiBzdWJ0cmVlO1xuICAgIH1cbiAgICB2YXIgcCA9IHN1YnRyZWUucGF0aDtcbiAgICB2YXIgbGFiID0gc3VidHJlZS5zZWxlY3RlZC5sYWJlbDtcbiAgICB2YXIgdCA9IHN1YnRyZWUuc2VsZWN0ZWQua2lkc1swXTtcbiAgICB2YXIgdHMgPSBzdWJ0cmVlLnNlbGVjdGVkLmtpZHMuc2xpY2UoMSk7XG4gICAgXG4gICAgcmV0dXJuIHtwYXRoOiBbe2xhYmVsOiBsYWIsIGxlZnQ6IFtdLCByaWdodDogdHN9XS5jb25jYXQocCksIHNlbGVjdGVkOiB0fTtcbn1cblxuZnVuY3Rpb24gaXNCb3R0b21Nb3N0KHN1YnRyZWUpIHtcbiAgICByZXR1cm4gc3VidHJlZS5zZWxlY3RlZC5raWRzLmxlbmd0aCA9PT0gMDtcbn1cblxuXG5mdW5jdGlvbiByaWdodFVwKHN1YnRyZWUpIHtcbiAgICB3aGlsZSAoIWlzVG9wTW9zdChzdWJ0cmVlKSAmJiBpc1JpZ2h0TW9zdChzdWJ0cmVlKSkge1xuXHRzdWJ0cmVlID0gdXAoc3VidHJlZSk7XG4gICAgfVxuICAgIHJldHVybiByaWdodChzdWJ0cmVlKTtcbn1cblxuZnVuY3Rpb24gbGVmdERvd24oc3VidHJlZSkge1xuICAgIHdoaWxlICghaXNCb3R0b21Nb3N0KHN1YnRyZWUpICYmIGlzTGVmdE1vc3Qoc3VidHJlZSkpIHtcblx0c3VidHJlZSA9IGRvd24oc3VidHJlZSk7XG4gICAgfVxuICAgIHJldHVybiBsZWZ0KHN1YnRyZWUpO1xufVxuXG5mdW5jdGlvbiBuZXh0KHN1YnRyZWUpIHtcbiAgICBpZiAoaXNCb3R0b21Nb3N0KHN1YnRyZWUpKSB7XG5cdHJldHVybiByaWdodFVwKHN1YnRyZWUpO1xuICAgIH1cbiAgICByZXR1cm4gZG93bihzdWJ0cmVlKTtcbn1cblxuZnVuY3Rpb24gcHJldmlvdXMyKHN1YnRyZWUpIHtcbiAgICBpZiAoaXNSaWdodE1vc3Qoc3VidHJlZSkpIHtcblx0cmV0dXJuIGxlZnQoc3VidHJlZSk7XG4gICAgfVxuICAgIHJldHVybiBuZXh0U3VjaFRoYXQoZnVuY3Rpb24gKHMpIHsgcmV0dXJuIGlzUmlnaHRNb3N0KHMpICYmIGlzQm90dG9tTW9zdChzKTsgfSwgdXAoc3VidHJlZSkpO1xufVxuXG5mdW5jdGlvbiBwcmV2aW91cyhzdWJ0cmVlKSB7XG4gICAgaWYgKGlzVG9wTW9zdChzdWJ0cmVlKSkge1xuXHRyZXR1cm4gbGVmdERvd24oc3VidHJlZSk7XG4gICAgfVxuICAgIHJldHVybiB1cChzdWJ0cmVlKTtcbn1cblxuZnVuY3Rpb24gbmV4dFN1Y2hUaGF0KHByZWQsIHN1YnRyZWUpIHtcbiAgICB2YXIgc3QyID0gbmV4dChzdWJ0cmVlKTsgLy8gYWx3YXlzIG1vdmUuXG4gICAgd2hpbGUgKCFpc1RvcE1vc3Qoc3QyKSAmJiAhcHJlZChzdDIpKSB7XG5cdHN0MiA9IG5leHQoc3QyKTtcbiAgICB9XG4gICAgcmV0dXJuIHByZWQoc3QyKSA/IHN0MiA6IHN1YnRyZWU7XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2UodHJlZSwgc3VidHJlZSkge1xuICAgIHJldHVybiB7cGF0aDogc3VidHJlZS5wYXRoLCBzZWxlY3RlZDogdHJlZX07XG59XG5cblxudmFyIHRlbXBsYXRlcyA9IHtcbiAgICBcIihcIjoge2xhYmVsOiBcIihcIiwga2lkczogW2hvbGUoKV0gfSxcbiAgICBJZjoge2xhYmVsOiBcIklmXCIsIGtpZHM6IFtob2xlKCksIGhvbGUoKSwgaG9sZSgpXX0sXG4gICAgQWRkOiB7bGFiZWw6IFwiQWRkXCIsIGtpZHM6IFtob2xlKCksIGhvbGUoKV19LFxuICAgIE11bDoge2xhYmVsOiBcIk11bFwiLCBraWRzOiBbaG9sZSgpLCBob2xlKCldfSxcbiAgICBFeHA6IHtsYWJlbDogXCJFeHBcIiwga2lkczogW2hvbGUoKSwgaG9sZSgpXX1cbn1cblxuZnVuY3Rpb24gaW5zZXJ0KGxhYmVsLCBzdWJ0cmVlKSB7XG4gICAgLy9jb25zb2xlLmxvZyhcIkluc2VydDogXCIgKyBsYWJlbCk7XG4gICAgLy9jb25zb2xlLmxvZyhcIlN1YnRyZWU6IFwiKTtcbiAgICAvL2NvbnNvbGUubG9nKHN1YnRyZWUpO1xuICAgIC8vIHRoaXMgZG9lc24ndCB3b3JrOiB3ZSdyZSBtb3ZpbmcgdG8gbmV4dCBpbW1lZGlhdGVseSxcbiAgICAvLyBpZiB0aGVyZSBhcmUgbW9yZSBob2xlcyB0byBiZSBmaWxsZWQuXG4gICAgaWYgKCF0ZW1wbGF0ZXNbbGFiZWxdKSB7IC8vJiYgIWF0SG9sZShzdWJ0cmVlKSAmJiBzdWJ0cmVlLnNlbGVjdGVkLmtpZHMubGVuZ3RoID09PSAwKSB7XG5cdHZhciBsID0gc3VidHJlZS5zZWxlY3RlZC5sYWJlbDtcblx0dmFyIHQgPSB7bGFiZWw6IChsID09PSBudWxsID8gXCJcIiA6IGwpICsgbGFiZWwsIGtpZHM6IFtdfTtcblx0cmV0dXJuIHtwYXRoOiBzdWJ0cmVlLnBhdGgsIHNlbGVjdGVkOiB0fTtcbiAgICB9XG4gICAgdmFyIHRlbXBsYXRlID0gdGVtcGxhdGVzW2xhYmVsXSB8fCB7bGFiZWw6IGxhYmVsLCBraWRzOiBbXX07XG4gICAgcmV0dXJuIHRyZWVJbnNlcnQodGVtcGxhdGUsIHN1YnRyZWUpO1xufVxuXG5mdW5jdGlvbiB0cmVlSW5zZXJ0KHRyZWUsIHN1YnRyZWUpIHtcbiAgICBpZiAoYXRIb2xlKHN1YnRyZWUpKSB7XG5cdHJldHVybiByZXBsYWNlKHRyZWUsIHN1YnRyZWUpO1xuICAgIH1cbiAgICByZXR1cm4gcmVwbGFjZShzdWJ0cmVlLnNlbGVjdGVkLCBkb3duKHJlcGxhY2UodHJlZSwgc3VidHJlZSkpKTtcbn1cblxuZnVuY3Rpb24ga2lsbChzdWJ0cmVlKSB7XG4gICAgcmV0dXJuIHJlcGxhY2UoaG9sZSgpLCBzdWJ0cmVlKTtcbn1cblxuZnVuY3Rpb24gcHJvbW90ZShzdWJ0cmVlKSB7XG4gICAgcmV0dXJuIHJlcGxhY2Uoc3VidHJlZS5zZWxlY3RlZCwgdXAoc3VidHJlZSkpO1xufVxuXG5mdW5jdGlvbiBzaXR1YXRpb24oc3VidHJlZSkge1xuICAgIGlmIChzdWJ0cmVlLnBhdGgubGVuZ3RoID09PSAwKSB7XG5cdHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIHN1YnRyZWUucGF0aC5zbGljZSgwLDEpO1xufVxuXG5mdW5jdGlvbiBncmFmdChwYXRoLCBzdWJ0cmVlKSB7XG4gICAgcmV0dXJuIHtwYXRoOiBwYXRoLmNvbmNhdChzdWJ0cmVlLnBhdGgpLCBzZWxlY3RlZDogc3VidHJlZS5zZWxlY3RlZH07XG59XG5cbmZ1bmN0aW9uIGVudGVyKGxhYmVsLCBzdWJ0cmVlKSB7XG4gICAgcmV0dXJuIG5leHRTdWNoVGhhdChhdEhvbGUsIGluc2VydChsYWJlbCwgc3VidHJlZSkpO1xufVxuXG5mdW5jdGlvbiBlbnRyeShsYWJlbCwgc3VidHJlZSkge1xuICAgIHJldHVybiBlbnRlcihsYWJlbCwgcmVkdWNlKGxhYmVsLCBzdWJ0cmVlKSk7XG59XG5cbmZ1bmN0aW9uIHJlZHVjZShsYWJlbCwgc3VidHJlZSkge1xuICAgIHdoaWxlICghaXNJcnJlZHVjaWJsZShsYWJlbCwgc3VidHJlZSkpIHtcblx0Ly9jb25zb2xlLmxvZyhcIlJlZHVjaW5nOiBcIiArIHV0aWwuaW5zcGVjdChzdWJ0cmVlLCB7ZGVwdGg6IG51bGx9KSk7XG5cdHN1YnRyZWUgPSB1cChzdWJ0cmVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHN1YnRyZWU7XG59XG5cbmZ1bmN0aW9uIGlzSXJyZWR1Y2libGUobGFiZWwsIHN1YnRyZWUpIHtcbiAgICByZXR1cm4gYXRIb2xlKHN1YnRyZWUpXG5cdHx8IGlzVG9wTW9zdChzdWJ0cmVlKVxuXHR8fCAhaXNSaWdodE1vc3Qoc3VidHJlZSlcblx0fHwgIShpc1Byb2R1Y2FibGUobGFiZWwsIHVwKHN1YnRyZWUpLnNlbGVjdGVkLmxhYmVsKSk7XG59XG5cblxudmFyIGFzc29jaWF0ZXNMZWZ0ID0ge1xuICAgIElmOiBmYWxzZSxcbiAgICBBZGQ6IHRydWUsXG4gICAgTXVsOiB0cnVlLFxuICAgIEV4cDogZmFsc2UsXG4gICAgYTogZmFsc2UsXG4gICAgYjogZmFsc2UsXG4gICAgYzogZmFsc2UsXG4gICAgZDogZmFsc2Vcbn07XG5cblxudmFyIHByZWNlZGVuY2UgPSB7XG4gICAgSWY6IDEwMDAsXG4gICAgQWRkOiAxMDAsXG4gICAgTXVsOiAyMDAsXG4gICAgRXhwOiAzMDAsXG4gICAgYTogMTAwMDAsXG4gICAgYjogMTAwMDAsXG4gICAgYzogMTAwMDAsXG4gICAgZDogMTAwMDBcbn07XG5cbmZ1bmN0aW9uIGlzUHJvZHVjYWJsZShvcDIsIG9wMSkge1xuICAgIC8vIGNvbnNvbGUubG9nKFwiQ2hlY2tpbmcgcHJvZHVjYWJsZTogXCIgKyBvcDIgKyBcIiwgXCIgKyBvcDEpO1xuICAgIC8vIGNvbnNvbGUubG9nKFwiUHJlY2VkZW5jZTogXCIgKyBwcmVjZWRlbmNlW29wMl0gKyBcIiwgXCIgKyBwcmVjZWRlbmNlW29wMV0pO1xuICAgIHZhciByID0gKG9wMSA9PT0gb3AyICYmIGFzc29jaWF0ZXNMZWZ0W29wMV0pIHx8IHByZWNlZGVuY2Vbb3AxXSA+IHByZWNlZGVuY2Vbb3AyXTtcbiAgICAvL2NvbnNvbGUubG9nKFwiUmVzdWx0OiBcIiArIHIpO1xuICAgIHJldHVybiByO1xufVxuXG5cblxuXG5cblxuZnVuY3Rpb24gZmxhdHRlbihzdWJ0cmVlMikge1xuICAgIHZhciBwYXRoID0gW107XG4gICAgLy9jb25zb2xlLmxvZyhcIkZMQVRURU46XCIpO1xuICAgIC8vY29uc29sZS5sb2codXRpbC5pbnNwZWN0KHN1YnRyZWUyLCB7ZGVwdGg6IG51bGx9KSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdWJ0cmVlMi5wYXRocy5sZW5ndGg7IGkrKykge1xuXHRwYXRoID0gcGF0aC5jb25jYXQoc3VidHJlZTIucGF0aHNbaV0pO1xuICAgIH1cbiAgICByZXR1cm4ge3BhdGg6IHBhdGgsIHNlbGVjdGVkOiBzdWJ0cmVlMi5zZWxlY3RlZH07XG59XG5cbmZ1bmN0aW9uIGxpZnQxKHMycykge1xuICAgIHJldHVybiBmdW5jdGlvbiAoczIpIHtcblx0Ly9jb25zb2xlLmxvZyhzMik7XG5cdHZhciBzID0gczJzKHtwYXRoOiBzMi5wYXRoc1swXSwgc2VsZWN0ZWQ6IHMyLnNlbGVjdGVkfSk7XG5cdHJldHVybiB7cGF0aHM6IFtzLnBhdGhdLmNvbmNhdChzMi5wYXRocy5zbGljZSgxKSksIHNlbGVjdGVkOiBzLnNlbGVjdGVkfTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGxpZnQyKHMycykge1xuICAgIHJldHVybiBmdW5jdGlvbiAoeCwgczIpIHtcblx0dmFyIHMgPSBzMnMoeCwge3BhdGg6IHMyLnBhdGhzWzBdLCBzZWxlY3RlZDogczIuc2VsZWN0ZWR9KTtcblx0cmV0dXJuIHtwYXRoczogW3MucGF0aF0uY29uY2F0KHMyLnBhdGhzLnNsaWNlKDEpKSwgc2VsZWN0ZWQ6IHMuc2VsZWN0ZWR9O1xuICAgIH07XG59XG5cbnZhciBlbnRyeTIgPSBsaWZ0MihlbnRyeSk7XG52YXIgcmlnaHQyID0gbGlmdDEocmlnaHQpO1xuXG5mdW5jdGlvbiBvcGVuKHN1YnRyZWUyKSB7XG4gICAgcmV0dXJuIHtwYXRoczogW1tdXS5jb25jYXQoc3VidHJlZTIucGF0aHMpLCBzZWxlY3RlZDogc3VidHJlZTIuc2VsZWN0ZWR9O1xufVxuXG5mdW5jdGlvbiBjbG9zZShzdWJ0cmVlMikge1xuICAgIGlmIChzdWJ0cmVlMi5wYXRocy5sZW5ndGggPD0gMSkge1xuXHRyZXR1cm4gc3VidHJlZTI7XG4gICAgfVxuICAgIHZhciBwID0gc3VidHJlZTIucGF0aHNbMF07XG4gICAgdmFyIHBzID0gc3VidHJlZTIucGF0aHMuc2xpY2UoMSk7XG4gICAgdmFyIHQgPSBzdWJ0cmVlMi5zZWxlY3RlZDtcbiAgICB2YXIgcyA9IGhvc3Qoe3BhdGg6IHAsIHNlbGVjdGVkOiB0fSk7XG4gICAgcmV0dXJuIHJpZ2h0Mih7cGF0aHM6IHBzLCBzZWxlY3RlZDogc30pO1xufVxuXG52YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKTtcblxuXG5mdW5jdGlvbiBlbnRlclN0cmluZyhhcnIpIHtcbiAgICAvL2NvbnNvbGUubG9nKFwiSU5QVVQgPSBcIiArIGFycik7XG4gICAgdmFyIHN0ID0ge3BhdGg6IFtdLCBzZWxlY3RlZDogaG9sZSgpfTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuXHQvL2NvbnNvbGUubG9nKFwiPT09PT09PT09PT09PT09PT4gRW50ZXJpbmc6IFwiICsgYXJyW2ldKTtcblx0c3QgPSBlbnRyeShhcnJbaV0sIHN0KTtcblx0Ly9jb25zb2xlLmxvZyhcIlJFU1VMVDogXCIpO1xuXHQvL2NvbnNvbGUubG9nKHV0aWwuaW5zcGVjdChzdCwge2RlcHRoOiBudWxsfSkpO1xuICAgIH1cbiAgICByZXR1cm4gc3Q7XG59XG5cbmNvbnNvbGUubG9nKFwiRVhBTVBMRTogYSAqIGIgKyBjICogZFwiKTtcbnZhciBleGFtcGxlID0gZW50ZXJTdHJpbmcoW1wiYVwiLCBcIk11bFwiLCBcImJcIiwgXCJBZGRcIiwgXCJjXCIsIFwiTXVsXCIsIFwiZFwiXSk7XG5jb25zb2xlLmxvZyh1dGlsLmluc3BlY3QoaG9zdChleGFtcGxlKSwge3Nob3dIaWRkZW46IGZhbHNlLCBkZXB0aDogbnVsbH0pKTtcblxuXG5jb25zb2xlLmxvZyhcIlxcblxcblxcblxcbkVYQU1QTEU6ICogKyBhIGIgKyBjIGQpXCIpO1xudmFyIGV4YW1wbGUyID0gZW50ZXJTdHJpbmcoW1wiTXVsXCIsIFwiQWRkXCIsIFwiYVwiLCBcImJcIiwgXCJBZGRcIiwgXCJjXCIsIFwiZFwiXSk7XG5jb25zb2xlLmxvZyh1dGlsLmluc3BlY3QoaG9zdChleGFtcGxlMiksIHtzaG93SGlkZGVuOiBmYWxzZSwgZGVwdGg6IG51bGx9KSk7XG5cbi8vY29uc29sZS5sb2coXCJcXG5TdWJ0cmVlOlwiKTtcbi8vY29uc29sZS5sb2codXRpbC5pbnNwZWN0KGV4YW1wbGUyLCB7c2hvd0hpZGRlbjogZmFsc2UsIGRlcHRoOiBudWxsfSkpO1xuXG5cbi8vIGNvbnNvbGUubG9nKFwiXFxuXFxuXFxuXFxuRVhBTVBMRTogICsgKiBhIGIgKiBjIGRcIik7XG4vLyB2YXIgZXhhbXBsZTMgPSBlbnRlclN0cmluZyhbXCJBZGRcIiwgXCJNdWxcIiwgXCJhXCIsIFwiYlwiLCBcIk11bFwiLCBcImNcIiwgXCJkXCJdKTtcbi8vIGNvbnNvbGUubG9nKHV0aWwuaW5zcGVjdChob3N0KGV4YW1wbGUzKSwge3Nob3dIaWRkZW46IGZhbHNlLCBkZXB0aDogbnVsbH0pKTtcblxuXG4vLyBjb25zb2xlLmxvZyhcIlxcblxcblxcblxcbkVYQU1QTEU6IChhICsgYikgKiBjXCIpO1xuLy8gdmFyIGV4YW1wbGU0ID0gZW50ZXJTdHJpbmcoW1wiQWRkXCIsIFwiTXVsXCIsIFwiYVwiLCBcImJcIiwgXCJjXCJdKTtcbi8vIGNvbnNvbGUubG9nKFwiRU5EIFJFU1VMVDpcIik7XG4vLyBjb25zb2xlLmxvZyh1dGlsLmluc3BlY3QoaG9zdChleGFtcGxlNCksIHtzaG93SGlkZGVuOiBmYWxzZSwgZGVwdGg6IG51bGx9KSk7XG5cbi8vIGNvbnNvbGUubG9nKFwiXFxuU3VidHJlZTpcIik7XG4vLyBjb25zb2xlLmxvZyh1dGlsLmluc3BlY3QoZXhhbXBsZTQsIHtzaG93SGlkZGVuOiBmYWxzZSwgZGVwdGg6IG51bGx9KSk7XG5cblxuXG5mdW5jdGlvbiBlbnRlckJyYWNrZXRlZFN0cmluZyhhcnIpIHtcbiAgICB2YXIgc3QgPSB7cGF0aHM6IFtbXV0sIHNlbGVjdGVkOiBob2xlKCl9O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG5cdC8vY29uc29sZS5sb2coXCI9PT09PT4gRW50ZXJpbmc6IFwiICsgYXJyW2ldKTtcblx0aWYgKGFycltpXSA9PT0gXCIoXCIpIHtcblx0ICAgIHN0ID0gb3BlbihzdCk7XG5cdCAgICAvL2NvbnNvbGUubG9nKFwiQWZ0ZXIgb3BlbjogXCIgKyB1dGlsLmluc3BlY3Qoc3QsIHtkZXB0aDogbnVsbH0pKTtcblx0ICAgIGNvbnRpbnVlO1xuXHR9XG5cdGlmIChhcnJbaV0gPT09IFwiKVwiKSB7XG5cdCAgICBzdCA9IGNsb3NlKHN0KTtcblx0ICAgIGNvbnRpbnVlO1xuXHR9XG5cdHN0ID0gZW50cnkyKGFycltpXSwgc3QpO1xuXHQvL2NvbnNvbGUubG9nKFwiUkVTVUxUOiBcIik7XG5cdC8vY29uc29sZS5sb2coc3QpO1xuICAgIH1cbiAgICByZXR1cm4gc3Q7XG59XG5cblxuXG5cbmNvbnNvbGUubG9nKFwiXFxuXFxuXFxuXFxuRVhBTVBMRTogKGEgKyBiKSAqIChjICsgZClcIik7XG52YXIgZXhhbXBsZTMgPSBlbnRlckJyYWNrZXRlZFN0cmluZyhbXCIoXCIsIFwiYVwiLCBcIkFkZFwiLCBcImJcIiwgXCIpXCIsIFwiTXVsXCIsIFwiKFwiLCBcImNcIiwgXCJBZGRcIiwgXCJkXCIsIFwiKVwiXSk7XG5jb25zb2xlLmxvZyhcIlNVQlRSRUUyXCIpO1xuLy9jb25zb2xlLmxvZyh1dGlsLmluc3BlY3QoZXhhbXBsZTMsIHtkZXB0aDogbnVsbH0pKTtcbmNvbnNvbGUubG9nKHV0aWwuaW5zcGVjdChob3N0KGZsYXR0ZW4oZXhhbXBsZTMpKSwge3Nob3dIaWRkZW46IGZhbHNlLCBkZXB0aDogbnVsbH0pKTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IHJ1bjtcbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuTXV0YXRpb25PYnNlcnZlciA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93Lk11dGF0aW9uT2JzZXJ2ZXI7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgdmFyIHF1ZXVlID0gW107XG5cbiAgICBpZiAoY2FuTXV0YXRpb25PYnNlcnZlcikge1xuICAgICAgICB2YXIgaGlkZGVuRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdmFyIG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHF1ZXVlTGlzdCA9IHF1ZXVlLnNsaWNlKCk7XG4gICAgICAgICAgICBxdWV1ZS5sZW5ndGggPSAwO1xuICAgICAgICAgICAgcXVldWVMaXN0LmZvckVhY2goZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBvYnNlcnZlci5vYnNlcnZlKGhpZGRlbkRpdiwgeyBhdHRyaWJ1dGVzOiB0cnVlIH0pO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgaWYgKCFxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBoaWRkZW5EaXYuc2V0QXR0cmlidXRlKCd5ZXMnLCAnbm8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNCdWZmZXIoYXJnKSB7XG4gIHJldHVybiBhcmcgJiYgdHlwZW9mIGFyZyA9PT0gJ29iamVjdCdcbiAgICAmJiB0eXBlb2YgYXJnLmNvcHkgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLmZpbGwgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLnJlYWRVSW50OCA9PT0gJ2Z1bmN0aW9uJztcbn0iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIGZvcm1hdFJlZ0V4cCA9IC8lW3NkaiVdL2c7XG5leHBvcnRzLmZvcm1hdCA9IGZ1bmN0aW9uKGYpIHtcbiAgaWYgKCFpc1N0cmluZyhmKSkge1xuICAgIHZhciBvYmplY3RzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG9iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gIH1cblxuICB2YXIgaSA9IDE7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCA9PT0gJyUlJykgcmV0dXJuICclJztcbiAgICBpZiAoaSA+PSBsZW4pIHJldHVybiB4O1xuICAgIHN3aXRjaCAoeCkge1xuICAgICAgY2FzZSAnJXMnOiByZXR1cm4gU3RyaW5nKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVqJzpcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnc1tpKytdKTtcbiAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfSk7XG4gIGZvciAodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKSB7XG4gICAgaWYgKGlzTnVsbCh4KSB8fCAhaXNPYmplY3QoeCkpIHtcbiAgICAgIHN0ciArPSAnICcgKyB4O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAnICsgaW5zcGVjdCh4KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblxuLy8gTWFyayB0aGF0IGEgbWV0aG9kIHNob3VsZCBub3QgYmUgdXNlZC5cbi8vIFJldHVybnMgYSBtb2RpZmllZCBmdW5jdGlvbiB3aGljaCB3YXJucyBvbmNlIGJ5IGRlZmF1bHQuXG4vLyBJZiAtLW5vLWRlcHJlY2F0aW9uIGlzIHNldCwgdGhlbiBpdCBpcyBhIG5vLW9wLlxuZXhwb3J0cy5kZXByZWNhdGUgPSBmdW5jdGlvbihmbiwgbXNnKSB7XG4gIC8vIEFsbG93IGZvciBkZXByZWNhdGluZyB0aGluZ3MgaW4gdGhlIHByb2Nlc3Mgb2Ygc3RhcnRpbmcgdXAuXG4gIGlmIChpc1VuZGVmaW5lZChnbG9iYWwucHJvY2VzcykpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sIG1zZykuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHByb2Nlc3Mubm9EZXByZWNhdGlvbiA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIHZhciB3YXJuZWQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZGVwcmVjYXRlZCgpIHtcbiAgICBpZiAoIXdhcm5lZCkge1xuICAgICAgaWYgKHByb2Nlc3MudGhyb3dEZXByZWNhdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICAgIH0gZWxzZSBpZiAocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKSB7XG4gICAgICAgIGNvbnNvbGUudHJhY2UobXNnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgIH1cbiAgICAgIHdhcm5lZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgcmV0dXJuIGRlcHJlY2F0ZWQ7XG59O1xuXG5cbnZhciBkZWJ1Z3MgPSB7fTtcbnZhciBkZWJ1Z0Vudmlyb247XG5leHBvcnRzLmRlYnVnbG9nID0gZnVuY3Rpb24oc2V0KSB7XG4gIGlmIChpc1VuZGVmaW5lZChkZWJ1Z0Vudmlyb24pKVxuICAgIGRlYnVnRW52aXJvbiA9IHByb2Nlc3MuZW52Lk5PREVfREVCVUcgfHwgJyc7XG4gIHNldCA9IHNldC50b1VwcGVyQ2FzZSgpO1xuICBpZiAoIWRlYnVnc1tzZXRdKSB7XG4gICAgaWYgKG5ldyBSZWdFeHAoJ1xcXFxiJyArIHNldCArICdcXFxcYicsICdpJykudGVzdChkZWJ1Z0Vudmlyb24pKSB7XG4gICAgICB2YXIgcGlkID0gcHJvY2Vzcy5waWQ7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXNnID0gZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignJXMgJWQ6ICVzJywgc2V0LCBwaWQsIG1zZyk7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge307XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWJ1Z3Nbc2V0XTtcbn07XG5cblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QgdGhhdCBhbHRlcnMgdGhlIG91dHB1dC5cbiAqL1xuLyogbGVnYWN5OiBvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIG9wdHMpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25zXG4gIHZhciBjdHggPSB7XG4gICAgc2VlbjogW10sXG4gICAgc3R5bGl6ZTogc3R5bGl6ZU5vQ29sb3JcbiAgfTtcbiAgLy8gbGVnYWN5Li4uXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIGN0eC5kZXB0aCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gNCkgY3R4LmNvbG9ycyA9IGFyZ3VtZW50c1szXTtcbiAgaWYgKGlzQm9vbGVhbihvcHRzKSkge1xuICAgIC8vIGxlZ2FjeS4uLlxuICAgIGN0eC5zaG93SGlkZGVuID0gb3B0cztcbiAgfSBlbHNlIGlmIChvcHRzKSB7XG4gICAgLy8gZ290IGFuIFwib3B0aW9uc1wiIG9iamVjdFxuICAgIGV4cG9ydHMuX2V4dGVuZChjdHgsIG9wdHMpO1xuICB9XG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5zaG93SGlkZGVuKSkgY3R4LnNob3dIaWRkZW4gPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpIGN0eC5kZXB0aCA9IDI7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY29sb3JzKSkgY3R4LmNvbG9ycyA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmN1c3RvbUluc3BlY3QpKSBjdHguY3VzdG9tSW5zcGVjdCA9IHRydWU7XG4gIGlmIChjdHguY29sb3JzKSBjdHguc3R5bGl6ZSA9IHN0eWxpemVXaXRoQ29sb3I7XG4gIHJldHVybiBmb3JtYXRWYWx1ZShjdHgsIG9iaiwgY3R4LmRlcHRoKTtcbn1cbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cblxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG5pbnNwZWN0LmNvbG9ycyA9IHtcbiAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAndW5kZXJsaW5lJyA6IFs0LCAyNF0sXG4gICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgJ2dyZXknIDogWzkwLCAzOV0sXG4gICdibGFjaycgOiBbMzAsIDM5XSxcbiAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICdjeWFuJyA6IFszNiwgMzldLFxuICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAncmVkJyA6IFszMSwgMzldLFxuICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG4vLyBEb24ndCB1c2UgJ2JsdWUnIG5vdCB2aXNpYmxlIG9uIGNtZC5leGVcbmluc3BlY3Quc3R5bGVzID0ge1xuICAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgJ251bWJlcic6ICd5ZWxsb3cnLFxuICAnYm9vbGVhbic6ICd5ZWxsb3cnLFxuICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAnbnVsbCc6ICdib2xkJyxcbiAgJ3N0cmluZyc6ICdncmVlbicsXG4gICdkYXRlJzogJ21hZ2VudGEnLFxuICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAncmVnZXhwJzogJ3JlZCdcbn07XG5cblxuZnVuY3Rpb24gc3R5bGl6ZVdpdGhDb2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICB2YXIgc3R5bGUgPSBpbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO1xuXG4gIGlmIChzdHlsZSkge1xuICAgIHJldHVybiAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVsxXSArICdtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc3R5bGl6ZU5vQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgcmV0dXJuIHN0cjtcbn1cblxuXG5mdW5jdGlvbiBhcnJheVRvSGFzaChhcnJheSkge1xuICB2YXIgaGFzaCA9IHt9O1xuXG4gIGFycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpIHtcbiAgICBoYXNoW3ZhbF0gPSB0cnVlO1xuICB9KTtcblxuICByZXR1cm4gaGFzaDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMpIHtcbiAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgaWYgKGN0eC5jdXN0b21JbnNwZWN0ICYmXG4gICAgICB2YWx1ZSAmJlxuICAgICAgaXNGdW5jdGlvbih2YWx1ZS5pbnNwZWN0KSAmJlxuICAgICAgLy8gRmlsdGVyIG91dCB0aGUgdXRpbCBtb2R1bGUsIGl0J3MgaW5zcGVjdCBmdW5jdGlvbiBpcyBzcGVjaWFsXG4gICAgICB2YWx1ZS5pbnNwZWN0ICE9PSBleHBvcnRzLmluc3BlY3QgJiZcbiAgICAgIC8vIEFsc28gZmlsdGVyIG91dCBhbnkgcHJvdG90eXBlIG9iamVjdHMgdXNpbmcgdGhlIGNpcmN1bGFyIGNoZWNrLlxuICAgICAgISh2YWx1ZS5jb25zdHJ1Y3RvciAmJiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT09IHZhbHVlKSkge1xuICAgIHZhciByZXQgPSB2YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcywgY3R4KTtcbiAgICBpZiAoIWlzU3RyaW5nKHJldCkpIHtcbiAgICAgIHJldCA9IGZvcm1hdFZhbHVlKGN0eCwgcmV0LCByZWN1cnNlVGltZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgdmFyIHByaW1pdGl2ZSA9IGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKTtcbiAgaWYgKHByaW1pdGl2ZSkge1xuICAgIHJldHVybiBwcmltaXRpdmU7XG4gIH1cblxuICAvLyBMb29rIHVwIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICB2YXIgdmlzaWJsZUtleXMgPSBhcnJheVRvSGFzaChrZXlzKTtcblxuICBpZiAoY3R4LnNob3dIaWRkZW4pIHtcbiAgICBrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModmFsdWUpO1xuICB9XG5cbiAgLy8gSUUgZG9lc24ndCBtYWtlIGVycm9yIGZpZWxkcyBub24tZW51bWVyYWJsZVxuICAvLyBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvaWUvZHd3NTJzYnQodj12cy45NCkuYXNweFxuICBpZiAoaXNFcnJvcih2YWx1ZSlcbiAgICAgICYmIChrZXlzLmluZGV4T2YoJ21lc3NhZ2UnKSA+PSAwIHx8IGtleXMuaW5kZXhPZignZGVzY3JpcHRpb24nKSA+PSAwKSkge1xuICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICAvLyBTb21lIHR5cGUgb2Ygb2JqZWN0IHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdmFyIG5hbWUgPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW0Z1bmN0aW9uJyArIG5hbWUgKyAnXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfVxuICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdkYXRlJyk7XG4gICAgfVxuICAgIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYmFzZSA9ICcnLCBhcnJheSA9IGZhbHNlLCBicmFjZXMgPSBbJ3snLCAnfSddO1xuXG4gIC8vIE1ha2UgQXJyYXkgc2F5IHRoYXQgdGhleSBhcmUgQXJyYXlcbiAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgYXJyYXkgPSB0cnVlO1xuICAgIGJyYWNlcyA9IFsnWycsICddJ107XG4gIH1cblxuICAvLyBNYWtlIGZ1bmN0aW9ucyBzYXkgdGhhdCB0aGV5IGFyZSBmdW5jdGlvbnNcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgdmFyIG4gPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICBiYXNlID0gJyBbRnVuY3Rpb24nICsgbiArICddJztcbiAgfVxuXG4gIC8vIE1ha2UgUmVnRXhwcyBzYXkgdGhhdCB0aGV5IGFyZSBSZWdFeHBzXG4gIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZGF0ZXMgd2l0aCBwcm9wZXJ0aWVzIGZpcnN0IHNheSB0aGUgZGF0ZVxuICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBEYXRlLnByb3RvdHlwZS50b1VUQ1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZXJyb3Igd2l0aCBtZXNzYWdlIGZpcnN0IHNheSB0aGUgZXJyb3JcbiAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiAoIWFycmF5IHx8IHZhbHVlLmxlbmd0aCA9PSAwKSkge1xuICAgIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgYnJhY2VzWzFdO1xuICB9XG5cbiAgaWYgKHJlY3Vyc2VUaW1lcyA8IDApIHtcbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tPYmplY3RdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cblxuICBjdHguc2Vlbi5wdXNoKHZhbHVlKTtcblxuICB2YXIgb3V0cHV0O1xuICBpZiAoYXJyYXkpIHtcbiAgICBvdXRwdXQgPSBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKTtcbiAgfSBlbHNlIHtcbiAgICBvdXRwdXQgPSBrZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGN0eC5zZWVuLnBvcCgpO1xuXG4gIHJldHVybiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhciBzaW1wbGUgPSAnXFwnJyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC9eXCJ8XCIkL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKSArICdcXCcnO1xuICAgIHJldHVybiBjdHguc3R5bGl6ZShzaW1wbGUsICdzdHJpbmcnKTtcbiAgfVxuICBpZiAoaXNOdW1iZXIodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnbnVtYmVyJyk7XG4gIGlmIChpc0Jvb2xlYW4odmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnYm9vbGVhbicpO1xuICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gIGlmIChpc051bGwodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IodmFsdWUpIHtcbiAgcmV0dXJuICdbJyArIEVycm9yLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSArICddJztcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIFN0cmluZyhpKSkpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAgU3RyaW5nKGkpLCB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKCcnKTtcbiAgICB9XG4gIH1cbiAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBrZXksIHRydWUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpIHtcbiAgdmFyIG5hbWUsIHN0ciwgZGVzYztcbiAgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIGtleSkgfHwgeyB2YWx1ZTogdmFsdWVba2V5XSB9O1xuICBpZiAoZGVzYy5nZXQpIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmICghaGFzT3duUHJvcGVydHkodmlzaWJsZUtleXMsIGtleSkpIHtcbiAgICBuYW1lID0gJ1snICsga2V5ICsgJ10nO1xuICB9XG4gIGlmICghc3RyKSB7XG4gICAgaWYgKGN0eC5zZWVuLmluZGV4T2YoZGVzYy52YWx1ZSkgPCAwKSB7XG4gICAgICBpZiAoaXNOdWxsKHJlY3Vyc2VUaW1lcykpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBpZiAoYXJyYXkgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cigxLCBuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICduYW1lJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG59XG5cblxuZnVuY3Rpb24gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpIHtcbiAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgdmFyIGxlbmd0aCA9IG91dHB1dC5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3VyKSB7XG4gICAgbnVtTGluZXNFc3QrKztcbiAgICBpZiAoY3VyLmluZGV4T2YoJ1xcbicpID49IDApIG51bUxpbmVzRXN0Kys7XG4gICAgcmV0dXJuIHByZXYgKyBjdXIucmVwbGFjZSgvXFx1MDAxYlxcW1xcZFxcZD9tL2csICcnKS5sZW5ndGggKyAxO1xuICB9LCAwKTtcblxuICBpZiAobGVuZ3RoID4gNjApIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICtcbiAgICAgICAgICAgKGJhc2UgPT09ICcnID8gJycgOiBiYXNlICsgJ1xcbiAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIG91dHB1dC5qb2luKCcsXFxuICAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIGJyYWNlc1sxXTtcbiAgfVxuXG4gIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgJyAnICsgb3V0cHV0LmpvaW4oJywgJykgKyAnICcgKyBicmFjZXNbMV07XG59XG5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gaXNPYmplY3QocmUpICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gaXNPYmplY3QoZCkgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuXG5mdW5jdGlvbiBpc0Vycm9yKGUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGUpICYmXG4gICAgICAob2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXScgfHwgZSBpbnN0YW5jZW9mIEVycm9yKTtcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSByZXF1aXJlKCcuL3N1cHBvcnQvaXNCdWZmZXInKTtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5cbmZ1bmN0aW9uIHBhZChuKSB7XG4gIHJldHVybiBuIDwgMTAgPyAnMCcgKyBuLnRvU3RyaW5nKDEwKSA6IG4udG9TdHJpbmcoMTApO1xufVxuXG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cblxuLy8gbG9nIGlzIGp1c3QgYSB0aGluIHdyYXBwZXIgdG8gY29uc29sZS5sb2cgdGhhdCBwcmVwZW5kcyBhIHRpbWVzdGFtcFxuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJyVzIC0gJXMnLCB0aW1lc3RhbXAoKSwgZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKSk7XG59O1xuXG5cbi8qKlxuICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICpcbiAqIFRoZSBGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgZnJvbSBsYW5nLmpzIHJld3JpdHRlbiBhcyBhIHN0YW5kYWxvbmVcbiAqIGZ1bmN0aW9uIChub3Qgb24gRnVuY3Rpb24ucHJvdG90eXBlKS4gTk9URTogSWYgdGhpcyBmaWxlIGlzIHRvIGJlIGxvYWRlZFxuICogZHVyaW5nIGJvb3RzdHJhcHBpbmcgdGhpcyBmdW5jdGlvbiBuZWVkcyB0byBiZSByZXdyaXR0ZW4gdXNpbmcgc29tZSBuYXRpdmVcbiAqIGZ1bmN0aW9ucyBhcyBwcm90b3R5cGUgc2V0dXAgdXNpbmcgbm9ybWFsIEphdmFTY3JpcHQgZG9lcyBub3Qgd29yayBhc1xuICogZXhwZWN0ZWQgZHVyaW5nIGJvb3RzdHJhcHBpbmcgKHNlZSBtaXJyb3IuanMgaW4gcjExNDkwMykuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZVxuICogICAgIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1cGVyQ3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBpbmhlcml0IHByb3RvdHlwZSBmcm9tLlxuICovXG5leHBvcnRzLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuZXhwb3J0cy5fZXh0ZW5kID0gZnVuY3Rpb24ob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCAhaXNPYmplY3QoYWRkKSkgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gIH1cbiAgcmV0dXJuIG9yaWdpbjtcbn07XG5cbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG4iXX0=
