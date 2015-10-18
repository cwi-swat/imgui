!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.app=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){


var TrimGUI = require('../libimgui');

var m = {
    t: 0
};

var ig = new TrimGUI(c2f, m, 'root');

function toF(c) {
    return Math.round(c * 9.0/5.0 + 32);
}

function toC(f) {
    return Math.round((parseFloat(f) - 32) * 5.0/9.0);
}

function c2f(m) {
    ig.text("C:")
    m.t = ig.textBox(m.t);

    ig.text("F:")
    m.t = toC(ig.textBox(toF(m.t)));
}
				 

module.exports = ig;

},{"../libimgui":2}],2:[function(require,module,exports){

'use strict';

/*
 * TODO:
 * - don't build vnode when handling event.
 * - make `here` more robust
 * - optimize use of ids in lists
 * - eliminate .class/#id parsing
 * - support key-based patching (attr `key`)
 */

class TrimGUI {
    constructor (app, model, root) {
	this.app = app;
	this.model = model
	this.root = root;
	this.event = null;
	this.focus = [];
	this.node = null;
	this.onMounts = {};
	this.timers = {};
	this.handlers = {};
	this.ids = 0;
	this.attributes = {};
	this.addSimpleElements();
	this.addInputElements();
    }

    run() {
	this.mount(this.renderOnce());
    }
    
    register(event, id) {
	// only add one handler to root, per event type.
	if (!this.handlers.hasOwnProperty(event)) {
	    this.handlers[event] = [];
	    var r = document.getElementById(this.root);
	    r.addEventListener(event, e => {
		e.stopPropagation(); // don't leak upwards
		var id = e.target.getAttribute('id');
		if (this.handlers[event].indexOf(id) > -1) {
		    this.event = e;
		    this.doRender();
		}
	    }, false);
	}
	this.handlers[event].push(id);
    }

    reset() {
	for (var k in this.handlers) {
	    if (this.handlers.hasOwnProperty(k)) {
		this.handlers[k] = [];
	    }
	}
	this.onMounts = {};
	this.focus = [];
	this.ids = 0;
    }

    renderOnce() {
	this.reset();
	this.app(this.model);
    }

    doRender() {
	// twice: one to handle event, one to sync view.
	var _ = this.renderOnce();
	var node = this.renderOnce();
	this.mount(node);
    }

    mount(node) {
	var container = document.getElementById(this.root);
	if (this.node !== null) {
	    reconcileKids(container, container.childNodes, this.focus);
	}
	else {
	    while (container.firstChild) {
		container.removeChild(container.firstChild);
	    }
	    for (var i = 0; i < this.focus.length; i++) {
		container.appendChild(build(this.focus[i]));
	    }
	}
	this.node = node;
	
	for (var id in this.onMounts) {
	    if (this.onMounts.hasOwnProperty(id)) {
		var doSomething = this.onMounts[id];
		var elt = document.getElementById(id);
		doSomething(elt);
	    }
	}
	
    }

    dealWithIt(e) {
	this.event = e;
	this.doRender();
    }


    attrs(as) {
	for (var a in as) {
	    if (as.hasOwnProperty(a)) {
		this.attributes[a] = as[a];
	    }
	}
	return this;
    }


    
    on(elt, events, block) {
	var id = this.attributes['id'] || ('id' + this.ids++);
	events.forEach(e => this.register(e, id));
	
	return this.id(id).withElement(elt, () => {
	    var event = this.event;
	    if (event && event.target.getAttribute('id') === id) {
		this.event = undefined; // maybe do in toplevel???
		return block(event); // let it be handled
	    }
	    return block();
	});
    }

    withElement(elt, func, evs) {
	// TODO: if this.pretend, don't build vnodes
	var parent = this.focus;
	this.focus = [];

	// Copy the current attribute set
	var myAttrs = {};
	for (var a in this.attributes) {
	    if (this.attributes.hasOwnProperty(a)) {
		myAttrs[a] = this.attributes[a];
	    }
	}
	this.attributes = {}; // kids don't inherit attrs.
	
	try {
	    return func();
	}
	finally {
	    if (myAttrs && myAttrs.onMount) {
		this.onMounts[myAttrs['id']] = myAttrs.onMount;
		delete myAttrs.onMount;
	    }
	    var vnode = {tag: elt, attrs: myAttrs, kids: this.focus};
	    parent.push(vnode);
	    this.focus = parent;
	}    
    }


    here(func, block) {
	var pos = this.focus.length;
	var self = this;
	return block(function () { // because arguments.
	    var parent = self.focus;
	    self.focus = [];
	    try {
		return func.apply(null, arguments);
	    }
	    finally {
		for (var i = 0; i < self.focus.length; i++) {
		    parent.splice(pos + i, 0, self.focus[i]);
		}
		self.focus = parent;
	    }
	});
    }


    content(c, ev) {
	if (typeof c === 'function') {
	    c.apply(undefined, ev);
	}
	if (typeof c === 'string') {
	    this.text(c);
	}
    }


    text(txt) {
	this.focus.push(txt);
    }
    
    
    // convenience

    attr(n, x) {
	var obj = {};
	obj[n] = x;
	return this.attrs(obj);
    }
    
    klass(x) {
	return this.attr('class', x);
    }

    id(x) {
	return this.attr('id', x);
    }

    textarea(x) {
	return this.on('textarea', ['keyup', 'blur'], ev => {
	    var newValue = ev ? ev.target.value : value;
	    this.content(x, ev);
	    return newValue;
	});
    }
    
    textBox(value) {
	var attrs = {};
	attrs.type = 'text';
	attrs.value = value;
	attrs.onMount = elt => {
    	    elt.value = value;
	};
	
	return this.attrs(attrs).on('input', ['input'], ev => {
	    return ev ? ev.target.value : value;
	});
    }

    checkBox(value) {
	var attrs = attrs || {};
	attrs.type = 'checkbox';
	if (value) {
	    attrs.checked = 'true';
	}
	attrs.onMount = elt => {
	    elt.checked = value;
	};
	
	return this.attrs(attrs).on('input', ['click'], ev => {
	    return ev ? ev.target.checked : value;
	});
    }


    after(id, delay) {
	if (this.timers.hasOwnProperty(id)) {
	    return this.timers[id];
	}

	this.timers[id] = false;
	window.setTimeout(() => {
	    this.timers[id] = true;
	    this.doRender();
	}, delay);
    }


    aclick(x) {
	return this.on('a', ['click'], ev => {
	    this.content(x, ev);
	    return ev !== undefined;
	});
    }
    
    button(x) {
	return this.on('button', ['click'], ev => {
	    this.content(x, ev);
	    return ev !== undefined;
	});
    }
    

    select(value, block) {
	var self = this;
	function option(optValue, label) {
	    var attrs = {value: optValue};
	    if (optValue === value) {
		attrs['selected'] = true;
	    }
	    label = label || optValue;
	    return self.attrs(attrs).withElement('option', () => self.text(label));
	}
	
	return this.on('select', ['change'], ev => {
	    block(option);
	    return ev  
		? ev.target.options[ev.target.selectedIndex].value
		: value;
	});
    }
    
    radioGroup(value, block) {
	var result = value;
	var name = 'name' + (this.ids++);
	function radio(radioValue, label) {
	    var attrs = {type: 'radio', name: name};
	    if (radioValue === value) {
		attrs['checked'] = true;
	    }
	    attrs.onMount = function (elt) {
		elt.checked = (radioValue === value);
	    };
	    return this.on('label', [], () => {
		this.attrs(attrs).on('input', ['click'], ev => {
		    if (ev) {
			result = radioValue;
		    }
		    return radioValue;
		})
		this.text(label || radioValue);
		return radioValue;
	    });
	}
	
	block(radio);
	return result;
    }

    label(txt) {
	// FIXME: this is extremely brittle.
	var id = 'id' + (this.ids + 1); // NB: not ++ !!
	return this.attr('for', id).withElement('label', () => this.text(txt));
    }
    

    addInputElements() {
	var basicInputs = {
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
		(name => {
		    this[name] = value => this
			.attrs({type: basicInputs[name].type, value: value})
			.on('input', [basicInputs[name].event],
			    ev => ev ? ev.target.value : value);
		})(name);
	    }
	}
    }

    addSimpleElements() {
	// Currently, these don't have events.
	['a', 'strong', 'br', 'span', 'h1', 'h2', 'h3', 'h4',
	 'section', 'div', 'ul', 'ol', 'li', 'header', 'footer', 'code', 'pre',
	 'dl', 'dt', 'dd', 'fieldset', 'table', 'td', 'tr', 'th', 'col', 'thead']
	    .forEach(elt => 
		     (elt => {
			 this[elt] = x => this.withElement(elt, () => this.content(x));
		     })(elt));
    }
        
}


/*

The following functions don't access TrimGUI state, but simply
patch the real dom (1st arg) based on the vdom (2nd arg).

vdom element
{tag:
 attrs: {} etc.
 kids: [] }

*/

function compat(d, v) {
    //console.log('Compat? ');
    //console.log('d = ' + d.nodeValue);
    //console.log('v = ' + JSON.stringify(v));
    return (d.nodeType === Node.TEXT_NODE && (typeof v !== 'object'))
	|| (d.tagName === v.tag.toUpperCase());
}


function reconcile(dom, vdom) {
    if (!compat(dom, vdom)) {
	throw 'Can only reconcile compatible nodes';
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
		    //console.log('Updating attribute: ' + vattr + ' = ' + vattrs[vattr]);
		    dom.setAttribute(vattr, vattrs[vattr]);
		}
	    }
	    else {
		//console.log('Adding attribute: ' + vattr + ' = ' + vattrs[vattr]);
		dom.setAttribute(vattr, vattrs[vattr]);
	    }
	}
    }
    
    for (var i = 0; i < dom.attributes.length; i++) {
	var dattr = dom.attributes[i];
	if (!vattrs.hasOwnProperty(dattr.nodeName)) {
	    //console.log('Removing attribute: ' + dattr.nodeName);
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
	    //console.log('Replacing child');
	    dom.replaceChild(build(vkid), dkid);
	}
    }
    
    if (dkids.length > len) {
	while (dkids.length > len) {
	    //console.log('Removing child ');
	    dom.removeChild(dkids[len]);
	}
    }
    else if (vkids.length > len) {
	for (var i = len; i < vkids.length; i++) {
	    //console.log('Appending new child ');
	    dom.appendChild(build(vkids[i]));
	}
    }
}

function build(vdom) {
    if (vdom === undefined) {
	return document.createTextNode('');
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

module.exports = TrimGUI;


},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNlbHNpdXMuanMiLCIuLi9saWJpbWd1aS9saWJpbWd1aS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcblxudmFyIFRyaW1HVUkgPSByZXF1aXJlKCcuLi9saWJpbWd1aScpO1xuXG52YXIgbSA9IHtcbiAgICB0OiAwXG59O1xuXG52YXIgaWcgPSBuZXcgVHJpbUdVSShjMmYsIG0sICdyb290Jyk7XG5cbmZ1bmN0aW9uIHRvRihjKSB7XG4gICAgcmV0dXJuIE1hdGgucm91bmQoYyAqIDkuMC81LjAgKyAzMik7XG59XG5cbmZ1bmN0aW9uIHRvQyhmKSB7XG4gICAgcmV0dXJuIE1hdGgucm91bmQoKHBhcnNlRmxvYXQoZikgLSAzMikgKiA1LjAvOS4wKTtcbn1cblxuZnVuY3Rpb24gYzJmKG0pIHtcbiAgICBpZy50ZXh0KFwiQzpcIilcbiAgICBtLnQgPSBpZy50ZXh0Qm94KG0udCk7XG5cbiAgICBpZy50ZXh0KFwiRjpcIilcbiAgICBtLnQgPSB0b0MoaWcudGV4dEJveCh0b0YobS50KSkpO1xufVxuXHRcdFx0XHQgXG5cbm1vZHVsZS5leHBvcnRzID0gaWc7XG4iLCJcbid1c2Ugc3RyaWN0JztcblxuLypcbiAqIFRPRE86XG4gKiAtIGRvbid0IGJ1aWxkIHZub2RlIHdoZW4gaGFuZGxpbmcgZXZlbnQuXG4gKiAtIG1ha2UgYGhlcmVgIG1vcmUgcm9idXN0XG4gKiAtIG9wdGltaXplIHVzZSBvZiBpZHMgaW4gbGlzdHNcbiAqIC0gZWxpbWluYXRlIC5jbGFzcy8jaWQgcGFyc2luZ1xuICogLSBzdXBwb3J0IGtleS1iYXNlZCBwYXRjaGluZyAoYXR0ciBga2V5YClcbiAqL1xuXG5jbGFzcyBUcmltR1VJIHtcbiAgICBjb25zdHJ1Y3RvciAoYXBwLCBtb2RlbCwgcm9vdCkge1xuXHR0aGlzLmFwcCA9IGFwcDtcblx0dGhpcy5tb2RlbCA9IG1vZGVsXG5cdHRoaXMucm9vdCA9IHJvb3Q7XG5cdHRoaXMuZXZlbnQgPSBudWxsO1xuXHR0aGlzLmZvY3VzID0gW107XG5cdHRoaXMubm9kZSA9IG51bGw7XG5cdHRoaXMub25Nb3VudHMgPSB7fTtcblx0dGhpcy50aW1lcnMgPSB7fTtcblx0dGhpcy5oYW5kbGVycyA9IHt9O1xuXHR0aGlzLmlkcyA9IDA7XG5cdHRoaXMuYXR0cmlidXRlcyA9IHt9O1xuXHR0aGlzLmFkZFNpbXBsZUVsZW1lbnRzKCk7XG5cdHRoaXMuYWRkSW5wdXRFbGVtZW50cygpO1xuICAgIH1cblxuICAgIHJ1bigpIHtcblx0dGhpcy5tb3VudCh0aGlzLnJlbmRlck9uY2UoKSk7XG4gICAgfVxuICAgIFxuICAgIHJlZ2lzdGVyKGV2ZW50LCBpZCkge1xuXHQvLyBvbmx5IGFkZCBvbmUgaGFuZGxlciB0byByb290LCBwZXIgZXZlbnQgdHlwZS5cblx0aWYgKCF0aGlzLmhhbmRsZXJzLmhhc093blByb3BlcnR5KGV2ZW50KSkge1xuXHQgICAgdGhpcy5oYW5kbGVyc1tldmVudF0gPSBbXTtcblx0ICAgIHZhciByID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5yb290KTtcblx0ICAgIHIuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgZSA9PiB7XG5cdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTsgLy8gZG9uJ3QgbGVhayB1cHdhcmRzXG5cdFx0dmFyIGlkID0gZS50YXJnZXQuZ2V0QXR0cmlidXRlKCdpZCcpO1xuXHRcdGlmICh0aGlzLmhhbmRsZXJzW2V2ZW50XS5pbmRleE9mKGlkKSA+IC0xKSB7XG5cdFx0ICAgIHRoaXMuZXZlbnQgPSBlO1xuXHRcdCAgICB0aGlzLmRvUmVuZGVyKCk7XG5cdFx0fVxuXHQgICAgfSwgZmFsc2UpO1xuXHR9XG5cdHRoaXMuaGFuZGxlcnNbZXZlbnRdLnB1c2goaWQpO1xuICAgIH1cblxuICAgIHJlc2V0KCkge1xuXHRmb3IgKHZhciBrIGluIHRoaXMuaGFuZGxlcnMpIHtcblx0ICAgIGlmICh0aGlzLmhhbmRsZXJzLmhhc093blByb3BlcnR5KGspKSB7XG5cdFx0dGhpcy5oYW5kbGVyc1trXSA9IFtdO1xuXHQgICAgfVxuXHR9XG5cdHRoaXMub25Nb3VudHMgPSB7fTtcblx0dGhpcy5mb2N1cyA9IFtdO1xuXHR0aGlzLmlkcyA9IDA7XG4gICAgfVxuXG4gICAgcmVuZGVyT25jZSgpIHtcblx0dGhpcy5yZXNldCgpO1xuXHR0aGlzLmFwcCh0aGlzLm1vZGVsKTtcbiAgICB9XG5cbiAgICBkb1JlbmRlcigpIHtcblx0Ly8gdHdpY2U6IG9uZSB0byBoYW5kbGUgZXZlbnQsIG9uZSB0byBzeW5jIHZpZXcuXG5cdHZhciBfID0gdGhpcy5yZW5kZXJPbmNlKCk7XG5cdHZhciBub2RlID0gdGhpcy5yZW5kZXJPbmNlKCk7XG5cdHRoaXMubW91bnQobm9kZSk7XG4gICAgfVxuXG4gICAgbW91bnQobm9kZSkge1xuXHR2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5yb290KTtcblx0aWYgKHRoaXMubm9kZSAhPT0gbnVsbCkge1xuXHQgICAgcmVjb25jaWxlS2lkcyhjb250YWluZXIsIGNvbnRhaW5lci5jaGlsZE5vZGVzLCB0aGlzLmZvY3VzKTtcblx0fVxuXHRlbHNlIHtcblx0ICAgIHdoaWxlIChjb250YWluZXIuZmlyc3RDaGlsZCkge1xuXHRcdGNvbnRhaW5lci5yZW1vdmVDaGlsZChjb250YWluZXIuZmlyc3RDaGlsZCk7XG5cdCAgICB9XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZm9jdXMubGVuZ3RoOyBpKyspIHtcblx0XHRjb250YWluZXIuYXBwZW5kQ2hpbGQoYnVpbGQodGhpcy5mb2N1c1tpXSkpO1xuXHQgICAgfVxuXHR9XG5cdHRoaXMubm9kZSA9IG5vZGU7XG5cdFxuXHRmb3IgKHZhciBpZCBpbiB0aGlzLm9uTW91bnRzKSB7XG5cdCAgICBpZiAodGhpcy5vbk1vdW50cy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcblx0XHR2YXIgZG9Tb21ldGhpbmcgPSB0aGlzLm9uTW91bnRzW2lkXTtcblx0XHR2YXIgZWx0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuXHRcdGRvU29tZXRoaW5nKGVsdCk7XG5cdCAgICB9XG5cdH1cblx0XG4gICAgfVxuXG4gICAgZGVhbFdpdGhJdChlKSB7XG5cdHRoaXMuZXZlbnQgPSBlO1xuXHR0aGlzLmRvUmVuZGVyKCk7XG4gICAgfVxuXG5cbiAgICBhdHRycyhhcykge1xuXHRmb3IgKHZhciBhIGluIGFzKSB7XG5cdCAgICBpZiAoYXMuaGFzT3duUHJvcGVydHkoYSkpIHtcblx0XHR0aGlzLmF0dHJpYnV0ZXNbYV0gPSBhc1thXTtcblx0ICAgIH1cblx0fVxuXHRyZXR1cm4gdGhpcztcbiAgICB9XG5cblxuICAgIFxuICAgIG9uKGVsdCwgZXZlbnRzLCBibG9jaykge1xuXHR2YXIgaWQgPSB0aGlzLmF0dHJpYnV0ZXNbJ2lkJ10gfHwgKCdpZCcgKyB0aGlzLmlkcysrKTtcblx0ZXZlbnRzLmZvckVhY2goZSA9PiB0aGlzLnJlZ2lzdGVyKGUsIGlkKSk7XG5cdFxuXHRyZXR1cm4gdGhpcy5pZChpZCkud2l0aEVsZW1lbnQoZWx0LCAoKSA9PiB7XG5cdCAgICB2YXIgZXZlbnQgPSB0aGlzLmV2ZW50O1xuXHQgICAgaWYgKGV2ZW50ICYmIGV2ZW50LnRhcmdldC5nZXRBdHRyaWJ1dGUoJ2lkJykgPT09IGlkKSB7XG5cdFx0dGhpcy5ldmVudCA9IHVuZGVmaW5lZDsgLy8gbWF5YmUgZG8gaW4gdG9wbGV2ZWw/Pz9cblx0XHRyZXR1cm4gYmxvY2soZXZlbnQpOyAvLyBsZXQgaXQgYmUgaGFuZGxlZFxuXHQgICAgfVxuXHQgICAgcmV0dXJuIGJsb2NrKCk7XG5cdH0pO1xuICAgIH1cblxuICAgIHdpdGhFbGVtZW50KGVsdCwgZnVuYywgZXZzKSB7XG5cdC8vIFRPRE86IGlmIHRoaXMucHJldGVuZCwgZG9uJ3QgYnVpbGQgdm5vZGVzXG5cdHZhciBwYXJlbnQgPSB0aGlzLmZvY3VzO1xuXHR0aGlzLmZvY3VzID0gW107XG5cblx0Ly8gQ29weSB0aGUgY3VycmVudCBhdHRyaWJ1dGUgc2V0XG5cdHZhciBteUF0dHJzID0ge307XG5cdGZvciAodmFyIGEgaW4gdGhpcy5hdHRyaWJ1dGVzKSB7XG5cdCAgICBpZiAodGhpcy5hdHRyaWJ1dGVzLmhhc093blByb3BlcnR5KGEpKSB7XG5cdFx0bXlBdHRyc1thXSA9IHRoaXMuYXR0cmlidXRlc1thXTtcblx0ICAgIH1cblx0fVxuXHR0aGlzLmF0dHJpYnV0ZXMgPSB7fTsgLy8ga2lkcyBkb24ndCBpbmhlcml0IGF0dHJzLlxuXHRcblx0dHJ5IHtcblx0ICAgIHJldHVybiBmdW5jKCk7XG5cdH1cblx0ZmluYWxseSB7XG5cdCAgICBpZiAobXlBdHRycyAmJiBteUF0dHJzLm9uTW91bnQpIHtcblx0XHR0aGlzLm9uTW91bnRzW215QXR0cnNbJ2lkJ11dID0gbXlBdHRycy5vbk1vdW50O1xuXHRcdGRlbGV0ZSBteUF0dHJzLm9uTW91bnQ7XG5cdCAgICB9XG5cdCAgICB2YXIgdm5vZGUgPSB7dGFnOiBlbHQsIGF0dHJzOiBteUF0dHJzLCBraWRzOiB0aGlzLmZvY3VzfTtcblx0ICAgIHBhcmVudC5wdXNoKHZub2RlKTtcblx0ICAgIHRoaXMuZm9jdXMgPSBwYXJlbnQ7XG5cdH0gICAgXG4gICAgfVxuXG5cbiAgICBoZXJlKGZ1bmMsIGJsb2NrKSB7XG5cdHZhciBwb3MgPSB0aGlzLmZvY3VzLmxlbmd0aDtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRyZXR1cm4gYmxvY2soZnVuY3Rpb24gKCkgeyAvLyBiZWNhdXNlIGFyZ3VtZW50cy5cblx0ICAgIHZhciBwYXJlbnQgPSBzZWxmLmZvY3VzO1xuXHQgICAgc2VsZi5mb2N1cyA9IFtdO1xuXHQgICAgdHJ5IHtcblx0XHRyZXR1cm4gZnVuYy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuXHQgICAgfVxuXHQgICAgZmluYWxseSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLmZvY3VzLmxlbmd0aDsgaSsrKSB7XG5cdFx0ICAgIHBhcmVudC5zcGxpY2UocG9zICsgaSwgMCwgc2VsZi5mb2N1c1tpXSk7XG5cdFx0fVxuXHRcdHNlbGYuZm9jdXMgPSBwYXJlbnQ7XG5cdCAgICB9XG5cdH0pO1xuICAgIH1cblxuXG4gICAgY29udGVudChjLCBldikge1xuXHRpZiAodHlwZW9mIGMgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIGMuYXBwbHkodW5kZWZpbmVkLCBldik7XG5cdH1cblx0aWYgKHR5cGVvZiBjID09PSAnc3RyaW5nJykge1xuXHQgICAgdGhpcy50ZXh0KGMpO1xuXHR9XG4gICAgfVxuXG5cbiAgICB0ZXh0KHR4dCkge1xuXHR0aGlzLmZvY3VzLnB1c2godHh0KTtcbiAgICB9XG4gICAgXG4gICAgXG4gICAgLy8gY29udmVuaWVuY2VcblxuICAgIGF0dHIobiwgeCkge1xuXHR2YXIgb2JqID0ge307XG5cdG9ialtuXSA9IHg7XG5cdHJldHVybiB0aGlzLmF0dHJzKG9iaik7XG4gICAgfVxuICAgIFxuICAgIGtsYXNzKHgpIHtcblx0cmV0dXJuIHRoaXMuYXR0cignY2xhc3MnLCB4KTtcbiAgICB9XG5cbiAgICBpZCh4KSB7XG5cdHJldHVybiB0aGlzLmF0dHIoJ2lkJywgeCk7XG4gICAgfVxuXG4gICAgdGV4dGFyZWEoeCkge1xuXHRyZXR1cm4gdGhpcy5vbigndGV4dGFyZWEnLCBbJ2tleXVwJywgJ2JsdXInXSwgZXYgPT4ge1xuXHQgICAgdmFyIG5ld1ZhbHVlID0gZXYgPyBldi50YXJnZXQudmFsdWUgOiB2YWx1ZTtcblx0ICAgIHRoaXMuY29udGVudCh4LCBldik7XG5cdCAgICByZXR1cm4gbmV3VmFsdWU7XG5cdH0pO1xuICAgIH1cbiAgICBcbiAgICB0ZXh0Qm94KHZhbHVlKSB7XG5cdHZhciBhdHRycyA9IHt9O1xuXHRhdHRycy50eXBlID0gJ3RleHQnO1xuXHRhdHRycy52YWx1ZSA9IHZhbHVlO1xuXHRhdHRycy5vbk1vdW50ID0gZWx0ID0+IHtcbiAgICBcdCAgICBlbHQudmFsdWUgPSB2YWx1ZTtcblx0fTtcblx0XG5cdHJldHVybiB0aGlzLmF0dHJzKGF0dHJzKS5vbignaW5wdXQnLCBbJ2lucHV0J10sIGV2ID0+IHtcblx0ICAgIHJldHVybiBldiA/IGV2LnRhcmdldC52YWx1ZSA6IHZhbHVlO1xuXHR9KTtcbiAgICB9XG5cbiAgICBjaGVja0JveCh2YWx1ZSkge1xuXHR2YXIgYXR0cnMgPSBhdHRycyB8fCB7fTtcblx0YXR0cnMudHlwZSA9ICdjaGVja2JveCc7XG5cdGlmICh2YWx1ZSkge1xuXHQgICAgYXR0cnMuY2hlY2tlZCA9ICd0cnVlJztcblx0fVxuXHRhdHRycy5vbk1vdW50ID0gZWx0ID0+IHtcblx0ICAgIGVsdC5jaGVja2VkID0gdmFsdWU7XG5cdH07XG5cdFxuXHRyZXR1cm4gdGhpcy5hdHRycyhhdHRycykub24oJ2lucHV0JywgWydjbGljayddLCBldiA9PiB7XG5cdCAgICByZXR1cm4gZXYgPyBldi50YXJnZXQuY2hlY2tlZCA6IHZhbHVlO1xuXHR9KTtcbiAgICB9XG5cblxuICAgIGFmdGVyKGlkLCBkZWxheSkge1xuXHRpZiAodGhpcy50aW1lcnMuaGFzT3duUHJvcGVydHkoaWQpKSB7XG5cdCAgICByZXR1cm4gdGhpcy50aW1lcnNbaWRdO1xuXHR9XG5cblx0dGhpcy50aW1lcnNbaWRdID0gZmFsc2U7XG5cdHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcblx0ICAgIHRoaXMudGltZXJzW2lkXSA9IHRydWU7XG5cdCAgICB0aGlzLmRvUmVuZGVyKCk7XG5cdH0sIGRlbGF5KTtcbiAgICB9XG5cblxuICAgIGFjbGljayh4KSB7XG5cdHJldHVybiB0aGlzLm9uKCdhJywgWydjbGljayddLCBldiA9PiB7XG5cdCAgICB0aGlzLmNvbnRlbnQoeCwgZXYpO1xuXHQgICAgcmV0dXJuIGV2ICE9PSB1bmRlZmluZWQ7XG5cdH0pO1xuICAgIH1cbiAgICBcbiAgICBidXR0b24oeCkge1xuXHRyZXR1cm4gdGhpcy5vbignYnV0dG9uJywgWydjbGljayddLCBldiA9PiB7XG5cdCAgICB0aGlzLmNvbnRlbnQoeCwgZXYpO1xuXHQgICAgcmV0dXJuIGV2ICE9PSB1bmRlZmluZWQ7XG5cdH0pO1xuICAgIH1cbiAgICBcblxuICAgIHNlbGVjdCh2YWx1ZSwgYmxvY2spIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRmdW5jdGlvbiBvcHRpb24ob3B0VmFsdWUsIGxhYmVsKSB7XG5cdCAgICB2YXIgYXR0cnMgPSB7dmFsdWU6IG9wdFZhbHVlfTtcblx0ICAgIGlmIChvcHRWYWx1ZSA9PT0gdmFsdWUpIHtcblx0XHRhdHRyc1snc2VsZWN0ZWQnXSA9IHRydWU7XG5cdCAgICB9XG5cdCAgICBsYWJlbCA9IGxhYmVsIHx8IG9wdFZhbHVlO1xuXHQgICAgcmV0dXJuIHNlbGYuYXR0cnMoYXR0cnMpLndpdGhFbGVtZW50KCdvcHRpb24nLCAoKSA9PiBzZWxmLnRleHQobGFiZWwpKTtcblx0fVxuXHRcblx0cmV0dXJuIHRoaXMub24oJ3NlbGVjdCcsIFsnY2hhbmdlJ10sIGV2ID0+IHtcblx0ICAgIGJsb2NrKG9wdGlvbik7XG5cdCAgICByZXR1cm4gZXYgIFxuXHRcdD8gZXYudGFyZ2V0Lm9wdGlvbnNbZXYudGFyZ2V0LnNlbGVjdGVkSW5kZXhdLnZhbHVlXG5cdFx0OiB2YWx1ZTtcblx0fSk7XG4gICAgfVxuICAgIFxuICAgIHJhZGlvR3JvdXAodmFsdWUsIGJsb2NrKSB7XG5cdHZhciByZXN1bHQgPSB2YWx1ZTtcblx0dmFyIG5hbWUgPSAnbmFtZScgKyAodGhpcy5pZHMrKyk7XG5cdGZ1bmN0aW9uIHJhZGlvKHJhZGlvVmFsdWUsIGxhYmVsKSB7XG5cdCAgICB2YXIgYXR0cnMgPSB7dHlwZTogJ3JhZGlvJywgbmFtZTogbmFtZX07XG5cdCAgICBpZiAocmFkaW9WYWx1ZSA9PT0gdmFsdWUpIHtcblx0XHRhdHRyc1snY2hlY2tlZCddID0gdHJ1ZTtcblx0ICAgIH1cblx0ICAgIGF0dHJzLm9uTW91bnQgPSBmdW5jdGlvbiAoZWx0KSB7XG5cdFx0ZWx0LmNoZWNrZWQgPSAocmFkaW9WYWx1ZSA9PT0gdmFsdWUpO1xuXHQgICAgfTtcblx0ICAgIHJldHVybiB0aGlzLm9uKCdsYWJlbCcsIFtdLCAoKSA9PiB7XG5cdFx0dGhpcy5hdHRycyhhdHRycykub24oJ2lucHV0JywgWydjbGljayddLCBldiA9PiB7XG5cdFx0ICAgIGlmIChldikge1xuXHRcdFx0cmVzdWx0ID0gcmFkaW9WYWx1ZTtcblx0XHQgICAgfVxuXHRcdCAgICByZXR1cm4gcmFkaW9WYWx1ZTtcblx0XHR9KVxuXHRcdHRoaXMudGV4dChsYWJlbCB8fCByYWRpb1ZhbHVlKTtcblx0XHRyZXR1cm4gcmFkaW9WYWx1ZTtcblx0ICAgIH0pO1xuXHR9XG5cdFxuXHRibG9jayhyYWRpbyk7XG5cdHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgbGFiZWwodHh0KSB7XG5cdC8vIEZJWE1FOiB0aGlzIGlzIGV4dHJlbWVseSBicml0dGxlLlxuXHR2YXIgaWQgPSAnaWQnICsgKHRoaXMuaWRzICsgMSk7IC8vIE5COiBub3QgKysgISFcblx0cmV0dXJuIHRoaXMuYXR0cignZm9yJywgaWQpLndpdGhFbGVtZW50KCdsYWJlbCcsICgpID0+IHRoaXMudGV4dCh0eHQpKTtcbiAgICB9XG4gICAgXG5cbiAgICBhZGRJbnB1dEVsZW1lbnRzKCkge1xuXHR2YXIgYmFzaWNJbnB1dHMgPSB7XG5cdCAgICBzcGluQm94OiB7dHlwZTogJ251bWJlcicsIGV2ZW50OiAnaW5wdXQnfSxcblx0ICAgIHNsaWRlcjoge3R5cGU6ICdyYW5nZScsIGV2ZW50OiAnaW5wdXQnfSxcblx0ICAgIGVtYWlsQm94OiB7dHlwZTogJ2VtYWlsJywgZXZlbnQ6ICdpbnB1dCd9LFxuXHQgICAgc2VhcmNoQm94OiB7dHlwZTogJ3NlYXJjaCcsIGV2ZW50OiAnaW5wdXQnfSxcblx0ICAgIGRhdGVQaWNrZXI6IHt0eXBlOiAnZGF0ZScsIGV2ZW50OiAnY2hhbmdlJ30sXG5cdCAgICBjb2xvclBpY2tlcjoge3R5cGU6ICdjb2xvcicsIGV2ZW50OiAnY2hhbmdlJ30sXG5cdCAgICBkYXRlVGltZVBpY2tlcjoge3R5cGU6ICdkYXRldGltZScsIGV2ZW50OiAnY2hhbmdlJ30sXG5cdCAgICBsb2NhbERhdGVUaW1lUGlja2VyOiB7dHlwZTogJ2RhdGV0aW1lLWxvY2FsJywgZXZlbnQ6ICdjaGFuZ2UnfSxcblx0ICAgIG1vbnRoUGlja2VyOiB7dHlwZTogJ3dlZWsnLCBldmVudDogJ2NoYW5nZSd9LFxuXHQgICAgd2Vla1BpY2tlcjoge3R5cGU6ICd3ZWVrJywgZXZlbnQ6ICdjaGFuZ2UnfSxcblx0ICAgIHRpbWVQaWNrZXI6IHt0eXBlOiAndGltZScsIGV2ZW50OiAnY2hhbmdlJ31cblx0fVxuXHRmb3IgKHZhciBuYW1lIGluIGJhc2ljSW5wdXRzKSB7XG5cdCAgICBpZiAoYmFzaWNJbnB1dHMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcblx0XHQobmFtZSA9PiB7XG5cdFx0ICAgIHRoaXNbbmFtZV0gPSB2YWx1ZSA9PiB0aGlzXG5cdFx0XHQuYXR0cnMoe3R5cGU6IGJhc2ljSW5wdXRzW25hbWVdLnR5cGUsIHZhbHVlOiB2YWx1ZX0pXG5cdFx0XHQub24oJ2lucHV0JywgW2Jhc2ljSW5wdXRzW25hbWVdLmV2ZW50XSxcblx0XHRcdCAgICBldiA9PiBldiA/IGV2LnRhcmdldC52YWx1ZSA6IHZhbHVlKTtcblx0XHR9KShuYW1lKTtcblx0ICAgIH1cblx0fVxuICAgIH1cblxuICAgIGFkZFNpbXBsZUVsZW1lbnRzKCkge1xuXHQvLyBDdXJyZW50bHksIHRoZXNlIGRvbid0IGhhdmUgZXZlbnRzLlxuXHRbJ2EnLCAnc3Ryb25nJywgJ2JyJywgJ3NwYW4nLCAnaDEnLCAnaDInLCAnaDMnLCAnaDQnLFxuXHQgJ3NlY3Rpb24nLCAnZGl2JywgJ3VsJywgJ29sJywgJ2xpJywgJ2hlYWRlcicsICdmb290ZXInLCAnY29kZScsICdwcmUnLFxuXHQgJ2RsJywgJ2R0JywgJ2RkJywgJ2ZpZWxkc2V0JywgJ3RhYmxlJywgJ3RkJywgJ3RyJywgJ3RoJywgJ2NvbCcsICd0aGVhZCddXG5cdCAgICAuZm9yRWFjaChlbHQgPT4gXG5cdFx0ICAgICAoZWx0ID0+IHtcblx0XHRcdCB0aGlzW2VsdF0gPSB4ID0+IHRoaXMud2l0aEVsZW1lbnQoZWx0LCAoKSA9PiB0aGlzLmNvbnRlbnQoeCkpO1xuXHRcdCAgICAgfSkoZWx0KSk7XG4gICAgfVxuICAgICAgICBcbn1cblxuXG4vKlxuXG5UaGUgZm9sbG93aW5nIGZ1bmN0aW9ucyBkb24ndCBhY2Nlc3MgVHJpbUdVSSBzdGF0ZSwgYnV0IHNpbXBseVxucGF0Y2ggdGhlIHJlYWwgZG9tICgxc3QgYXJnKSBiYXNlZCBvbiB0aGUgdmRvbSAoMm5kIGFyZykuXG5cbnZkb20gZWxlbWVudFxue3RhZzpcbiBhdHRyczoge30gZXRjLlxuIGtpZHM6IFtdIH1cblxuKi9cblxuZnVuY3Rpb24gY29tcGF0KGQsIHYpIHtcbiAgICAvL2NvbnNvbGUubG9nKCdDb21wYXQ/ICcpO1xuICAgIC8vY29uc29sZS5sb2coJ2QgPSAnICsgZC5ub2RlVmFsdWUpO1xuICAgIC8vY29uc29sZS5sb2coJ3YgPSAnICsgSlNPTi5zdHJpbmdpZnkodikpO1xuICAgIHJldHVybiAoZC5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUgJiYgKHR5cGVvZiB2ICE9PSAnb2JqZWN0JykpXG5cdHx8IChkLnRhZ05hbWUgPT09IHYudGFnLnRvVXBwZXJDYXNlKCkpO1xufVxuXG5cbmZ1bmN0aW9uIHJlY29uY2lsZShkb20sIHZkb20pIHtcbiAgICBpZiAoIWNvbXBhdChkb20sIHZkb20pKSB7XG5cdHRocm93ICdDYW4gb25seSByZWNvbmNpbGUgY29tcGF0aWJsZSBub2Rlcyc7XG4gICAgfVxuICAgIFxuICAgIC8vIFRleHQgbm9kZXNcbiAgICBpZiAodHlwZW9mIHZkb20gIT09ICdvYmplY3QnKSB7XG5cdGlmIChkb20ubm9kZVZhbHVlICE9PSB2ZG9tKSB7XG5cdCAgICBkb20ubm9kZVZhbHVlID0gdmRvbS50b1N0cmluZygpO1xuXHR9XG5cdHJldHVybjtcbiAgICB9XG5cblxuICAgIC8vIEVsZW1lbnQgbm9kZXNcbiAgICB2YXIgdmF0dHJzID0gdmRvbS5hdHRycyB8fCB7fTtcbiAgICBmb3IgKHZhciB2YXR0ciBpbiB2YXR0cnMpIHtcblx0aWYgKHZhdHRycy5oYXNPd25Qcm9wZXJ0eSh2YXR0cikpIHtcblx0ICAgIGlmIChkb20uaGFzQXR0cmlidXRlKHZhdHRyKSkge1xuXHRcdHZhciBkYXR0ciA9IGRvbS5nZXRBdHRyaWJ1dGUodmF0dHIpO1xuXHRcdGlmIChkYXR0ciAhPT0gdmF0dHJzW3ZhdHRyXS50b1N0cmluZygpKSB7IFxuXHRcdCAgICAvL2NvbnNvbGUubG9nKCdVcGRhdGluZyBhdHRyaWJ1dGU6ICcgKyB2YXR0ciArICcgPSAnICsgdmF0dHJzW3ZhdHRyXSk7XG5cdFx0ICAgIGRvbS5zZXRBdHRyaWJ1dGUodmF0dHIsIHZhdHRyc1t2YXR0cl0pO1xuXHRcdH1cblx0ICAgIH1cblx0ICAgIGVsc2Uge1xuXHRcdC8vY29uc29sZS5sb2coJ0FkZGluZyBhdHRyaWJ1dGU6ICcgKyB2YXR0ciArICcgPSAnICsgdmF0dHJzW3ZhdHRyXSk7XG5cdFx0ZG9tLnNldEF0dHJpYnV0ZSh2YXR0ciwgdmF0dHJzW3ZhdHRyXSk7XG5cdCAgICB9XG5cdH1cbiAgICB9XG4gICAgXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkb20uYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuXHR2YXIgZGF0dHIgPSBkb20uYXR0cmlidXRlc1tpXTtcblx0aWYgKCF2YXR0cnMuaGFzT3duUHJvcGVydHkoZGF0dHIubm9kZU5hbWUpKSB7XG5cdCAgICAvL2NvbnNvbGUubG9nKCdSZW1vdmluZyBhdHRyaWJ1dGU6ICcgKyBkYXR0ci5ub2RlTmFtZSk7XG5cdCAgICBkb20ucmVtb3ZlQXR0cmlidXRlKGRhdHRyLm5vZGVOYW1lKTtcblx0fVxuICAgIH1cblxuICAgIHJlY29uY2lsZUtpZHMoZG9tLCBkb20uY2hpbGROb2RlcywgdmRvbS5raWRzKTtcbn1cblxuZnVuY3Rpb24gcmVjb25jaWxlS2lkcyhkb20sIGRraWRzLCB2a2lkcykge1xuICAgIHZhciBsZW4gPSBNYXRoLm1pbihka2lkcy5sZW5ndGgsIHZraWRzLmxlbmd0aCk7XG4gICAgXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuXHR2YXIgZGtpZCA9IGRraWRzW2ldO1xuXHR2YXIgdmtpZCA9IHZraWRzW2ldO1xuXHRpZiAoY29tcGF0KGRraWQsIHZraWQpKSB7XG5cdCAgICByZWNvbmNpbGUoZGtpZCwgdmtpZCk7XG5cdH1cblx0ZWxzZSB7XG5cdCAgICAvL2NvbnNvbGUubG9nKCdSZXBsYWNpbmcgY2hpbGQnKTtcblx0ICAgIGRvbS5yZXBsYWNlQ2hpbGQoYnVpbGQodmtpZCksIGRraWQpO1xuXHR9XG4gICAgfVxuICAgIFxuICAgIGlmIChka2lkcy5sZW5ndGggPiBsZW4pIHtcblx0d2hpbGUgKGRraWRzLmxlbmd0aCA+IGxlbikge1xuXHQgICAgLy9jb25zb2xlLmxvZygnUmVtb3ZpbmcgY2hpbGQgJyk7XG5cdCAgICBkb20ucmVtb3ZlQ2hpbGQoZGtpZHNbbGVuXSk7XG5cdH1cbiAgICB9XG4gICAgZWxzZSBpZiAodmtpZHMubGVuZ3RoID4gbGVuKSB7XG5cdGZvciAodmFyIGkgPSBsZW47IGkgPCB2a2lkcy5sZW5ndGg7IGkrKykge1xuXHQgICAgLy9jb25zb2xlLmxvZygnQXBwZW5kaW5nIG5ldyBjaGlsZCAnKTtcblx0ICAgIGRvbS5hcHBlbmRDaGlsZChidWlsZCh2a2lkc1tpXSkpO1xuXHR9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBidWlsZCh2ZG9tKSB7XG4gICAgaWYgKHZkb20gPT09IHVuZGVmaW5lZCkge1xuXHRyZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHZkb20gIT09ICdvYmplY3QnKSB7XG5cdHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh2ZG9tLnRvU3RyaW5nKCkpO1xuICAgIH1cblxuICAgIHZhciBlbHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHZkb20udGFnKTtcbiAgICB2YXIgdmF0dHJzID0gdmRvbS5hdHRycyB8fCB7fTtcbiAgICBmb3IgKHZhciBrIGluIHZhdHRycykge1xuXHRpZiAodmF0dHJzLmhhc093blByb3BlcnR5KGspKSB7XG5cdCAgICBlbHQuc2V0QXR0cmlidXRlKGssIHZhdHRyc1trXSk7XG5cdH1cbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZG9tLmtpZHMubGVuZ3RoOyBpKyspIHtcblx0ZWx0LmFwcGVuZENoaWxkKGJ1aWxkKHZkb20ua2lkc1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gZWx0OyAgICBcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUcmltR1VJO1xuXG4iXX0=
