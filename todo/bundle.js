!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.todoApp=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){


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





// var callStack = [];

// // we should somehow garbage collect this.
// var memo = {};


// function getCallerLoc(offset) {
//     var stack = new Error().stack.split('\n');
//     var line = stack[(offset || 1) + 1];
//     //console.log("last / = " + line.lastIndexOf("/"));
//     if (line[line.length - 1] === ')') {
// 	line = line.slice(0, line.length - 1);
//     }
//     return line.slice(line.lastIndexOf('/') + 1);
// }
 

// function component(state, func) {
//     var fname = func.name || func.toString();
//     return namedComponent(fname, func, state);
// }

// function named(fname, comp) {
//     callStack.push(fname);
//     try {
// 	var args = Array.prototype.slice.call(arguments, 2);
// 	// for (var i = 2; i < arguments.length; i++) {
// 	//     args.push(arguments[i]);
// 	// }
// 	return comp.apply(null, args);
//     }
//     finally {
// 	callStack.pop();
//     }
// }

// function keyOf(value) {
//     if (value === null) {
// 	return "";
//     }

//     if (value === undefined) {
// 	return "";
//     }

//     if (value.constructor === Array) {
// 	return objectId(value);
//     }

//     if (typeof value === "object") {
// 	return objectId(value);
//     }

//     return "";
// }

// function namedComponent(fname, func, state) {
//     state = state || {};
//     return function() {
// 	var model = arguments[0]; // first argument *must* be a model
// 	callStack.push([fname, keyOf(model), getCallerLoc(2)].toString());
// 	try {
// 	    var key = callStack.toString();
// 	    if (!memo[key]) {
// 		memo[key] = clone(state);
// 	    }
// 	    var self = memo[key];
// 	    return func.apply(null, [self].concat(Array.prototype.slice.call(arguments)));
// 	}
// 	finally {
// 	    callStack.pop();
// 	}
//     };
// }

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
		    //console.log("Updating attribute: " + vattr + " = " + vattrs[vattr]);
		    dom.setAttribute(vattr, vattrs[vattr]);
		}
	    }
	    else {
		//console.log("Adding attribute: " + vattr + " = " + vattrs[vattr]);
		dom.setAttribute(vattr, vattrs[vattr]);
	    }
	}
    }
    
    for (var i = 0; i < dom.attributes.length; i++) {
	var dattr = dom.attributes[i];
	if (!vattrs.hasOwnProperty(dattr.nodeName)) {
	    //console.log("Removing attribute: " + dattr.nodeName);
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
	    //console.log("Replacing child");
	    dom.replaceChild(build(vkid), dkid);
	}
    }
    
    if (dkids.length > len) {
	while (dkids.length > len) {
	    //console.log("Removing child ");
	    dom.removeChild(dkids[len]);
	}
    }
    else if (vkids.length > len) {
	for (var i = len; i < vkids.length; i++) {
	    //console.log("Appending new child ");
	    dom.appendChild(build(vkids[i]));
	}
    }
}

function build(vdom) {
    if (vdom === undefined) {
	return document.createTextNode("");
    }
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

// var __next_objid=1;
// function objectId(obj) {
//     if (obj==null) return null;
//     if (obj.__obj_id==null) obj.__obj_id=__next_objid++;
//     return obj.__obj_id;
// }

// function clone(obj) {
//     if (null == obj || "object" != typeof obj) return obj;
//     var copy = obj.constructor();
//     for (var attr in obj) {
//         if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
//     }
//     return copy;
// }

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
//    component: component,
//    clone: clone,
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
//    dealWithIt: dealWithIt,
//    callStack: callStack,
//    memo: memo,
//    named: named,
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


var imgui = require('../libimgui');
imgui.install(window);

var todos = {
    items: [
        {label: "Email", done: false},
        {label: "Reviewing", done: true},
        {label: "Buy milk", done: false},
        {label: "Send postcard", done: true},
        {label: "Finish annual report", done: false}
    ],
    newTodo: ""
};

function run() {
    setup(todoApp, todos, 'root');
}


function todoApp(model) {

    h2("Todo App");


    function todoView(item) {
	item.done = checkBox(item.done);
	text(item.label);
    }
        
    editableList(model.items, todoView);
    
    if (button("Add")) {
        model.items.push({label: model.newTodo, done: false});
        model.newTodo = "";
    }
    
    model.newTodo = textBox(model.newTodo);

    pre(function() {
	text(JSON.stringify(model, null, '  '));
    });
}



function editableList(xs, renderx) {
    function move(idx, dir) {
	var elt = xs[idx];
        xs.splice(idx, 1);
        xs.splice(idx + dir, 0, elt);
    }

    
    table(function () {

	// iterate over a copy
	var elts = xs.slice(0);
	
        for (var idx = 0; idx < elts.length; idx++) {
	    tr(function() {
		td(function () {
                    renderx(elts[idx]);
		});

		td(function() {
                    if (button(" + ")) {
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
}

module.exports = run;

},{"../libimgui":1}]},{},[3])(3)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4uL2xpYmltZ3VpL2xpYmltZ3VpLmpzIiwiLi4vbGliaW1ndWkvbm9kZV9tb2R1bGVzL2p3ZXJ0eS9qd2VydHkuanMiLCJ0b2RvLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3Z1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDamRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG5cbi8qXG5cblRPRE86XG5cbi0gbWFrZSBwb3NzaWJsZSB0byB1c2UgbXVsdGlwbGUgaW5zdGFuY2UgaW4gYSBzaW5nbGUgcGFnZSAocHV0IGV2ZXJ5dGhpbmcgaW4gYW4gb2JqZWN0KVxuXG4tIG1ha2UgXCJoZXJlXCIgcmVzaWxpZW50IGFnYWluc3QgcGFzc2luZyB0aGUgeWllbGRlZCBmdW5jdGlvbiB0byBvdGhlciBmdW5jdGlvbnMuIEN1cnJlbnRseSBcbiAgaXQgb25seSB3b3JrcyBpZiBpdCdzIGNhbGxlZCB3aXRoaW4gdGhlIGNsb3N1cmUuXG5cbi0gcmVtb3ZlIFwiYm9keVwiIHBhdGNoaW5nLlxuXG4tIGxldCBldmVudC1oYW5kbGluZyByZW5kZXIgbm90IGJ1aWxkIFZub2Rlcy5cblxuLSBhZGQgYXNzZXJ0aW9ucyB0byBjaGVjayBpbnB1dCBwYXJhbXMuXG5cbi0gZ2FyYmFnZSBjb2xsZWN0IHZpZXcgc3RhdGVzLlxuXG4tIHBlcmhhcHMgcmVtb3ZlIHRyeS1maW5hbGx5LCBzaW5jZSBleGNlcHRpb24gaGFuZGxpbmcgZG9lcyBub3Qgc2VlbXMgdG8gYmUgY29tbW9uIGluIEpTIChhbmQgc2xvdy4uLilcblxuLSBtYWtlIHNvbWUgZWxlbWVudHMgYm90aCBhY2NlcHQgc3RyaW5nIGFuZCBibG9jayAoZS5nLiBwKS5cblxuLSBzZXBhcmF0ZSB3aWRnZXRzIGluIG90aGVyIGxpYlxuXG4tIHJlbW92ZSBkZXAgb24gandlcnR5ICh1c2UgcHJvY2VlZCBwYXR0ZXJuKVxuXG4tIGFsbG93IGV2ZW50IGRlbGVnYXRpb24gdmlhIHJvb3QsIG5vdCBqdXN0IGRvY3VtZW50LlxuXG4tIG1ha2UgZG9jdW1lbnQgaW5qZWN0YWJsZVxuXG4qL1xuXG52YXIgandlcnR5ID0gcmVxdWlyZSgnandlcnR5JykuandlcnR5O1xuXG52YXIgR1VJID0ge1xuICAgIGV2ZW50OiBudWxsLFxuICAgIGFwcDogbnVsbCxcbiAgICBtb2RlbDogbnVsbCxcbiAgICBmb2N1czogW10sXG4gICAgbm9kZTogbnVsbCxcbiAgICBleHRyYXM6IHt9LFxuICAgIHRpbWVyczoge30sXG4gICAgaGFuZGxlcnM6IHt9LFxuICAgIGlkczogMFxufVxuXG5mdW5jdGlvbiBpbml0KGFwcCwgbW9kZWwsIHJvb3QpIHtcbiAgICBHVUkuYXBwID0gYXBwO1xuICAgIEdVSS5tb2RlbCA9IG1vZGVsO1xuICAgIEdVSS5yb290ID0gcm9vdDtcbn1cblxuZnVuY3Rpb24gcmVnaXN0ZXIoZXZlbnQsIGlkKSB7XG4gICAgLy8gb25seSBhZGQgb25lIGhhbmRsZXIgdG8gcm9vdCwgcGVyIGV2ZW50IHR5cGUuXG4gICAgaWYgKCFHVUkuaGFuZGxlcnMuaGFzT3duUHJvcGVydHkoZXZlbnQpKSB7XG5cdEdVSS5oYW5kbGVyc1tldmVudF0gPSBbXTtcblx0dmFyIHIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChHVUkucm9vdCk7XG5cdHIuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgZnVuY3Rpb24gKGUpIHtcblx0ICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIGRvbid0IGxlYWsgdXB3YXJkc1xuXHQgICAgdmFyIGlkID0gZS50YXJnZXQuZ2V0QXR0cmlidXRlKCdpZCcpO1xuXHQgICAgaWYgKEdVSS5oYW5kbGVyc1tldmVudF0uaW5kZXhPZihpZCkgPiAtMSkge1xuXHRcdEdVSS5ldmVudCA9IGU7XG5cdFx0ZG9SZW5kZXIoKTtcblx0ICAgIH1cblx0fSwgZmFsc2UpO1xuICAgIH1cbiAgICBHVUkuaGFuZGxlcnNbZXZlbnRdLnB1c2goaWQpO1xufVxuXG5mdW5jdGlvbiByZXNldEhhbmRsZXJzKCkge1xuICAgIGZvciAodmFyIGsgaW4gR1VJLmhhbmRsZXJzKSB7XG5cdGlmIChHVUkuaGFuZGxlcnMuaGFzT3duUHJvcGVydHkoaykpIHtcblx0ICAgIEdVSS5oYW5kbGVyc1trXSA9IFtdO1xuXHR9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzZXR1cChhcHAsIG1vZGVsLCByb290KSB7XG4gICAgaW5pdChhcHAsIG1vZGVsLCByb290KTtcbiAgICBtb3VudChyZW5kZXJPbmNlKCkpO1xufVxuXG5cbmZ1bmN0aW9uIHJlbmRlck9uY2UoKSB7XG4gICAgcmVzZXRIYW5kbGVycygpO1xuICAgIEdVSS5leHRyYXMgPSB7fTtcbiAgICBHVUkuZm9jdXMgPSBbXTtcbiAgICBHVUkuaWRzID0gMDtcbiAgICBHVUkuYXBwKEdVSS5tb2RlbCk7XG59XG5cbmZ1bmN0aW9uIG1vdW50KG5vZGUpIHtcbiAgICB2YXIgYWN0aXZlID0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudDtcbiAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoR1VJLnJvb3QpO1xuICAgIGlmIChHVUkubm9kZSAhPT0gbnVsbCkge1xuXHRyZWNvbmNpbGVLaWRzKGNvbnRhaW5lciwgY29udGFpbmVyLmNoaWxkTm9kZXMsIEdVSS5mb2N1cyk7XG4gICAgfVxuICAgIGVsc2Uge1xuXHR3aGlsZSAoY29udGFpbmVyLmZpcnN0Q2hpbGQpIHtcblx0ICAgIGNvbnRhaW5lci5yZW1vdmVDaGlsZChjb250YWluZXIuZmlyc3RDaGlsZCk7XG5cdH1cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBHVUkuZm9jdXMubGVuZ3RoOyBpKyspIHtcblx0ICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChidWlsZChHVUkuZm9jdXNbaV0pKTtcblx0fVxuICAgIH1cbiAgICBHVUkubm9kZSA9IG5vZGU7XG5cbiAgICBmb3IgKHZhciBpZCBpbiBHVUkuZXh0cmFzKSB7XG5cdGlmIChHVUkuZXh0cmFzLmhhc093blByb3BlcnR5KGlkKSkge1xuXHQgICAgdmFyIGRvU29tZXRoaW5nID0gR1VJLmV4dHJhc1tpZF07XG5cdCAgICB2YXIgZWx0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuXHQgICAgZG9Tb21ldGhpbmcoZWx0KTtcblx0fVxuICAgIH1cbiAgICBcbn1cblxuZnVuY3Rpb24gZG9SZW5kZXIoKSB7XG4gICAgLy8gdHdpY2U6IG9uZSB0byBoYW5kbGUgZXZlbnQsIG9uZSB0byBzeW5jIHZpZXcuXG4gICAgdmFyIF8gPSByZW5kZXJPbmNlKCk7XG4gICAgdmFyIG5vZGUgPSByZW5kZXJPbmNlKCk7XG4gICAgbW91bnQobm9kZSk7XG59XG5cblxuXG5cblxuLy8gdmFyIGNhbGxTdGFjayA9IFtdO1xuXG4vLyAvLyB3ZSBzaG91bGQgc29tZWhvdyBnYXJiYWdlIGNvbGxlY3QgdGhpcy5cbi8vIHZhciBtZW1vID0ge307XG5cblxuLy8gZnVuY3Rpb24gZ2V0Q2FsbGVyTG9jKG9mZnNldCkge1xuLy8gICAgIHZhciBzdGFjayA9IG5ldyBFcnJvcigpLnN0YWNrLnNwbGl0KCdcXG4nKTtcbi8vICAgICB2YXIgbGluZSA9IHN0YWNrWyhvZmZzZXQgfHwgMSkgKyAxXTtcbi8vICAgICAvL2NvbnNvbGUubG9nKFwibGFzdCAvID0gXCIgKyBsaW5lLmxhc3RJbmRleE9mKFwiL1wiKSk7XG4vLyAgICAgaWYgKGxpbmVbbGluZS5sZW5ndGggLSAxXSA9PT0gJyknKSB7XG4vLyBcdGxpbmUgPSBsaW5lLnNsaWNlKDAsIGxpbmUubGVuZ3RoIC0gMSk7XG4vLyAgICAgfVxuLy8gICAgIHJldHVybiBsaW5lLnNsaWNlKGxpbmUubGFzdEluZGV4T2YoJy8nKSArIDEpO1xuLy8gfVxuIFxuXG4vLyBmdW5jdGlvbiBjb21wb25lbnQoc3RhdGUsIGZ1bmMpIHtcbi8vICAgICB2YXIgZm5hbWUgPSBmdW5jLm5hbWUgfHwgZnVuYy50b1N0cmluZygpO1xuLy8gICAgIHJldHVybiBuYW1lZENvbXBvbmVudChmbmFtZSwgZnVuYywgc3RhdGUpO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBuYW1lZChmbmFtZSwgY29tcCkge1xuLy8gICAgIGNhbGxTdGFjay5wdXNoKGZuYW1lKTtcbi8vICAgICB0cnkge1xuLy8gXHR2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4vLyBcdC8vIGZvciAodmFyIGkgPSAyOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4vLyBcdC8vICAgICBhcmdzLnB1c2goYXJndW1lbnRzW2ldKTtcbi8vIFx0Ly8gfVxuLy8gXHRyZXR1cm4gY29tcC5hcHBseShudWxsLCBhcmdzKTtcbi8vICAgICB9XG4vLyAgICAgZmluYWxseSB7XG4vLyBcdGNhbGxTdGFjay5wb3AoKTtcbi8vICAgICB9XG4vLyB9XG5cbi8vIGZ1bmN0aW9uIGtleU9mKHZhbHVlKSB7XG4vLyAgICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4vLyBcdHJldHVybiBcIlwiO1xuLy8gICAgIH1cblxuLy8gICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4vLyBcdHJldHVybiBcIlwiO1xuLy8gICAgIH1cblxuLy8gICAgIGlmICh2YWx1ZS5jb25zdHJ1Y3RvciA9PT0gQXJyYXkpIHtcbi8vIFx0cmV0dXJuIG9iamVjdElkKHZhbHVlKTtcbi8vICAgICB9XG5cbi8vICAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiKSB7XG4vLyBcdHJldHVybiBvYmplY3RJZCh2YWx1ZSk7XG4vLyAgICAgfVxuXG4vLyAgICAgcmV0dXJuIFwiXCI7XG4vLyB9XG5cbi8vIGZ1bmN0aW9uIG5hbWVkQ29tcG9uZW50KGZuYW1lLCBmdW5jLCBzdGF0ZSkge1xuLy8gICAgIHN0YXRlID0gc3RhdGUgfHwge307XG4vLyAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuLy8gXHR2YXIgbW9kZWwgPSBhcmd1bWVudHNbMF07IC8vIGZpcnN0IGFyZ3VtZW50ICptdXN0KiBiZSBhIG1vZGVsXG4vLyBcdGNhbGxTdGFjay5wdXNoKFtmbmFtZSwga2V5T2YobW9kZWwpLCBnZXRDYWxsZXJMb2MoMildLnRvU3RyaW5nKCkpO1xuLy8gXHR0cnkge1xuLy8gXHQgICAgdmFyIGtleSA9IGNhbGxTdGFjay50b1N0cmluZygpO1xuLy8gXHQgICAgaWYgKCFtZW1vW2tleV0pIHtcbi8vIFx0XHRtZW1vW2tleV0gPSBjbG9uZShzdGF0ZSk7XG4vLyBcdCAgICB9XG4vLyBcdCAgICB2YXIgc2VsZiA9IG1lbW9ba2V5XTtcbi8vIFx0ICAgIHJldHVybiBmdW5jLmFwcGx5KG51bGwsIFtzZWxmXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuLy8gXHR9XG4vLyBcdGZpbmFsbHkge1xuLy8gXHQgICAgY2FsbFN0YWNrLnBvcCgpO1xuLy8gXHR9XG4vLyAgICAgfTtcbi8vIH1cblxuLypcbnZkb20gZWxlbWVudFxue3RhZzpcbiBhdHRyczoge30gZXRjLlxuIGtpZHM6IFtdIH1cblxuKi9cblxuZnVuY3Rpb24gY29tcGF0KGQsIHYpIHtcbiAgICAvL2NvbnNvbGUubG9nKFwiQ29tcGF0PyBcIik7XG4gICAgLy9jb25zb2xlLmxvZyhcImQgPSBcIiArIGQubm9kZVZhbHVlKTtcbiAgICAvL2NvbnNvbGUubG9nKFwidiA9IFwiICsgSlNPTi5zdHJpbmdpZnkodikpO1xuICAgIHJldHVybiAoZC5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUgJiYgKHR5cGVvZiB2ICE9PSAnb2JqZWN0JykpXG5cdHx8IChkLnRhZ05hbWUgPT09IHYudGFnLnRvVXBwZXJDYXNlKCkpO1xufVxuXG4vLyBmdW5jdGlvbiBzZXRBdHRyaWJ1dGVIb29rKGRvbSwgbmFtZSwgdmFsdWUpIHtcbi8vICAgICBmdW5jdGlvbiBwYXJzZUJvb2xlYW4odikge1xuLy8gXHRpZiAoIXYpIHtcbi8vIFx0ICAgIHJldHVybiBmYWxzZTtcbi8vIFx0fVxuLy8gXHRyZXR1cm4gdi50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkgPT09ICd0cnVlJztcbi8vICAgICB9XG4vLyAgICAgLy8gaWYgKG5hbWUgPT09ICdjaGVja2VkJykge1xuLy8gICAgIC8vIFx0ZG9tLmNoZWNrZWQgPSBwYXJzZUJvb2xlYW4odmFsdWUpO1xuLy8gICAgIC8vIH1cbi8vICAgICAvLyBpZiAobmFtZSA9PT0gJ3NlbGVjdGVkJykge1xuLy8gICAgIC8vIFx0ZG9tLnNlbGVjdGVkID0gcGFyc2VCb29sZWFuKHZhbHVlKTtcbi8vICAgICAvLyB9XG4vLyAgICAgaWYgKG5hbWUgPT09ICd2YWx1ZScpIHtcbi8vIFx0ZG9tLnZhbHVlID0gdmFsdWU7XG4vLyAgICAgfVxuLy8gfVxuXG4vLyBmdW5jdGlvbiByZW1vdmVBdHRyaWJ1dGVIb29rKGRvbSwgbmFtZSkge1xuLy8gICAgIC8vIGlmIChuYW1lID09PSAnY2hlY2tlZCcpIHtcbi8vICAgICAvLyBcdGRvbS5jaGVja2VkID0gZmFsc2U7XG4vLyAgICAgLy8gfVxuLy8gICAgIC8vIGlmIChuYW1lID09PSAnc2VsZWN0ZWQnKSB7XG4vLyAgICAgLy8gXHRkb20uc2VsZWN0ZWQgPSBmYWxzZTtcbi8vICAgICAvLyB9XG4vLyAgICAgaWYgKG5hbWUgPT09ICd2YWx1ZScpIHtcbi8vIFx0ZG9tLnZhbHVlID0gJyc7XG4vLyAgICAgfVxuLy8gfVxuXG5mdW5jdGlvbiByZWNvbmNpbGUoZG9tLCB2ZG9tKSB7XG4gICAgaWYgKCFjb21wYXQoZG9tLCB2ZG9tKSkge1xuXHR0aHJvdyBcIkNhbiBvbmx5IHJlY29uY2lsZSBjb21wYXRpYmxlIG5vZGVzXCI7XG4gICAgfVxuICAgIFxuICAgIC8vIFRleHQgbm9kZXNcbiAgICBpZiAodHlwZW9mIHZkb20gIT09ICdvYmplY3QnKSB7XG5cdGlmIChkb20ubm9kZVZhbHVlICE9PSB2ZG9tKSB7XG5cdCAgICBkb20ubm9kZVZhbHVlID0gdmRvbS50b1N0cmluZygpO1xuXHR9XG5cdHJldHVybjtcbiAgICB9XG5cblxuICAgIC8vIEVsZW1lbnQgbm9kZXNcbiAgICB2YXIgdmF0dHJzID0gdmRvbS5hdHRycyB8fCB7fTtcbiAgICBmb3IgKHZhciB2YXR0ciBpbiB2YXR0cnMpIHtcblx0aWYgKHZhdHRycy5oYXNPd25Qcm9wZXJ0eSh2YXR0cikpIHtcblx0ICAgIGlmIChkb20uaGFzQXR0cmlidXRlKHZhdHRyKSkge1xuXHRcdHZhciBkYXR0ciA9IGRvbS5nZXRBdHRyaWJ1dGUodmF0dHIpO1xuXHRcdGlmIChkYXR0ciAhPT0gdmF0dHJzW3ZhdHRyXS50b1N0cmluZygpKSB7IFxuXHRcdCAgICAvL2NvbnNvbGUubG9nKFwiVXBkYXRpbmcgYXR0cmlidXRlOiBcIiArIHZhdHRyICsgXCIgPSBcIiArIHZhdHRyc1t2YXR0cl0pO1xuXHRcdCAgICBkb20uc2V0QXR0cmlidXRlKHZhdHRyLCB2YXR0cnNbdmF0dHJdKTtcblx0XHR9XG5cdCAgICB9XG5cdCAgICBlbHNlIHtcblx0XHQvL2NvbnNvbGUubG9nKFwiQWRkaW5nIGF0dHJpYnV0ZTogXCIgKyB2YXR0ciArIFwiID0gXCIgKyB2YXR0cnNbdmF0dHJdKTtcblx0XHRkb20uc2V0QXR0cmlidXRlKHZhdHRyLCB2YXR0cnNbdmF0dHJdKTtcblx0ICAgIH1cblx0fVxuICAgIH1cbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRvbS5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG5cdHZhciBkYXR0ciA9IGRvbS5hdHRyaWJ1dGVzW2ldO1xuXHRpZiAoIXZhdHRycy5oYXNPd25Qcm9wZXJ0eShkYXR0ci5ub2RlTmFtZSkpIHtcblx0ICAgIC8vY29uc29sZS5sb2coXCJSZW1vdmluZyBhdHRyaWJ1dGU6IFwiICsgZGF0dHIubm9kZU5hbWUpO1xuXHQgICAgZG9tLnJlbW92ZUF0dHJpYnV0ZShkYXR0ci5ub2RlTmFtZSk7XG5cdH1cbiAgICB9XG5cbiAgICByZWNvbmNpbGVLaWRzKGRvbSwgZG9tLmNoaWxkTm9kZXMsIHZkb20ua2lkcyk7XG59XG5cbmZ1bmN0aW9uIHJlY29uY2lsZUtpZHMoZG9tLCBka2lkcywgdmtpZHMpIHtcbiAgICB2YXIgbGVuID0gTWF0aC5taW4oZGtpZHMubGVuZ3RoLCB2a2lkcy5sZW5ndGgpO1xuICAgIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcblx0dmFyIGRraWQgPSBka2lkc1tpXTtcblx0dmFyIHZraWQgPSB2a2lkc1tpXTtcblx0aWYgKGNvbXBhdChka2lkLCB2a2lkKSkge1xuXHQgICAgcmVjb25jaWxlKGRraWQsIHZraWQpO1xuXHR9XG5cdGVsc2Uge1xuXHQgICAgLy9jb25zb2xlLmxvZyhcIlJlcGxhY2luZyBjaGlsZFwiKTtcblx0ICAgIGRvbS5yZXBsYWNlQ2hpbGQoYnVpbGQodmtpZCksIGRraWQpO1xuXHR9XG4gICAgfVxuICAgIFxuICAgIGlmIChka2lkcy5sZW5ndGggPiBsZW4pIHtcblx0d2hpbGUgKGRraWRzLmxlbmd0aCA+IGxlbikge1xuXHQgICAgLy9jb25zb2xlLmxvZyhcIlJlbW92aW5nIGNoaWxkIFwiKTtcblx0ICAgIGRvbS5yZW1vdmVDaGlsZChka2lkc1tsZW5dKTtcblx0fVxuICAgIH1cbiAgICBlbHNlIGlmICh2a2lkcy5sZW5ndGggPiBsZW4pIHtcblx0Zm9yICh2YXIgaSA9IGxlbjsgaSA8IHZraWRzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAvL2NvbnNvbGUubG9nKFwiQXBwZW5kaW5nIG5ldyBjaGlsZCBcIik7XG5cdCAgICBkb20uYXBwZW5kQ2hpbGQoYnVpbGQodmtpZHNbaV0pKTtcblx0fVxuICAgIH1cbn1cblxuZnVuY3Rpb24gYnVpbGQodmRvbSkge1xuICAgIGlmICh2ZG9tID09PSB1bmRlZmluZWQpIHtcblx0cmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFwiXCIpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHZkb20gIT09ICdvYmplY3QnKSB7XG5cdHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh2ZG9tLnRvU3RyaW5nKCkpO1xuICAgIH1cblxuICAgIHZhciBlbHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHZkb20udGFnKTtcbiAgICB2YXIgdmF0dHJzID0gdmRvbS5hdHRycyB8fCB7fTtcbiAgICBmb3IgKHZhciBrIGluIHZhdHRycykge1xuXHRpZiAodmF0dHJzLmhhc093blByb3BlcnR5KGspKSB7XG5cdCAgICBlbHQuc2V0QXR0cmlidXRlKGssIHZhdHRyc1trXSk7XG5cdH1cbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZG9tLmtpZHMubGVuZ3RoOyBpKyspIHtcblx0ZWx0LmFwcGVuZENoaWxkKGJ1aWxkKHZkb20ua2lkc1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gZWx0OyAgICBcbn1cblxuLy8gdmFyIF9fbmV4dF9vYmppZD0xO1xuLy8gZnVuY3Rpb24gb2JqZWN0SWQob2JqKSB7XG4vLyAgICAgaWYgKG9iaj09bnVsbCkgcmV0dXJuIG51bGw7XG4vLyAgICAgaWYgKG9iai5fX29ial9pZD09bnVsbCkgb2JqLl9fb2JqX2lkPV9fbmV4dF9vYmppZCsrO1xuLy8gICAgIHJldHVybiBvYmouX19vYmpfaWQ7XG4vLyB9XG5cbi8vIGZ1bmN0aW9uIGNsb25lKG9iaikge1xuLy8gICAgIGlmIChudWxsID09IG9iaiB8fCBcIm9iamVjdFwiICE9IHR5cGVvZiBvYmopIHJldHVybiBvYmo7XG4vLyAgICAgdmFyIGNvcHkgPSBvYmouY29uc3RydWN0b3IoKTtcbi8vICAgICBmb3IgKHZhciBhdHRyIGluIG9iaikge1xuLy8gICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGF0dHIpKSBjb3B5W2F0dHJdID0gb2JqW2F0dHJdO1xuLy8gICAgIH1cbi8vICAgICByZXR1cm4gY29weTtcbi8vIH1cblxuLy8gRXZlbnQgaGFuZGxpbmdcblxuZnVuY3Rpb24gZGVhbFdpdGhJdChlKSB7XG4gICAgR1VJLmV2ZW50ID0gZTtcbiAgICBkb1JlbmRlcigpO1xufVxuXG5cblxuLy8gUmVuZGVyIGZ1bmN0aW9uc1xuXG5mdW5jdGlvbiBpc0tleUNvbWJvRXZlbnQoZXZlbnQpIHtcbiAgICByZXR1cm4gZXZlbnQuaW5kZXhPZihcIjpcIikgPiAtIDE7XG59XG5cbmZ1bmN0aW9uIGdldEhhbmRsZXIoZXZlbnQpIHtcbiAgICBpZiAoaXNLZXlDb21ib0V2ZW50KGV2ZW50KSkge1xuXHRyZXR1cm4ga2V5Q29tYm9MaXN0ZW5lcihldmVudCk7XG4gICAgfVxuICAgIHJldHVybiBkZWFsV2l0aEl0O1xufVxuICAgIFxuZnVuY3Rpb24ga2V5Q29tYm9MaXN0ZW5lcihlbHQsIGV2ZW50KSB7XG4gICAgdmFyIGNvbG9uID0gZXZlbnQuaW5kZXhPZihcIjpcIik7XG4gICAgdmFyIGNvbWJvID0gZXZlbnQuc2xpY2UoY29sb24gKyAxKTtcbiAgICBldmVudCA9IGV2ZW50LnNsaWNlKDAsIGNvbG9uKTtcbiAgICByZXR1cm4gZnVuY3Rpb24gbGlzdGVuKGUpIHtcblx0aWYgKGp3ZXJ0eS5pcyhjb21ibywgZSkpIHtcblx0ICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdCAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cdCAgICBlLmlzS2V5ID0gZnVuY3Rpb24gKGMpIHsgcmV0dXJuIGp3ZXJ0eS5pcyhjLCB0aGlzKTsgfTtcblx0ICAgIGUudGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIGxpc3RlbiwgZmFsc2UpO1xuXHQgICAgZGVhbFdpdGhJdChlKTtcblx0fVxuICAgIH07XG59XG5cblxuZnVuY3Rpb24gb24oZWx0LCBldmVudHMsIGF0dHJzLCBibG9jaykge1xuICAgIGF0dHJzID0gYXR0cnMgfHwge307XG4gICAgdmFyIGlkID0gYXR0cnNbXCJpZFwiXSB8fCAoXCJpZFwiICsgR1VJLmlkcysrKTtcbiAgICBhdHRyc1tcImlkXCJdID0gaWQ7XG5cbiAgICBcbiAgICAvL0dVSS5oYW5kbGVyc1tpZF0gPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV2ZW50cy5sZW5ndGg7IGkrKykge1xuXHRyZWdpc3RlcihldmVudHNbaV0sIGlkKTtcbiAgICB9XG5cbiAgICByZXR1cm4gd2l0aEVsZW1lbnQoZWx0LCBhdHRycywgZnVuY3Rpb24oKSB7XG5cdHZhciBldmVudCA9IEdVSS5ldmVudDtcblx0aWYgKGV2ZW50ICYmIGV2ZW50LnRhcmdldC5nZXRBdHRyaWJ1dGUoJ2lkJykgPT09IGlkKSB7XG5cdCAgICBHVUkuZXZlbnQgPSB1bmRlZmluZWQ7IC8vIG1heWJlIGRvIGluIHRvcGxldmVsPz8/XG5cdCAgICByZXR1cm4gYmxvY2soZXZlbnQpOyAvLyBsZXQgaXQgYmUgaGFuZGxlZFxuXHR9XG5cdHJldHVybiBibG9jaygpO1xuICAgIH0pO1xufVxuXG5cblxuXG5mdW5jdGlvbiBoZXJlKGZ1bmMsIGJsb2NrKSB7XG4gICAgdmFyIHBvcyA9IEdVSS5mb2N1cy5sZW5ndGg7XG4gICAgcmV0dXJuIGJsb2NrKGZ1bmN0aW9uKCkge1xuXHR2YXIgcGFyZW50ID0gR1VJLmZvY3VzO1xuXHRHVUkuZm9jdXMgPSBbXTtcblx0dHJ5IHtcblx0ICAgIHJldHVybiBmdW5jLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG5cdH1cblx0ZmluYWxseSB7XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IEdVSS5mb2N1cy5sZW5ndGg7IGkrKykge1xuXHRcdHBhcmVudC5zcGxpY2UocG9zICsgaSwgMCwgR1VJLmZvY3VzW2ldKTtcblx0ICAgIH1cblx0ICAgIEdVSS5mb2N1cyA9IHBhcmVudDtcblx0fVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiB3aXRoRWxlbWVudChlbHQsIGF0dHJzLCBmdW5jLCBldnMpIHtcbiAgICAvLyBUT0RPOiBpZiBHVUkucHJldGVuZCwgZG9uJ3QgYnVpbGQgdm5vZGVzXG4gICAgdmFyIHBhcmVudCA9IEdVSS5mb2N1cztcbiAgICBHVUkuZm9jdXMgPSBbXTtcbiAgICB0cnkge1xuXHRyZXR1cm4gZnVuYygpO1xuICAgIH1cbiAgICBmaW5hbGx5IHtcblx0aWYgKGF0dHJzICYmIGF0dHJzWydleHRyYSddKSB7XG5cdCAgICBHVUkuZXh0cmFzW2F0dHJzWydpZCddXSA9IGF0dHJzWydleHRyYSddO1xuXHQgICAgZGVsZXRlIGF0dHJzWydleHRyYSddO1xuXHR9XG5cdHZhciB2bm9kZSA9IHt0YWc6IGVsdCwgYXR0cnM6IGF0dHJzLCBraWRzOiBHVUkuZm9jdXN9O1xuXHRwYXJlbnQucHVzaCh2bm9kZSk7XG5cdEdVSS5mb2N1cyA9IHBhcmVudDtcbiAgICB9ICAgIFxufVxuXG5cblxuLy8gQmFzaWMgd2lkZ2V0c1xuXG5cbmZ1bmN0aW9uIGFkZElucHV0RWxlbWVudHMob2JqKSB7XG4gICAgdmFyIGJhc2ljSW5wdXRzID0ge1xuLy9cdHRleHRCb3g6IHt0eXBlOiAndGV4dCcsIGV2ZW50OiAnaW5wdXQnfSxcblx0c3BpbkJveDoge3R5cGU6ICdudW1iZXInLCBldmVudDogJ2lucHV0J30sXG5cdHNsaWRlcjoge3R5cGU6ICdyYW5nZScsIGV2ZW50OiAnaW5wdXQnfSxcblx0ZW1haWxCb3g6IHt0eXBlOiAnZW1haWwnLCBldmVudDogJ2lucHV0J30sXG5cdHNlYXJjaEJveDoge3R5cGU6ICdzZWFyY2gnLCBldmVudDogJ2lucHV0J30sXG5cdGRhdGVQaWNrZXI6IHt0eXBlOiAnZGF0ZScsIGV2ZW50OiAnY2hhbmdlJ30sXG5cdGNvbG9yUGlja2VyOiB7dHlwZTogJ2NvbG9yJywgZXZlbnQ6ICdjaGFuZ2UnfSxcblx0ZGF0ZVRpbWVQaWNrZXI6IHt0eXBlOiAnZGF0ZXRpbWUnLCBldmVudDogJ2NoYW5nZSd9LFxuXHRsb2NhbERhdGVUaW1lUGlja2VyOiB7dHlwZTogJ2RhdGV0aW1lLWxvY2FsJywgZXZlbnQ6ICdjaGFuZ2UnfSxcblx0bW9udGhQaWNrZXI6IHt0eXBlOiAnd2VlaycsIGV2ZW50OiAnY2hhbmdlJ30sXG5cdHdlZWtQaWNrZXI6IHt0eXBlOiAnd2VlaycsIGV2ZW50OiAnY2hhbmdlJ30sXG5cdHRpbWVQaWNrZXI6IHt0eXBlOiAndGltZScsIGV2ZW50OiAnY2hhbmdlJ31cbiAgICB9XG4gICAgXG5cbiAgICBmb3IgKHZhciBuYW1lIGluIGJhc2ljSW5wdXRzKSB7XG5cdGlmIChiYXNpY0lucHV0cy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuXHQgICAgKGZ1bmN0aW9uIChuYW1lKSB7XG5cdFx0b2JqW25hbWVdID0gZnVuY3Rpb24gKHZhbHVlLCBhdHRycykge1xuXHRcdCAgICBhdHRycyA9IGF0dHJzIHx8IHt9O1xuXHRcdCAgICBhdHRyc1sndHlwZSddID0gYmFzaWNJbnB1dHNbbmFtZV0udHlwZTtcblx0XHQgICAgYXR0cnNbJ3ZhbHVlJ10gPSB2YWx1ZTtcblx0XHQgICAgXG5cdFx0ICAgIHJldHVybiBvbihcImlucHV0XCIsIFtiYXNpY0lucHV0c1tuYW1lXS5ldmVudF0sIGF0dHJzLCBmdW5jdGlvbihldikge1xuXHRcdFx0cmV0dXJuIGV2ID8gZXYudGFyZ2V0LnZhbHVlIDogdmFsdWU7XG5cdFx0ICAgIH0pO1xuXHRcdH1cblx0ICAgIH0pKG5hbWUpO1xuXHR9XG4gICAgfVxufVxuXG5mdW5jdGlvbiB0ZXh0YXJlYSh2YWx1ZSwgYXR0cnMpIHtcbiAgICBhdHRycyA9IGF0dHJzIHx8IHt9O1xuICAgIFxuICAgIHJldHVybiBvbihcInRleHRhcmVhXCIsIFtcImtleXVwXCIsIFwiYmx1clwiXSwgYXR0cnMsIGZ1bmN0aW9uKGV2KSB7XG5cdHZhciBuZXdWYWx1ZSA9IGV2ID8gZXYudGFyZ2V0LnZhbHVlIDogdmFsdWU7XG5cdHRleHQodmFsdWUpO1xuXHRyZXR1cm4gbmV3VmFsdWU7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHRleHRCb3godmFsdWUsIGF0dHJzKSB7XG4gICAgYXR0cnMgPSBhdHRycyB8fCB7fTtcbiAgICBhdHRycy50eXBlID0gJ3RleHQnO1xuICAgIGF0dHJzLnZhbHVlID0gdmFsdWU7XG4gICAgYXR0cnMuZXh0cmEgPSBmdW5jdGlvbiAoZWx0KSB7XG4gICAgXHRlbHQudmFsdWUgPSB2YWx1ZTtcbiAgICB9O1xuICAgIFxuICAgIFxuICAgIHJldHVybiBvbihcImlucHV0XCIsIFtcImlucHV0XCJdLCBhdHRycywgZnVuY3Rpb24oZXYpIHtcblx0cmV0dXJuIGV2ID8gZXYudGFyZ2V0LnZhbHVlIDogdmFsdWU7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGNoZWNrQm94KHZhbHVlLCBhdHRycykge1xuICAgIGF0dHJzID0gYXR0cnMgfHwge307XG4gICAgYXR0cnMudHlwZSA9IFwiY2hlY2tib3hcIjtcbiAgICBpZiAodmFsdWUpIHtcblx0YXR0cnMuY2hlY2tlZCA9IFwidHJ1ZVwiO1xuICAgIH1cbiAgICBhdHRycy5leHRyYSA9IGZ1bmN0aW9uIChlbHQpIHtcblx0ZWx0LmNoZWNrZWQgPSB2YWx1ZTtcbiAgICB9O1xuICAgIFxuICAgIHJldHVybiBvbihcImlucHV0XCIsIFtcImNsaWNrXCJdLCBhdHRycywgZnVuY3Rpb24oZXYpIHtcblx0cmV0dXJuIGV2ID8gZXYudGFyZ2V0LmNoZWNrZWQgOiB2YWx1ZTtcbiAgICB9KTtcbn1cblxuXG5mdW5jdGlvbiBhZnRlcihpZCwgZGVsYXkpIHtcbiAgICBpZiAoR1VJLnRpbWVycy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcblx0aWYgKEdVSS50aW1lcnNbaWRdKSB7XG5cdCAgICByZXR1cm4gdHJ1ZTtcblx0fVxuXHRyZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGVsc2Uge1xuXHRHVUkudGltZXJzW2lkXSA9IGZhbHNlO1xuXHR3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0ICAgIEdVSS50aW1lcnNbaWRdID0gdHJ1ZTtcblx0ICAgIGRvUmVuZGVyKCk7XG5cdH0sIGRlbGF5KTtcbiAgICB9XG59XG5cblxuZnVuY3Rpb24gYnV0dG9uKGxhYmVsLCBhdHRycykge1xuICAgIHJldHVybiBvbihcImJ1dHRvblwiLCBbXCJjbGlja1wiXSwgYXR0cnMsIGZ1bmN0aW9uKGV2KSB7XG5cdHRleHQobGFiZWwpO1xuXHRyZXR1cm4gZXYgIT09IHVuZGVmaW5lZDtcbiAgICB9KTtcbn1cblxuXG5mdW5jdGlvbiBzZWxlY3QodmFsdWUsIHgsIHksIHopIHtcbiAgICAvL2lkQ2xhc3MsIGF0dHJzLCBibG9ja1xuXG4gICAgZnVuY3Rpb24gb3B0aW9uKG9wdFZhbHVlLCBsYWJlbCkge1xuXHR2YXIgYXR0cnMgPSB7dmFsdWU6IG9wdFZhbHVlfTtcblx0aWYgKG9wdFZhbHVlID09PSB2YWx1ZSkge1xuXHQgICAgYXR0cnNbJ3NlbGVjdGVkJ10gPSB0cnVlO1xuXHR9XG5cdGxhYmVsID0gbGFiZWwgfHwgb3B0VmFsdWU7XG5cdHJldHVybiB3aXRoRWxlbWVudChcIm9wdGlvblwiLCBhdHRycywgZnVuY3Rpb24gKCkge1xuXHQgICAgdGV4dChsYWJlbCk7XG5cdH0pO1xuICAgIH1cbiAgICBcbiAgICB2YXIgYmxvY2sgPSBleHRyYWN0QmxvY2soYXJndW1lbnRzKTtcbiAgICByZXR1cm4gb24oXCJzZWxlY3RcIiwgW1wiY2hhbmdlXCJdLCBkZWZhdWx0QXR0cnMoeCwgeSwgeiksIGZ1bmN0aW9uKGV2KSB7XG5cdGJsb2NrKG9wdGlvbik7XG5cdHJldHVybiBldiAgXG5cdCAgICA/IGV2LnRhcmdldC5vcHRpb25zW2V2LnRhcmdldC5zZWxlY3RlZEluZGV4XS52YWx1ZVxuXHQgICAgOiB2YWx1ZTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gcmFkaW9Hcm91cCh2YWx1ZSwgIHgsIHksIHopIHtcbiAgICB2YXIgcmVzdWx0ID0gdmFsdWU7XG4gICAgdmFyIG5hbWUgPSAnbmFtZScgKyAoR1VJLmlkcysrKTtcbiAgICBmdW5jdGlvbiByYWRpbyhyYWRpb1ZhbHVlLCBsYWJlbCkge1xuXHR2YXIgYXR0cnMgPSB7dHlwZTogXCJyYWRpb1wiLCBuYW1lOiBuYW1lfTtcblx0aWYgKHJhZGlvVmFsdWUgPT09IHZhbHVlKSB7XG5cdCAgICBhdHRyc1snY2hlY2tlZCddID0gdHJ1ZTtcblx0fVxuXHRhdHRycy5leHRyYSA9IGZ1bmN0aW9uIChlbHQpIHtcblx0ICAgIGVsdC5jaGVja2VkID0gKHJhZGlvVmFsdWUgPT09IHZhbHVlKTtcblx0fTtcblx0cmV0dXJuIG9uKFwibGFiZWxcIiwgW10sIHt9LCBmdW5jdGlvbiAoKSB7XG5cdCAgICBvbihcImlucHV0XCIsIFtcImNsaWNrXCJdLCBhdHRycywgZnVuY3Rpb24gKGV2KSB7XG5cdFx0aWYgKGV2KSB7XG5cdFx0ICAgIHJlc3VsdCA9IHJhZGlvVmFsdWU7XG5cdFx0fVxuXHRcdHJldHVybiByYWRpb1ZhbHVlO1xuXHQgICAgfSlcblx0ICAgIHRleHQobGFiZWwgfHwgcmFkaW9WYWx1ZSk7XG5cdCAgICByZXR1cm4gcmFkaW9WYWx1ZTtcblx0fSk7XG4gICAgfVxuXG4gICAgdmFyIGJsb2NrID0gZXh0cmFjdEJsb2NrKGFyZ3VtZW50cyk7XG4gICAgYmxvY2socmFkaW8pO1xuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGxhYmVsKHR4dCkge1xuICAgIC8vIEZJWE1FOiB0aGlzIGlzIGV4dHJlbWVseSBicml0dGxlLlxuICAgIHZhciBpZCA9IFwiaWRcIiArIChHVUkuaWRzICsgMSk7IC8vIE5COiBub3QgKysgISFcbiAgICByZXR1cm4gd2l0aEVsZW1lbnQoXCJsYWJlbFwiLCB7XCJmb3JcIjogaWR9LCBmdW5jdGlvbiAoKSB7XG5cdCB0ZXh0KHR4dCk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHRleHQodHh0KSB7XG4gICAgR1VJLmZvY3VzLnB1c2godHh0KTtcbn1cblxuZnVuY3Rpb24gYnIoKSB7XG4gICAgd2l0aEVsZW1lbnQoXCJiclwiLCB7fSwgZnVuY3Rpb24oKSB7fSk7XG59XG5cbi8vIEJsb2NrIGxldmVsIGVsZW1lbnRzXG5cblxuZnVuY3Rpb24gZGVmYXVsdEF0dHJzKHgsIHksIHopIHtcbiAgICBcbiAgICBpZiAodHlwZW9mIHggPT09IFwiZnVuY3Rpb25cIikge1xuXHRyZXR1cm4ge307XG4gICAgfVxuXG4gICAgdmFyIGF0dHJzID0ge307XG4gICAgdmFyIGlkQ2xhc3M7XG4gICAgaWYgKHR5cGVvZiB4ID09PSBcInN0cmluZ1wiKSB7XG5cdGlkQ2xhc3MgPSB4O1xuXHRpZiAodHlwZW9mIHkgPT0gXCJvYmplY3RcIikge1xuXHQgICAgYXR0cnMgPSB5O1xuXHR9XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiB4ID09PSBcIm9iamVjdFwiKSB7XG5cdGF0dHJzID0geDtcbiAgICB9XG5cbiAgICBpZiAoIWlkQ2xhc3MpIHtcblx0cmV0dXJuIGF0dHJzO1xuICAgIH1cbiAgICBcbiAgICB2YXIgaGFzaCA9IGlkQ2xhc3MuaW5kZXhPZihcIiNcIik7XG4gICAgdmFyIGRvdCA9IGlkQ2xhc3MuaW5kZXhPZihcIi5cIik7XG4gICAgaWYgKGRvdCA+IC0xKSB7XG5cdGF0dHJzWydjbGFzcyddID0gaWRDbGFzcy5zbGljZShkb3QgKyAxLCBoYXNoID4gLTEgPyBoYXNoIDogaWRDbGFzcy5sZW5ndGgpO1xuICAgIH1cbiAgICBpZiAoaGFzaCA+IC0xKSB7XG5cdGF0dHJzWydpZCddID0gaWRDbGFzcy5zbGljZShoYXNoICsgMSk7XG4gICAgfVxuICAgIHJldHVybiBhdHRycztcbn1cblxuZnVuY3Rpb24gYWRkSW5saW5lRWxlbWVudHMob2JqKSB7XG4gICAgdmFyIGVsdHMgPSBbXCJhXCIsIFwicFwiLCBcInNwYW5cIiwgXCJoMVwiLCBcImgyXCIsIFwiaDNcIiwgXCJoNFwiXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsdHMubGVuZ3RoOyBpKyspIHtcblx0b2JqW2VsdHNbaV1dID0gZnVuY3Rpb24gKGVsdCkge1xuXHQgICAgcmV0dXJuIGZ1bmN0aW9uICh0eHQsIGlkQ2xhc3MsIGF0dHJzKSB7XG5cdFx0d2l0aEVsZW1lbnQoZWx0LCBkZWZhdWx0QXR0cnMoaWRDbGFzcywgYXR0cnMpLCBmdW5jdGlvbigpIHtcblx0XHQgICAgdGV4dCh0eHQpO1xuXHRcdH0pO1xuXHQgICAgfVxuXHR9KGVsdHNbaV0pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZXh0cmFjdEJsb2NrKGFyZ3MpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcblx0aWYgKCh0eXBlb2YgYXJnc1tpXSkgPT09IFwiZnVuY3Rpb25cIikge1xuXHQgICAgcmV0dXJuIGFyZ3NbaV07XG5cdH1cbiAgICB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge307XG59XG5cbmZ1bmN0aW9uIGFkZEJsb2NrRWxlbWVudHMob2JqKSB7XG4gICAgdmFyIGVsdHMgPSBbXCJzZWN0aW9uXCIsIFwiZGl2XCIsIFwidWxcIiwgXCJvbFwiLCBcImxpXCIsIFwiaGVhZGVyXCIsIFwiZm9vdGVyXCIsIFwiY29kZVwiLCBcInByZVwiLFxuXHRcdFwiZGxcIiwgXCJkdFwiLCBcImRkXCIsIFwiZmllbGRzZXRcIiwgXCJ0YWJsZVwiLCBcInRkXCIsIFwidHJcIiwgXCJ0aFwiLCBcImNvbFwiLCBcInRoZWFkXCJdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWx0cy5sZW5ndGg7IGkrKykge1xuXHRvYmpbZWx0c1tpXV0gPSBmdW5jdGlvbiAoZWx0KSB7XG5cdCAgICByZXR1cm4gZnVuY3Rpb24gKHgsIHksIHopIHtcblx0XHR2YXIgYmxvY2sgPSBmdW5jdGlvbigpIHt9O1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0ICAgIGlmICgodHlwZW9mIGFyZ3VtZW50c1tpXSkgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0YmxvY2sgPSBhcmd1bWVudHNbaV07XG5cdFx0ICAgIH1cblx0XHR9XG5cdFx0cmV0dXJuIHdpdGhFbGVtZW50KGVsdCwgZGVmYXVsdEF0dHJzKHgsIHksIHopLCBleHRyYWN0QmxvY2soYXJndW1lbnRzKSk7XG5cdCAgICB9XG5cdH0oZWx0c1tpXSk7XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIGluc3RhbGwob2JqKSB7XG4gICAgZm9yICh2YXIgayBpbiB0aGlzKSB7XG5cdGlmICh0aGlzLmhhc093blByb3BlcnR5KGspKSB7XG5cdCAgICBvYmpba10gPSB0aGlzW2tdO1xuXHR9XG4gICAgfVxufVxuXG5cbnZhciBsaWJpbWd1aSA9IHtcbiAgICBzZXR1cDogc2V0dXAsXG4gICAgaW5pdDogaW5pdCxcbi8vICAgIGNvbXBvbmVudDogY29tcG9uZW50LFxuLy8gICAgY2xvbmU6IGNsb25lLFxuICAgIHRleHRhcmVhOiB0ZXh0YXJlYSxcbiAgICBzZWxlY3Q6IHNlbGVjdCxcbiAgICByYWRpb0dyb3VwOiByYWRpb0dyb3VwLFxuICAgIHRleHQ6IHRleHQsXG4gICAgbGFiZWw6IGxhYmVsLFxuICAgIGNoZWNrQm94OiBjaGVja0JveCxcbiAgICB0ZXh0Qm94OiB0ZXh0Qm94LFxuICAgIGJ1dHRvbjogYnV0dG9uLFxuICAgIGhlcmU6IGhlcmUsXG4gICAgYWZ0ZXI6IGFmdGVyLFxuICAgIG9uOiBvbixcbiAgICBicjogYnIsXG4vLyAgICBkZWFsV2l0aEl0OiBkZWFsV2l0aEl0LFxuLy8gICAgY2FsbFN0YWNrOiBjYWxsU3RhY2ssXG4vLyAgICBtZW1vOiBtZW1vLFxuLy8gICAgbmFtZWQ6IG5hbWVkLFxuICAgIGluc3RhbGw6IGluc3RhbGxcbn07XG5cbmFkZEJsb2NrRWxlbWVudHMobGliaW1ndWkpO1xuYWRkSW5saW5lRWxlbWVudHMobGliaW1ndWkpO1xuYWRkSW5wdXRFbGVtZW50cyhsaWJpbWd1aSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbGliaW1ndWk7XG5cbiIsIi8qXG4gKiBqd2VydHkgLSBBd2Vzb21lIGhhbmRsaW5nIG9mIGtleWJvYXJkIGV2ZW50c1xuICpcbiAqIGp3ZXJ0eSBpcyBhIEpTIGxpYiB3aGljaCBhbGxvd3MgeW91IHRvIGJpbmQsIGZpcmUgYW5kIGFzc2VydCBrZXkgY29tYmluYXRpb25cbiAqIHN0cmluZ3MgYWdhaW5zdCBlbGVtZW50cyBhbmQgZXZlbnRzLiBJdCBub3JtYWxpc2VzIHRoZSBwb29yIHN0ZCBhcGkgaW50b1xuICogc29tZXRoaW5nIGVhc3kgdG8gdXNlIGFuZCBjbGVhci5cbiAqXG4gKiBUaGlzIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIE1JVFxuICogRm9yIHRoZSBmdWxsIGxpY2Vuc2Ugc2VlOiBodHRwOi8va2VpdGhhbXVzLm1pdC1saWNlbnNlLm9yZy9cbiAqIEZvciBtb3JlIGluZm9ybWF0aW9uIHNlZTogaHR0cDovL2tlaXRoYW11cy5naXRodWIuY29tL2p3ZXJ0eVxuICpcbiAqIEBhdXRob3IgS2VpdGggQ2lya2VsICgna2VpdGhhbXVzJykgPGp3ZXJ0eUBrZWl0aGNpcmtlbC5jby51az5cbiAqIEBsaWNlbnNlIGh0dHA6Ly9rZWl0aGFtdXMubWl0LWxpY2Vuc2Uub3JnL1xuICogQGNvcHlyaWdodCBDb3B5cmlnaHQgwqkgMjAxMSwgS2VpdGggQ2lya2VsXG4gKlxuICovXG4oZnVuY3Rpb24gKGdsb2JhbCwgZXhwb3J0cykge1xuICAgIFxuICAgIC8vIEhlbHBlciBtZXRob2RzICYgdmFyczpcbiAgICB2YXIgJGQgPSBnbG9iYWwuZG9jdW1lbnRcbiAgICAsICAgJCA9IChnbG9iYWwualF1ZXJ5IHx8IGdsb2JhbC5aZXB0byB8fCBnbG9iYWwuZW5kZXIgfHwgJGQpXG4gICAgLCAgICQkXG4gICAgLCAgICRiXG4gICAgLCAgIGtlID0gJ2tleWRvd24nO1xuICAgIFxuICAgIGZ1bmN0aW9uIHJlYWxUeXBlT2Yodiwgcykge1xuICAgICAgICByZXR1cm4gKHYgPT09IG51bGwpID8gcyA9PT0gJ251bGwnXG4gICAgICAgIDogKHYgPT09IHVuZGVmaW5lZCkgPyBzID09PSAndW5kZWZpbmVkJ1xuICAgICAgICA6ICh2LmlzICYmIHYgaW5zdGFuY2VvZiAkKSA/IHMgPT09ICdlbGVtZW50J1xuICAgICAgICA6IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2KS50b0xvd2VyQ2FzZSgpLmluZGV4T2YocykgPiA3O1xuICAgIH1cbiAgICBcbiAgICBpZiAoJCA9PT0gJGQpIHtcbiAgICAgICAgJCQgPSBmdW5jdGlvbiAoc2VsZWN0b3IsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIHJldHVybiBzZWxlY3RvciA/ICQucXVlcnlTZWxlY3RvcihzZWxlY3RvciwgY29udGV4dCB8fCAkKSA6ICQ7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAkYiA9IGZ1bmN0aW9uIChlLCBmbikgeyBlLmFkZEV2ZW50TGlzdGVuZXIoa2UsIGZuLCBmYWxzZSk7IH07XG4gICAgICAgICRmID0gZnVuY3Rpb24gKGUsIGp3ZXJ0eUV2KSB7XG4gICAgICAgICAgICB2YXIgcmV0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50JylcbiAgICAgICAgICAgICwgICBpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXQuaW5pdEV2ZW50KGtlLCB0cnVlLCB0cnVlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yIChpIGluIGp3ZXJ0eUV2KSByZXRbaV0gPSBqd2VydHlFdltpXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIChlIHx8ICQpLmRpc3BhdGNoRXZlbnQocmV0KTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgICQkID0gZnVuY3Rpb24gKHNlbGVjdG9yLCBjb250ZXh0LCBmbikgeyByZXR1cm4gJChzZWxlY3RvciB8fCAkZCwgY29udGV4dCk7IH07XG4gICAgICAgICRiID0gZnVuY3Rpb24gKGUsIGZuKSB7ICQoZSkuYmluZChrZSArICcuandlcnR5JywgZm4pOyB9O1xuICAgICAgICAkZiA9IGZ1bmN0aW9uIChlLCBvYikgeyAkKGUgfHwgJGQpLnRyaWdnZXIoJC5FdmVudChrZSwgb2IpKTsgfTtcbiAgICB9XG4gICAgXG4gICAgLy8gUHJpdmF0ZVxuICAgIHZhciBfbW9kUHJvcHMgPSB7IDE2OiAnc2hpZnRLZXknLCAxNzogJ2N0cmxLZXknLCAxODogJ2FsdEtleScsIDkxOiAnbWV0YUtleScgfTtcbiAgICBcbiAgICAvLyBHZW5lcmF0ZSBrZXkgbWFwcGluZ3MgZm9yIGNvbW1vbiBrZXlzIHRoYXQgYXJlIG5vdCBwcmludGFibGUuXG4gICAgdmFyIF9rZXlzID0ge1xuICAgICAgICBcbiAgICAgICAgLy8gTU9EIGFrYSB0b2dnbGVhYmxlIGtleXNcbiAgICAgICAgbW9kczoge1xuICAgICAgICAgICAgLy8gU2hpZnQga2V5LCDih6dcbiAgICAgICAgICAgICfih6cnOiAxNiwgc2hpZnQ6IDE2LFxuICAgICAgICAgICAgLy8gQ1RSTCBrZXksIG9uIE1hYzog4oyDXG4gICAgICAgICAgICAn4oyDJzogMTcsIGN0cmw6IDE3LFxuICAgICAgICAgICAgLy8gQUxUIGtleSwgb24gTWFjOiDijKUgKEFsdClcbiAgICAgICAgICAgICfijKUnOiAxOCwgYWx0OiAxOCwgb3B0aW9uOiAxOCxcbiAgICAgICAgICAgIC8vIE1FVEEsIG9uIE1hYzog4oyYIChDTUQpLCBvbiBXaW5kb3dzIChXaW4pLCBvbiBMaW51eCAoU3VwZXIpXG4gICAgICAgICAgICAn4oyYJzogOTEsIG1ldGE6IDkxLCBjbWQ6IDkxLCAnc3VwZXInOiA5MSwgd2luOiA5MVxuICAgICAgICB9LFxuICAgICAgICBcbiAgICAgICAgLy8gTm9ybWFsIGtleXNcbiAgICAgICAga2V5czoge1xuICAgICAgICAgICAgLy8gQmFja3NwYWNlIGtleSwgb24gTWFjOiDijKsgKEJhY2tzcGFjZSlcbiAgICAgICAgICAgICfijKsnOiA4LCBiYWNrc3BhY2U6IDgsXG4gICAgICAgICAgICAvLyBUYWIgS2V5LCBvbiBNYWM6IOKHpSAoVGFiKSwgb24gV2luZG93cyDih6Xih6VcbiAgICAgICAgICAgICfih6UnOiA5LCAn4oeGJzogOSwgdGFiOiA5LFxuICAgICAgICAgICAgLy8gUmV0dXJuIGtleSwg4oapXG4gICAgICAgICAgICAn4oapJzogMTMsICdyZXR1cm4nOiAxMywgZW50ZXI6IDEzLCAn4oyFJzogMTMsXG4gICAgICAgICAgICAvLyBQYXVzZS9CcmVhayBrZXlcbiAgICAgICAgICAgICdwYXVzZSc6IDE5LCAncGF1c2UtYnJlYWsnOiAxOSxcbiAgICAgICAgICAgIC8vIENhcHMgTG9jayBrZXksIOKHqlxuICAgICAgICAgICAgJ+KHqic6IDIwLCBjYXBzOiAyMCwgJ2NhcHMtbG9jayc6IDIwLFxuICAgICAgICAgICAgLy8gRXNjYXBlIGtleSwgb24gTWFjOiDijossIG9uIFdpbmRvd3M6IEVzY1xuICAgICAgICAgICAgJ+KOiyc6IDI3LCBlc2NhcGU6IDI3LCBlc2M6IDI3LFxuICAgICAgICAgICAgLy8gU3BhY2Uga2V5XG4gICAgICAgICAgICBzcGFjZTogMzIsXG4gICAgICAgICAgICAvLyBQYWdlLVVwIGtleSwgb3IgcGd1cCwgb24gTWFjOiDihpZcbiAgICAgICAgICAgICfihpYnOiAzMywgcGd1cDogMzMsICdwYWdlLXVwJzogMzMsXG4gICAgICAgICAgICAvLyBQYWdlLURvd24ga2V5LCBvciBwZ2Rvd24sIG9uIE1hYzog4oaYXG4gICAgICAgICAgICAn4oaYJzogMzQsIHBnZG93bjogMzQsICdwYWdlLWRvd24nOiAzNCxcbiAgICAgICAgICAgIC8vIEVORCBrZXksIG9uIE1hYzog4oefXG4gICAgICAgICAgICAn4oefJzogMzUsIGVuZDogMzUsXG4gICAgICAgICAgICAvLyBIT01FIGtleSwgb24gTWFjOiDih55cbiAgICAgICAgICAgICfih54nOiAzNiwgaG9tZTogMzYsXG4gICAgICAgICAgICAvLyBJbnNlcnQga2V5LCBvciBpbnNcbiAgICAgICAgICAgIGluczogNDUsIGluc2VydDogNDUsXG4gICAgICAgICAgICAvLyBEZWxldGUga2V5LCBvbiBNYWM6IOKMqyAoRGVsZXRlKVxuICAgICAgICAgICAgZGVsOiA0NiwgJ2RlbGV0ZSc6IDQ2LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBMZWZ0IEFycm93IEtleSwgb3Ig4oaQXG4gICAgICAgICAgICAn4oaQJzogMzcsIGxlZnQ6IDM3LCAnYXJyb3ctbGVmdCc6IDM3LFxuICAgICAgICAgICAgLy8gVXAgQXJyb3cgS2V5LCBvciDihpFcbiAgICAgICAgICAgICfihpEnOiAzOCwgdXA6IDM4LCAnYXJyb3ctdXAnOiAzOCxcbiAgICAgICAgICAgIC8vIFJpZ2h0IEFycm93IEtleSwgb3Ig4oaSXG4gICAgICAgICAgICAn4oaSJzogMzksIHJpZ2h0OiAzOSwgJ2Fycm93LXJpZ2h0JzogMzksXG4gICAgICAgICAgICAvLyBVcCBBcnJvdyBLZXksIG9yIOKGk1xuICAgICAgICAgICAgJ+KGkyc6IDQwLCBkb3duOiA0MCwgJ2Fycm93LWRvd24nOiA0MCxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gb2RpdGllcywgcHJpbnRpbmcgY2hhcmFjdGVycyB0aGF0IGNvbWUgb3V0IHdyb25nOlxuICAgICAgICAgICAgLy8gTnVtLU11bHRpcGx5LCBvciAqXG4gICAgICAgICAgICAnKic6IDEwNiwgc3RhcjogMTA2LCBhc3RlcmlzazogMTA2LCBtdWx0aXBseTogMTA2LFxuICAgICAgICAgICAgLy8gTnVtLVBsdXMgb3IgK1xuICAgICAgICAgICAgJysnOiAxMDcsICdwbHVzJzogMTA3LFxuICAgICAgICAgICAgLy8gTnVtLVN1YnRyYWN0LCBvciAtXG4gICAgICAgICAgICAnLSc6IDEwOSwgc3VidHJhY3Q6IDEwOSxcbiAgICAgICAgICAgIC8vIFNlbWljb2xvblxuICAgICAgICAgICAgJzsnOiAxODYsIHNlbWljb2xvbjoxODYsXG4gICAgICAgICAgICAvLyA9IG9yIGVxdWFsc1xuICAgICAgICAgICAgJz0nOiAxODcsICdlcXVhbHMnOiAxODcsXG4gICAgICAgICAgICAvLyBDb21tYSwgb3IgLFxuICAgICAgICAgICAgJywnOiAxODgsIGNvbW1hOiAxODgsXG4gICAgICAgICAgICAvLyctJzogMTg5LCAvLz8/P1xuICAgICAgICAgICAgLy8gUGVyaW9kLCBvciAuLCBvciBmdWxsLXN0b3BcbiAgICAgICAgICAgICcuJzogMTkwLCBwZXJpb2Q6IDE5MCwgJ2Z1bGwtc3RvcCc6IDE5MCxcbiAgICAgICAgICAgIC8vIFNsYXNoLCBvciAvLCBvciBmb3J3YXJkLXNsYXNoXG4gICAgICAgICAgICAnLyc6IDE5MSwgc2xhc2g6IDE5MSwgJ2ZvcndhcmQtc2xhc2gnOiAxOTEsXG4gICAgICAgICAgICAvLyBUaWNrLCBvciBgLCBvciBiYWNrLXF1b3RlIFxuICAgICAgICAgICAgJ2AnOiAxOTIsIHRpY2s6IDE5MiwgJ2JhY2stcXVvdGUnOiAxOTIsXG4gICAgICAgICAgICAvLyBPcGVuIGJyYWNrZXQsIG9yIFtcbiAgICAgICAgICAgICdbJzogMjE5LCAnb3Blbi1icmFja2V0JzogMjE5LFxuICAgICAgICAgICAgLy8gQmFjayBzbGFzaCwgb3IgXFxcbiAgICAgICAgICAgICdcXFxcJzogMjIwLCAnYmFjay1zbGFzaCc6IDIyMCxcbiAgICAgICAgICAgIC8vIENsb3NlIGJhY2tldCwgb3IgXVxuICAgICAgICAgICAgJ10nOiAyMjEsICdjbG9zZS1icmFja2V0JzogMjIxLFxuICAgICAgICAgICAgLy8gQXBvc3RyYXBoZSwgb3IgUXVvdGUsIG9yICdcbiAgICAgICAgICAgICdcXCcnOiAyMjIsIHF1b3RlOiAyMjIsIGFwb3N0cmFwaGU6IDIyMlxuICAgICAgICB9XG4gICAgICAgIFxuICAgIH07XG4gICAgXG4gICAgLy8gVG8gbWluaW1pc2UgY29kZSBibG9hdCwgYWRkIGFsbCBvZiB0aGUgTlVNUEFEIDAtOSBrZXlzIGluIGEgbG9vcFxuICAgIGkgPSA5NSwgbiA9IDA7XG4gICAgd2hpbGUoKytpIDwgMTA2KSB7XG4gICAgICAgIF9rZXlzLmtleXNbJ251bS0nICsgbl0gPSBpO1xuICAgICAgICArK247XG4gICAgfVxuICAgIFxuICAgIC8vIFRvIG1pbmltaXNlIGNvZGUgYmxvYXQsIGFkZCBhbGwgb2YgdGhlIHRvcCByb3cgMC05IGtleXMgaW4gYSBsb29wXG4gICAgaSA9IDQ3LCBuID0gMDtcbiAgICB3aGlsZSgrK2kgPCA1OCkge1xuICAgICAgICBfa2V5cy5rZXlzW25dID0gaTtcbiAgICAgICAgKytuO1xuICAgIH1cbiAgICBcbiAgICAvLyBUbyBtaW5pbWlzZSBjb2RlIGJsb2F0LCBhZGQgYWxsIG9mIHRoZSBGMS1GMjUga2V5cyBpbiBhIGxvb3BcbiAgICBpID0gMTExLCBuID0gMTtcbiAgICB3aGlsZSgrK2kgPCAxMzYpIHtcbiAgICAgICAgX2tleXMua2V5c1snZicgKyBuXSA9IGk7XG4gICAgICAgICsrbjtcbiAgICB9XG4gICAgXG4gICAgLy8gVG8gbWluaW1pc2UgY29kZSBibG9hdCwgYWRkIGFsbCBvZiB0aGUgbGV0dGVycyBvZiB0aGUgYWxwaGFiZXQgaW4gYSBsb29wXG4gICAgdmFyIGkgPSA2NDtcbiAgICB3aGlsZSgrK2kgPCA5MSkge1xuICAgICAgICBfa2V5cy5rZXlzW1N0cmluZy5mcm9tQ2hhckNvZGUoaSkudG9Mb3dlckNhc2UoKV0gPSBpO1xuICAgIH1cbiAgICBcbiAgICBmdW5jdGlvbiBKd2VydHlDb2RlKGp3ZXJ0eUNvZGUpIHtcbiAgICAgICAgdmFyIGlcbiAgICAgICAgLCAgIGNcbiAgICAgICAgLCAgIG5cbiAgICAgICAgLCAgIHpcbiAgICAgICAgLCAgIGtleUNvbWJvXG4gICAgICAgICwgICBvcHRpb25hbHNcbiAgICAgICAgLCAgIGp3ZXJ0eUNvZGVGcmFnbWVudFxuICAgICAgICAsICAgcmFuZ2VNYXRjaGVzXG4gICAgICAgICwgICByYW5nZUk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbi1jYXNlIHdlIGdldCBjYWxsZWQgd2l0aCBhbiBpbnN0YW5jZSBvZiBvdXJzZWx2ZXMsIGp1c3QgcmV0dXJuIHRoYXQuXG4gICAgICAgIGlmIChqd2VydHlDb2RlIGluc3RhbmNlb2YgSndlcnR5Q29kZSkgcmV0dXJuIGp3ZXJ0eUNvZGU7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBqd2VydHlDb2RlIGlzbid0IGFuIGFycmF5LCBjYXN0IGl0IGFzIGEgc3RyaW5nIGFuZCBzcGxpdCBpbnRvIGFycmF5LlxuICAgICAgICBpZiAoIXJlYWxUeXBlT2YoandlcnR5Q29kZSwgJ2FycmF5JykpIHtcbiAgICAgICAgICAgIGp3ZXJ0eUNvZGUgPSAoU3RyaW5nKGp3ZXJ0eUNvZGUpKS5yZXBsYWNlKC9cXHMvZywgJycpLnRvTG93ZXJDYXNlKCkuXG4gICAgICAgICAgICAgICAgbWF0Y2goLyg/OlxcKyx8W14sXSkrL2cpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBMb29wIHRocm91Z2ggZWFjaCBrZXkgc2VxdWVuY2UgaW4gandlcnR5Q29kZVxuICAgICAgICBmb3IgKGkgPSAwLCBjID0gandlcnR5Q29kZS5sZW5ndGg7IGkgPCBjOyArK2kpIHtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSWYgdGhlIGtleSBjb21ibyBhdCB0aGlzIHBhcnQgb2YgdGhlIHNlcXVlbmNlIGlzbid0IGFuIGFycmF5LFxuICAgICAgICAgICAgLy8gY2FzdCBhcyBhIHN0cmluZyBhbmQgc3BsaXQgaW50byBhbiBhcnJheS5cbiAgICAgICAgICAgIGlmICghcmVhbFR5cGVPZihqd2VydHlDb2RlW2ldLCAnYXJyYXknKSkge1xuICAgICAgICAgICAgICAgIGp3ZXJ0eUNvZGVbaV0gPSBTdHJpbmcoandlcnR5Q29kZVtpXSlcbiAgICAgICAgICAgICAgICAgICAgLm1hdGNoKC8oPzpcXCtcXC98W15cXC9dKSsvZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFBhcnNlIHRoZSBrZXkgb3B0aW9uYWxzIGluIHRoaXMgc2VxdWVuY2VcbiAgICAgICAgICAgIG9wdGlvbmFscyA9IFtdLCBuID0gandlcnR5Q29kZVtpXS5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAobi0tKSB7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQmVnaW4gY3JlYXRpbmcgdGhlIG9iamVjdCBmb3IgdGhpcyBrZXkgY29tYm9cbiAgICAgICAgICAgICAgICB2YXIgandlcnR5Q29kZUZyYWdtZW50ID0gandlcnR5Q29kZVtpXVtuXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBrZXlDb21ibyA9IHtcbiAgICAgICAgICAgICAgICAgICAgandlcnR5Q29tYm86IFN0cmluZyhqd2VydHlDb2RlRnJhZ21lbnQpLFxuICAgICAgICAgICAgICAgICAgICBzaGlmdEtleTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGN0cmxLZXk6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBhbHRLZXk6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBtZXRhS2V5OiBmYWxzZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJZiBqd2VydHlDb2RlRnJhZ21lbnQgaXNuJ3QgYW4gYXJyYXkgdGhlbiBjYXN0IGFzIGEgc3RyaW5nXG4gICAgICAgICAgICAgICAgLy8gYW5kIHNwbGl0IGl0IGludG8gb25lLlxuICAgICAgICAgICAgICAgIGlmICghcmVhbFR5cGVPZihqd2VydHlDb2RlRnJhZ21lbnQsICdhcnJheScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGp3ZXJ0eUNvZGVGcmFnbWVudCA9IFN0cmluZyhqd2VydHlDb2RlRnJhZ21lbnQpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5tYXRjaCgvKD86KD86W15cXCtdKSt8XFwrXFwrfF5cXCskKS9nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgeiA9IGp3ZXJ0eUNvZGVGcmFnbWVudC5sZW5ndGg7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHotLSkge1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gTm9ybWFsaXNlIG1hdGNoaW5nIGVycm9yc1xuICAgICAgICAgICAgICAgICAgICBpZiAoandlcnR5Q29kZUZyYWdtZW50W3pdID09PSAnKysnKSBqd2VydHlDb2RlRnJhZ21lbnRbel0gPSAnKyc7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBJbmplY3QgZWl0aGVyIGtleUNvZGUgb3IgY3RybC9tZXRhL3NoaWZ0L2FsdEtleSBpbnRvIGtleUNvbWJvXG4gICAgICAgICAgICAgICAgICAgIGlmIChqd2VydHlDb2RlRnJhZ21lbnRbel0gaW4gX2tleXMubW9kcykge1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5Q29tYm9bX21vZFByb3BzW19rZXlzLm1vZHNbandlcnR5Q29kZUZyYWdtZW50W3pdXV1dID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmKGp3ZXJ0eUNvZGVGcmFnbWVudFt6XSBpbiBfa2V5cy5rZXlzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlDb21iby5rZXlDb2RlID0gX2tleXMua2V5c1tqd2VydHlDb2RlRnJhZ21lbnRbel1dO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2VNYXRjaGVzID0gandlcnR5Q29kZUZyYWdtZW50W3pdLm1hdGNoKC9eXFxbKFteLV0rXFwtP1teLV0qKS0oW14tXStcXC0/W14tXSopXFxdJC8pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyZWFsVHlwZU9mKGtleUNvbWJvLmtleUNvZGUsICd1bmRlZmluZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB3ZSBwaWNrZWQgdXAgYSByYW5nZSBtYXRjaCBlYXJsaWVyLi4uXG4gICAgICAgICAgICAgICAgICAgIGlmIChyYW5nZU1hdGNoZXMgJiYgKHJhbmdlTWF0Y2hlc1sxXSBpbiBfa2V5cy5rZXlzKSAmJiAocmFuZ2VNYXRjaGVzWzJdIGluIF9rZXlzLmtleXMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZU1hdGNoZXNbMl0gPSBfa2V5cy5rZXlzW3JhbmdlTWF0Y2hlc1syXV07XG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZU1hdGNoZXNbMV0gPSBfa2V5cy5rZXlzW3JhbmdlTWF0Y2hlc1sxXV07XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdvIGZyb20gbWF0Y2ggMSBhbmQgY2FwdHVyZSBhbGwga2V5LWNvbW9icyB1cCB0byBtYXRjaCAyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHJhbmdlSSA9IHJhbmdlTWF0Y2hlc1sxXTsgcmFuZ2VJIDwgcmFuZ2VNYXRjaGVzWzJdOyArK3JhbmdlSSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbmFscy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWx0S2V5OiBrZXlDb21iby5hbHRLZXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNoaWZ0S2V5OiBrZXlDb21iby5zaGlmdEtleSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0YUtleToga2V5Q29tYm8ubWV0YUtleSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3RybEtleToga2V5Q29tYm8uY3RybEtleSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5Q29kZTogcmFuZ2VJLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBqd2VydHlDb21ibzogU3RyaW5nKGp3ZXJ0eUNvZGVGcmFnbWVudClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGtleUNvbWJvLmtleUNvZGUgPSByYW5nZUk7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluamVjdCBlaXRoZXIga2V5Q29kZSBvciBjdHJsL21ldGEvc2hpZnQvYWx0S2V5IGludG8ga2V5Q29tYm9cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleUNvbWJvLmtleUNvZGUgPSAwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG9wdGlvbmFscy5wdXNoKGtleUNvbWJvKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpc1tpXSA9IG9wdGlvbmFscztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxlbmd0aCA9IGk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBcbiAgICB2YXIgandlcnR5ID0gZXhwb3J0cy5qd2VydHkgPSB7ICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGp3ZXJ0eS5ldmVudFxuICAgICAgICAgKlxuICAgICAgICAgKiBgandlcnR5LmV2ZW50YCB3aWxsIHJldHVybiBhIGZ1bmN0aW9uLCB3aGljaCBleHBlY3RzIHRoZSBmaXJzdFxuICAgICAgICAgKiAgYXJndW1lbnQgdG8gYmUgYSBrZXkgZXZlbnQuIFdoZW4gdGhlIGtleSBldmVudCBtYXRjaGVzIGBqd2VydHlDb2RlYCxcbiAgICAgICAgICogIGBjYWxsYmFja0Z1bmN0aW9uYCBpcyBmaXJlZC4gYGp3ZXJ0eS5ldmVudGAgaXMgdXNlZCBieSBgandlcnR5LmtleWBcbiAgICAgICAgICogIHRvIGJpbmQgdGhlIGZ1bmN0aW9uIGl0IHJldHVybnMuIGBqd2VydHkuZXZlbnRgIGlzIHVzZWZ1bCBmb3JcbiAgICAgICAgICogIGF0dGFjaGluZyB0byB5b3VyIG93biBldmVudCBsaXN0ZW5lcnMuIEl0IGNhbiBiZSB1c2VkIGFzIGEgZGVjb3JhdG9yXG4gICAgICAgICAqICBtZXRob2QgdG8gZW5jYXBzdWxhdGUgZnVuY3Rpb25hbGl0eSB0aGF0IHlvdSBvbmx5IHdhbnQgdG8gZmlyZSBhZnRlclxuICAgICAgICAgKiAgYSBzcGVjaWZpYyBrZXkgY29tYm8uIElmIGBjYWxsYmFja0NvbnRleHRgIGlzIHNwZWNpZmllZCB0aGVuIGl0IHdpbGxcbiAgICAgICAgICogIGJlIHN1cHBsaWVkIGFzIGBjYWxsYmFja0Z1bmN0aW9uYCdzIGNvbnRleHQgLSBpbiBvdGhlciB3b3JkcywgdGhlXG4gICAgICAgICAqICBrZXl3b3JkIGB0aGlzYCB3aWxsIGJlIHNldCB0byBgY2FsbGJhY2tDb250ZXh0YCBpbnNpZGUgdGhlXG4gICAgICAgICAqICBgY2FsbGJhY2tGdW5jdGlvbmAgZnVuY3Rpb24uXG4gICAgICAgICAqXG4gICAgICAgICAqICAgQHBhcmFtIHtNaXhlZH0gandlcnR5Q29kZSBjYW4gYmUgYW4gYXJyYXksIG9yIHN0cmluZyBvZiBrZXlcbiAgICAgICAgICogICAgICBjb21iaW5hdGlvbnMsIHdoaWNoIGluY2x1ZGVzIG9wdGluYWxzIGFuZCBvciBzZXF1ZW5jZXNcbiAgICAgICAgICogICBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja0Z1Y250aW9uIGlzIGEgZnVuY3Rpb24gKG9yIGJvb2xlYW4pIHdoaWNoXG4gICAgICAgICAqICAgICAgaXMgZmlyZWQgd2hlbiBqd2VydHlDb2RlIGlzIG1hdGNoZWQuIFJldHVybiBmYWxzZSB0b1xuICAgICAgICAgKiAgICAgIHByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICogICBAcGFyYW0ge09iamVjdH0gY2FsbGJhY2tDb250ZXh0IChPcHRpb25hbCkgVGhlIGNvbnRleHQgdG8gY2FsbFxuICAgICAgICAgKiAgICAgIGBjYWxsYmFja2Agd2l0aCAoaS5lIHRoaXMpXG4gICAgICAgICAqICAgICAgXG4gICAgICAgICAqL1xuICAgICAgICBldmVudDogZnVuY3Rpb24gKGp3ZXJ0eUNvZGUsIGNhbGxiYWNrRnVuY3Rpb24sIGNhbGxiYWNrQ29udGV4dCAvKj8gdGhpcyAqLykge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDb25zdHJ1Y3QgYSBmdW5jdGlvbiBvdXQgb2YgY2FsbGJhY2tGdW5jdGlvbiwgaWYgaXQgaXMgYSBib29sZWFuLlxuICAgICAgICAgICAgaWYgKHJlYWxUeXBlT2YoY2FsbGJhY2tGdW5jdGlvbiwgJ2Jvb2xlYW4nKSkge1xuICAgICAgICAgICAgICAgIHZhciBib29sID0gY2FsbGJhY2tGdW5jdGlvbjtcbiAgICAgICAgICAgICAgICBjYWxsYmFja0Z1bmN0aW9uID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gYm9vbDsgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBqd2VydHlDb2RlID0gbmV3IEp3ZXJ0eUNvZGUoandlcnR5Q29kZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpc2UgaW4tc2NvcGUgdmFycy5cbiAgICAgICAgICAgIHZhciBpID0gMFxuICAgICAgICAgICAgLCAgIGMgPSBqd2VydHlDb2RlLmxlbmd0aCAtIDFcbiAgICAgICAgICAgICwgICByZXR1cm5WYWx1ZVxuICAgICAgICAgICAgLCAgIGp3ZXJ0eUNvZGVJcztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVGhpcyBpcyB0aGUgZXZlbnQgbGlzdGVuZXIgZnVuY3Rpb24gdGhhdCBnZXRzIHJldHVybmVkLi4uXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gaWYgandlcnR5Q29kZUlzIHJldHVybnMgdHJ1dGh5IChzdHJpbmcpLi4uXG4gICAgICAgICAgICAgICAgaWYgKChqd2VydHlDb2RlSXMgPSBqd2VydHkuaXMoandlcnR5Q29kZSwgZXZlbnQsIGkpKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyAuLi4gYW5kIHRoaXMgaXNuJ3QgdGhlIGxhc3Qga2V5IGluIHRoZSBzZXF1ZW5jZSxcbiAgICAgICAgICAgICAgICAgICAgLy8gaW5jcmltZW50IHRoZSBrZXkgaW4gc2VxdWVuY2UgdG8gY2hlY2suXG4gICAgICAgICAgICAgICAgICAgIGlmIChpIDwgYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAvLyAuLi4gYW5kIHRoaXMgaXMgdGhlIGxhc3QgaW4gdGhlIHNlcXVlbmNlIChvciB0aGUgb25seVxuICAgICAgICAgICAgICAgICAgICAvLyBvbmUgaW4gc2VxdWVuY2UpLCB0aGVuIGZpcmUgdGhlIGNhbGxiYWNrXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWx1ZSA9IGNhbGxiYWNrRnVuY3Rpb24uY2FsbChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja0NvbnRleHQgfHwgdGhpcywgZXZlbnQsIGp3ZXJ0eUNvZGVJcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIHRoZSBjYWxsYmFjayByZXR1cm5lZCBmYWxzZSwgdGhlbiB3ZSBzaG91bGQgcnVuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBwcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJldHVyblZhbHVlID09PSBmYWxzZSkgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVzZXQgaSBmb3IgdGhlIG5leHQgc2VxdWVuY2UgdG8gZmlyZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIGkgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBldmVudCBkaWRuJ3QgaGl0IHRoaXMgdGltZSwgd2Ugc2hvdWxkIHJlc2V0IGkgdG8gMCxcbiAgICAgICAgICAgICAgICAvLyB0aGF0IGlzLCB1bmxlc3MgdGhpcyBjb21ibyB3YXMgdGhlIGZpcnN0IGluIHRoZSBzZXF1ZW5jZSxcbiAgICAgICAgICAgICAgICAvLyBpbiB3aGljaCBjYXNlIHdlIHNob3VsZCByZXNldCBpIHRvIDEuXG4gICAgICAgICAgICAgICAgaSA9IGp3ZXJ0eS5pcyhqd2VydHlDb2RlLCBldmVudCkgPyAxIDogMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBqd2VydHkuaXNcbiAgICAgICAgICpcbiAgICAgICAgICogYGp3ZXJ0eS5pc2Agd2lsbCByZXR1cm4gYSBib29sZWFuIHZhbHVlLCBiYXNlZCBvbiBpZiBgZXZlbnRgIG1hdGNoZXNcbiAgICAgICAgICogIGBqd2VydHlDb2RlYC4gYGp3ZXJ0eS5pc2AgaXMgY2FsbGVkIGJ5IGBqd2VydHkuZXZlbnRgIHRvIGNoZWNrXG4gICAgICAgICAqICB3aGV0aGVyIG9yIG5vdCB0byBmaXJlIHRoZSBjYWxsYmFjay4gYGV2ZW50YCBjYW4gYmUgYSBET00gZXZlbnQsIG9yXG4gICAgICAgICAqICBhIGpRdWVyeS9aZXB0by9FbmRlciBtYW51ZmFjdHVyZWQgZXZlbnQuIFRoZSBwcm9wZXJ0aWVzIG9mXG4gICAgICAgICAqICBgandlcnR5Q29kZWAgKHNwZWZpY2lhbGx5IGN0cmxLZXksIGFsdEtleSwgbWV0YUtleSwgc2hpZnRLZXkgYW5kXG4gICAgICAgICAqICBrZXlDb2RlKSBzaG91bGQgbWF0Y2ggYGp3ZXJ0eUNvZGVgJ3MgcHJvcGVydGllcyAtIGlmIHRoZXkgZG8sIHRoZW5cbiAgICAgICAgICogIGBqd2VydHkuaXNgIHdpbGwgcmV0dXJuIGB0cnVlYC4gSWYgdGhleSBkb24ndCwgYGp3ZXJ0eS5pc2Agd2lsbFxuICAgICAgICAgKiAgcmV0dXJuIGBmYWxzZWAuXG4gICAgICAgICAqXG4gICAgICAgICAqICAgQHBhcmFtIHtNaXhlZH0gandlcnR5Q29kZSBjYW4gYmUgYW4gYXJyYXksIG9yIHN0cmluZyBvZiBrZXlcbiAgICAgICAgICogICAgICBjb21iaW5hdGlvbnMsIHdoaWNoIGluY2x1ZGVzIG9wdGluYWxzIGFuZCBvciBzZXF1ZW5jZXNcbiAgICAgICAgICogICBAcGFyYW0ge0tleWJvYXJkRXZlbnR9IGV2ZW50IGlzIHRoZSBLZXlib2FyZEV2ZW50IHRvIGFzc2VydCBhZ2FpbnN0XG4gICAgICAgICAqICAgQHBhcmFtIHtJbnRlZ2VyfSBpIChPcHRpb25hbCkgY2hlY2tzIHRoZSBgaWAga2V5IGluIGp3ZXJ0eUNvZGVcbiAgICAgICAgICogICAgICBzZXF1ZW5jZVxuICAgICAgICAgKiAgICAgIFxuICAgICAgICAgKi9cbiAgICAgICAgaXM6IGZ1bmN0aW9uIChqd2VydHlDb2RlLCBldmVudCwgaSAvKj8gMCovKSB7XG4gICAgICAgICAgICBqd2VydHlDb2RlID0gbmV3IEp3ZXJ0eUNvZGUoandlcnR5Q29kZSk7XG4gICAgICAgICAgICAvLyBEZWZhdWx0IGBpYCB0byAwXG4gICAgICAgICAgICBpID0gaSB8fCAwO1xuICAgICAgICAgICAgLy8gV2UgYXJlIG9ubHkgaW50ZXJlc3RpbmcgaW4gYGlgIG9mIGp3ZXJ0eUNvZGU7XG4gICAgICAgICAgICBqd2VydHlDb2RlID0gandlcnR5Q29kZVtpXTtcbiAgICAgICAgICAgIC8vIGpRdWVyeSBzdG9yZXMgdGhlICpyZWFsKiBldmVudCBpbiBgb3JpZ2luYWxFdmVudGAsIHdoaWNoIHdlIHVzZVxuICAgICAgICAgICAgLy8gYmVjYXVzZSBpdCBkb2VzIGFubm95dGhpbmcgc3R1ZmYgdG8gYG1ldGFLZXlgXG4gICAgICAgICAgICBldmVudCA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQgfHwgZXZlbnQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFdlJ2xsIGxvb2sgYXQgZWFjaCBvcHRpb25hbCBpbiB0aGlzIGp3ZXJ0eUNvZGUgc2VxdWVuY2UuLi5cbiAgICAgICAgICAgIHZhciBrZXlcbiAgICAgICAgICAgICwgICBuID0gandlcnR5Q29kZS5sZW5ndGhcbiAgICAgICAgICAgICwgICByZXR1cm5WYWx1ZSA9IGZhbHNlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBMb29wIHRocm91Z2ggZWFjaCBmcmFnbWVudCBvZiBqd2VydHlDb2RlXG4gICAgICAgICAgICB3aGlsZSAobi0tKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSBqd2VydHlDb2RlW25dLmp3ZXJ0eUNvbWJvO1xuICAgICAgICAgICAgICAgIC8vIEZvciBlYWNoIHByb3BlcnR5IGluIHRoZSBqd2VydHlDb2RlIG9iamVjdCwgY29tcGFyZSB0byBgZXZlbnRgXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgcCBpbiBqd2VydHlDb2RlW25dKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIC4uLmV4Y2VwdCBmb3IgandlcnR5Q29kZS5qd2VydHlDb21iby4uLlxuICAgICAgICAgICAgICAgICAgICBpZiAocCAhPT0gJ2p3ZXJ0eUNvbWJvJyAmJiBldmVudFtwXSAhPSBqd2VydHlDb2RlW25dW3BdKSByZXR1cm5WYWx1ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBJZiB0aGlzIGp3ZXJ0eUNvZGUgb3B0aW9uYWwgd2Fzbid0IGZhbHNleSwgdGhlbiB3ZSBjYW4gcmV0dXJuIGVhcmx5LlxuICAgICAgICAgICAgICAgIGlmIChyZXR1cm5WYWx1ZSAhPT0gZmFsc2UpIHJldHVybiByZXR1cm5WYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXR1cm5WYWx1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBqd2VydHkua2V5XG4gICAgICAgICAqXG4gICAgICAgICAqICBgandlcnR5LmtleWAgd2lsbCBhdHRhY2ggYW4gZXZlbnQgbGlzdGVuZXIgYW5kIGZpcmVcbiAgICAgICAgICogICBgY2FsbGJhY2tGdW5jdGlvbmAgd2hlbiBgandlcnR5Q29kZWAgbWF0Y2hlcy4gVGhlIGV2ZW50IGxpc3RlbmVyIGlzXG4gICAgICAgICAqICAgYXR0YWNoZWQgdG8gYGRvY3VtZW50YCwgbWVhbmluZyBpdCB3aWxsIGxpc3RlbiBmb3IgYW55IGtleSBldmVudHNcbiAgICAgICAgICogICBvbiB0aGUgcGFnZSAoYSBnbG9iYWwgc2hvcnRjdXQgbGlzdGVuZXIpLiBJZiBgY2FsbGJhY2tDb250ZXh0YCBpc1xuICAgICAgICAgKiAgIHNwZWNpZmllZCB0aGVuIGl0IHdpbGwgYmUgc3VwcGxpZWQgYXMgYGNhbGxiYWNrRnVuY3Rpb25gJ3MgY29udGV4dFxuICAgICAgICAgKiAgIC0gaW4gb3RoZXIgd29yZHMsIHRoZSBrZXl3b3JkIGB0aGlzYCB3aWxsIGJlIHNldCB0b1xuICAgICAgICAgKiAgIGBjYWxsYmFja0NvbnRleHRgIGluc2lkZSB0aGUgYGNhbGxiYWNrRnVuY3Rpb25gIGZ1bmN0aW9uLlxuICAgICAgICAgKlxuICAgICAgICAgKiAgIEBwYXJhbSB7TWl4ZWR9IGp3ZXJ0eUNvZGUgY2FuIGJlIGFuIGFycmF5LCBvciBzdHJpbmcgb2Yga2V5XG4gICAgICAgICAqICAgICAgY29tYmluYXRpb25zLCB3aGljaCBpbmNsdWRlcyBvcHRpbmFscyBhbmQgb3Igc2VxdWVuY2VzXG4gICAgICAgICAqICAgQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tGdW5jdGlvbiBpcyBhIGZ1bmN0aW9uIChvciBib29sZWFuKSB3aGljaFxuICAgICAgICAgKiAgICAgIGlzIGZpcmVkIHdoZW4gandlcnR5Q29kZSBpcyBtYXRjaGVkLiBSZXR1cm4gZmFsc2UgdG9cbiAgICAgICAgICogICAgICBwcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAqICAgQHBhcmFtIHtPYmplY3R9IGNhbGxiYWNrQ29udGV4dCAoT3B0aW9uYWwpIFRoZSBjb250ZXh0IHRvIGNhbGxcbiAgICAgICAgICogICAgICBgY2FsbGJhY2tgIHdpdGggKGkuZSB0aGlzKVxuICAgICAgICAgKiAgIEBwYXJhbSB7TWl4ZWR9IHNlbGVjdG9yIGNhbiBiZSBhIHN0cmluZywgalF1ZXJ5L1plcHRvL0VuZGVyIG9iamVjdCxcbiAgICAgICAgICogICAgICBvciBhbiBIVE1MKkVsZW1lbnQgb24gd2hpY2ggdG8gYmluZCB0aGUgZXZlbnRMaXN0ZW5lclxuICAgICAgICAgKiAgIEBwYXJhbSB7TWl4ZWR9IHNlbGVjdG9yQ29udGV4dCBjYW4gYmUgYSBzdHJpbmcsIGpRdWVyeS9aZXB0by9FbmRlclxuICAgICAgICAgKiAgICAgIG9iamVjdCwgb3IgYW4gSFRNTCpFbGVtZW50IG9uIHdoaWNoIHRvIHNjb3BlIHRoZSBzZWxlY3RvclxuICAgICAgICAgKiAgXG4gICAgICAgICAqL1xuICAgICAgICBrZXk6IGZ1bmN0aW9uIChqd2VydHlDb2RlLCBjYWxsYmFja0Z1bmN0aW9uLCBjYWxsYmFja0NvbnRleHQgLyo/IHRoaXMgKi8sIHNlbGVjdG9yIC8qPyBkb2N1bWVudCAqLywgc2VsZWN0b3JDb250ZXh0IC8qPyBib2R5ICovKSB7XG4gICAgICAgICAgICAvLyBCZWNhdXNlIGNhbGxiYWNrQ29udGV4dCBpcyBvcHRpb25hbCwgd2Ugc2hvdWxkIGNoZWNrIGlmIHRoZVxuICAgICAgICAgICAgLy8gYGNhbGxiYWNrQ29udGV4dGAgaXMgYSBzdHJpbmcgb3IgZWxlbWVudCwgYW5kIGlmIGl0IGlzLCB0aGVuIHRoZVxuICAgICAgICAgICAgLy8gZnVuY3Rpb24gd2FzIGNhbGxlZCB3aXRob3V0IGEgY29udGV4dCwgYW5kIGBjYWxsYmFja0NvbnRleHRgIGlzXG4gICAgICAgICAgICAvLyBhY3R1YWxseSBgc2VsZWN0b3JgXG4gICAgICAgICAgICB2YXIgcmVhbFNlbGVjdG9yID0gcmVhbFR5cGVPZihjYWxsYmFja0NvbnRleHQsICdlbGVtZW50JykgfHwgcmVhbFR5cGVPZihjYWxsYmFja0NvbnRleHQsICdzdHJpbmcnKSA/IGNhbGxiYWNrQ29udGV4dCA6IHNlbGVjdG9yXG4gICAgICAgICAgICAvLyBJZiBgY2FsbGJhY2tDb250ZXh0YCBpcyB1bmRlZmluZWQsIG9yIGlmIHdlIHNraXBwZWQgaXQgKGFuZFxuICAgICAgICAgICAgLy8gdGhlcmVmb3JlIGl0IGlzIGByZWFsU2VsZWN0b3JgKSwgc2V0IGNvbnRleHQgdG8gYGdsb2JhbGAuXG4gICAgICAgICAgICAsICAgcmVhbGNhbGxiYWNrQ29udGV4dCA9IHJlYWxTZWxlY3RvciA9PT0gY2FsbGJhY2tDb250ZXh0ID8gZ2xvYmFsIDogY2FsbGJhY2tDb250ZXh0XG4gICAgICAgICAgICAvLyBGaW5hbGx5IGlmIHdlIGRpZCBza2lwIGBjYWxsYmFja0NvbnRleHRgLCB0aGVuIHNoaWZ0XG4gICAgICAgICAgICAvLyBgc2VsZWN0b3JDb250ZXh0YCB0byB0aGUgbGVmdCAodGFrZSBpdCBmcm9tIGBzZWxlY3RvcmApXG4gICAgICAgICAgICAsICAgIHJlYWxTZWxlY3RvckNvbnRleHQgPSByZWFsU2VsZWN0b3IgPT09IGNhbGxiYWNrQ29udGV4dCA/IHNlbGVjdG9yIDogc2VsZWN0b3JDb250ZXh0O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJZiBgcmVhbFNlbGVjdG9yYCBpcyBhbHJlYWR5IGEgalF1ZXJ5L1plcHRvL0VuZGVyL0RPTSBlbGVtZW50LFxuICAgICAgICAgICAgLy8gdGhlbiBqdXN0IHVzZSBpdCBuZWF0LCBvdGhlcndpc2UgZmluZCBpdCBpbiBET00gdXNpbmcgJCQoKVxuICAgICAgICAgICAgJGIocmVhbFR5cGVPZihyZWFsU2VsZWN0b3IsICdlbGVtZW50JykgP1xuICAgICAgICAgICAgICAgcmVhbFNlbGVjdG9yIDogJCQocmVhbFNlbGVjdG9yLCByZWFsU2VsZWN0b3JDb250ZXh0KVxuICAgICAgICAgICAgLCBqd2VydHkuZXZlbnQoandlcnR5Q29kZSwgY2FsbGJhY2tGdW5jdGlvbiwgcmVhbGNhbGxiYWNrQ29udGV4dCkpO1xuICAgICAgICB9LFxuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGp3ZXJ0eS5maXJlXG4gICAgICAgICAqXG4gICAgICAgICAqIGBqd2VydHkuZmlyZWAgd2lsbCBjb25zdHJ1Y3QgYSBrZXl1cCBldmVudCB0byBmaXJlLCBiYXNlZCBvblxuICAgICAgICAgKiAgYGp3ZXJ0eUNvZGVgLiBUaGUgZXZlbnQgd2lsbCBiZSBmaXJlZCBhZ2FpbnN0IGBzZWxlY3RvcmAuXG4gICAgICAgICAqICBgc2VsZWN0b3JDb250ZXh0YCBpcyB1c2VkIHRvIHNlYXJjaCBmb3IgYHNlbGVjdG9yYCB3aXRoaW5cbiAgICAgICAgICogIGBzZWxlY3RvckNvbnRleHRgLCBzaW1pbGFyIHRvIGpRdWVyeSdzXG4gICAgICAgICAqICBgJCgnc2VsZWN0b3InLCAnY29udGV4dCcpYC5cbiAgICAgICAgICpcbiAgICAgICAgICogICBAcGFyYW0ge01peGVkfSBqd2VydHlDb2RlIGNhbiBiZSBhbiBhcnJheSwgb3Igc3RyaW5nIG9mIGtleVxuICAgICAgICAgKiAgICAgIGNvbWJpbmF0aW9ucywgd2hpY2ggaW5jbHVkZXMgb3B0aW5hbHMgYW5kIG9yIHNlcXVlbmNlc1xuICAgICAgICAgKiAgIEBwYXJhbSB7TWl4ZWR9IHNlbGVjdG9yIGNhbiBiZSBhIHN0cmluZywgalF1ZXJ5L1plcHRvL0VuZGVyIG9iamVjdCxcbiAgICAgICAgICogICAgICBvciBhbiBIVE1MKkVsZW1lbnQgb24gd2hpY2ggdG8gYmluZCB0aGUgZXZlbnRMaXN0ZW5lclxuICAgICAgICAgKiAgIEBwYXJhbSB7TWl4ZWR9IHNlbGVjdG9yQ29udGV4dCBjYW4gYmUgYSBzdHJpbmcsIGpRdWVyeS9aZXB0by9FbmRlclxuICAgICAgICAgKiAgICAgIG9iamVjdCwgb3IgYW4gSFRNTCpFbGVtZW50IG9uIHdoaWNoIHRvIHNjb3BlIHRoZSBzZWxlY3RvclxuICAgICAgICAgKiAgXG4gICAgICAgICAqL1xuICAgICAgICBmaXJlOiBmdW5jdGlvbiAoandlcnR5Q29kZSwgc2VsZWN0b3IgLyo/IGRvY3VtZW50ICovLCBzZWxlY3RvckNvbnRleHQgLyo/IGJvZHkgKi8sIGkpIHtcbiAgICAgICAgICAgIGp3ZXJ0eUNvZGUgPSBuZXcgSndlcnR5Q29kZShqd2VydHlDb2RlKTtcbiAgICAgICAgICAgIHZhciByZWFsSSA9IHJlYWxUeXBlT2Yoc2VsZWN0b3JDb250ZXh0LCAnbnVtYmVyJykgPyBzZWxlY3RvckNvbnRleHQgOiBpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJZiBgcmVhbFNlbGVjdG9yYCBpcyBhbHJlYWR5IGEgalF1ZXJ5L1plcHRvL0VuZGVyL0RPTSBlbGVtZW50LFxuICAgICAgICAgICAgLy8gdGhlbiBqdXN0IHVzZSBpdCBuZWF0LCBvdGhlcndpc2UgZmluZCBpdCBpbiBET00gdXNpbmcgJCQoKVxuICAgICAgICAgICAgJGYocmVhbFR5cGVPZihzZWxlY3RvciwgJ2VsZW1lbnQnKSA/XG4gICAgICAgICAgICAgICAgc2VsZWN0b3IgOiAkJChzZWxlY3Rvciwgc2VsZWN0b3JDb250ZXh0KVxuICAgICAgICAgICAgLCBqd2VydHlDb2RlW3JlYWxJIHx8IDBdWzBdKTtcbiAgICAgICAgfSxcbiAgICAgICAgXG4gICAgICAgIEtFWVM6IF9rZXlzXG4gICAgfTtcbiAgICBcbn0odGhpcywgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzID8gbW9kdWxlLmV4cG9ydHMgOiB0aGlzKSkpOyIsIlxuXG52YXIgaW1ndWkgPSByZXF1aXJlKCcuLi9saWJpbWd1aScpO1xuaW1ndWkuaW5zdGFsbCh3aW5kb3cpO1xuXG52YXIgdG9kb3MgPSB7XG4gICAgaXRlbXM6IFtcbiAgICAgICAge2xhYmVsOiBcIkVtYWlsXCIsIGRvbmU6IGZhbHNlfSxcbiAgICAgICAge2xhYmVsOiBcIlJldmlld2luZ1wiLCBkb25lOiB0cnVlfSxcbiAgICAgICAge2xhYmVsOiBcIkJ1eSBtaWxrXCIsIGRvbmU6IGZhbHNlfSxcbiAgICAgICAge2xhYmVsOiBcIlNlbmQgcG9zdGNhcmRcIiwgZG9uZTogdHJ1ZX0sXG4gICAgICAgIHtsYWJlbDogXCJGaW5pc2ggYW5udWFsIHJlcG9ydFwiLCBkb25lOiBmYWxzZX1cbiAgICBdLFxuICAgIG5ld1RvZG86IFwiXCJcbn07XG5cbmZ1bmN0aW9uIHJ1bigpIHtcbiAgICBzZXR1cCh0b2RvQXBwLCB0b2RvcywgJ3Jvb3QnKTtcbn1cblxuXG5mdW5jdGlvbiB0b2RvQXBwKG1vZGVsKSB7XG5cbiAgICBoMihcIlRvZG8gQXBwXCIpO1xuXG5cbiAgICBmdW5jdGlvbiB0b2RvVmlldyhpdGVtKSB7XG5cdGl0ZW0uZG9uZSA9IGNoZWNrQm94KGl0ZW0uZG9uZSk7XG5cdHRleHQoaXRlbS5sYWJlbCk7XG4gICAgfVxuICAgICAgICBcbiAgICBlZGl0YWJsZUxpc3QobW9kZWwuaXRlbXMsIHRvZG9WaWV3KTtcbiAgICBcbiAgICBpZiAoYnV0dG9uKFwiQWRkXCIpKSB7XG4gICAgICAgIG1vZGVsLml0ZW1zLnB1c2goe2xhYmVsOiBtb2RlbC5uZXdUb2RvLCBkb25lOiBmYWxzZX0pO1xuICAgICAgICBtb2RlbC5uZXdUb2RvID0gXCJcIjtcbiAgICB9XG4gICAgXG4gICAgbW9kZWwubmV3VG9kbyA9IHRleHRCb3gobW9kZWwubmV3VG9kbyk7XG5cbiAgICBwcmUoZnVuY3Rpb24oKSB7XG5cdHRleHQoSlNPTi5zdHJpbmdpZnkobW9kZWwsIG51bGwsICcgICcpKTtcbiAgICB9KTtcbn1cblxuXG5cbmZ1bmN0aW9uIGVkaXRhYmxlTGlzdCh4cywgcmVuZGVyeCkge1xuICAgIGZ1bmN0aW9uIG1vdmUoaWR4LCBkaXIpIHtcblx0dmFyIGVsdCA9IHhzW2lkeF07XG4gICAgICAgIHhzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICB4cy5zcGxpY2UoaWR4ICsgZGlyLCAwLCBlbHQpO1xuICAgIH1cblxuICAgIFxuICAgIHRhYmxlKGZ1bmN0aW9uICgpIHtcblxuXHQvLyBpdGVyYXRlIG92ZXIgYSBjb3B5XG5cdHZhciBlbHRzID0geHMuc2xpY2UoMCk7XG5cdFxuICAgICAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBlbHRzLmxlbmd0aDsgaWR4KyspIHtcblx0ICAgIHRyKGZ1bmN0aW9uKCkge1xuXHRcdHRkKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyeChlbHRzW2lkeF0pO1xuXHRcdH0pO1xuXG5cdFx0dGQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChidXR0b24oXCIgKyBcIikpIHtcblx0XHRcdHhzLnNwbGljZShpZHggKyAxLCAwLCBjbG9uZShuZXd4KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblx0XHR9KTtcblx0XHRcbiAgICAgICAgICAgICAgICB0ZChmdW5jdGlvbigpIHtcblx0XHQgICAgaWYgKGJ1dHRvbihcIiAtIFwiKSkge1xuXHRcdFx0eHMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblx0XHR9KTtcblxuXHRcdHRkKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaWR4ID4gMCAmJiBidXR0b24oXCIgXiBcIikpIHtcblx0XHRcdG1vdmUoaWR4LCAtMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblx0XHR9KTtcblxuXHRcdHRkKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaWR4IDwgeHMubGVuZ3RoIC0gMSAmJiBidXR0b24oXCIgdiBcIikpIHtcblx0XHRcdG1vdmUoaWR4LCArMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblx0XHR9KTtcbiAgICAgICAgICAgIH0pO1xuXHQgICAgXG4gICAgICAgIH1cblx0XG4gICAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcnVuO1xuIl19
