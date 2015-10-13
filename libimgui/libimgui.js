
"use strict";

class TrimGUI {
    constructor (app, model, root) {
	this.app = app;
	this.model = model
	this.root = root;
	this.event = null;
	this.focus = [];
	this.node = null;
	this.extras = {};
	this.timers = {};
	this.handlers = {};
	this.ids = 0;
	this.addInlineElements();
	this.addBlockElements();
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
	this.extras = {};
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
	
	for (var id in this.extras) {
	    if (this.extras.hasOwnProperty(id)) {
		var doSomething = this.extras[id];
		var elt = document.getElementById(id);
		doSomething(elt);
	    }
	}
	
    }

    dealWithIt(e) {
	this.event = e;
	this.doRender();
    }

    withElement(elt, attrs, func, evs) {
	// TODO: if this.pretend, don't build vnodes
	var parent = this.focus;
	this.focus = [];
	try {
	    return func();
	}
	finally {
	    if (attrs && attrs['extra']) {
		this.extras[attrs['id']] = attrs['extra'];
		delete attrs['extra'];
	    }
	    var vnode = {tag: elt, attrs: attrs, kids: this.focus};
	    parent.push(vnode);
	    this.focus = parent;
	}    
    }

    on(elt, events, attrs, block) {
	attrs = attrs || {};
	var id = attrs["id"] || ("id" + this.ids++);
	attrs["id"] = id;
	
	
	//this.handlers[id] = [];
	for (var i = 0; i < events.length; i++) {
	    this.register(events[i], id);
	}
	
	return this.withElement(elt, attrs, () => {
	    var event = this.event;
	    if (event && event.target.getAttribute('id') === id) {
		this.event = undefined; // maybe do in toplevel???
		return block(event); // let it be handled
	    }
	    return block();
	});
    }


    here(func, block) {
	var pos = this.focus.length;
	return block(() => {
	    var parent = this.focus;
	    this.focus = [];
	    try {
		return func.apply(null, arguments);
	    }
	    finally {
		for (var i = 0; i < this.focus.length; i++) {
		    parent.splice(pos + i, 0, this.focus[i]);
		}
		this.focus = parent;
	    }
	});
    }


    // dom elements

    textarea(value, attrs) {
	attrs = attrs || {};
	
	return this.on("textarea", ["keyup", "blur"], attrs, ev => {
	    var newValue = ev ? ev.target.value : value;
	    this.text(value);
	    return newValue;
	});
    }
    
    textBox(value, attrs) {
	attrs = attrs || {};
	attrs.type = 'text';
	attrs.value = value;
	attrs.extra = function (elt) {
    	    elt.value = value;
	};
	
    
	return this.on("input", ["input"], attrs, ev => {
	    return ev ? ev.target.value : value;
	});
    }

    checkBox(value, attrs) {
	attrs = attrs || {};
	attrs.type = "checkbox";
	if (value) {
	    attrs.checked = "true";
	}
	attrs.extra = function (elt) {
	    elt.checked = value;
	};
	
	return this.on("input", ["click"], attrs, function(ev) {
	    return ev ? ev.target.checked : value;
	});
    }


    after(id, delay) {
	if (this.timers.hasOwnProperty(id)) {
	    if (this.timers[id]) {
		return true;
	    }
	    return false;
	}
	else {
	    this.timers[id] = false;
	    window.setTimeout(() => {
		this.timers[id] = true;
		this.doRender();
	    }, delay);
	}
    }


    button(label, attrs) {
	return this.on("button", ["click"], attrs, ev => {
	    this.text(label);
	    return ev !== undefined;
	});
    }
    

    select(value, x, y, z) {
	var self = this;
	function option(optValue, label) {
	    var attrs = {value: optValue};
	    if (optValue === value) {
		attrs['selected'] = true;
	    }
	    label = label || optValue;
	    return self.withElement("option", attrs, () => {
		text(label);
	    });
	}
	
	var block = this.extractBlock(arguments);
	return this.on("select", ["change"], this.defaultAttrs(x, y, z), ev => {
	    block(option);
	    return ev  
		? ev.target.options[ev.target.selectedIndex].value
		: value;
	});
    }
    
    radioGroup(value,  x, y, z) {
	var result = value;
	var name = 'name' + (this.ids++);
	function radio(radioValue, label) {
	    var attrs = {type: "radio", name: name};
	    if (radioValue === value) {
		attrs['checked'] = true;
	    }
	    attrs.extra = function (elt) {
		elt.checked = (radioValue === value);
	    };
	    return this.on("label", [], {}, () => {
		this.on("input", ["click"], attrs, ev => {
		    if (ev) {
			result = radioValue;
		    }
		    return radioValue;
		})
		this.text(label || radioValue);
		return radioValue;
	    });
	}
	
	var block = this.extractBlock(arguments);
	block(radio);
	return result;
    }

    label(txt) {
	// FIXME: this is extremely brittle.
	var id = "id" + (this.ids + 1); // NB: not ++ !!
	return this.withElement("label", {"for": id}, function () {
	    this.text(txt);
	});
    }
    
    text(txt) {
	this.focus.push(txt);
    }

    br() {
	this.withElement("br", {}, function() {});
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
	var self = this;
	for (var name in basicInputs) {
	    if (basicInputs.hasOwnProperty(name)) {
		(function (name) {
		    self[name] = function (value, attrs) {
			attrs = attrs || {};
			attrs['type'] = basicInputs[name].type;
			attrs['value'] = value;
			
			return self.on("input", [basicInputs[name].event], attrs, function(ev) {
			    return ev ? ev.target.value : value;
			});
		    }
		})(name);
	    }
	}
    }

    addInlineElements() {
	var elts = ["a", "p", "span", "h1", "h2", "h3", "h4"];
	var self = this;
	for (var i = 0; i < elts.length; i++) {
	    this[elts[i]] = (elt => {
		return (txt, idClass, attrs) => {
		    this.withElement(elt, this.defaultAttrs(idClass, attrs), () => {
			this.text(txt);
		    });
		}
	    })(elts[i]);
	}
    }
    
    extractBlock(args) {
	for (var i = 0; i < args.length; i++) {
	    if ((typeof args[i]) === "function") {
		return args[i];
	    }
	}
	return function() {};
    }
    
    
    addBlockElements() {
	var elts = ["section", "div", "ul", "ol", "li", "header", "footer", "code", "pre",
		    "dl", "dt", "dd", "fieldset", "table", "td", "tr", "th", "col", "thead"];
	var self = this;
	for (var i = 0; i < elts.length; i++) {
	    this[elts[i]] = ((elt) => {
		return function (x, y, z) { // cannot use => because arguments.
		    return self.withElement(elt, self.defaultAttrs(x, y, z),
					    self.extractBlock(arguments));
		}
	    })(elts[i]);
	}
    }

    defaultAttrs(x, y, z) {
	
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

module.exports = TrimGUI;

