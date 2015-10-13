!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.celsiusApp=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){


var imgui = require('../libimgui');
imgui.install(window);

var m = {
    t: 0
};

function run() {
    setup(c2f, m, 'root');
} 

function toF(c) {
    return Math.round(c * 9.0/5.0 + 32);
}

function toC(f) {
    return Math.round((parseFloat(f) - 32) * 5.0/9.0);
}

function c2f(m) {
    text("C:")
    m.t = textBox(m.t);

    text("F:")
    m.t = toC(textBox(toF(m.t)));
}
				 

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNlbHNpdXMuanMiLCIuLi9saWJpbWd1aS9saWJpbWd1aS5qcyIsIi4uL2xpYmltZ3VpL25vZGVfbW9kdWxlcy9qd2VydHkvandlcnR5LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3Z1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG5cbnZhciBpbWd1aSA9IHJlcXVpcmUoJy4uL2xpYmltZ3VpJyk7XG5pbWd1aS5pbnN0YWxsKHdpbmRvdyk7XG5cbnZhciBtID0ge1xuICAgIHQ6IDBcbn07XG5cbmZ1bmN0aW9uIHJ1bigpIHtcbiAgICBzZXR1cChjMmYsIG0sICdyb290Jyk7XG59IFxuXG5mdW5jdGlvbiB0b0YoYykge1xuICAgIHJldHVybiBNYXRoLnJvdW5kKGMgKiA5LjAvNS4wICsgMzIpO1xufVxuXG5mdW5jdGlvbiB0b0MoZikge1xuICAgIHJldHVybiBNYXRoLnJvdW5kKChwYXJzZUZsb2F0KGYpIC0gMzIpICogNS4wLzkuMCk7XG59XG5cbmZ1bmN0aW9uIGMyZihtKSB7XG4gICAgdGV4dChcIkM6XCIpXG4gICAgbS50ID0gdGV4dEJveChtLnQpO1xuXG4gICAgdGV4dChcIkY6XCIpXG4gICAgbS50ID0gdG9DKHRleHRCb3godG9GKG0udCkpKTtcbn1cblx0XHRcdFx0IFxuXG5tb2R1bGUuZXhwb3J0cyA9IHJ1bjtcbiIsIlxuXG4vKlxuXG5UT0RPOlxuXG4tIG1ha2UgcG9zc2libGUgdG8gdXNlIG11bHRpcGxlIGluc3RhbmNlIGluIGEgc2luZ2xlIHBhZ2UgKHB1dCBldmVyeXRoaW5nIGluIGFuIG9iamVjdClcblxuLSBtYWtlIFwiaGVyZVwiIHJlc2lsaWVudCBhZ2FpbnN0IHBhc3NpbmcgdGhlIHlpZWxkZWQgZnVuY3Rpb24gdG8gb3RoZXIgZnVuY3Rpb25zLiBDdXJyZW50bHkgXG4gIGl0IG9ubHkgd29ya3MgaWYgaXQncyBjYWxsZWQgd2l0aGluIHRoZSBjbG9zdXJlLlxuXG4tIHJlbW92ZSBcImJvZHlcIiBwYXRjaGluZy5cblxuLSBsZXQgZXZlbnQtaGFuZGxpbmcgcmVuZGVyIG5vdCBidWlsZCBWbm9kZXMuXG5cbi0gYWRkIGFzc2VydGlvbnMgdG8gY2hlY2sgaW5wdXQgcGFyYW1zLlxuXG4tIGdhcmJhZ2UgY29sbGVjdCB2aWV3IHN0YXRlcy5cblxuLSBwZXJoYXBzIHJlbW92ZSB0cnktZmluYWxseSwgc2luY2UgZXhjZXB0aW9uIGhhbmRsaW5nIGRvZXMgbm90IHNlZW1zIHRvIGJlIGNvbW1vbiBpbiBKUyAoYW5kIHNsb3cuLi4pXG5cbi0gbWFrZSBzb21lIGVsZW1lbnRzIGJvdGggYWNjZXB0IHN0cmluZyBhbmQgYmxvY2sgKGUuZy4gcCkuXG5cbi0gc2VwYXJhdGUgd2lkZ2V0cyBpbiBvdGhlciBsaWJcblxuLSByZW1vdmUgZGVwIG9uIGp3ZXJ0eSAodXNlIHByb2NlZWQgcGF0dGVybilcblxuLSBhbGxvdyBldmVudCBkZWxlZ2F0aW9uIHZpYSByb290LCBub3QganVzdCBkb2N1bWVudC5cblxuLSBtYWtlIGRvY3VtZW50IGluamVjdGFibGVcblxuKi9cblxudmFyIGp3ZXJ0eSA9IHJlcXVpcmUoJ2p3ZXJ0eScpLmp3ZXJ0eTtcblxudmFyIEdVSSA9IHtcbiAgICBldmVudDogbnVsbCxcbiAgICBhcHA6IG51bGwsXG4gICAgbW9kZWw6IG51bGwsXG4gICAgZm9jdXM6IFtdLFxuICAgIG5vZGU6IG51bGwsXG4gICAgZXh0cmFzOiB7fSxcbiAgICB0aW1lcnM6IHt9LFxuICAgIGhhbmRsZXJzOiB7fSxcbiAgICBpZHM6IDBcbn1cblxuZnVuY3Rpb24gaW5pdChhcHAsIG1vZGVsLCByb290KSB7XG4gICAgR1VJLmFwcCA9IGFwcDtcbiAgICBHVUkubW9kZWwgPSBtb2RlbDtcbiAgICBHVUkucm9vdCA9IHJvb3Q7XG59XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyKGV2ZW50LCBpZCkge1xuICAgIC8vIG9ubHkgYWRkIG9uZSBoYW5kbGVyIHRvIHJvb3QsIHBlciBldmVudCB0eXBlLlxuICAgIGlmICghR1VJLmhhbmRsZXJzLmhhc093blByb3BlcnR5KGV2ZW50KSkge1xuXHRHVUkuaGFuZGxlcnNbZXZlbnRdID0gW107XG5cdHZhciByID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoR1VJLnJvb3QpO1xuXHRyLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGZ1bmN0aW9uIChlKSB7XG5cdCAgICBlLnN0b3BQcm9wYWdhdGlvbigpOyAvLyBkb24ndCBsZWFrIHVwd2FyZHNcblx0ICAgIHZhciBpZCA9IGUudGFyZ2V0LmdldEF0dHJpYnV0ZSgnaWQnKTtcblx0ICAgIGlmIChHVUkuaGFuZGxlcnNbZXZlbnRdLmluZGV4T2YoaWQpID4gLTEpIHtcblx0XHRHVUkuZXZlbnQgPSBlO1xuXHRcdGRvUmVuZGVyKCk7XG5cdCAgICB9XG5cdH0sIGZhbHNlKTtcbiAgICB9XG4gICAgR1VJLmhhbmRsZXJzW2V2ZW50XS5wdXNoKGlkKTtcbn1cblxuZnVuY3Rpb24gcmVzZXRIYW5kbGVycygpIHtcbiAgICBmb3IgKHZhciBrIGluIEdVSS5oYW5kbGVycykge1xuXHRpZiAoR1VJLmhhbmRsZXJzLmhhc093blByb3BlcnR5KGspKSB7XG5cdCAgICBHVUkuaGFuZGxlcnNba10gPSBbXTtcblx0fVxuICAgIH1cbn1cblxuZnVuY3Rpb24gc2V0dXAoYXBwLCBtb2RlbCwgcm9vdCkge1xuICAgIGluaXQoYXBwLCBtb2RlbCwgcm9vdCk7XG4gICAgbW91bnQocmVuZGVyT25jZSgpKTtcbn1cblxuXG5mdW5jdGlvbiByZW5kZXJPbmNlKCkge1xuICAgIHJlc2V0SGFuZGxlcnMoKTtcbiAgICBHVUkuZXh0cmFzID0ge307XG4gICAgR1VJLmZvY3VzID0gW107XG4gICAgR1VJLmlkcyA9IDA7XG4gICAgR1VJLmFwcChHVUkubW9kZWwpO1xufVxuXG5mdW5jdGlvbiBtb3VudChub2RlKSB7XG4gICAgdmFyIGFjdGl2ZSA9IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQ7XG4gICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKEdVSS5yb290KTtcbiAgICBpZiAoR1VJLm5vZGUgIT09IG51bGwpIHtcblx0cmVjb25jaWxlS2lkcyhjb250YWluZXIsIGNvbnRhaW5lci5jaGlsZE5vZGVzLCBHVUkuZm9jdXMpO1xuICAgIH1cbiAgICBlbHNlIHtcblx0d2hpbGUgKGNvbnRhaW5lci5maXJzdENoaWxkKSB7XG5cdCAgICBjb250YWluZXIucmVtb3ZlQ2hpbGQoY29udGFpbmVyLmZpcnN0Q2hpbGQpO1xuXHR9XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgR1VJLmZvY3VzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoYnVpbGQoR1VJLmZvY3VzW2ldKSk7XG5cdH1cbiAgICB9XG4gICAgR1VJLm5vZGUgPSBub2RlO1xuXG4gICAgZm9yICh2YXIgaWQgaW4gR1VJLmV4dHJhcykge1xuXHRpZiAoR1VJLmV4dHJhcy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcblx0ICAgIHZhciBkb1NvbWV0aGluZyA9IEdVSS5leHRyYXNbaWRdO1xuXHQgICAgdmFyIGVsdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcblx0ICAgIGRvU29tZXRoaW5nKGVsdCk7XG5cdH1cbiAgICB9XG4gICAgXG59XG5cbmZ1bmN0aW9uIGRvUmVuZGVyKCkge1xuICAgIC8vIHR3aWNlOiBvbmUgdG8gaGFuZGxlIGV2ZW50LCBvbmUgdG8gc3luYyB2aWV3LlxuICAgIHZhciBfID0gcmVuZGVyT25jZSgpO1xuICAgIHZhciBub2RlID0gcmVuZGVyT25jZSgpO1xuICAgIG1vdW50KG5vZGUpO1xufVxuXG5cblxuXG5cbi8vIHZhciBjYWxsU3RhY2sgPSBbXTtcblxuLy8gLy8gd2Ugc2hvdWxkIHNvbWVob3cgZ2FyYmFnZSBjb2xsZWN0IHRoaXMuXG4vLyB2YXIgbWVtbyA9IHt9O1xuXG5cbi8vIGZ1bmN0aW9uIGdldENhbGxlckxvYyhvZmZzZXQpIHtcbi8vICAgICB2YXIgc3RhY2sgPSBuZXcgRXJyb3IoKS5zdGFjay5zcGxpdCgnXFxuJyk7XG4vLyAgICAgdmFyIGxpbmUgPSBzdGFja1sob2Zmc2V0IHx8IDEpICsgMV07XG4vLyAgICAgLy9jb25zb2xlLmxvZyhcImxhc3QgLyA9IFwiICsgbGluZS5sYXN0SW5kZXhPZihcIi9cIikpO1xuLy8gICAgIGlmIChsaW5lW2xpbmUubGVuZ3RoIC0gMV0gPT09ICcpJykge1xuLy8gXHRsaW5lID0gbGluZS5zbGljZSgwLCBsaW5lLmxlbmd0aCAtIDEpO1xuLy8gICAgIH1cbi8vICAgICByZXR1cm4gbGluZS5zbGljZShsaW5lLmxhc3RJbmRleE9mKCcvJykgKyAxKTtcbi8vIH1cbiBcblxuLy8gZnVuY3Rpb24gY29tcG9uZW50KHN0YXRlLCBmdW5jKSB7XG4vLyAgICAgdmFyIGZuYW1lID0gZnVuYy5uYW1lIHx8IGZ1bmMudG9TdHJpbmcoKTtcbi8vICAgICByZXR1cm4gbmFtZWRDb21wb25lbnQoZm5hbWUsIGZ1bmMsIHN0YXRlKTtcbi8vIH1cblxuLy8gZnVuY3Rpb24gbmFtZWQoZm5hbWUsIGNvbXApIHtcbi8vICAgICBjYWxsU3RhY2sucHVzaChmbmFtZSk7XG4vLyAgICAgdHJ5IHtcbi8vIFx0dmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuLy8gXHQvLyBmb3IgKHZhciBpID0gMjsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuLy8gXHQvLyAgICAgYXJncy5wdXNoKGFyZ3VtZW50c1tpXSk7XG4vLyBcdC8vIH1cbi8vIFx0cmV0dXJuIGNvbXAuYXBwbHkobnVsbCwgYXJncyk7XG4vLyAgICAgfVxuLy8gICAgIGZpbmFsbHkge1xuLy8gXHRjYWxsU3RhY2sucG9wKCk7XG4vLyAgICAgfVxuLy8gfVxuXG4vLyBmdW5jdGlvbiBrZXlPZih2YWx1ZSkge1xuLy8gICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuLy8gXHRyZXR1cm4gXCJcIjtcbi8vICAgICB9XG5cbi8vICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuLy8gXHRyZXR1cm4gXCJcIjtcbi8vICAgICB9XG5cbi8vICAgICBpZiAodmFsdWUuY29uc3RydWN0b3IgPT09IEFycmF5KSB7XG4vLyBcdHJldHVybiBvYmplY3RJZCh2YWx1ZSk7XG4vLyAgICAgfVxuXG4vLyAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIikge1xuLy8gXHRyZXR1cm4gb2JqZWN0SWQodmFsdWUpO1xuLy8gICAgIH1cblxuLy8gICAgIHJldHVybiBcIlwiO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBuYW1lZENvbXBvbmVudChmbmFtZSwgZnVuYywgc3RhdGUpIHtcbi8vICAgICBzdGF0ZSA9IHN0YXRlIHx8IHt9O1xuLy8gICAgIHJldHVybiBmdW5jdGlvbigpIHtcbi8vIFx0dmFyIG1vZGVsID0gYXJndW1lbnRzWzBdOyAvLyBmaXJzdCBhcmd1bWVudCAqbXVzdCogYmUgYSBtb2RlbFxuLy8gXHRjYWxsU3RhY2sucHVzaChbZm5hbWUsIGtleU9mKG1vZGVsKSwgZ2V0Q2FsbGVyTG9jKDIpXS50b1N0cmluZygpKTtcbi8vIFx0dHJ5IHtcbi8vIFx0ICAgIHZhciBrZXkgPSBjYWxsU3RhY2sudG9TdHJpbmcoKTtcbi8vIFx0ICAgIGlmICghbWVtb1trZXldKSB7XG4vLyBcdFx0bWVtb1trZXldID0gY2xvbmUoc3RhdGUpO1xuLy8gXHQgICAgfVxuLy8gXHQgICAgdmFyIHNlbGYgPSBtZW1vW2tleV07XG4vLyBcdCAgICByZXR1cm4gZnVuYy5hcHBseShudWxsLCBbc2VsZl0uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbi8vIFx0fVxuLy8gXHRmaW5hbGx5IHtcbi8vIFx0ICAgIGNhbGxTdGFjay5wb3AoKTtcbi8vIFx0fVxuLy8gICAgIH07XG4vLyB9XG5cbi8qXG52ZG9tIGVsZW1lbnRcbnt0YWc6XG4gYXR0cnM6IHt9IGV0Yy5cbiBraWRzOiBbXSB9XG5cbiovXG5cbmZ1bmN0aW9uIGNvbXBhdChkLCB2KSB7XG4gICAgLy9jb25zb2xlLmxvZyhcIkNvbXBhdD8gXCIpO1xuICAgIC8vY29uc29sZS5sb2coXCJkID0gXCIgKyBkLm5vZGVWYWx1ZSk7XG4gICAgLy9jb25zb2xlLmxvZyhcInYgPSBcIiArIEpTT04uc3RyaW5naWZ5KHYpKTtcbiAgICByZXR1cm4gKGQubm9kZVR5cGUgPT09IE5vZGUuVEVYVF9OT0RFICYmICh0eXBlb2YgdiAhPT0gJ29iamVjdCcpKVxuXHR8fCAoZC50YWdOYW1lID09PSB2LnRhZy50b1VwcGVyQ2FzZSgpKTtcbn1cblxuLy8gZnVuY3Rpb24gc2V0QXR0cmlidXRlSG9vayhkb20sIG5hbWUsIHZhbHVlKSB7XG4vLyAgICAgZnVuY3Rpb24gcGFyc2VCb29sZWFuKHYpIHtcbi8vIFx0aWYgKCF2KSB7XG4vLyBcdCAgICByZXR1cm4gZmFsc2U7XG4vLyBcdH1cbi8vIFx0cmV0dXJuIHYudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpID09PSAndHJ1ZSc7XG4vLyAgICAgfVxuLy8gICAgIC8vIGlmIChuYW1lID09PSAnY2hlY2tlZCcpIHtcbi8vICAgICAvLyBcdGRvbS5jaGVja2VkID0gcGFyc2VCb29sZWFuKHZhbHVlKTtcbi8vICAgICAvLyB9XG4vLyAgICAgLy8gaWYgKG5hbWUgPT09ICdzZWxlY3RlZCcpIHtcbi8vICAgICAvLyBcdGRvbS5zZWxlY3RlZCA9IHBhcnNlQm9vbGVhbih2YWx1ZSk7XG4vLyAgICAgLy8gfVxuLy8gICAgIGlmIChuYW1lID09PSAndmFsdWUnKSB7XG4vLyBcdGRvbS52YWx1ZSA9IHZhbHVlO1xuLy8gICAgIH1cbi8vIH1cblxuLy8gZnVuY3Rpb24gcmVtb3ZlQXR0cmlidXRlSG9vayhkb20sIG5hbWUpIHtcbi8vICAgICAvLyBpZiAobmFtZSA9PT0gJ2NoZWNrZWQnKSB7XG4vLyAgICAgLy8gXHRkb20uY2hlY2tlZCA9IGZhbHNlO1xuLy8gICAgIC8vIH1cbi8vICAgICAvLyBpZiAobmFtZSA9PT0gJ3NlbGVjdGVkJykge1xuLy8gICAgIC8vIFx0ZG9tLnNlbGVjdGVkID0gZmFsc2U7XG4vLyAgICAgLy8gfVxuLy8gICAgIGlmIChuYW1lID09PSAndmFsdWUnKSB7XG4vLyBcdGRvbS52YWx1ZSA9ICcnO1xuLy8gICAgIH1cbi8vIH1cblxuZnVuY3Rpb24gcmVjb25jaWxlKGRvbSwgdmRvbSkge1xuICAgIGlmICghY29tcGF0KGRvbSwgdmRvbSkpIHtcblx0dGhyb3cgXCJDYW4gb25seSByZWNvbmNpbGUgY29tcGF0aWJsZSBub2Rlc1wiO1xuICAgIH1cbiAgICBcbiAgICAvLyBUZXh0IG5vZGVzXG4gICAgaWYgKHR5cGVvZiB2ZG9tICE9PSAnb2JqZWN0Jykge1xuXHRpZiAoZG9tLm5vZGVWYWx1ZSAhPT0gdmRvbSkge1xuXHQgICAgZG9tLm5vZGVWYWx1ZSA9IHZkb20udG9TdHJpbmcoKTtcblx0fVxuXHRyZXR1cm47XG4gICAgfVxuXG5cbiAgICAvLyBFbGVtZW50IG5vZGVzXG4gICAgdmFyIHZhdHRycyA9IHZkb20uYXR0cnMgfHwge307XG4gICAgZm9yICh2YXIgdmF0dHIgaW4gdmF0dHJzKSB7XG5cdGlmICh2YXR0cnMuaGFzT3duUHJvcGVydHkodmF0dHIpKSB7XG5cdCAgICBpZiAoZG9tLmhhc0F0dHJpYnV0ZSh2YXR0cikpIHtcblx0XHR2YXIgZGF0dHIgPSBkb20uZ2V0QXR0cmlidXRlKHZhdHRyKTtcblx0XHRpZiAoZGF0dHIgIT09IHZhdHRyc1t2YXR0cl0udG9TdHJpbmcoKSkgeyBcblx0XHQgICAgLy9jb25zb2xlLmxvZyhcIlVwZGF0aW5nIGF0dHJpYnV0ZTogXCIgKyB2YXR0ciArIFwiID0gXCIgKyB2YXR0cnNbdmF0dHJdKTtcblx0XHQgICAgZG9tLnNldEF0dHJpYnV0ZSh2YXR0ciwgdmF0dHJzW3ZhdHRyXSk7XG5cdFx0fVxuXHQgICAgfVxuXHQgICAgZWxzZSB7XG5cdFx0Ly9jb25zb2xlLmxvZyhcIkFkZGluZyBhdHRyaWJ1dGU6IFwiICsgdmF0dHIgKyBcIiA9IFwiICsgdmF0dHJzW3ZhdHRyXSk7XG5cdFx0ZG9tLnNldEF0dHJpYnV0ZSh2YXR0ciwgdmF0dHJzW3ZhdHRyXSk7XG5cdCAgICB9XG5cdH1cbiAgICB9XG4gICAgXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkb20uYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuXHR2YXIgZGF0dHIgPSBkb20uYXR0cmlidXRlc1tpXTtcblx0aWYgKCF2YXR0cnMuaGFzT3duUHJvcGVydHkoZGF0dHIubm9kZU5hbWUpKSB7XG5cdCAgICAvL2NvbnNvbGUubG9nKFwiUmVtb3ZpbmcgYXR0cmlidXRlOiBcIiArIGRhdHRyLm5vZGVOYW1lKTtcblx0ICAgIGRvbS5yZW1vdmVBdHRyaWJ1dGUoZGF0dHIubm9kZU5hbWUpO1xuXHR9XG4gICAgfVxuXG4gICAgcmVjb25jaWxlS2lkcyhkb20sIGRvbS5jaGlsZE5vZGVzLCB2ZG9tLmtpZHMpO1xufVxuXG5mdW5jdGlvbiByZWNvbmNpbGVLaWRzKGRvbSwgZGtpZHMsIHZraWRzKSB7XG4gICAgdmFyIGxlbiA9IE1hdGgubWluKGRraWRzLmxlbmd0aCwgdmtpZHMubGVuZ3RoKTtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG5cdHZhciBka2lkID0gZGtpZHNbaV07XG5cdHZhciB2a2lkID0gdmtpZHNbaV07XG5cdGlmIChjb21wYXQoZGtpZCwgdmtpZCkpIHtcblx0ICAgIHJlY29uY2lsZShka2lkLCB2a2lkKTtcblx0fVxuXHRlbHNlIHtcblx0ICAgIC8vY29uc29sZS5sb2coXCJSZXBsYWNpbmcgY2hpbGRcIik7XG5cdCAgICBkb20ucmVwbGFjZUNoaWxkKGJ1aWxkKHZraWQpLCBka2lkKTtcblx0fVxuICAgIH1cbiAgICBcbiAgICBpZiAoZGtpZHMubGVuZ3RoID4gbGVuKSB7XG5cdHdoaWxlIChka2lkcy5sZW5ndGggPiBsZW4pIHtcblx0ICAgIC8vY29uc29sZS5sb2coXCJSZW1vdmluZyBjaGlsZCBcIik7XG5cdCAgICBkb20ucmVtb3ZlQ2hpbGQoZGtpZHNbbGVuXSk7XG5cdH1cbiAgICB9XG4gICAgZWxzZSBpZiAodmtpZHMubGVuZ3RoID4gbGVuKSB7XG5cdGZvciAodmFyIGkgPSBsZW47IGkgPCB2a2lkcy5sZW5ndGg7IGkrKykge1xuXHQgICAgLy9jb25zb2xlLmxvZyhcIkFwcGVuZGluZyBuZXcgY2hpbGQgXCIpO1xuXHQgICAgZG9tLmFwcGVuZENoaWxkKGJ1aWxkKHZraWRzW2ldKSk7XG5cdH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkKHZkb20pIHtcbiAgICBpZiAodmRvbSA9PT0gdW5kZWZpbmVkKSB7XG5cdHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShcIlwiKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB2ZG9tICE9PSAnb2JqZWN0Jykge1xuXHRyZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodmRvbS50b1N0cmluZygpKTtcbiAgICB9XG5cbiAgICB2YXIgZWx0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh2ZG9tLnRhZyk7XG4gICAgdmFyIHZhdHRycyA9IHZkb20uYXR0cnMgfHwge307XG4gICAgZm9yICh2YXIgayBpbiB2YXR0cnMpIHtcblx0aWYgKHZhdHRycy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuXHQgICAgZWx0LnNldEF0dHJpYnV0ZShrLCB2YXR0cnNba10pO1xuXHR9XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmRvbS5raWRzLmxlbmd0aDsgaSsrKSB7XG5cdGVsdC5hcHBlbmRDaGlsZChidWlsZCh2ZG9tLmtpZHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIGVsdDsgICAgXG59XG5cbi8vIHZhciBfX25leHRfb2JqaWQ9MTtcbi8vIGZ1bmN0aW9uIG9iamVjdElkKG9iaikge1xuLy8gICAgIGlmIChvYmo9PW51bGwpIHJldHVybiBudWxsO1xuLy8gICAgIGlmIChvYmouX19vYmpfaWQ9PW51bGwpIG9iai5fX29ial9pZD1fX25leHRfb2JqaWQrKztcbi8vICAgICByZXR1cm4gb2JqLl9fb2JqX2lkO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBjbG9uZShvYmopIHtcbi8vICAgICBpZiAobnVsbCA9PSBvYmogfHwgXCJvYmplY3RcIiAhPSB0eXBlb2Ygb2JqKSByZXR1cm4gb2JqO1xuLy8gICAgIHZhciBjb3B5ID0gb2JqLmNvbnN0cnVjdG9yKCk7XG4vLyAgICAgZm9yICh2YXIgYXR0ciBpbiBvYmopIHtcbi8vICAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgY29weVthdHRyXSA9IG9ialthdHRyXTtcbi8vICAgICB9XG4vLyAgICAgcmV0dXJuIGNvcHk7XG4vLyB9XG5cbi8vIEV2ZW50IGhhbmRsaW5nXG5cbmZ1bmN0aW9uIGRlYWxXaXRoSXQoZSkge1xuICAgIEdVSS5ldmVudCA9IGU7XG4gICAgZG9SZW5kZXIoKTtcbn1cblxuXG5cbi8vIFJlbmRlciBmdW5jdGlvbnNcblxuZnVuY3Rpb24gaXNLZXlDb21ib0V2ZW50KGV2ZW50KSB7XG4gICAgcmV0dXJuIGV2ZW50LmluZGV4T2YoXCI6XCIpID4gLSAxO1xufVxuXG5mdW5jdGlvbiBnZXRIYW5kbGVyKGV2ZW50KSB7XG4gICAgaWYgKGlzS2V5Q29tYm9FdmVudChldmVudCkpIHtcblx0cmV0dXJuIGtleUNvbWJvTGlzdGVuZXIoZXZlbnQpO1xuICAgIH1cbiAgICByZXR1cm4gZGVhbFdpdGhJdDtcbn1cbiAgICBcbmZ1bmN0aW9uIGtleUNvbWJvTGlzdGVuZXIoZWx0LCBldmVudCkge1xuICAgIHZhciBjb2xvbiA9IGV2ZW50LmluZGV4T2YoXCI6XCIpO1xuICAgIHZhciBjb21ibyA9IGV2ZW50LnNsaWNlKGNvbG9uICsgMSk7XG4gICAgZXZlbnQgPSBldmVudC5zbGljZSgwLCBjb2xvbik7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGxpc3RlbihlKSB7XG5cdGlmIChqd2VydHkuaXMoY29tYm8sIGUpKSB7XG5cdCAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHQgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHQgICAgZS5pc0tleSA9IGZ1bmN0aW9uIChjKSB7IHJldHVybiBqd2VydHkuaXMoYywgdGhpcyk7IH07XG5cdCAgICBlLnRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBsaXN0ZW4sIGZhbHNlKTtcblx0ICAgIGRlYWxXaXRoSXQoZSk7XG5cdH1cbiAgICB9O1xufVxuXG5cbmZ1bmN0aW9uIG9uKGVsdCwgZXZlbnRzLCBhdHRycywgYmxvY2spIHtcbiAgICBhdHRycyA9IGF0dHJzIHx8IHt9O1xuICAgIHZhciBpZCA9IGF0dHJzW1wiaWRcIl0gfHwgKFwiaWRcIiArIEdVSS5pZHMrKyk7XG4gICAgYXR0cnNbXCJpZFwiXSA9IGlkO1xuXG4gICAgXG4gICAgLy9HVUkuaGFuZGxlcnNbaWRdID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyBpKyspIHtcblx0cmVnaXN0ZXIoZXZlbnRzW2ldLCBpZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHdpdGhFbGVtZW50KGVsdCwgYXR0cnMsIGZ1bmN0aW9uKCkge1xuXHR2YXIgZXZlbnQgPSBHVUkuZXZlbnQ7XG5cdGlmIChldmVudCAmJiBldmVudC50YXJnZXQuZ2V0QXR0cmlidXRlKCdpZCcpID09PSBpZCkge1xuXHQgICAgR1VJLmV2ZW50ID0gdW5kZWZpbmVkOyAvLyBtYXliZSBkbyBpbiB0b3BsZXZlbD8/P1xuXHQgICAgcmV0dXJuIGJsb2NrKGV2ZW50KTsgLy8gbGV0IGl0IGJlIGhhbmRsZWRcblx0fVxuXHRyZXR1cm4gYmxvY2soKTtcbiAgICB9KTtcbn1cblxuXG5cblxuZnVuY3Rpb24gaGVyZShmdW5jLCBibG9jaykge1xuICAgIHZhciBwb3MgPSBHVUkuZm9jdXMubGVuZ3RoO1xuICAgIHJldHVybiBibG9jayhmdW5jdGlvbigpIHtcblx0dmFyIHBhcmVudCA9IEdVSS5mb2N1cztcblx0R1VJLmZvY3VzID0gW107XG5cdHRyeSB7XG5cdCAgICByZXR1cm4gZnVuYy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuXHR9XG5cdGZpbmFsbHkge1xuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBHVUkuZm9jdXMubGVuZ3RoOyBpKyspIHtcblx0XHRwYXJlbnQuc3BsaWNlKHBvcyArIGksIDAsIEdVSS5mb2N1c1tpXSk7XG5cdCAgICB9XG5cdCAgICBHVUkuZm9jdXMgPSBwYXJlbnQ7XG5cdH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gd2l0aEVsZW1lbnQoZWx0LCBhdHRycywgZnVuYywgZXZzKSB7XG4gICAgLy8gVE9ETzogaWYgR1VJLnByZXRlbmQsIGRvbid0IGJ1aWxkIHZub2Rlc1xuICAgIHZhciBwYXJlbnQgPSBHVUkuZm9jdXM7XG4gICAgR1VJLmZvY3VzID0gW107XG4gICAgdHJ5IHtcblx0cmV0dXJuIGZ1bmMoKTtcbiAgICB9XG4gICAgZmluYWxseSB7XG5cdGlmIChhdHRycyAmJiBhdHRyc1snZXh0cmEnXSkge1xuXHQgICAgR1VJLmV4dHJhc1thdHRyc1snaWQnXV0gPSBhdHRyc1snZXh0cmEnXTtcblx0ICAgIGRlbGV0ZSBhdHRyc1snZXh0cmEnXTtcblx0fVxuXHR2YXIgdm5vZGUgPSB7dGFnOiBlbHQsIGF0dHJzOiBhdHRycywga2lkczogR1VJLmZvY3VzfTtcblx0cGFyZW50LnB1c2godm5vZGUpO1xuXHRHVUkuZm9jdXMgPSBwYXJlbnQ7XG4gICAgfSAgICBcbn1cblxuXG5cbi8vIEJhc2ljIHdpZGdldHNcblxuXG5mdW5jdGlvbiBhZGRJbnB1dEVsZW1lbnRzKG9iaikge1xuICAgIHZhciBiYXNpY0lucHV0cyA9IHtcbi8vXHR0ZXh0Qm94OiB7dHlwZTogJ3RleHQnLCBldmVudDogJ2lucHV0J30sXG5cdHNwaW5Cb3g6IHt0eXBlOiAnbnVtYmVyJywgZXZlbnQ6ICdpbnB1dCd9LFxuXHRzbGlkZXI6IHt0eXBlOiAncmFuZ2UnLCBldmVudDogJ2lucHV0J30sXG5cdGVtYWlsQm94OiB7dHlwZTogJ2VtYWlsJywgZXZlbnQ6ICdpbnB1dCd9LFxuXHRzZWFyY2hCb3g6IHt0eXBlOiAnc2VhcmNoJywgZXZlbnQ6ICdpbnB1dCd9LFxuXHRkYXRlUGlja2VyOiB7dHlwZTogJ2RhdGUnLCBldmVudDogJ2NoYW5nZSd9LFxuXHRjb2xvclBpY2tlcjoge3R5cGU6ICdjb2xvcicsIGV2ZW50OiAnY2hhbmdlJ30sXG5cdGRhdGVUaW1lUGlja2VyOiB7dHlwZTogJ2RhdGV0aW1lJywgZXZlbnQ6ICdjaGFuZ2UnfSxcblx0bG9jYWxEYXRlVGltZVBpY2tlcjoge3R5cGU6ICdkYXRldGltZS1sb2NhbCcsIGV2ZW50OiAnY2hhbmdlJ30sXG5cdG1vbnRoUGlja2VyOiB7dHlwZTogJ3dlZWsnLCBldmVudDogJ2NoYW5nZSd9LFxuXHR3ZWVrUGlja2VyOiB7dHlwZTogJ3dlZWsnLCBldmVudDogJ2NoYW5nZSd9LFxuXHR0aW1lUGlja2VyOiB7dHlwZTogJ3RpbWUnLCBldmVudDogJ2NoYW5nZSd9XG4gICAgfVxuICAgIFxuXG4gICAgZm9yICh2YXIgbmFtZSBpbiBiYXNpY0lucHV0cykge1xuXHRpZiAoYmFzaWNJbnB1dHMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcblx0ICAgIChmdW5jdGlvbiAobmFtZSkge1xuXHRcdG9ialtuYW1lXSA9IGZ1bmN0aW9uICh2YWx1ZSwgYXR0cnMpIHtcblx0XHQgICAgYXR0cnMgPSBhdHRycyB8fCB7fTtcblx0XHQgICAgYXR0cnNbJ3R5cGUnXSA9IGJhc2ljSW5wdXRzW25hbWVdLnR5cGU7XG5cdFx0ICAgIGF0dHJzWyd2YWx1ZSddID0gdmFsdWU7XG5cdFx0ICAgIFxuXHRcdCAgICByZXR1cm4gb24oXCJpbnB1dFwiLCBbYmFzaWNJbnB1dHNbbmFtZV0uZXZlbnRdLCBhdHRycywgZnVuY3Rpb24oZXYpIHtcblx0XHRcdHJldHVybiBldiA/IGV2LnRhcmdldC52YWx1ZSA6IHZhbHVlO1xuXHRcdCAgICB9KTtcblx0XHR9XG5cdCAgICB9KShuYW1lKTtcblx0fVxuICAgIH1cbn1cblxuZnVuY3Rpb24gdGV4dGFyZWEodmFsdWUsIGF0dHJzKSB7XG4gICAgYXR0cnMgPSBhdHRycyB8fCB7fTtcbiAgICBcbiAgICByZXR1cm4gb24oXCJ0ZXh0YXJlYVwiLCBbXCJrZXl1cFwiLCBcImJsdXJcIl0sIGF0dHJzLCBmdW5jdGlvbihldikge1xuXHR2YXIgbmV3VmFsdWUgPSBldiA/IGV2LnRhcmdldC52YWx1ZSA6IHZhbHVlO1xuXHR0ZXh0KHZhbHVlKTtcblx0cmV0dXJuIG5ld1ZhbHVlO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiB0ZXh0Qm94KHZhbHVlLCBhdHRycykge1xuICAgIGF0dHJzID0gYXR0cnMgfHwge307XG4gICAgYXR0cnMudHlwZSA9ICd0ZXh0JztcbiAgICBhdHRycy52YWx1ZSA9IHZhbHVlO1xuICAgIGF0dHJzLmV4dHJhID0gZnVuY3Rpb24gKGVsdCkge1xuICAgIFx0ZWx0LnZhbHVlID0gdmFsdWU7XG4gICAgfTtcbiAgICBcbiAgICBcbiAgICByZXR1cm4gb24oXCJpbnB1dFwiLCBbXCJpbnB1dFwiXSwgYXR0cnMsIGZ1bmN0aW9uKGV2KSB7XG5cdHJldHVybiBldiA/IGV2LnRhcmdldC52YWx1ZSA6IHZhbHVlO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBjaGVja0JveCh2YWx1ZSwgYXR0cnMpIHtcbiAgICBhdHRycyA9IGF0dHJzIHx8IHt9O1xuICAgIGF0dHJzLnR5cGUgPSBcImNoZWNrYm94XCI7XG4gICAgaWYgKHZhbHVlKSB7XG5cdGF0dHJzLmNoZWNrZWQgPSBcInRydWVcIjtcbiAgICB9XG4gICAgYXR0cnMuZXh0cmEgPSBmdW5jdGlvbiAoZWx0KSB7XG5cdGVsdC5jaGVja2VkID0gdmFsdWU7XG4gICAgfTtcbiAgICBcbiAgICByZXR1cm4gb24oXCJpbnB1dFwiLCBbXCJjbGlja1wiXSwgYXR0cnMsIGZ1bmN0aW9uKGV2KSB7XG5cdHJldHVybiBldiA/IGV2LnRhcmdldC5jaGVja2VkIDogdmFsdWU7XG4gICAgfSk7XG59XG5cblxuZnVuY3Rpb24gYWZ0ZXIoaWQsIGRlbGF5KSB7XG4gICAgaWYgKEdVSS50aW1lcnMuaGFzT3duUHJvcGVydHkoaWQpKSB7XG5cdGlmIChHVUkudGltZXJzW2lkXSkge1xuXHQgICAgcmV0dXJuIHRydWU7XG5cdH1cblx0cmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBlbHNlIHtcblx0R1VJLnRpbWVyc1tpZF0gPSBmYWxzZTtcblx0d2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdCAgICBHVUkudGltZXJzW2lkXSA9IHRydWU7XG5cdCAgICBkb1JlbmRlcigpO1xuXHR9LCBkZWxheSk7XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIGJ1dHRvbihsYWJlbCwgYXR0cnMpIHtcbiAgICByZXR1cm4gb24oXCJidXR0b25cIiwgW1wiY2xpY2tcIl0sIGF0dHJzLCBmdW5jdGlvbihldikge1xuXHR0ZXh0KGxhYmVsKTtcblx0cmV0dXJuIGV2ICE9PSB1bmRlZmluZWQ7XG4gICAgfSk7XG59XG5cblxuZnVuY3Rpb24gc2VsZWN0KHZhbHVlLCB4LCB5LCB6KSB7XG4gICAgLy9pZENsYXNzLCBhdHRycywgYmxvY2tcblxuICAgIGZ1bmN0aW9uIG9wdGlvbihvcHRWYWx1ZSwgbGFiZWwpIHtcblx0dmFyIGF0dHJzID0ge3ZhbHVlOiBvcHRWYWx1ZX07XG5cdGlmIChvcHRWYWx1ZSA9PT0gdmFsdWUpIHtcblx0ICAgIGF0dHJzWydzZWxlY3RlZCddID0gdHJ1ZTtcblx0fVxuXHRsYWJlbCA9IGxhYmVsIHx8IG9wdFZhbHVlO1xuXHRyZXR1cm4gd2l0aEVsZW1lbnQoXCJvcHRpb25cIiwgYXR0cnMsIGZ1bmN0aW9uICgpIHtcblx0ICAgIHRleHQobGFiZWwpO1xuXHR9KTtcbiAgICB9XG4gICAgXG4gICAgdmFyIGJsb2NrID0gZXh0cmFjdEJsb2NrKGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIG9uKFwic2VsZWN0XCIsIFtcImNoYW5nZVwiXSwgZGVmYXVsdEF0dHJzKHgsIHksIHopLCBmdW5jdGlvbihldikge1xuXHRibG9jayhvcHRpb24pO1xuXHRyZXR1cm4gZXYgIFxuXHQgICAgPyBldi50YXJnZXQub3B0aW9uc1tldi50YXJnZXQuc2VsZWN0ZWRJbmRleF0udmFsdWVcblx0ICAgIDogdmFsdWU7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHJhZGlvR3JvdXAodmFsdWUsICB4LCB5LCB6KSB7XG4gICAgdmFyIHJlc3VsdCA9IHZhbHVlO1xuICAgIHZhciBuYW1lID0gJ25hbWUnICsgKEdVSS5pZHMrKyk7XG4gICAgZnVuY3Rpb24gcmFkaW8ocmFkaW9WYWx1ZSwgbGFiZWwpIHtcblx0dmFyIGF0dHJzID0ge3R5cGU6IFwicmFkaW9cIiwgbmFtZTogbmFtZX07XG5cdGlmIChyYWRpb1ZhbHVlID09PSB2YWx1ZSkge1xuXHQgICAgYXR0cnNbJ2NoZWNrZWQnXSA9IHRydWU7XG5cdH1cblx0YXR0cnMuZXh0cmEgPSBmdW5jdGlvbiAoZWx0KSB7XG5cdCAgICBlbHQuY2hlY2tlZCA9IChyYWRpb1ZhbHVlID09PSB2YWx1ZSk7XG5cdH07XG5cdHJldHVybiBvbihcImxhYmVsXCIsIFtdLCB7fSwgZnVuY3Rpb24gKCkge1xuXHQgICAgb24oXCJpbnB1dFwiLCBbXCJjbGlja1wiXSwgYXR0cnMsIGZ1bmN0aW9uIChldikge1xuXHRcdGlmIChldikge1xuXHRcdCAgICByZXN1bHQgPSByYWRpb1ZhbHVlO1xuXHRcdH1cblx0XHRyZXR1cm4gcmFkaW9WYWx1ZTtcblx0ICAgIH0pXG5cdCAgICB0ZXh0KGxhYmVsIHx8IHJhZGlvVmFsdWUpO1xuXHQgICAgcmV0dXJuIHJhZGlvVmFsdWU7XG5cdH0pO1xuICAgIH1cblxuICAgIHZhciBibG9jayA9IGV4dHJhY3RCbG9jayhhcmd1bWVudHMpO1xuICAgIGJsb2NrKHJhZGlvKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBsYWJlbCh0eHQpIHtcbiAgICAvLyBGSVhNRTogdGhpcyBpcyBleHRyZW1lbHkgYnJpdHRsZS5cbiAgICB2YXIgaWQgPSBcImlkXCIgKyAoR1VJLmlkcyArIDEpOyAvLyBOQjogbm90ICsrICEhXG4gICAgcmV0dXJuIHdpdGhFbGVtZW50KFwibGFiZWxcIiwge1wiZm9yXCI6IGlkfSwgZnVuY3Rpb24gKCkge1xuXHQgdGV4dCh0eHQpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiB0ZXh0KHR4dCkge1xuICAgIEdVSS5mb2N1cy5wdXNoKHR4dCk7XG59XG5cbmZ1bmN0aW9uIGJyKCkge1xuICAgIHdpdGhFbGVtZW50KFwiYnJcIiwge30sIGZ1bmN0aW9uKCkge30pO1xufVxuXG4vLyBCbG9jayBsZXZlbCBlbGVtZW50c1xuXG5cbmZ1bmN0aW9uIGRlZmF1bHRBdHRycyh4LCB5LCB6KSB7XG4gICAgXG4gICAgaWYgKHR5cGVvZiB4ID09PSBcImZ1bmN0aW9uXCIpIHtcblx0cmV0dXJuIHt9O1xuICAgIH1cblxuICAgIHZhciBhdHRycyA9IHt9O1xuICAgIHZhciBpZENsYXNzO1xuICAgIGlmICh0eXBlb2YgeCA9PT0gXCJzdHJpbmdcIikge1xuXHRpZENsYXNzID0geDtcblx0aWYgKHR5cGVvZiB5ID09IFwib2JqZWN0XCIpIHtcblx0ICAgIGF0dHJzID0geTtcblx0fVxuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgeCA9PT0gXCJvYmplY3RcIikge1xuXHRhdHRycyA9IHg7XG4gICAgfVxuXG4gICAgaWYgKCFpZENsYXNzKSB7XG5cdHJldHVybiBhdHRycztcbiAgICB9XG4gICAgXG4gICAgdmFyIGhhc2ggPSBpZENsYXNzLmluZGV4T2YoXCIjXCIpO1xuICAgIHZhciBkb3QgPSBpZENsYXNzLmluZGV4T2YoXCIuXCIpO1xuICAgIGlmIChkb3QgPiAtMSkge1xuXHRhdHRyc1snY2xhc3MnXSA9IGlkQ2xhc3Muc2xpY2UoZG90ICsgMSwgaGFzaCA+IC0xID8gaGFzaCA6IGlkQ2xhc3MubGVuZ3RoKTtcbiAgICB9XG4gICAgaWYgKGhhc2ggPiAtMSkge1xuXHRhdHRyc1snaWQnXSA9IGlkQ2xhc3Muc2xpY2UoaGFzaCArIDEpO1xuICAgIH1cbiAgICByZXR1cm4gYXR0cnM7XG59XG5cbmZ1bmN0aW9uIGFkZElubGluZUVsZW1lbnRzKG9iaikge1xuICAgIHZhciBlbHRzID0gW1wiYVwiLCBcInBcIiwgXCJzcGFuXCIsIFwiaDFcIiwgXCJoMlwiLCBcImgzXCIsIFwiaDRcIl07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbHRzLmxlbmd0aDsgaSsrKSB7XG5cdG9ialtlbHRzW2ldXSA9IGZ1bmN0aW9uIChlbHQpIHtcblx0ICAgIHJldHVybiBmdW5jdGlvbiAodHh0LCBpZENsYXNzLCBhdHRycykge1xuXHRcdHdpdGhFbGVtZW50KGVsdCwgZGVmYXVsdEF0dHJzKGlkQ2xhc3MsIGF0dHJzKSwgZnVuY3Rpb24oKSB7XG5cdFx0ICAgIHRleHQodHh0KTtcblx0XHR9KTtcblx0ICAgIH1cblx0fShlbHRzW2ldKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RCbG9jayhhcmdzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG5cdGlmICgodHlwZW9mIGFyZ3NbaV0pID09PSBcImZ1bmN0aW9uXCIpIHtcblx0ICAgIHJldHVybiBhcmdzW2ldO1xuXHR9XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbigpIHt9O1xufVxuXG5mdW5jdGlvbiBhZGRCbG9ja0VsZW1lbnRzKG9iaikge1xuICAgIHZhciBlbHRzID0gW1wic2VjdGlvblwiLCBcImRpdlwiLCBcInVsXCIsIFwib2xcIiwgXCJsaVwiLCBcImhlYWRlclwiLCBcImZvb3RlclwiLCBcImNvZGVcIiwgXCJwcmVcIixcblx0XHRcImRsXCIsIFwiZHRcIiwgXCJkZFwiLCBcImZpZWxkc2V0XCIsIFwidGFibGVcIiwgXCJ0ZFwiLCBcInRyXCIsIFwidGhcIiwgXCJjb2xcIiwgXCJ0aGVhZFwiXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsdHMubGVuZ3RoOyBpKyspIHtcblx0b2JqW2VsdHNbaV1dID0gZnVuY3Rpb24gKGVsdCkge1xuXHQgICAgcmV0dXJuIGZ1bmN0aW9uICh4LCB5LCB6KSB7XG5cdFx0dmFyIGJsb2NrID0gZnVuY3Rpb24oKSB7fTtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdCAgICBpZiAoKHR5cGVvZiBhcmd1bWVudHNbaV0pID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdGJsb2NrID0gYXJndW1lbnRzW2ldO1xuXHRcdCAgICB9XG5cdFx0fVxuXHRcdHJldHVybiB3aXRoRWxlbWVudChlbHQsIGRlZmF1bHRBdHRycyh4LCB5LCB6KSwgZXh0cmFjdEJsb2NrKGFyZ3VtZW50cykpO1xuXHQgICAgfVxuXHR9KGVsdHNbaV0pO1xuICAgIH1cbn1cblxuXG5mdW5jdGlvbiBpbnN0YWxsKG9iaikge1xuICAgIGZvciAodmFyIGsgaW4gdGhpcykge1xuXHRpZiAodGhpcy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuXHQgICAgb2JqW2tdID0gdGhpc1trXTtcblx0fVxuICAgIH1cbn1cblxuXG52YXIgbGliaW1ndWkgPSB7XG4gICAgc2V0dXA6IHNldHVwLFxuICAgIGluaXQ6IGluaXQsXG4vLyAgICBjb21wb25lbnQ6IGNvbXBvbmVudCxcbi8vICAgIGNsb25lOiBjbG9uZSxcbiAgICB0ZXh0YXJlYTogdGV4dGFyZWEsXG4gICAgc2VsZWN0OiBzZWxlY3QsXG4gICAgcmFkaW9Hcm91cDogcmFkaW9Hcm91cCxcbiAgICB0ZXh0OiB0ZXh0LFxuICAgIGxhYmVsOiBsYWJlbCxcbiAgICBjaGVja0JveDogY2hlY2tCb3gsXG4gICAgdGV4dEJveDogdGV4dEJveCxcbiAgICBidXR0b246IGJ1dHRvbixcbiAgICBoZXJlOiBoZXJlLFxuICAgIGFmdGVyOiBhZnRlcixcbiAgICBvbjogb24sXG4gICAgYnI6IGJyLFxuLy8gICAgZGVhbFdpdGhJdDogZGVhbFdpdGhJdCxcbi8vICAgIGNhbGxTdGFjazogY2FsbFN0YWNrLFxuLy8gICAgbWVtbzogbWVtbyxcbi8vICAgIG5hbWVkOiBuYW1lZCxcbiAgICBpbnN0YWxsOiBpbnN0YWxsXG59O1xuXG5hZGRCbG9ja0VsZW1lbnRzKGxpYmltZ3VpKTtcbmFkZElubGluZUVsZW1lbnRzKGxpYmltZ3VpKTtcbmFkZElucHV0RWxlbWVudHMobGliaW1ndWkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGxpYmltZ3VpO1xuXG4iLCIvKlxuICogandlcnR5IC0gQXdlc29tZSBoYW5kbGluZyBvZiBrZXlib2FyZCBldmVudHNcbiAqXG4gKiBqd2VydHkgaXMgYSBKUyBsaWIgd2hpY2ggYWxsb3dzIHlvdSB0byBiaW5kLCBmaXJlIGFuZCBhc3NlcnQga2V5IGNvbWJpbmF0aW9uXG4gKiBzdHJpbmdzIGFnYWluc3QgZWxlbWVudHMgYW5kIGV2ZW50cy4gSXQgbm9ybWFsaXNlcyB0aGUgcG9vciBzdGQgYXBpIGludG9cbiAqIHNvbWV0aGluZyBlYXN5IHRvIHVzZSBhbmQgY2xlYXIuXG4gKlxuICogVGhpcyBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBNSVRcbiAqIEZvciB0aGUgZnVsbCBsaWNlbnNlIHNlZTogaHR0cDovL2tlaXRoYW11cy5taXQtbGljZW5zZS5vcmcvXG4gKiBGb3IgbW9yZSBpbmZvcm1hdGlvbiBzZWU6IGh0dHA6Ly9rZWl0aGFtdXMuZ2l0aHViLmNvbS9qd2VydHlcbiAqXG4gKiBAYXV0aG9yIEtlaXRoIENpcmtlbCAoJ2tlaXRoYW11cycpIDxqd2VydHlAa2VpdGhjaXJrZWwuY28udWs+XG4gKiBAbGljZW5zZSBodHRwOi8va2VpdGhhbXVzLm1pdC1saWNlbnNlLm9yZy9cbiAqIEBjb3B5cmlnaHQgQ29weXJpZ2h0IMKpIDIwMTEsIEtlaXRoIENpcmtlbFxuICpcbiAqL1xuKGZ1bmN0aW9uIChnbG9iYWwsIGV4cG9ydHMpIHtcbiAgICBcbiAgICAvLyBIZWxwZXIgbWV0aG9kcyAmIHZhcnM6XG4gICAgdmFyICRkID0gZ2xvYmFsLmRvY3VtZW50XG4gICAgLCAgICQgPSAoZ2xvYmFsLmpRdWVyeSB8fCBnbG9iYWwuWmVwdG8gfHwgZ2xvYmFsLmVuZGVyIHx8ICRkKVxuICAgICwgICAkJFxuICAgICwgICAkYlxuICAgICwgICBrZSA9ICdrZXlkb3duJztcbiAgICBcbiAgICBmdW5jdGlvbiByZWFsVHlwZU9mKHYsIHMpIHtcbiAgICAgICAgcmV0dXJuICh2ID09PSBudWxsKSA/IHMgPT09ICdudWxsJ1xuICAgICAgICA6ICh2ID09PSB1bmRlZmluZWQpID8gcyA9PT0gJ3VuZGVmaW5lZCdcbiAgICAgICAgOiAodi5pcyAmJiB2IGluc3RhbmNlb2YgJCkgPyBzID09PSAnZWxlbWVudCdcbiAgICAgICAgOiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodikudG9Mb3dlckNhc2UoKS5pbmRleE9mKHMpID4gNztcbiAgICB9XG4gICAgXG4gICAgaWYgKCQgPT09ICRkKSB7XG4gICAgICAgICQkID0gZnVuY3Rpb24gKHNlbGVjdG9yLCBjb250ZXh0KSB7XG4gICAgICAgICAgICByZXR1cm4gc2VsZWN0b3IgPyAkLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IsIGNvbnRleHQgfHwgJCkgOiAkO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgJGIgPSBmdW5jdGlvbiAoZSwgZm4pIHsgZS5hZGRFdmVudExpc3RlbmVyKGtlLCBmbiwgZmFsc2UpOyB9O1xuICAgICAgICAkZiA9IGZ1bmN0aW9uIChlLCBqd2VydHlFdikge1xuICAgICAgICAgICAgdmFyIHJldCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpXG4gICAgICAgICAgICAsICAgaTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0LmluaXRFdmVudChrZSwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZvciAoaSBpbiBqd2VydHlFdikgcmV0W2ldID0gandlcnR5RXZbaV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiAoZSB8fCAkKS5kaXNwYXRjaEV2ZW50KHJldCk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICAkJCA9IGZ1bmN0aW9uIChzZWxlY3RvciwgY29udGV4dCwgZm4pIHsgcmV0dXJuICQoc2VsZWN0b3IgfHwgJGQsIGNvbnRleHQpOyB9O1xuICAgICAgICAkYiA9IGZ1bmN0aW9uIChlLCBmbikgeyAkKGUpLmJpbmQoa2UgKyAnLmp3ZXJ0eScsIGZuKTsgfTtcbiAgICAgICAgJGYgPSBmdW5jdGlvbiAoZSwgb2IpIHsgJChlIHx8ICRkKS50cmlnZ2VyKCQuRXZlbnQoa2UsIG9iKSk7IH07XG4gICAgfVxuICAgIFxuICAgIC8vIFByaXZhdGVcbiAgICB2YXIgX21vZFByb3BzID0geyAxNjogJ3NoaWZ0S2V5JywgMTc6ICdjdHJsS2V5JywgMTg6ICdhbHRLZXknLCA5MTogJ21ldGFLZXknIH07XG4gICAgXG4gICAgLy8gR2VuZXJhdGUga2V5IG1hcHBpbmdzIGZvciBjb21tb24ga2V5cyB0aGF0IGFyZSBub3QgcHJpbnRhYmxlLlxuICAgIHZhciBfa2V5cyA9IHtcbiAgICAgICAgXG4gICAgICAgIC8vIE1PRCBha2EgdG9nZ2xlYWJsZSBrZXlzXG4gICAgICAgIG1vZHM6IHtcbiAgICAgICAgICAgIC8vIFNoaWZ0IGtleSwg4oenXG4gICAgICAgICAgICAn4oenJzogMTYsIHNoaWZ0OiAxNixcbiAgICAgICAgICAgIC8vIENUUkwga2V5LCBvbiBNYWM6IOKMg1xuICAgICAgICAgICAgJ+KMgyc6IDE3LCBjdHJsOiAxNyxcbiAgICAgICAgICAgIC8vIEFMVCBrZXksIG9uIE1hYzog4oylIChBbHQpXG4gICAgICAgICAgICAn4oylJzogMTgsIGFsdDogMTgsIG9wdGlvbjogMTgsXG4gICAgICAgICAgICAvLyBNRVRBLCBvbiBNYWM6IOKMmCAoQ01EKSwgb24gV2luZG93cyAoV2luKSwgb24gTGludXggKFN1cGVyKVxuICAgICAgICAgICAgJ+KMmCc6IDkxLCBtZXRhOiA5MSwgY21kOiA5MSwgJ3N1cGVyJzogOTEsIHdpbjogOTFcbiAgICAgICAgfSxcbiAgICAgICAgXG4gICAgICAgIC8vIE5vcm1hbCBrZXlzXG4gICAgICAgIGtleXM6IHtcbiAgICAgICAgICAgIC8vIEJhY2tzcGFjZSBrZXksIG9uIE1hYzog4oyrIChCYWNrc3BhY2UpXG4gICAgICAgICAgICAn4oyrJzogOCwgYmFja3NwYWNlOiA4LFxuICAgICAgICAgICAgLy8gVGFiIEtleSwgb24gTWFjOiDih6UgKFRhYiksIG9uIFdpbmRvd3Mg4oel4oelXG4gICAgICAgICAgICAn4oelJzogOSwgJ+KHhic6IDksIHRhYjogOSxcbiAgICAgICAgICAgIC8vIFJldHVybiBrZXksIOKGqVxuICAgICAgICAgICAgJ+KGqSc6IDEzLCAncmV0dXJuJzogMTMsIGVudGVyOiAxMywgJ+KMhSc6IDEzLFxuICAgICAgICAgICAgLy8gUGF1c2UvQnJlYWsga2V5XG4gICAgICAgICAgICAncGF1c2UnOiAxOSwgJ3BhdXNlLWJyZWFrJzogMTksXG4gICAgICAgICAgICAvLyBDYXBzIExvY2sga2V5LCDih6pcbiAgICAgICAgICAgICfih6onOiAyMCwgY2FwczogMjAsICdjYXBzLWxvY2snOiAyMCxcbiAgICAgICAgICAgIC8vIEVzY2FwZSBrZXksIG9uIE1hYzog4o6LLCBvbiBXaW5kb3dzOiBFc2NcbiAgICAgICAgICAgICfijosnOiAyNywgZXNjYXBlOiAyNywgZXNjOiAyNyxcbiAgICAgICAgICAgIC8vIFNwYWNlIGtleVxuICAgICAgICAgICAgc3BhY2U6IDMyLFxuICAgICAgICAgICAgLy8gUGFnZS1VcCBrZXksIG9yIHBndXAsIG9uIE1hYzog4oaWXG4gICAgICAgICAgICAn4oaWJzogMzMsIHBndXA6IDMzLCAncGFnZS11cCc6IDMzLFxuICAgICAgICAgICAgLy8gUGFnZS1Eb3duIGtleSwgb3IgcGdkb3duLCBvbiBNYWM6IOKGmFxuICAgICAgICAgICAgJ+KGmCc6IDM0LCBwZ2Rvd246IDM0LCAncGFnZS1kb3duJzogMzQsXG4gICAgICAgICAgICAvLyBFTkQga2V5LCBvbiBNYWM6IOKHn1xuICAgICAgICAgICAgJ+KHnyc6IDM1LCBlbmQ6IDM1LFxuICAgICAgICAgICAgLy8gSE9NRSBrZXksIG9uIE1hYzog4oeeXG4gICAgICAgICAgICAn4oeeJzogMzYsIGhvbWU6IDM2LFxuICAgICAgICAgICAgLy8gSW5zZXJ0IGtleSwgb3IgaW5zXG4gICAgICAgICAgICBpbnM6IDQ1LCBpbnNlcnQ6IDQ1LFxuICAgICAgICAgICAgLy8gRGVsZXRlIGtleSwgb24gTWFjOiDijKsgKERlbGV0ZSlcbiAgICAgICAgICAgIGRlbDogNDYsICdkZWxldGUnOiA0NixcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTGVmdCBBcnJvdyBLZXksIG9yIOKGkFxuICAgICAgICAgICAgJ+KGkCc6IDM3LCBsZWZ0OiAzNywgJ2Fycm93LWxlZnQnOiAzNyxcbiAgICAgICAgICAgIC8vIFVwIEFycm93IEtleSwgb3Ig4oaRXG4gICAgICAgICAgICAn4oaRJzogMzgsIHVwOiAzOCwgJ2Fycm93LXVwJzogMzgsXG4gICAgICAgICAgICAvLyBSaWdodCBBcnJvdyBLZXksIG9yIOKGklxuICAgICAgICAgICAgJ+KGkic6IDM5LCByaWdodDogMzksICdhcnJvdy1yaWdodCc6IDM5LFxuICAgICAgICAgICAgLy8gVXAgQXJyb3cgS2V5LCBvciDihpNcbiAgICAgICAgICAgICfihpMnOiA0MCwgZG93bjogNDAsICdhcnJvdy1kb3duJzogNDAsXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIG9kaXRpZXMsIHByaW50aW5nIGNoYXJhY3RlcnMgdGhhdCBjb21lIG91dCB3cm9uZzpcbiAgICAgICAgICAgIC8vIE51bS1NdWx0aXBseSwgb3IgKlxuICAgICAgICAgICAgJyonOiAxMDYsIHN0YXI6IDEwNiwgYXN0ZXJpc2s6IDEwNiwgbXVsdGlwbHk6IDEwNixcbiAgICAgICAgICAgIC8vIE51bS1QbHVzIG9yICtcbiAgICAgICAgICAgICcrJzogMTA3LCAncGx1cyc6IDEwNyxcbiAgICAgICAgICAgIC8vIE51bS1TdWJ0cmFjdCwgb3IgLVxuICAgICAgICAgICAgJy0nOiAxMDksIHN1YnRyYWN0OiAxMDksXG4gICAgICAgICAgICAvLyBTZW1pY29sb25cbiAgICAgICAgICAgICc7JzogMTg2LCBzZW1pY29sb246MTg2LFxuICAgICAgICAgICAgLy8gPSBvciBlcXVhbHNcbiAgICAgICAgICAgICc9JzogMTg3LCAnZXF1YWxzJzogMTg3LFxuICAgICAgICAgICAgLy8gQ29tbWEsIG9yICxcbiAgICAgICAgICAgICcsJzogMTg4LCBjb21tYTogMTg4LFxuICAgICAgICAgICAgLy8nLSc6IDE4OSwgLy8/Pz9cbiAgICAgICAgICAgIC8vIFBlcmlvZCwgb3IgLiwgb3IgZnVsbC1zdG9wXG4gICAgICAgICAgICAnLic6IDE5MCwgcGVyaW9kOiAxOTAsICdmdWxsLXN0b3AnOiAxOTAsXG4gICAgICAgICAgICAvLyBTbGFzaCwgb3IgLywgb3IgZm9yd2FyZC1zbGFzaFxuICAgICAgICAgICAgJy8nOiAxOTEsIHNsYXNoOiAxOTEsICdmb3J3YXJkLXNsYXNoJzogMTkxLFxuICAgICAgICAgICAgLy8gVGljaywgb3IgYCwgb3IgYmFjay1xdW90ZSBcbiAgICAgICAgICAgICdgJzogMTkyLCB0aWNrOiAxOTIsICdiYWNrLXF1b3RlJzogMTkyLFxuICAgICAgICAgICAgLy8gT3BlbiBicmFja2V0LCBvciBbXG4gICAgICAgICAgICAnWyc6IDIxOSwgJ29wZW4tYnJhY2tldCc6IDIxOSxcbiAgICAgICAgICAgIC8vIEJhY2sgc2xhc2gsIG9yIFxcXG4gICAgICAgICAgICAnXFxcXCc6IDIyMCwgJ2JhY2stc2xhc2gnOiAyMjAsXG4gICAgICAgICAgICAvLyBDbG9zZSBiYWNrZXQsIG9yIF1cbiAgICAgICAgICAgICddJzogMjIxLCAnY2xvc2UtYnJhY2tldCc6IDIyMSxcbiAgICAgICAgICAgIC8vIEFwb3N0cmFwaGUsIG9yIFF1b3RlLCBvciAnXG4gICAgICAgICAgICAnXFwnJzogMjIyLCBxdW90ZTogMjIyLCBhcG9zdHJhcGhlOiAyMjJcbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9O1xuICAgIFxuICAgIC8vIFRvIG1pbmltaXNlIGNvZGUgYmxvYXQsIGFkZCBhbGwgb2YgdGhlIE5VTVBBRCAwLTkga2V5cyBpbiBhIGxvb3BcbiAgICBpID0gOTUsIG4gPSAwO1xuICAgIHdoaWxlKCsraSA8IDEwNikge1xuICAgICAgICBfa2V5cy5rZXlzWydudW0tJyArIG5dID0gaTtcbiAgICAgICAgKytuO1xuICAgIH1cbiAgICBcbiAgICAvLyBUbyBtaW5pbWlzZSBjb2RlIGJsb2F0LCBhZGQgYWxsIG9mIHRoZSB0b3Agcm93IDAtOSBrZXlzIGluIGEgbG9vcFxuICAgIGkgPSA0NywgbiA9IDA7XG4gICAgd2hpbGUoKytpIDwgNTgpIHtcbiAgICAgICAgX2tleXMua2V5c1tuXSA9IGk7XG4gICAgICAgICsrbjtcbiAgICB9XG4gICAgXG4gICAgLy8gVG8gbWluaW1pc2UgY29kZSBibG9hdCwgYWRkIGFsbCBvZiB0aGUgRjEtRjI1IGtleXMgaW4gYSBsb29wXG4gICAgaSA9IDExMSwgbiA9IDE7XG4gICAgd2hpbGUoKytpIDwgMTM2KSB7XG4gICAgICAgIF9rZXlzLmtleXNbJ2YnICsgbl0gPSBpO1xuICAgICAgICArK247XG4gICAgfVxuICAgIFxuICAgIC8vIFRvIG1pbmltaXNlIGNvZGUgYmxvYXQsIGFkZCBhbGwgb2YgdGhlIGxldHRlcnMgb2YgdGhlIGFscGhhYmV0IGluIGEgbG9vcFxuICAgIHZhciBpID0gNjQ7XG4gICAgd2hpbGUoKytpIDwgOTEpIHtcbiAgICAgICAgX2tleXMua2V5c1tTdHJpbmcuZnJvbUNoYXJDb2RlKGkpLnRvTG93ZXJDYXNlKCldID0gaTtcbiAgICB9XG4gICAgXG4gICAgZnVuY3Rpb24gSndlcnR5Q29kZShqd2VydHlDb2RlKSB7XG4gICAgICAgIHZhciBpXG4gICAgICAgICwgICBjXG4gICAgICAgICwgICBuXG4gICAgICAgICwgICB6XG4gICAgICAgICwgICBrZXlDb21ib1xuICAgICAgICAsICAgb3B0aW9uYWxzXG4gICAgICAgICwgICBqd2VydHlDb2RlRnJhZ21lbnRcbiAgICAgICAgLCAgIHJhbmdlTWF0Y2hlc1xuICAgICAgICAsICAgcmFuZ2VJO1xuICAgICAgICBcbiAgICAgICAgLy8gSW4tY2FzZSB3ZSBnZXQgY2FsbGVkIHdpdGggYW4gaW5zdGFuY2Ugb2Ygb3Vyc2VsdmVzLCBqdXN0IHJldHVybiB0aGF0LlxuICAgICAgICBpZiAoandlcnR5Q29kZSBpbnN0YW5jZW9mIEp3ZXJ0eUNvZGUpIHJldHVybiBqd2VydHlDb2RlO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgandlcnR5Q29kZSBpc24ndCBhbiBhcnJheSwgY2FzdCBpdCBhcyBhIHN0cmluZyBhbmQgc3BsaXQgaW50byBhcnJheS5cbiAgICAgICAgaWYgKCFyZWFsVHlwZU9mKGp3ZXJ0eUNvZGUsICdhcnJheScpKSB7XG4gICAgICAgICAgICBqd2VydHlDb2RlID0gKFN0cmluZyhqd2VydHlDb2RlKSkucmVwbGFjZSgvXFxzL2csICcnKS50b0xvd2VyQ2FzZSgpLlxuICAgICAgICAgICAgICAgIG1hdGNoKC8oPzpcXCssfFteLF0pKy9nKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTG9vcCB0aHJvdWdoIGVhY2gga2V5IHNlcXVlbmNlIGluIGp3ZXJ0eUNvZGVcbiAgICAgICAgZm9yIChpID0gMCwgYyA9IGp3ZXJ0eUNvZGUubGVuZ3RoOyBpIDwgYzsgKytpKSB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIElmIHRoZSBrZXkgY29tYm8gYXQgdGhpcyBwYXJ0IG9mIHRoZSBzZXF1ZW5jZSBpc24ndCBhbiBhcnJheSxcbiAgICAgICAgICAgIC8vIGNhc3QgYXMgYSBzdHJpbmcgYW5kIHNwbGl0IGludG8gYW4gYXJyYXkuXG4gICAgICAgICAgICBpZiAoIXJlYWxUeXBlT2YoandlcnR5Q29kZVtpXSwgJ2FycmF5JykpIHtcbiAgICAgICAgICAgICAgICBqd2VydHlDb2RlW2ldID0gU3RyaW5nKGp3ZXJ0eUNvZGVbaV0pXG4gICAgICAgICAgICAgICAgICAgIC5tYXRjaCgvKD86XFwrXFwvfFteXFwvXSkrL2cpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQYXJzZSB0aGUga2V5IG9wdGlvbmFscyBpbiB0aGlzIHNlcXVlbmNlXG4gICAgICAgICAgICBvcHRpb25hbHMgPSBbXSwgbiA9IGp3ZXJ0eUNvZGVbaV0ubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUgKG4tLSkge1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEJlZ2luIGNyZWF0aW5nIHRoZSBvYmplY3QgZm9yIHRoaXMga2V5IGNvbWJvXG4gICAgICAgICAgICAgICAgdmFyIGp3ZXJ0eUNvZGVGcmFnbWVudCA9IGp3ZXJ0eUNvZGVbaV1bbl07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAga2V5Q29tYm8gPSB7XG4gICAgICAgICAgICAgICAgICAgIGp3ZXJ0eUNvbWJvOiBTdHJpbmcoandlcnR5Q29kZUZyYWdtZW50KSxcbiAgICAgICAgICAgICAgICAgICAgc2hpZnRLZXk6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjdHJsS2V5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgYWx0S2V5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgbWV0YUtleTogZmFsc2VcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSWYgandlcnR5Q29kZUZyYWdtZW50IGlzbid0IGFuIGFycmF5IHRoZW4gY2FzdCBhcyBhIHN0cmluZ1xuICAgICAgICAgICAgICAgIC8vIGFuZCBzcGxpdCBpdCBpbnRvIG9uZS5cbiAgICAgICAgICAgICAgICBpZiAoIXJlYWxUeXBlT2YoandlcnR5Q29kZUZyYWdtZW50LCAnYXJyYXknKSkge1xuICAgICAgICAgICAgICAgICAgICBqd2VydHlDb2RlRnJhZ21lbnQgPSBTdHJpbmcoandlcnR5Q29kZUZyYWdtZW50KS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAubWF0Y2goLyg/Oig/OlteXFwrXSkrfFxcK1xcK3xeXFwrJCkvZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHogPSBqd2VydHlDb2RlRnJhZ21lbnQubGVuZ3RoO1xuICAgICAgICAgICAgICAgIHdoaWxlICh6LS0pIHtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIE5vcm1hbGlzZSBtYXRjaGluZyBlcnJvcnNcbiAgICAgICAgICAgICAgICAgICAgaWYgKGp3ZXJ0eUNvZGVGcmFnbWVudFt6XSA9PT0gJysrJykgandlcnR5Q29kZUZyYWdtZW50W3pdID0gJysnO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5qZWN0IGVpdGhlciBrZXlDb2RlIG9yIGN0cmwvbWV0YS9zaGlmdC9hbHRLZXkgaW50byBrZXlDb21ib1xuICAgICAgICAgICAgICAgICAgICBpZiAoandlcnR5Q29kZUZyYWdtZW50W3pdIGluIF9rZXlzLm1vZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleUNvbWJvW19tb2RQcm9wc1tfa2V5cy5tb2RzW2p3ZXJ0eUNvZGVGcmFnbWVudFt6XV1dXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZihqd2VydHlDb2RlRnJhZ21lbnRbel0gaW4gX2tleXMua2V5cykge1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5Q29tYm8ua2V5Q29kZSA9IF9rZXlzLmtleXNbandlcnR5Q29kZUZyYWdtZW50W3pdXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlTWF0Y2hlcyA9IGp3ZXJ0eUNvZGVGcmFnbWVudFt6XS5tYXRjaCgvXlxcWyhbXi1dK1xcLT9bXi1dKiktKFteLV0rXFwtP1teLV0qKVxcXSQvKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmVhbFR5cGVPZihrZXlDb21iby5rZXlDb2RlLCAndW5kZWZpbmVkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgd2UgcGlja2VkIHVwIGEgcmFuZ2UgbWF0Y2ggZWFybGllci4uLlxuICAgICAgICAgICAgICAgICAgICBpZiAocmFuZ2VNYXRjaGVzICYmIChyYW5nZU1hdGNoZXNbMV0gaW4gX2tleXMua2V5cykgJiYgKHJhbmdlTWF0Y2hlc1syXSBpbiBfa2V5cy5rZXlzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2VNYXRjaGVzWzJdID0gX2tleXMua2V5c1tyYW5nZU1hdGNoZXNbMl1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2VNYXRjaGVzWzFdID0gX2tleXMua2V5c1tyYW5nZU1hdGNoZXNbMV1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBHbyBmcm9tIG1hdGNoIDEgYW5kIGNhcHR1cmUgYWxsIGtleS1jb21vYnMgdXAgdG8gbWF0Y2ggMlxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChyYW5nZUkgPSByYW5nZU1hdGNoZXNbMV07IHJhbmdlSSA8IHJhbmdlTWF0Y2hlc1syXTsgKytyYW5nZUkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25hbHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsdEtleToga2V5Q29tYm8uYWx0S2V5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaGlmdEtleToga2V5Q29tYm8uc2hpZnRLZXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGFLZXk6IGtleUNvbWJvLm1ldGFLZXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN0cmxLZXk6IGtleUNvbWJvLmN0cmxLZXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleUNvZGU6IHJhbmdlSSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgandlcnR5Q29tYm86IFN0cmluZyhqd2VydHlDb2RlRnJhZ21lbnQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlDb21iby5rZXlDb2RlID0gcmFuZ2VJO1xuICAgICAgICAgICAgICAgICAgICAvLyBJbmplY3QgZWl0aGVyIGtleUNvZGUgb3IgY3RybC9tZXRhL3NoaWZ0L2FsdEtleSBpbnRvIGtleUNvbWJvXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlDb21iby5rZXlDb2RlID0gMDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvcHRpb25hbHMucHVzaChrZXlDb21ibyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXNbaV0gPSBvcHRpb25hbHM7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sZW5ndGggPSBpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgXG4gICAgdmFyIGp3ZXJ0eSA9IGV4cG9ydHMuandlcnR5ID0geyAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBqd2VydHkuZXZlbnRcbiAgICAgICAgICpcbiAgICAgICAgICogYGp3ZXJ0eS5ldmVudGAgd2lsbCByZXR1cm4gYSBmdW5jdGlvbiwgd2hpY2ggZXhwZWN0cyB0aGUgZmlyc3RcbiAgICAgICAgICogIGFyZ3VtZW50IHRvIGJlIGEga2V5IGV2ZW50LiBXaGVuIHRoZSBrZXkgZXZlbnQgbWF0Y2hlcyBgandlcnR5Q29kZWAsXG4gICAgICAgICAqICBgY2FsbGJhY2tGdW5jdGlvbmAgaXMgZmlyZWQuIGBqd2VydHkuZXZlbnRgIGlzIHVzZWQgYnkgYGp3ZXJ0eS5rZXlgXG4gICAgICAgICAqICB0byBiaW5kIHRoZSBmdW5jdGlvbiBpdCByZXR1cm5zLiBgandlcnR5LmV2ZW50YCBpcyB1c2VmdWwgZm9yXG4gICAgICAgICAqICBhdHRhY2hpbmcgdG8geW91ciBvd24gZXZlbnQgbGlzdGVuZXJzLiBJdCBjYW4gYmUgdXNlZCBhcyBhIGRlY29yYXRvclxuICAgICAgICAgKiAgbWV0aG9kIHRvIGVuY2Fwc3VsYXRlIGZ1bmN0aW9uYWxpdHkgdGhhdCB5b3Ugb25seSB3YW50IHRvIGZpcmUgYWZ0ZXJcbiAgICAgICAgICogIGEgc3BlY2lmaWMga2V5IGNvbWJvLiBJZiBgY2FsbGJhY2tDb250ZXh0YCBpcyBzcGVjaWZpZWQgdGhlbiBpdCB3aWxsXG4gICAgICAgICAqICBiZSBzdXBwbGllZCBhcyBgY2FsbGJhY2tGdW5jdGlvbmAncyBjb250ZXh0IC0gaW4gb3RoZXIgd29yZHMsIHRoZVxuICAgICAgICAgKiAga2V5d29yZCBgdGhpc2Agd2lsbCBiZSBzZXQgdG8gYGNhbGxiYWNrQ29udGV4dGAgaW5zaWRlIHRoZVxuICAgICAgICAgKiAgYGNhbGxiYWNrRnVuY3Rpb25gIGZ1bmN0aW9uLlxuICAgICAgICAgKlxuICAgICAgICAgKiAgIEBwYXJhbSB7TWl4ZWR9IGp3ZXJ0eUNvZGUgY2FuIGJlIGFuIGFycmF5LCBvciBzdHJpbmcgb2Yga2V5XG4gICAgICAgICAqICAgICAgY29tYmluYXRpb25zLCB3aGljaCBpbmNsdWRlcyBvcHRpbmFscyBhbmQgb3Igc2VxdWVuY2VzXG4gICAgICAgICAqICAgQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tGdWNudGlvbiBpcyBhIGZ1bmN0aW9uIChvciBib29sZWFuKSB3aGljaFxuICAgICAgICAgKiAgICAgIGlzIGZpcmVkIHdoZW4gandlcnR5Q29kZSBpcyBtYXRjaGVkLiBSZXR1cm4gZmFsc2UgdG9cbiAgICAgICAgICogICAgICBwcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAqICAgQHBhcmFtIHtPYmplY3R9IGNhbGxiYWNrQ29udGV4dCAoT3B0aW9uYWwpIFRoZSBjb250ZXh0IHRvIGNhbGxcbiAgICAgICAgICogICAgICBgY2FsbGJhY2tgIHdpdGggKGkuZSB0aGlzKVxuICAgICAgICAgKiAgICAgIFxuICAgICAgICAgKi9cbiAgICAgICAgZXZlbnQ6IGZ1bmN0aW9uIChqd2VydHlDb2RlLCBjYWxsYmFja0Z1bmN0aW9uLCBjYWxsYmFja0NvbnRleHQgLyo/IHRoaXMgKi8pIHtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ29uc3RydWN0IGEgZnVuY3Rpb24gb3V0IG9mIGNhbGxiYWNrRnVuY3Rpb24sIGlmIGl0IGlzIGEgYm9vbGVhbi5cbiAgICAgICAgICAgIGlmIChyZWFsVHlwZU9mKGNhbGxiYWNrRnVuY3Rpb24sICdib29sZWFuJykpIHtcbiAgICAgICAgICAgICAgICB2YXIgYm9vbCA9IGNhbGxiYWNrRnVuY3Rpb247XG4gICAgICAgICAgICAgICAgY2FsbGJhY2tGdW5jdGlvbiA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGJvb2w7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgandlcnR5Q29kZSA9IG5ldyBKd2VydHlDb2RlKGp3ZXJ0eUNvZGUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXNlIGluLXNjb3BlIHZhcnMuXG4gICAgICAgICAgICB2YXIgaSA9IDBcbiAgICAgICAgICAgICwgICBjID0gandlcnR5Q29kZS5sZW5ndGggLSAxXG4gICAgICAgICAgICAsICAgcmV0dXJuVmFsdWVcbiAgICAgICAgICAgICwgICBqd2VydHlDb2RlSXM7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRoaXMgaXMgdGhlIGV2ZW50IGxpc3RlbmVyIGZ1bmN0aW9uIHRoYXQgZ2V0cyByZXR1cm5lZC4uLlxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIGlmIGp3ZXJ0eUNvZGVJcyByZXR1cm5zIHRydXRoeSAoc3RyaW5nKS4uLlxuICAgICAgICAgICAgICAgIGlmICgoandlcnR5Q29kZUlzID0gandlcnR5LmlzKGp3ZXJ0eUNvZGUsIGV2ZW50LCBpKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gLi4uIGFuZCB0aGlzIGlzbid0IHRoZSBsYXN0IGtleSBpbiB0aGUgc2VxdWVuY2UsXG4gICAgICAgICAgICAgICAgICAgIC8vIGluY3JpbWVudCB0aGUga2V5IGluIHNlcXVlbmNlIHRvIGNoZWNrLlxuICAgICAgICAgICAgICAgICAgICBpZiAoaSA8IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICsraTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgLy8gLi4uIGFuZCB0aGlzIGlzIHRoZSBsYXN0IGluIHRoZSBzZXF1ZW5jZSAob3IgdGhlIG9ubHlcbiAgICAgICAgICAgICAgICAgICAgLy8gb25lIGluIHNlcXVlbmNlKSwgdGhlbiBmaXJlIHRoZSBjYWxsYmFja1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSBjYWxsYmFja0Z1bmN0aW9uLmNhbGwoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tDb250ZXh0IHx8IHRoaXMsIGV2ZW50LCBqd2VydHlDb2RlSXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgY2FsbGJhY2sgcmV0dXJuZWQgZmFsc2UsIHRoZW4gd2Ugc2hvdWxkIHJ1blxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXR1cm5WYWx1ZSA9PT0gZmFsc2UpIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlc2V0IGkgZm9yIHRoZSBuZXh0IHNlcXVlbmNlIHRvIGZpcmUuXG4gICAgICAgICAgICAgICAgICAgICAgICBpID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgZXZlbnQgZGlkbid0IGhpdCB0aGlzIHRpbWUsIHdlIHNob3VsZCByZXNldCBpIHRvIDAsXG4gICAgICAgICAgICAgICAgLy8gdGhhdCBpcywgdW5sZXNzIHRoaXMgY29tYm8gd2FzIHRoZSBmaXJzdCBpbiB0aGUgc2VxdWVuY2UsXG4gICAgICAgICAgICAgICAgLy8gaW4gd2hpY2ggY2FzZSB3ZSBzaG91bGQgcmVzZXQgaSB0byAxLlxuICAgICAgICAgICAgICAgIGkgPSBqd2VydHkuaXMoandlcnR5Q29kZSwgZXZlbnQpID8gMSA6IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogandlcnR5LmlzXG4gICAgICAgICAqXG4gICAgICAgICAqIGBqd2VydHkuaXNgIHdpbGwgcmV0dXJuIGEgYm9vbGVhbiB2YWx1ZSwgYmFzZWQgb24gaWYgYGV2ZW50YCBtYXRjaGVzXG4gICAgICAgICAqICBgandlcnR5Q29kZWAuIGBqd2VydHkuaXNgIGlzIGNhbGxlZCBieSBgandlcnR5LmV2ZW50YCB0byBjaGVja1xuICAgICAgICAgKiAgd2hldGhlciBvciBub3QgdG8gZmlyZSB0aGUgY2FsbGJhY2suIGBldmVudGAgY2FuIGJlIGEgRE9NIGV2ZW50LCBvclxuICAgICAgICAgKiAgYSBqUXVlcnkvWmVwdG8vRW5kZXIgbWFudWZhY3R1cmVkIGV2ZW50LiBUaGUgcHJvcGVydGllcyBvZlxuICAgICAgICAgKiAgYGp3ZXJ0eUNvZGVgIChzcGVmaWNpYWxseSBjdHJsS2V5LCBhbHRLZXksIG1ldGFLZXksIHNoaWZ0S2V5IGFuZFxuICAgICAgICAgKiAga2V5Q29kZSkgc2hvdWxkIG1hdGNoIGBqd2VydHlDb2RlYCdzIHByb3BlcnRpZXMgLSBpZiB0aGV5IGRvLCB0aGVuXG4gICAgICAgICAqICBgandlcnR5LmlzYCB3aWxsIHJldHVybiBgdHJ1ZWAuIElmIHRoZXkgZG9uJ3QsIGBqd2VydHkuaXNgIHdpbGxcbiAgICAgICAgICogIHJldHVybiBgZmFsc2VgLlxuICAgICAgICAgKlxuICAgICAgICAgKiAgIEBwYXJhbSB7TWl4ZWR9IGp3ZXJ0eUNvZGUgY2FuIGJlIGFuIGFycmF5LCBvciBzdHJpbmcgb2Yga2V5XG4gICAgICAgICAqICAgICAgY29tYmluYXRpb25zLCB3aGljaCBpbmNsdWRlcyBvcHRpbmFscyBhbmQgb3Igc2VxdWVuY2VzXG4gICAgICAgICAqICAgQHBhcmFtIHtLZXlib2FyZEV2ZW50fSBldmVudCBpcyB0aGUgS2V5Ym9hcmRFdmVudCB0byBhc3NlcnQgYWdhaW5zdFxuICAgICAgICAgKiAgIEBwYXJhbSB7SW50ZWdlcn0gaSAoT3B0aW9uYWwpIGNoZWNrcyB0aGUgYGlgIGtleSBpbiBqd2VydHlDb2RlXG4gICAgICAgICAqICAgICAgc2VxdWVuY2VcbiAgICAgICAgICogICAgICBcbiAgICAgICAgICovXG4gICAgICAgIGlzOiBmdW5jdGlvbiAoandlcnR5Q29kZSwgZXZlbnQsIGkgLyo/IDAqLykge1xuICAgICAgICAgICAgandlcnR5Q29kZSA9IG5ldyBKd2VydHlDb2RlKGp3ZXJ0eUNvZGUpO1xuICAgICAgICAgICAgLy8gRGVmYXVsdCBgaWAgdG8gMFxuICAgICAgICAgICAgaSA9IGkgfHwgMDtcbiAgICAgICAgICAgIC8vIFdlIGFyZSBvbmx5IGludGVyZXN0aW5nIGluIGBpYCBvZiBqd2VydHlDb2RlO1xuICAgICAgICAgICAgandlcnR5Q29kZSA9IGp3ZXJ0eUNvZGVbaV07XG4gICAgICAgICAgICAvLyBqUXVlcnkgc3RvcmVzIHRoZSAqcmVhbCogZXZlbnQgaW4gYG9yaWdpbmFsRXZlbnRgLCB3aGljaCB3ZSB1c2VcbiAgICAgICAgICAgIC8vIGJlY2F1c2UgaXQgZG9lcyBhbm5veXRoaW5nIHN0dWZmIHRvIGBtZXRhS2V5YFxuICAgICAgICAgICAgZXZlbnQgPSBldmVudC5vcmlnaW5hbEV2ZW50IHx8IGV2ZW50O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBXZSdsbCBsb29rIGF0IGVhY2ggb3B0aW9uYWwgaW4gdGhpcyBqd2VydHlDb2RlIHNlcXVlbmNlLi4uXG4gICAgICAgICAgICB2YXIga2V5XG4gICAgICAgICAgICAsICAgbiA9IGp3ZXJ0eUNvZGUubGVuZ3RoXG4gICAgICAgICAgICAsICAgcmV0dXJuVmFsdWUgPSBmYWxzZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTG9vcCB0aHJvdWdoIGVhY2ggZnJhZ21lbnQgb2YgandlcnR5Q29kZVxuICAgICAgICAgICAgd2hpbGUgKG4tLSkge1xuICAgICAgICAgICAgICAgIHJldHVyblZhbHVlID0gandlcnR5Q29kZVtuXS5qd2VydHlDb21ibztcbiAgICAgICAgICAgICAgICAvLyBGb3IgZWFjaCBwcm9wZXJ0eSBpbiB0aGUgandlcnR5Q29kZSBvYmplY3QsIGNvbXBhcmUgdG8gYGV2ZW50YFxuICAgICAgICAgICAgICAgIGZvciAodmFyIHAgaW4gandlcnR5Q29kZVtuXSkge1xuICAgICAgICAgICAgICAgICAgICAvLyAuLi5leGNlcHQgZm9yIGp3ZXJ0eUNvZGUuandlcnR5Q29tYm8uLi5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHAgIT09ICdqd2VydHlDb21ibycgJiYgZXZlbnRbcF0gIT0gandlcnR5Q29kZVtuXVtwXSkgcmV0dXJuVmFsdWUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhpcyBqd2VydHlDb2RlIG9wdGlvbmFsIHdhc24ndCBmYWxzZXksIHRoZW4gd2UgY2FuIHJldHVybiBlYXJseS5cbiAgICAgICAgICAgICAgICBpZiAocmV0dXJuVmFsdWUgIT09IGZhbHNlKSByZXR1cm4gcmV0dXJuVmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmV0dXJuVmFsdWU7XG4gICAgICAgIH0sXG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogandlcnR5LmtleVxuICAgICAgICAgKlxuICAgICAgICAgKiAgYGp3ZXJ0eS5rZXlgIHdpbGwgYXR0YWNoIGFuIGV2ZW50IGxpc3RlbmVyIGFuZCBmaXJlXG4gICAgICAgICAqICAgYGNhbGxiYWNrRnVuY3Rpb25gIHdoZW4gYGp3ZXJ0eUNvZGVgIG1hdGNoZXMuIFRoZSBldmVudCBsaXN0ZW5lciBpc1xuICAgICAgICAgKiAgIGF0dGFjaGVkIHRvIGBkb2N1bWVudGAsIG1lYW5pbmcgaXQgd2lsbCBsaXN0ZW4gZm9yIGFueSBrZXkgZXZlbnRzXG4gICAgICAgICAqICAgb24gdGhlIHBhZ2UgKGEgZ2xvYmFsIHNob3J0Y3V0IGxpc3RlbmVyKS4gSWYgYGNhbGxiYWNrQ29udGV4dGAgaXNcbiAgICAgICAgICogICBzcGVjaWZpZWQgdGhlbiBpdCB3aWxsIGJlIHN1cHBsaWVkIGFzIGBjYWxsYmFja0Z1bmN0aW9uYCdzIGNvbnRleHRcbiAgICAgICAgICogICAtIGluIG90aGVyIHdvcmRzLCB0aGUga2V5d29yZCBgdGhpc2Agd2lsbCBiZSBzZXQgdG9cbiAgICAgICAgICogICBgY2FsbGJhY2tDb250ZXh0YCBpbnNpZGUgdGhlIGBjYWxsYmFja0Z1bmN0aW9uYCBmdW5jdGlvbi5cbiAgICAgICAgICpcbiAgICAgICAgICogICBAcGFyYW0ge01peGVkfSBqd2VydHlDb2RlIGNhbiBiZSBhbiBhcnJheSwgb3Igc3RyaW5nIG9mIGtleVxuICAgICAgICAgKiAgICAgIGNvbWJpbmF0aW9ucywgd2hpY2ggaW5jbHVkZXMgb3B0aW5hbHMgYW5kIG9yIHNlcXVlbmNlc1xuICAgICAgICAgKiAgIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrRnVuY3Rpb24gaXMgYSBmdW5jdGlvbiAob3IgYm9vbGVhbikgd2hpY2hcbiAgICAgICAgICogICAgICBpcyBmaXJlZCB3aGVuIGp3ZXJ0eUNvZGUgaXMgbWF0Y2hlZC4gUmV0dXJuIGZhbHNlIHRvXG4gICAgICAgICAqICAgICAgcHJldmVudERlZmF1bHQoKVxuICAgICAgICAgKiAgIEBwYXJhbSB7T2JqZWN0fSBjYWxsYmFja0NvbnRleHQgKE9wdGlvbmFsKSBUaGUgY29udGV4dCB0byBjYWxsXG4gICAgICAgICAqICAgICAgYGNhbGxiYWNrYCB3aXRoIChpLmUgdGhpcylcbiAgICAgICAgICogICBAcGFyYW0ge01peGVkfSBzZWxlY3RvciBjYW4gYmUgYSBzdHJpbmcsIGpRdWVyeS9aZXB0by9FbmRlciBvYmplY3QsXG4gICAgICAgICAqICAgICAgb3IgYW4gSFRNTCpFbGVtZW50IG9uIHdoaWNoIHRvIGJpbmQgdGhlIGV2ZW50TGlzdGVuZXJcbiAgICAgICAgICogICBAcGFyYW0ge01peGVkfSBzZWxlY3RvckNvbnRleHQgY2FuIGJlIGEgc3RyaW5nLCBqUXVlcnkvWmVwdG8vRW5kZXJcbiAgICAgICAgICogICAgICBvYmplY3QsIG9yIGFuIEhUTUwqRWxlbWVudCBvbiB3aGljaCB0byBzY29wZSB0aGUgc2VsZWN0b3JcbiAgICAgICAgICogIFxuICAgICAgICAgKi9cbiAgICAgICAga2V5OiBmdW5jdGlvbiAoandlcnR5Q29kZSwgY2FsbGJhY2tGdW5jdGlvbiwgY2FsbGJhY2tDb250ZXh0IC8qPyB0aGlzICovLCBzZWxlY3RvciAvKj8gZG9jdW1lbnQgKi8sIHNlbGVjdG9yQ29udGV4dCAvKj8gYm9keSAqLykge1xuICAgICAgICAgICAgLy8gQmVjYXVzZSBjYWxsYmFja0NvbnRleHQgaXMgb3B0aW9uYWwsIHdlIHNob3VsZCBjaGVjayBpZiB0aGVcbiAgICAgICAgICAgIC8vIGBjYWxsYmFja0NvbnRleHRgIGlzIGEgc3RyaW5nIG9yIGVsZW1lbnQsIGFuZCBpZiBpdCBpcywgdGhlbiB0aGVcbiAgICAgICAgICAgIC8vIGZ1bmN0aW9uIHdhcyBjYWxsZWQgd2l0aG91dCBhIGNvbnRleHQsIGFuZCBgY2FsbGJhY2tDb250ZXh0YCBpc1xuICAgICAgICAgICAgLy8gYWN0dWFsbHkgYHNlbGVjdG9yYFxuICAgICAgICAgICAgdmFyIHJlYWxTZWxlY3RvciA9IHJlYWxUeXBlT2YoY2FsbGJhY2tDb250ZXh0LCAnZWxlbWVudCcpIHx8IHJlYWxUeXBlT2YoY2FsbGJhY2tDb250ZXh0LCAnc3RyaW5nJykgPyBjYWxsYmFja0NvbnRleHQgOiBzZWxlY3RvclxuICAgICAgICAgICAgLy8gSWYgYGNhbGxiYWNrQ29udGV4dGAgaXMgdW5kZWZpbmVkLCBvciBpZiB3ZSBza2lwcGVkIGl0IChhbmRcbiAgICAgICAgICAgIC8vIHRoZXJlZm9yZSBpdCBpcyBgcmVhbFNlbGVjdG9yYCksIHNldCBjb250ZXh0IHRvIGBnbG9iYWxgLlxuICAgICAgICAgICAgLCAgIHJlYWxjYWxsYmFja0NvbnRleHQgPSByZWFsU2VsZWN0b3IgPT09IGNhbGxiYWNrQ29udGV4dCA/IGdsb2JhbCA6IGNhbGxiYWNrQ29udGV4dFxuICAgICAgICAgICAgLy8gRmluYWxseSBpZiB3ZSBkaWQgc2tpcCBgY2FsbGJhY2tDb250ZXh0YCwgdGhlbiBzaGlmdFxuICAgICAgICAgICAgLy8gYHNlbGVjdG9yQ29udGV4dGAgdG8gdGhlIGxlZnQgKHRha2UgaXQgZnJvbSBgc2VsZWN0b3JgKVxuICAgICAgICAgICAgLCAgICByZWFsU2VsZWN0b3JDb250ZXh0ID0gcmVhbFNlbGVjdG9yID09PSBjYWxsYmFja0NvbnRleHQgPyBzZWxlY3RvciA6IHNlbGVjdG9yQ29udGV4dDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSWYgYHJlYWxTZWxlY3RvcmAgaXMgYWxyZWFkeSBhIGpRdWVyeS9aZXB0by9FbmRlci9ET00gZWxlbWVudCxcbiAgICAgICAgICAgIC8vIHRoZW4ganVzdCB1c2UgaXQgbmVhdCwgb3RoZXJ3aXNlIGZpbmQgaXQgaW4gRE9NIHVzaW5nICQkKClcbiAgICAgICAgICAgICRiKHJlYWxUeXBlT2YocmVhbFNlbGVjdG9yLCAnZWxlbWVudCcpID9cbiAgICAgICAgICAgICAgIHJlYWxTZWxlY3RvciA6ICQkKHJlYWxTZWxlY3RvciwgcmVhbFNlbGVjdG9yQ29udGV4dClcbiAgICAgICAgICAgICwgandlcnR5LmV2ZW50KGp3ZXJ0eUNvZGUsIGNhbGxiYWNrRnVuY3Rpb24sIHJlYWxjYWxsYmFja0NvbnRleHQpKTtcbiAgICAgICAgfSxcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBqd2VydHkuZmlyZVxuICAgICAgICAgKlxuICAgICAgICAgKiBgandlcnR5LmZpcmVgIHdpbGwgY29uc3RydWN0IGEga2V5dXAgZXZlbnQgdG8gZmlyZSwgYmFzZWQgb25cbiAgICAgICAgICogIGBqd2VydHlDb2RlYC4gVGhlIGV2ZW50IHdpbGwgYmUgZmlyZWQgYWdhaW5zdCBgc2VsZWN0b3JgLlxuICAgICAgICAgKiAgYHNlbGVjdG9yQ29udGV4dGAgaXMgdXNlZCB0byBzZWFyY2ggZm9yIGBzZWxlY3RvcmAgd2l0aGluXG4gICAgICAgICAqICBgc2VsZWN0b3JDb250ZXh0YCwgc2ltaWxhciB0byBqUXVlcnknc1xuICAgICAgICAgKiAgYCQoJ3NlbGVjdG9yJywgJ2NvbnRleHQnKWAuXG4gICAgICAgICAqXG4gICAgICAgICAqICAgQHBhcmFtIHtNaXhlZH0gandlcnR5Q29kZSBjYW4gYmUgYW4gYXJyYXksIG9yIHN0cmluZyBvZiBrZXlcbiAgICAgICAgICogICAgICBjb21iaW5hdGlvbnMsIHdoaWNoIGluY2x1ZGVzIG9wdGluYWxzIGFuZCBvciBzZXF1ZW5jZXNcbiAgICAgICAgICogICBAcGFyYW0ge01peGVkfSBzZWxlY3RvciBjYW4gYmUgYSBzdHJpbmcsIGpRdWVyeS9aZXB0by9FbmRlciBvYmplY3QsXG4gICAgICAgICAqICAgICAgb3IgYW4gSFRNTCpFbGVtZW50IG9uIHdoaWNoIHRvIGJpbmQgdGhlIGV2ZW50TGlzdGVuZXJcbiAgICAgICAgICogICBAcGFyYW0ge01peGVkfSBzZWxlY3RvckNvbnRleHQgY2FuIGJlIGEgc3RyaW5nLCBqUXVlcnkvWmVwdG8vRW5kZXJcbiAgICAgICAgICogICAgICBvYmplY3QsIG9yIGFuIEhUTUwqRWxlbWVudCBvbiB3aGljaCB0byBzY29wZSB0aGUgc2VsZWN0b3JcbiAgICAgICAgICogIFxuICAgICAgICAgKi9cbiAgICAgICAgZmlyZTogZnVuY3Rpb24gKGp3ZXJ0eUNvZGUsIHNlbGVjdG9yIC8qPyBkb2N1bWVudCAqLywgc2VsZWN0b3JDb250ZXh0IC8qPyBib2R5ICovLCBpKSB7XG4gICAgICAgICAgICBqd2VydHlDb2RlID0gbmV3IEp3ZXJ0eUNvZGUoandlcnR5Q29kZSk7XG4gICAgICAgICAgICB2YXIgcmVhbEkgPSByZWFsVHlwZU9mKHNlbGVjdG9yQ29udGV4dCwgJ251bWJlcicpID8gc2VsZWN0b3JDb250ZXh0IDogaTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSWYgYHJlYWxTZWxlY3RvcmAgaXMgYWxyZWFkeSBhIGpRdWVyeS9aZXB0by9FbmRlci9ET00gZWxlbWVudCxcbiAgICAgICAgICAgIC8vIHRoZW4ganVzdCB1c2UgaXQgbmVhdCwgb3RoZXJ3aXNlIGZpbmQgaXQgaW4gRE9NIHVzaW5nICQkKClcbiAgICAgICAgICAgICRmKHJlYWxUeXBlT2Yoc2VsZWN0b3IsICdlbGVtZW50JykgP1xuICAgICAgICAgICAgICAgIHNlbGVjdG9yIDogJCQoc2VsZWN0b3IsIHNlbGVjdG9yQ29udGV4dClcbiAgICAgICAgICAgICwgandlcnR5Q29kZVtyZWFsSSB8fCAwXVswXSk7XG4gICAgICAgIH0sXG4gICAgICAgIFxuICAgICAgICBLRVlTOiBfa2V5c1xuICAgIH07XG4gICAgXG59KHRoaXMsICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cyA/IG1vZHVsZS5leHBvcnRzIDogdGhpcykpKTsiXX0=
