!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.app=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

'use strict';


/**
 * Data model
 */

var autoNumber = 0;

class Article {
    constructor (name, price) {
	this.id = ++autoNumber; // UUID for this article
	this.name = name;
	this.price = price;
    }
}

class Entry {
    constructor (article) {
	this.id = ++autoNumber; // UUID for this entry
	this.article = article;
	this.amount = 1;
    }

    get price() {
        return this.article ? this.article.price * this.amount : 0;
    }
}

class ShoppingCart {
    constructor () {
	this.entries = [];
    }

    get total() {
        return this.entries.reduce(function(sum, entry) {
            return sum + entry.price;
        }, 0);
    }
}

// Some available articles
var articles = [
    ['Funny Bunnies', 17.63],
    ['Awesome React', 23.95],
    ['Second hand Netbook', 50.00]
].map(function(e) {
    return new Article(e[0], e[1]);
});

// Our shopping cart
var cart = new ShoppingCart();

// With a demo item inside
cart.entries.push(new Entry(articles[0]));


var model = {
    articles: articles,
    cart: cart
}


/*
 * GUI
 */ 

var TrimGUI = require('../libimgui');

var ig = new TrimGUI(app, model, 'root');


function app(model) {
    shopDemoView(model.articles, model.cart);
}

function shopDemoView(articles, cart) {
    ig.table(() => {
	ig.tr(() => {
	    ig.td({colspan: 2}, () => {
		if (ig.button('update some items')) {
		    update(articles);
		}
		if (ig.button('create a lot of items')) {
		    generate(articles, cart);
		}
	    });
	});
	ig.tr(() => {
	    ig.td(() => {
		ig.h2('Available items');
		articlesView(cart, articles);
	    });
	    ig.td(() => {
		ig.h2('Your shopping cart');
		cartView(cart);
	    });
	});
    });
}

function generate(articles, cart) {
    var amount = parseInt(prompt('How many articles and entries should be created?', 1000));
    for(var i = 0; i < amount; i++) {
        var art = new Article('Generated item ' + articles.length, articles.length);
        articles.push(art);
        cart.entries.push(new Entry(art));
    }
}



function update(articles) {
    for(var i = 0; i < 10; i++) {
        var article = articles[Math.floor(Math.random() * articles.length)];
        article.name += 'x';
        article.price += 1;
    }
}

function articlesView(cart, articles) {
    ig.div(() => {
	if (ig.button('new article')) {
	    articles.push(new Article(prompt('Article name'),
				      prompt('Price (please fill in a number)')));
	}
	ig.ul(() => {
	    for (var i = 0; i < articles.length; i++) {
		articleView(cart, articles, articles[i], i);
	    }
	});
    });
}

function articleView(cart, articles, article, i) {
    ig.li(() => {
	ig.span(article.name);
	if (ig.button('>>')) {
	    var existingEntry = cart.entries.find(entry => entry.article === article);
            if (existingEntry) {
		existingEntry.amount += 1;
            }
	    else {
		cart.entries.unshift(new Entry(article))
	    }
	    
	}
	if (ig.button('edit')) {
            article.name = prompt('New name', article.name);
            article.price = parseInt(prompt('New price', article.price), 10);
	}
	ig.klass('price').span('€ ' + article.price);
    });
}


function cartView(cart) {
    ig.div(() => {
	ig.ul(() => {
	    for (var i = 0; i < cart.entries.length; i++) {
		var entry = cart.entries[i];
		ig.li(() => {
		    if (ig.button('<<')) {
			if (--entry.amount < 1) {
			    cart.entries.splice(cart.entries.indexOf(entry), 1);
			}
		    }
		    ig.span(entry.article.name);
		    ig.klass('price').span(entry.amount + 'x'); 
		});
	    }
	});
	ig.span(('Total: € ' + cart.total).replace(/(\.\d\d)\d*/,'$1'));
    });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNob3AuanMiLCIuLi9saWJpbWd1aS9saWJpbWd1aS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuJ3VzZSBzdHJpY3QnO1xuXG5cbi8qKlxuICogRGF0YSBtb2RlbFxuICovXG5cbnZhciBhdXRvTnVtYmVyID0gMDtcblxuY2xhc3MgQXJ0aWNsZSB7XG4gICAgY29uc3RydWN0b3IgKG5hbWUsIHByaWNlKSB7XG5cdHRoaXMuaWQgPSArK2F1dG9OdW1iZXI7IC8vIFVVSUQgZm9yIHRoaXMgYXJ0aWNsZVxuXHR0aGlzLm5hbWUgPSBuYW1lO1xuXHR0aGlzLnByaWNlID0gcHJpY2U7XG4gICAgfVxufVxuXG5jbGFzcyBFbnRyeSB7XG4gICAgY29uc3RydWN0b3IgKGFydGljbGUpIHtcblx0dGhpcy5pZCA9ICsrYXV0b051bWJlcjsgLy8gVVVJRCBmb3IgdGhpcyBlbnRyeVxuXHR0aGlzLmFydGljbGUgPSBhcnRpY2xlO1xuXHR0aGlzLmFtb3VudCA9IDE7XG4gICAgfVxuXG4gICAgZ2V0IHByaWNlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hcnRpY2xlID8gdGhpcy5hcnRpY2xlLnByaWNlICogdGhpcy5hbW91bnQgOiAwO1xuICAgIH1cbn1cblxuY2xhc3MgU2hvcHBpbmdDYXJ0IHtcbiAgICBjb25zdHJ1Y3RvciAoKSB7XG5cdHRoaXMuZW50cmllcyA9IFtdO1xuICAgIH1cblxuICAgIGdldCB0b3RhbCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZW50cmllcy5yZWR1Y2UoZnVuY3Rpb24oc3VtLCBlbnRyeSkge1xuICAgICAgICAgICAgcmV0dXJuIHN1bSArIGVudHJ5LnByaWNlO1xuICAgICAgICB9LCAwKTtcbiAgICB9XG59XG5cbi8vIFNvbWUgYXZhaWxhYmxlIGFydGljbGVzXG52YXIgYXJ0aWNsZXMgPSBbXG4gICAgWydGdW5ueSBCdW5uaWVzJywgMTcuNjNdLFxuICAgIFsnQXdlc29tZSBSZWFjdCcsIDIzLjk1XSxcbiAgICBbJ1NlY29uZCBoYW5kIE5ldGJvb2snLCA1MC4wMF1cbl0ubWFwKGZ1bmN0aW9uKGUpIHtcbiAgICByZXR1cm4gbmV3IEFydGljbGUoZVswXSwgZVsxXSk7XG59KTtcblxuLy8gT3VyIHNob3BwaW5nIGNhcnRcbnZhciBjYXJ0ID0gbmV3IFNob3BwaW5nQ2FydCgpO1xuXG4vLyBXaXRoIGEgZGVtbyBpdGVtIGluc2lkZVxuY2FydC5lbnRyaWVzLnB1c2gobmV3IEVudHJ5KGFydGljbGVzWzBdKSk7XG5cblxudmFyIG1vZGVsID0ge1xuICAgIGFydGljbGVzOiBhcnRpY2xlcyxcbiAgICBjYXJ0OiBjYXJ0XG59XG5cblxuLypcbiAqIEdVSVxuICovIFxuXG52YXIgVHJpbUdVSSA9IHJlcXVpcmUoJy4uL2xpYmltZ3VpJyk7XG5cbnZhciBpZyA9IG5ldyBUcmltR1VJKGFwcCwgbW9kZWwsICdyb290Jyk7XG5cblxuZnVuY3Rpb24gYXBwKG1vZGVsKSB7XG4gICAgc2hvcERlbW9WaWV3KG1vZGVsLmFydGljbGVzLCBtb2RlbC5jYXJ0KTtcbn1cblxuZnVuY3Rpb24gc2hvcERlbW9WaWV3KGFydGljbGVzLCBjYXJ0KSB7XG4gICAgaWcudGFibGUoKCkgPT4ge1xuXHRpZy50cigoKSA9PiB7XG5cdCAgICBpZy50ZCh7Y29sc3BhbjogMn0sICgpID0+IHtcblx0XHRpZiAoaWcuYnV0dG9uKCd1cGRhdGUgc29tZSBpdGVtcycpKSB7XG5cdFx0ICAgIHVwZGF0ZShhcnRpY2xlcyk7XG5cdFx0fVxuXHRcdGlmIChpZy5idXR0b24oJ2NyZWF0ZSBhIGxvdCBvZiBpdGVtcycpKSB7XG5cdFx0ICAgIGdlbmVyYXRlKGFydGljbGVzLCBjYXJ0KTtcblx0XHR9XG5cdCAgICB9KTtcblx0fSk7XG5cdGlnLnRyKCgpID0+IHtcblx0ICAgIGlnLnRkKCgpID0+IHtcblx0XHRpZy5oMignQXZhaWxhYmxlIGl0ZW1zJyk7XG5cdFx0YXJ0aWNsZXNWaWV3KGNhcnQsIGFydGljbGVzKTtcblx0ICAgIH0pO1xuXHQgICAgaWcudGQoKCkgPT4ge1xuXHRcdGlnLmgyKCdZb3VyIHNob3BwaW5nIGNhcnQnKTtcblx0XHRjYXJ0VmlldyhjYXJ0KTtcblx0ICAgIH0pO1xuXHR9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGUoYXJ0aWNsZXMsIGNhcnQpIHtcbiAgICB2YXIgYW1vdW50ID0gcGFyc2VJbnQocHJvbXB0KCdIb3cgbWFueSBhcnRpY2xlcyBhbmQgZW50cmllcyBzaG91bGQgYmUgY3JlYXRlZD8nLCAxMDAwKSk7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGFtb3VudDsgaSsrKSB7XG4gICAgICAgIHZhciBhcnQgPSBuZXcgQXJ0aWNsZSgnR2VuZXJhdGVkIGl0ZW0gJyArIGFydGljbGVzLmxlbmd0aCwgYXJ0aWNsZXMubGVuZ3RoKTtcbiAgICAgICAgYXJ0aWNsZXMucHVzaChhcnQpO1xuICAgICAgICBjYXJ0LmVudHJpZXMucHVzaChuZXcgRW50cnkoYXJ0KSk7XG4gICAgfVxufVxuXG5cblxuZnVuY3Rpb24gdXBkYXRlKGFydGljbGVzKSB7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IDEwOyBpKyspIHtcbiAgICAgICAgdmFyIGFydGljbGUgPSBhcnRpY2xlc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBhcnRpY2xlcy5sZW5ndGgpXTtcbiAgICAgICAgYXJ0aWNsZS5uYW1lICs9ICd4JztcbiAgICAgICAgYXJ0aWNsZS5wcmljZSArPSAxO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gYXJ0aWNsZXNWaWV3KGNhcnQsIGFydGljbGVzKSB7XG4gICAgaWcuZGl2KCgpID0+IHtcblx0aWYgKGlnLmJ1dHRvbignbmV3IGFydGljbGUnKSkge1xuXHQgICAgYXJ0aWNsZXMucHVzaChuZXcgQXJ0aWNsZShwcm9tcHQoJ0FydGljbGUgbmFtZScpLFxuXHRcdFx0XHQgICAgICBwcm9tcHQoJ1ByaWNlIChwbGVhc2UgZmlsbCBpbiBhIG51bWJlciknKSkpO1xuXHR9XG5cdGlnLnVsKCgpID0+IHtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJ0aWNsZXMubGVuZ3RoOyBpKyspIHtcblx0XHRhcnRpY2xlVmlldyhjYXJ0LCBhcnRpY2xlcywgYXJ0aWNsZXNbaV0sIGkpO1xuXHQgICAgfVxuXHR9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gYXJ0aWNsZVZpZXcoY2FydCwgYXJ0aWNsZXMsIGFydGljbGUsIGkpIHtcbiAgICBpZy5saSgoKSA9PiB7XG5cdGlnLnNwYW4oYXJ0aWNsZS5uYW1lKTtcblx0aWYgKGlnLmJ1dHRvbignPj4nKSkge1xuXHQgICAgdmFyIGV4aXN0aW5nRW50cnkgPSBjYXJ0LmVudHJpZXMuZmluZChlbnRyeSA9PiBlbnRyeS5hcnRpY2xlID09PSBhcnRpY2xlKTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZ0VudHJ5KSB7XG5cdFx0ZXhpc3RpbmdFbnRyeS5hbW91bnQgKz0gMTtcbiAgICAgICAgICAgIH1cblx0ICAgIGVsc2Uge1xuXHRcdGNhcnQuZW50cmllcy51bnNoaWZ0KG5ldyBFbnRyeShhcnRpY2xlKSlcblx0ICAgIH1cblx0ICAgIFxuXHR9XG5cdGlmIChpZy5idXR0b24oJ2VkaXQnKSkge1xuICAgICAgICAgICAgYXJ0aWNsZS5uYW1lID0gcHJvbXB0KCdOZXcgbmFtZScsIGFydGljbGUubmFtZSk7XG4gICAgICAgICAgICBhcnRpY2xlLnByaWNlID0gcGFyc2VJbnQocHJvbXB0KCdOZXcgcHJpY2UnLCBhcnRpY2xlLnByaWNlKSwgMTApO1xuXHR9XG5cdGlnLmtsYXNzKCdwcmljZScpLnNwYW4oJ+KCrCAnICsgYXJ0aWNsZS5wcmljZSk7XG4gICAgfSk7XG59XG5cblxuZnVuY3Rpb24gY2FydFZpZXcoY2FydCkge1xuICAgIGlnLmRpdigoKSA9PiB7XG5cdGlnLnVsKCgpID0+IHtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2FydC5lbnRyaWVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGVudHJ5ID0gY2FydC5lbnRyaWVzW2ldO1xuXHRcdGlnLmxpKCgpID0+IHtcblx0XHQgICAgaWYgKGlnLmJ1dHRvbignPDwnKSkge1xuXHRcdFx0aWYgKC0tZW50cnkuYW1vdW50IDwgMSkge1xuXHRcdFx0ICAgIGNhcnQuZW50cmllcy5zcGxpY2UoY2FydC5lbnRyaWVzLmluZGV4T2YoZW50cnkpLCAxKTtcblx0XHRcdH1cblx0XHQgICAgfVxuXHRcdCAgICBpZy5zcGFuKGVudHJ5LmFydGljbGUubmFtZSk7XG5cdFx0ICAgIGlnLmtsYXNzKCdwcmljZScpLnNwYW4oZW50cnkuYW1vdW50ICsgJ3gnKTsgXG5cdFx0fSk7XG5cdCAgICB9XG5cdH0pO1xuXHRpZy5zcGFuKCgnVG90YWw6IOKCrCAnICsgY2FydC50b3RhbCkucmVwbGFjZSgvKFxcLlxcZFxcZClcXGQqLywnJDEnKSk7XG4gICAgfSk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBpZztcbiIsIlxuJ3VzZSBzdHJpY3QnO1xuXG4vKlxuICogVE9ETzpcbiAqIC0gZG9uJ3QgYnVpbGQgdm5vZGUgd2hlbiBoYW5kbGluZyBldmVudC5cbiAqIC0gbWFrZSBgaGVyZWAgbW9yZSByb2J1c3RcbiAqIC0gb3B0aW1pemUgdXNlIG9mIGlkcyBpbiBsaXN0c1xuICogLSBlbGltaW5hdGUgLmNsYXNzLyNpZCBwYXJzaW5nXG4gKiAtIHN1cHBvcnQga2V5LWJhc2VkIHBhdGNoaW5nIChhdHRyIGBrZXlgKVxuICovXG5cbmNsYXNzIFRyaW1HVUkge1xuICAgIGNvbnN0cnVjdG9yIChhcHAsIG1vZGVsLCByb290KSB7XG5cdHRoaXMuYXBwID0gYXBwO1xuXHR0aGlzLm1vZGVsID0gbW9kZWxcblx0dGhpcy5yb290ID0gcm9vdDtcblx0dGhpcy5ldmVudCA9IG51bGw7XG5cdHRoaXMuZm9jdXMgPSBbXTtcblx0dGhpcy5ub2RlID0gbnVsbDtcblx0dGhpcy5vbk1vdW50cyA9IHt9O1xuXHR0aGlzLnRpbWVycyA9IHt9O1xuXHR0aGlzLmhhbmRsZXJzID0ge307XG5cdHRoaXMuaWRzID0gMDtcblx0dGhpcy5hdHRyaWJ1dGVzID0ge307XG5cdHRoaXMuYWRkU2ltcGxlRWxlbWVudHMoKTtcblx0dGhpcy5hZGRJbnB1dEVsZW1lbnRzKCk7XG4gICAgfVxuXG4gICAgcnVuKCkge1xuXHR0aGlzLm1vdW50KHRoaXMucmVuZGVyT25jZSgpKTtcbiAgICB9XG4gICAgXG4gICAgcmVnaXN0ZXIoZXZlbnQsIGlkKSB7XG5cdC8vIG9ubHkgYWRkIG9uZSBoYW5kbGVyIHRvIHJvb3QsIHBlciBldmVudCB0eXBlLlxuXHRpZiAoIXRoaXMuaGFuZGxlcnMuaGFzT3duUHJvcGVydHkoZXZlbnQpKSB7XG5cdCAgICB0aGlzLmhhbmRsZXJzW2V2ZW50XSA9IFtdO1xuXHQgICAgdmFyIHIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLnJvb3QpO1xuXHQgICAgci5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBlID0+IHtcblx0XHRlLnN0b3BQcm9wYWdhdGlvbigpOyAvLyBkb24ndCBsZWFrIHVwd2FyZHNcblx0XHR2YXIgaWQgPSBlLnRhcmdldC5nZXRBdHRyaWJ1dGUoJ2lkJyk7XG5cdFx0aWYgKHRoaXMuaGFuZGxlcnNbZXZlbnRdLmluZGV4T2YoaWQpID4gLTEpIHtcblx0XHQgICAgdGhpcy5ldmVudCA9IGU7XG5cdFx0ICAgIHRoaXMuZG9SZW5kZXIoKTtcblx0XHR9XG5cdCAgICB9LCBmYWxzZSk7XG5cdH1cblx0dGhpcy5oYW5kbGVyc1tldmVudF0ucHVzaChpZCk7XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG5cdGZvciAodmFyIGsgaW4gdGhpcy5oYW5kbGVycykge1xuXHQgICAgaWYgKHRoaXMuaGFuZGxlcnMuaGFzT3duUHJvcGVydHkoaykpIHtcblx0XHR0aGlzLmhhbmRsZXJzW2tdID0gW107XG5cdCAgICB9XG5cdH1cblx0dGhpcy5vbk1vdW50cyA9IHt9O1xuXHR0aGlzLmZvY3VzID0gW107XG5cdHRoaXMuaWRzID0gMDtcbiAgICB9XG5cbiAgICByZW5kZXJPbmNlKCkge1xuXHR0aGlzLnJlc2V0KCk7XG5cdHRoaXMuYXBwKHRoaXMubW9kZWwpO1xuICAgIH1cblxuICAgIGRvUmVuZGVyKCkge1xuXHQvLyB0d2ljZTogb25lIHRvIGhhbmRsZSBldmVudCwgb25lIHRvIHN5bmMgdmlldy5cblx0dmFyIF8gPSB0aGlzLnJlbmRlck9uY2UoKTtcblx0dmFyIG5vZGUgPSB0aGlzLnJlbmRlck9uY2UoKTtcblx0dGhpcy5tb3VudChub2RlKTtcbiAgICB9XG5cbiAgICBtb3VudChub2RlKSB7XG5cdHZhciBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLnJvb3QpO1xuXHRpZiAodGhpcy5ub2RlICE9PSBudWxsKSB7XG5cdCAgICByZWNvbmNpbGVLaWRzKGNvbnRhaW5lciwgY29udGFpbmVyLmNoaWxkTm9kZXMsIHRoaXMuZm9jdXMpO1xuXHR9XG5cdGVsc2Uge1xuXHQgICAgd2hpbGUgKGNvbnRhaW5lci5maXJzdENoaWxkKSB7XG5cdFx0Y29udGFpbmVyLnJlbW92ZUNoaWxkKGNvbnRhaW5lci5maXJzdENoaWxkKTtcblx0ICAgIH1cblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5mb2N1cy5sZW5ndGg7IGkrKykge1xuXHRcdGNvbnRhaW5lci5hcHBlbmRDaGlsZChidWlsZCh0aGlzLmZvY3VzW2ldKSk7XG5cdCAgICB9XG5cdH1cblx0dGhpcy5ub2RlID0gbm9kZTtcblx0XG5cdGZvciAodmFyIGlkIGluIHRoaXMub25Nb3VudHMpIHtcblx0ICAgIGlmICh0aGlzLm9uTW91bnRzLmhhc093blByb3BlcnR5KGlkKSkge1xuXHRcdHZhciBkb1NvbWV0aGluZyA9IHRoaXMub25Nb3VudHNbaWRdO1xuXHRcdHZhciBlbHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7XG5cdFx0ZG9Tb21ldGhpbmcoZWx0KTtcblx0ICAgIH1cblx0fVxuXHRcbiAgICB9XG5cbiAgICBkZWFsV2l0aEl0KGUpIHtcblx0dGhpcy5ldmVudCA9IGU7XG5cdHRoaXMuZG9SZW5kZXIoKTtcbiAgICB9XG5cblxuICAgIGF0dHJzKGFzKSB7XG5cdGZvciAodmFyIGEgaW4gYXMpIHtcblx0ICAgIGlmIChhcy5oYXNPd25Qcm9wZXJ0eShhKSkge1xuXHRcdHRoaXMuYXR0cmlidXRlc1thXSA9IGFzW2FdO1xuXHQgICAgfVxuXHR9XG5cdHJldHVybiB0aGlzO1xuICAgIH1cblxuXG4gICAgXG4gICAgb24oZWx0LCBldmVudHMsIGJsb2NrKSB7XG5cdHZhciBpZCA9IHRoaXMuYXR0cmlidXRlc1snaWQnXSB8fCAoJ2lkJyArIHRoaXMuaWRzKyspO1xuXHRldmVudHMuZm9yRWFjaChlID0+IHRoaXMucmVnaXN0ZXIoZSwgaWQpKTtcblx0XG5cdHJldHVybiB0aGlzLmlkKGlkKS53aXRoRWxlbWVudChlbHQsICgpID0+IHtcblx0ICAgIHZhciBldmVudCA9IHRoaXMuZXZlbnQ7XG5cdCAgICBpZiAoZXZlbnQgJiYgZXZlbnQudGFyZ2V0LmdldEF0dHJpYnV0ZSgnaWQnKSA9PT0gaWQpIHtcblx0XHR0aGlzLmV2ZW50ID0gdW5kZWZpbmVkOyAvLyBtYXliZSBkbyBpbiB0b3BsZXZlbD8/P1xuXHRcdHJldHVybiBibG9jayhldmVudCk7IC8vIGxldCBpdCBiZSBoYW5kbGVkXG5cdCAgICB9XG5cdCAgICByZXR1cm4gYmxvY2soKTtcblx0fSk7XG4gICAgfVxuXG4gICAgd2l0aEVsZW1lbnQoZWx0LCBmdW5jLCBldnMpIHtcblx0Ly8gVE9ETzogaWYgdGhpcy5wcmV0ZW5kLCBkb24ndCBidWlsZCB2bm9kZXNcblx0dmFyIHBhcmVudCA9IHRoaXMuZm9jdXM7XG5cdHRoaXMuZm9jdXMgPSBbXTtcblxuXHQvLyBDb3B5IHRoZSBjdXJyZW50IGF0dHJpYnV0ZSBzZXRcblx0dmFyIG15QXR0cnMgPSB7fTtcblx0Zm9yICh2YXIgYSBpbiB0aGlzLmF0dHJpYnV0ZXMpIHtcblx0ICAgIGlmICh0aGlzLmF0dHJpYnV0ZXMuaGFzT3duUHJvcGVydHkoYSkpIHtcblx0XHRteUF0dHJzW2FdID0gdGhpcy5hdHRyaWJ1dGVzW2FdO1xuXHQgICAgfVxuXHR9XG5cdHRoaXMuYXR0cmlidXRlcyA9IHt9OyAvLyBraWRzIGRvbid0IGluaGVyaXQgYXR0cnMuXG5cdFxuXHR0cnkge1xuXHQgICAgcmV0dXJuIGZ1bmMoKTtcblx0fVxuXHRmaW5hbGx5IHtcblx0ICAgIGlmIChteUF0dHJzICYmIG15QXR0cnMub25Nb3VudCkge1xuXHRcdHRoaXMub25Nb3VudHNbbXlBdHRyc1snaWQnXV0gPSBteUF0dHJzLm9uTW91bnQ7XG5cdFx0ZGVsZXRlIG15QXR0cnMub25Nb3VudDtcblx0ICAgIH1cblx0ICAgIHZhciB2bm9kZSA9IHt0YWc6IGVsdCwgYXR0cnM6IG15QXR0cnMsIGtpZHM6IHRoaXMuZm9jdXN9O1xuXHQgICAgcGFyZW50LnB1c2godm5vZGUpO1xuXHQgICAgdGhpcy5mb2N1cyA9IHBhcmVudDtcblx0fSAgICBcbiAgICB9XG5cblxuICAgIGhlcmUoZnVuYywgYmxvY2spIHtcblx0dmFyIHBvcyA9IHRoaXMuZm9jdXMubGVuZ3RoO1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdHJldHVybiBibG9jayhmdW5jdGlvbiAoKSB7IC8vIGJlY2F1c2UgYXJndW1lbnRzLlxuXHQgICAgdmFyIHBhcmVudCA9IHNlbGYuZm9jdXM7XG5cdCAgICBzZWxmLmZvY3VzID0gW107XG5cdCAgICB0cnkge1xuXHRcdHJldHVybiBmdW5jLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG5cdCAgICB9XG5cdCAgICBmaW5hbGx5IHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuZm9jdXMubGVuZ3RoOyBpKyspIHtcblx0XHQgICAgcGFyZW50LnNwbGljZShwb3MgKyBpLCAwLCBzZWxmLmZvY3VzW2ldKTtcblx0XHR9XG5cdFx0c2VsZi5mb2N1cyA9IHBhcmVudDtcblx0ICAgIH1cblx0fSk7XG4gICAgfVxuXG5cbiAgICBjb250ZW50KGMsIGV2KSB7XG5cdGlmICh0eXBlb2YgYyA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgYy5hcHBseSh1bmRlZmluZWQsIGV2KTtcblx0fVxuXHRpZiAodHlwZW9mIGMgPT09ICdzdHJpbmcnKSB7XG5cdCAgICB0aGlzLnRleHQoYyk7XG5cdH1cbiAgICB9XG5cblxuICAgIHRleHQodHh0KSB7XG5cdHRoaXMuZm9jdXMucHVzaCh0eHQpO1xuICAgIH1cbiAgICBcbiAgICBcbiAgICAvLyBjb252ZW5pZW5jZVxuXG4gICAgYXR0cihuLCB4KSB7XG5cdHZhciBvYmogPSB7fTtcblx0b2JqW25dID0geDtcblx0cmV0dXJuIHRoaXMuYXR0cnMob2JqKTtcbiAgICB9XG4gICAgXG4gICAga2xhc3MoeCkge1xuXHRyZXR1cm4gdGhpcy5hdHRyKCdjbGFzcycsIHgpO1xuICAgIH1cblxuICAgIGlkKHgpIHtcblx0cmV0dXJuIHRoaXMuYXR0cignaWQnLCB4KTtcbiAgICB9XG5cbiAgICB0ZXh0YXJlYSh4KSB7XG5cdHJldHVybiB0aGlzLm9uKCd0ZXh0YXJlYScsIFsna2V5dXAnLCAnYmx1ciddLCBldiA9PiB7XG5cdCAgICB2YXIgbmV3VmFsdWUgPSBldiA/IGV2LnRhcmdldC52YWx1ZSA6IHZhbHVlO1xuXHQgICAgdGhpcy5jb250ZW50KHgsIGV2KTtcblx0ICAgIHJldHVybiBuZXdWYWx1ZTtcblx0fSk7XG4gICAgfVxuICAgIFxuICAgIHRleHRCb3godmFsdWUpIHtcblx0dmFyIGF0dHJzID0ge307XG5cdGF0dHJzLnR5cGUgPSAndGV4dCc7XG5cdGF0dHJzLnZhbHVlID0gdmFsdWU7XG5cdGF0dHJzLm9uTW91bnQgPSBlbHQgPT4ge1xuICAgIFx0ICAgIGVsdC52YWx1ZSA9IHZhbHVlO1xuXHR9O1xuXHRcblx0cmV0dXJuIHRoaXMuYXR0cnMoYXR0cnMpLm9uKCdpbnB1dCcsIFsnaW5wdXQnXSwgZXYgPT4ge1xuXHQgICAgcmV0dXJuIGV2ID8gZXYudGFyZ2V0LnZhbHVlIDogdmFsdWU7XG5cdH0pO1xuICAgIH1cblxuICAgIGNoZWNrQm94KHZhbHVlKSB7XG5cdHZhciBhdHRycyA9IGF0dHJzIHx8IHt9O1xuXHRhdHRycy50eXBlID0gJ2NoZWNrYm94Jztcblx0aWYgKHZhbHVlKSB7XG5cdCAgICBhdHRycy5jaGVja2VkID0gJ3RydWUnO1xuXHR9XG5cdGF0dHJzLm9uTW91bnQgPSBlbHQgPT4ge1xuXHQgICAgZWx0LmNoZWNrZWQgPSB2YWx1ZTtcblx0fTtcblx0XG5cdHJldHVybiB0aGlzLmF0dHJzKGF0dHJzKS5vbignaW5wdXQnLCBbJ2NsaWNrJ10sIGV2ID0+IHtcblx0ICAgIHJldHVybiBldiA/IGV2LnRhcmdldC5jaGVja2VkIDogdmFsdWU7XG5cdH0pO1xuICAgIH1cblxuXG4gICAgYWZ0ZXIoaWQsIGRlbGF5KSB7XG5cdGlmICh0aGlzLnRpbWVycy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcblx0ICAgIHJldHVybiB0aGlzLnRpbWVyc1tpZF07XG5cdH1cblxuXHR0aGlzLnRpbWVyc1tpZF0gPSBmYWxzZTtcblx0d2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuXHQgICAgdGhpcy50aW1lcnNbaWRdID0gdHJ1ZTtcblx0ICAgIHRoaXMuZG9SZW5kZXIoKTtcblx0fSwgZGVsYXkpO1xuICAgIH1cblxuXG4gICAgYWNsaWNrKHgpIHtcblx0cmV0dXJuIHRoaXMub24oJ2EnLCBbJ2NsaWNrJ10sIGV2ID0+IHtcblx0ICAgIHRoaXMuY29udGVudCh4LCBldik7XG5cdCAgICByZXR1cm4gZXYgIT09IHVuZGVmaW5lZDtcblx0fSk7XG4gICAgfVxuICAgIFxuICAgIGJ1dHRvbih4KSB7XG5cdHJldHVybiB0aGlzLm9uKCdidXR0b24nLCBbJ2NsaWNrJ10sIGV2ID0+IHtcblx0ICAgIHRoaXMuY29udGVudCh4LCBldik7XG5cdCAgICByZXR1cm4gZXYgIT09IHVuZGVmaW5lZDtcblx0fSk7XG4gICAgfVxuICAgIFxuXG4gICAgc2VsZWN0KHZhbHVlLCBibG9jaykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdGZ1bmN0aW9uIG9wdGlvbihvcHRWYWx1ZSwgbGFiZWwpIHtcblx0ICAgIHZhciBhdHRycyA9IHt2YWx1ZTogb3B0VmFsdWV9O1xuXHQgICAgaWYgKG9wdFZhbHVlID09PSB2YWx1ZSkge1xuXHRcdGF0dHJzWydzZWxlY3RlZCddID0gdHJ1ZTtcblx0ICAgIH1cblx0ICAgIGxhYmVsID0gbGFiZWwgfHwgb3B0VmFsdWU7XG5cdCAgICByZXR1cm4gc2VsZi5hdHRycyhhdHRycykud2l0aEVsZW1lbnQoJ29wdGlvbicsICgpID0+IHNlbGYudGV4dChsYWJlbCkpO1xuXHR9XG5cdFxuXHRyZXR1cm4gdGhpcy5vbignc2VsZWN0JywgWydjaGFuZ2UnXSwgZXYgPT4ge1xuXHQgICAgYmxvY2sob3B0aW9uKTtcblx0ICAgIHJldHVybiBldiAgXG5cdFx0PyBldi50YXJnZXQub3B0aW9uc1tldi50YXJnZXQuc2VsZWN0ZWRJbmRleF0udmFsdWVcblx0XHQ6IHZhbHVlO1xuXHR9KTtcbiAgICB9XG4gICAgXG4gICAgcmFkaW9Hcm91cCh2YWx1ZSwgYmxvY2spIHtcblx0dmFyIHJlc3VsdCA9IHZhbHVlO1xuXHR2YXIgbmFtZSA9ICduYW1lJyArICh0aGlzLmlkcysrKTtcblx0ZnVuY3Rpb24gcmFkaW8ocmFkaW9WYWx1ZSwgbGFiZWwpIHtcblx0ICAgIHZhciBhdHRycyA9IHt0eXBlOiAncmFkaW8nLCBuYW1lOiBuYW1lfTtcblx0ICAgIGlmIChyYWRpb1ZhbHVlID09PSB2YWx1ZSkge1xuXHRcdGF0dHJzWydjaGVja2VkJ10gPSB0cnVlO1xuXHQgICAgfVxuXHQgICAgYXR0cnMub25Nb3VudCA9IGZ1bmN0aW9uIChlbHQpIHtcblx0XHRlbHQuY2hlY2tlZCA9IChyYWRpb1ZhbHVlID09PSB2YWx1ZSk7XG5cdCAgICB9O1xuXHQgICAgcmV0dXJuIHRoaXMub24oJ2xhYmVsJywgW10sICgpID0+IHtcblx0XHR0aGlzLmF0dHJzKGF0dHJzKS5vbignaW5wdXQnLCBbJ2NsaWNrJ10sIGV2ID0+IHtcblx0XHQgICAgaWYgKGV2KSB7XG5cdFx0XHRyZXN1bHQgPSByYWRpb1ZhbHVlO1xuXHRcdCAgICB9XG5cdFx0ICAgIHJldHVybiByYWRpb1ZhbHVlO1xuXHRcdH0pXG5cdFx0dGhpcy50ZXh0KGxhYmVsIHx8IHJhZGlvVmFsdWUpO1xuXHRcdHJldHVybiByYWRpb1ZhbHVlO1xuXHQgICAgfSk7XG5cdH1cblx0XG5cdGJsb2NrKHJhZGlvKTtcblx0cmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBsYWJlbCh0eHQpIHtcblx0Ly8gRklYTUU6IHRoaXMgaXMgZXh0cmVtZWx5IGJyaXR0bGUuXG5cdHZhciBpZCA9ICdpZCcgKyAodGhpcy5pZHMgKyAxKTsgLy8gTkI6IG5vdCArKyAhIVxuXHRyZXR1cm4gdGhpcy5hdHRyKCdmb3InLCBpZCkud2l0aEVsZW1lbnQoJ2xhYmVsJywgKCkgPT4gdGhpcy50ZXh0KHR4dCkpO1xuICAgIH1cbiAgICBcblxuICAgIGFkZElucHV0RWxlbWVudHMoKSB7XG5cdHZhciBiYXNpY0lucHV0cyA9IHtcblx0ICAgIHNwaW5Cb3g6IHt0eXBlOiAnbnVtYmVyJywgZXZlbnQ6ICdpbnB1dCd9LFxuXHQgICAgc2xpZGVyOiB7dHlwZTogJ3JhbmdlJywgZXZlbnQ6ICdpbnB1dCd9LFxuXHQgICAgZW1haWxCb3g6IHt0eXBlOiAnZW1haWwnLCBldmVudDogJ2lucHV0J30sXG5cdCAgICBzZWFyY2hCb3g6IHt0eXBlOiAnc2VhcmNoJywgZXZlbnQ6ICdpbnB1dCd9LFxuXHQgICAgZGF0ZVBpY2tlcjoge3R5cGU6ICdkYXRlJywgZXZlbnQ6ICdjaGFuZ2UnfSxcblx0ICAgIGNvbG9yUGlja2VyOiB7dHlwZTogJ2NvbG9yJywgZXZlbnQ6ICdjaGFuZ2UnfSxcblx0ICAgIGRhdGVUaW1lUGlja2VyOiB7dHlwZTogJ2RhdGV0aW1lJywgZXZlbnQ6ICdjaGFuZ2UnfSxcblx0ICAgIGxvY2FsRGF0ZVRpbWVQaWNrZXI6IHt0eXBlOiAnZGF0ZXRpbWUtbG9jYWwnLCBldmVudDogJ2NoYW5nZSd9LFxuXHQgICAgbW9udGhQaWNrZXI6IHt0eXBlOiAnd2VlaycsIGV2ZW50OiAnY2hhbmdlJ30sXG5cdCAgICB3ZWVrUGlja2VyOiB7dHlwZTogJ3dlZWsnLCBldmVudDogJ2NoYW5nZSd9LFxuXHQgICAgdGltZVBpY2tlcjoge3R5cGU6ICd0aW1lJywgZXZlbnQ6ICdjaGFuZ2UnfVxuXHR9XG5cdGZvciAodmFyIG5hbWUgaW4gYmFzaWNJbnB1dHMpIHtcblx0ICAgIGlmIChiYXNpY0lucHV0cy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuXHRcdChuYW1lID0+IHtcblx0XHQgICAgdGhpc1tuYW1lXSA9IHZhbHVlID0+IHRoaXNcblx0XHRcdC5hdHRycyh7dHlwZTogYmFzaWNJbnB1dHNbbmFtZV0udHlwZSwgdmFsdWU6IHZhbHVlfSlcblx0XHRcdC5vbignaW5wdXQnLCBbYmFzaWNJbnB1dHNbbmFtZV0uZXZlbnRdLFxuXHRcdFx0ICAgIGV2ID0+IGV2ID8gZXYudGFyZ2V0LnZhbHVlIDogdmFsdWUpO1xuXHRcdH0pKG5hbWUpO1xuXHQgICAgfVxuXHR9XG4gICAgfVxuXG4gICAgYWRkU2ltcGxlRWxlbWVudHMoKSB7XG5cdC8vIEN1cnJlbnRseSwgdGhlc2UgZG9uJ3QgaGF2ZSBldmVudHMuXG5cdFsnYScsICdzdHJvbmcnLCAnYnInLCAnc3BhbicsICdoMScsICdoMicsICdoMycsICdoNCcsXG5cdCAnc2VjdGlvbicsICdkaXYnLCAndWwnLCAnb2wnLCAnbGknLCAnaGVhZGVyJywgJ2Zvb3RlcicsICdjb2RlJywgJ3ByZScsXG5cdCAnZGwnLCAnZHQnLCAnZGQnLCAnZmllbGRzZXQnLCAndGFibGUnLCAndGQnLCAndHInLCAndGgnLCAnY29sJywgJ3RoZWFkJ11cblx0ICAgIC5mb3JFYWNoKGVsdCA9PiBcblx0XHQgICAgIChlbHQgPT4ge1xuXHRcdFx0IHRoaXNbZWx0XSA9IHggPT4gdGhpcy53aXRoRWxlbWVudChlbHQsICgpID0+IHRoaXMuY29udGVudCh4KSk7XG5cdFx0ICAgICB9KShlbHQpKTtcbiAgICB9XG4gICAgICAgIFxufVxuXG5cbi8qXG5cblRoZSBmb2xsb3dpbmcgZnVuY3Rpb25zIGRvbid0IGFjY2VzcyBUcmltR1VJIHN0YXRlLCBidXQgc2ltcGx5XG5wYXRjaCB0aGUgcmVhbCBkb20gKDFzdCBhcmcpIGJhc2VkIG9uIHRoZSB2ZG9tICgybmQgYXJnKS5cblxudmRvbSBlbGVtZW50XG57dGFnOlxuIGF0dHJzOiB7fSBldGMuXG4ga2lkczogW10gfVxuXG4qL1xuXG5mdW5jdGlvbiBjb21wYXQoZCwgdikge1xuICAgIC8vY29uc29sZS5sb2coJ0NvbXBhdD8gJyk7XG4gICAgLy9jb25zb2xlLmxvZygnZCA9ICcgKyBkLm5vZGVWYWx1ZSk7XG4gICAgLy9jb25zb2xlLmxvZygndiA9ICcgKyBKU09OLnN0cmluZ2lmeSh2KSk7XG4gICAgcmV0dXJuIChkLm5vZGVUeXBlID09PSBOb2RlLlRFWFRfTk9ERSAmJiAodHlwZW9mIHYgIT09ICdvYmplY3QnKSlcblx0fHwgKGQudGFnTmFtZSA9PT0gdi50YWcudG9VcHBlckNhc2UoKSk7XG59XG5cblxuZnVuY3Rpb24gcmVjb25jaWxlKGRvbSwgdmRvbSkge1xuICAgIGlmICghY29tcGF0KGRvbSwgdmRvbSkpIHtcblx0dGhyb3cgJ0NhbiBvbmx5IHJlY29uY2lsZSBjb21wYXRpYmxlIG5vZGVzJztcbiAgICB9XG4gICAgXG4gICAgLy8gVGV4dCBub2Rlc1xuICAgIGlmICh0eXBlb2YgdmRvbSAhPT0gJ29iamVjdCcpIHtcblx0aWYgKGRvbS5ub2RlVmFsdWUgIT09IHZkb20pIHtcblx0ICAgIGRvbS5ub2RlVmFsdWUgPSB2ZG9tLnRvU3RyaW5nKCk7XG5cdH1cblx0cmV0dXJuO1xuICAgIH1cblxuXG4gICAgLy8gRWxlbWVudCBub2Rlc1xuICAgIHZhciB2YXR0cnMgPSB2ZG9tLmF0dHJzIHx8IHt9O1xuICAgIGZvciAodmFyIHZhdHRyIGluIHZhdHRycykge1xuXHRpZiAodmF0dHJzLmhhc093blByb3BlcnR5KHZhdHRyKSkge1xuXHQgICAgaWYgKGRvbS5oYXNBdHRyaWJ1dGUodmF0dHIpKSB7XG5cdFx0dmFyIGRhdHRyID0gZG9tLmdldEF0dHJpYnV0ZSh2YXR0cik7XG5cdFx0aWYgKGRhdHRyICE9PSB2YXR0cnNbdmF0dHJdLnRvU3RyaW5nKCkpIHsgXG5cdFx0ICAgIC8vY29uc29sZS5sb2coJ1VwZGF0aW5nIGF0dHJpYnV0ZTogJyArIHZhdHRyICsgJyA9ICcgKyB2YXR0cnNbdmF0dHJdKTtcblx0XHQgICAgZG9tLnNldEF0dHJpYnV0ZSh2YXR0ciwgdmF0dHJzW3ZhdHRyXSk7XG5cdFx0fVxuXHQgICAgfVxuXHQgICAgZWxzZSB7XG5cdFx0Ly9jb25zb2xlLmxvZygnQWRkaW5nIGF0dHJpYnV0ZTogJyArIHZhdHRyICsgJyA9ICcgKyB2YXR0cnNbdmF0dHJdKTtcblx0XHRkb20uc2V0QXR0cmlidXRlKHZhdHRyLCB2YXR0cnNbdmF0dHJdKTtcblx0ICAgIH1cblx0fVxuICAgIH1cbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRvbS5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG5cdHZhciBkYXR0ciA9IGRvbS5hdHRyaWJ1dGVzW2ldO1xuXHRpZiAoIXZhdHRycy5oYXNPd25Qcm9wZXJ0eShkYXR0ci5ub2RlTmFtZSkpIHtcblx0ICAgIC8vY29uc29sZS5sb2coJ1JlbW92aW5nIGF0dHJpYnV0ZTogJyArIGRhdHRyLm5vZGVOYW1lKTtcblx0ICAgIGRvbS5yZW1vdmVBdHRyaWJ1dGUoZGF0dHIubm9kZU5hbWUpO1xuXHR9XG4gICAgfVxuXG4gICAgcmVjb25jaWxlS2lkcyhkb20sIGRvbS5jaGlsZE5vZGVzLCB2ZG9tLmtpZHMpO1xufVxuXG5mdW5jdGlvbiByZWNvbmNpbGVLaWRzKGRvbSwgZGtpZHMsIHZraWRzKSB7XG4gICAgdmFyIGxlbiA9IE1hdGgubWluKGRraWRzLmxlbmd0aCwgdmtpZHMubGVuZ3RoKTtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG5cdHZhciBka2lkID0gZGtpZHNbaV07XG5cdHZhciB2a2lkID0gdmtpZHNbaV07XG5cdGlmIChjb21wYXQoZGtpZCwgdmtpZCkpIHtcblx0ICAgIHJlY29uY2lsZShka2lkLCB2a2lkKTtcblx0fVxuXHRlbHNlIHtcblx0ICAgIC8vY29uc29sZS5sb2coJ1JlcGxhY2luZyBjaGlsZCcpO1xuXHQgICAgZG9tLnJlcGxhY2VDaGlsZChidWlsZCh2a2lkKSwgZGtpZCk7XG5cdH1cbiAgICB9XG4gICAgXG4gICAgaWYgKGRraWRzLmxlbmd0aCA+IGxlbikge1xuXHR3aGlsZSAoZGtpZHMubGVuZ3RoID4gbGVuKSB7XG5cdCAgICAvL2NvbnNvbGUubG9nKCdSZW1vdmluZyBjaGlsZCAnKTtcblx0ICAgIGRvbS5yZW1vdmVDaGlsZChka2lkc1tsZW5dKTtcblx0fVxuICAgIH1cbiAgICBlbHNlIGlmICh2a2lkcy5sZW5ndGggPiBsZW4pIHtcblx0Zm9yICh2YXIgaSA9IGxlbjsgaSA8IHZraWRzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAvL2NvbnNvbGUubG9nKCdBcHBlbmRpbmcgbmV3IGNoaWxkICcpO1xuXHQgICAgZG9tLmFwcGVuZENoaWxkKGJ1aWxkKHZraWRzW2ldKSk7XG5cdH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkKHZkb20pIHtcbiAgICBpZiAodmRvbSA9PT0gdW5kZWZpbmVkKSB7XG5cdHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgdmRvbSAhPT0gJ29iamVjdCcpIHtcblx0cmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHZkb20udG9TdHJpbmcoKSk7XG4gICAgfVxuXG4gICAgdmFyIGVsdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodmRvbS50YWcpO1xuICAgIHZhciB2YXR0cnMgPSB2ZG9tLmF0dHJzIHx8IHt9O1xuICAgIGZvciAodmFyIGsgaW4gdmF0dHJzKSB7XG5cdGlmICh2YXR0cnMuaGFzT3duUHJvcGVydHkoaykpIHtcblx0ICAgIGVsdC5zZXRBdHRyaWJ1dGUoaywgdmF0dHJzW2tdKTtcblx0fVxuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZkb20ua2lkcy5sZW5ndGg7IGkrKykge1xuXHRlbHQuYXBwZW5kQ2hpbGQoYnVpbGQodmRvbS5raWRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBlbHQ7ICAgIFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRyaW1HVUk7XG5cbiJdfQ==
