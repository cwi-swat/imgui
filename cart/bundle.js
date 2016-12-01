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

var Libimgui = require('../libimgui');

var wnd = new Libimgui(app, model, 'root');


function app(model) {
    shopDemoView(model.articles, model.cart);
}

function shopDemoView(articles, cart) {
    wnd.table(() => {
	wnd.tr(() => {
	    wnd.td({colspan: 2}, () => {
		if (wnd.button('update some items')) {
		    update(articles);
		}
		if (wnd.button('create a lot of items')) {
		    generate(articles, cart);
		}
	    });
	});
	wnd.tr(() => {
	    wnd.td(() => {
		wnd.h2('Available items');
		articlesView(cart, articles);
	    });
	    wnd.td(() => {
		wnd.h2('Your shopping cart');
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
    wnd.div(() => {
	if (wnd.button('new article')) {
	    articles.push(new Article(prompt('Article name'),
				      prompt('Price (please fill in a number)')));
	}
	wnd.ul(() => {
	    for (var i = 0; i < articles.length; i++) {
		articleView(cart, articles, articles[i], i);
	    }
	});
    });
}

function articleView(cart, articles, article, i) {
    wnd.li(() => {
	wnd.span(article.name);
	if (wnd.button('>>')) {
	    var existingEntry = cart.entries.find(entry => entry.article === article);
            if (existingEntry) {
		existingEntry.amount += 1;
            }
	    else {
		cart.entries.unshift(new Entry(article));
	    }
	    
	}
	if (wnd.button('edit')) {
            article.name = prompt('New name', article.name);
            article.price = parseInt(prompt('New price', article.price), 10);
	}
	wnd.klass('price').span('€ ' + article.price);
    });
}


function cartView(cart) {
    wnd.div(() => {
	wnd.ul(() => {
	    for (var i = 0; i < cart.entries.length; i++) {
		var entry = cart.entries[i];
		wnd.li(() => {
		    if (wnd.button('<<')) {
			if (--entry.amount < 1) {
			    cart.entries.splice(cart.entries.indexOf(entry), 1);
			}
		    }
		    wnd.span(entry.article.name);
		    wnd.klass('price').span(entry.amount + 'x'); 
		});
	    }
	});
	wnd.span(('Total: € ' + cart.total).replace(/(\.\d\d)\d*/,'$1'));
    });
}


module.exports = wnd;

},{"../libimgui":2}],2:[function(require,module,exports){


'use strict';

/*
 * TODO:
 * - don't build vnode when handling event.
 * - eliminate try-finally for perf
 * - make `here` more robust
 * - optimize use of ids in lists
 * - eliminate .class/#id parsing
 * - support key-based patching (attr `key`)
 */

class TrimGUI {
    constructor (app, model, root) {
        this.app = app;
        this.model = model;
        this.root = root;
        this.event = null;
        this.focus = [];
        this.node = null;
        this.onMounts = {};
        this.timers = {};
        this.handlers = {};
        this.ids = 0;
        this.attributes = {};
        this.route = document.location.hash;
        this.addSimpleElements();
        this.addInputElements();
        window.addEventListener('storage', this.dealWithIt, false);
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

    enRoute(hash, block) {
        if (!this.route) {
            return false;
        }
        if (this.route === hash) {
            this.route = undefined; // only run once.
            return true;
        }
        return false;
    }

    onStorage(block) {
        var event = this.event;
        if (event && event.type === 'storage') {
            this.event = undefined; 
            block(event); 
        }
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

    nextId() {
        return this.ids + 1;
    }
    
    
    // convenience

    attr(n, x) {
        var obj = {};
        obj[n] = x;
        return this.attrs(obj);
    }

    attrIf(c, n, x) {
        if (c) {
            return this.attr(n, x);
        }
        return this;
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
        var attrs = {type: 'text', value: value};
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
        
        return undefined;
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
        var idx = -1;
        var selected = -1;
        function option(optValue, label) {
            var attrs = {value: optValue};
            idx++;
            if (optValue === value) {
                selected = idx;
            }
            label = label || optValue;
            return self.attrs(attrs).withElement('option', () => self.text(label));
        }

        
        var myAttrs = {onMount: elt => {
            elt.selectedIndex = selected;
        }};

        return this.attrs(myAttrs).on('select', ['change'], ev => {
            block(option);
            return ev  
                ? ev.target.options[ev.target.selectedIndex].value
                : value;
        });
    }
    
    radioGroup(value, block) {
        var result = value;
        var name = 'name' + (this.ids++);
        var self = this;
        function radio(radioValue, label) {
            var attrs = {type: 'radio', name: name};
            if (radioValue === value) {
                attrs['checked'] = true;
            }
            attrs.onMount = elt => {
                elt.checked = (radioValue === value);
            };
            return self.on('label', [], () => {
                self.attrs(attrs).on('input', ['click'], ev => {
                    if (ev) {
                        result = radioValue;
                    }
                    return radioValue;
                });
                self.text(label || radioValue);
                return radioValue;
            });
        }
        
        block(radio);
        return result;
    }

    // label(txt) {
    //         // FIXME: this is extremely brittle.
    //         var id = 'id' + (this.ids + 1); // NB: not ++ !!
    //         return this.attr('for', id).withElement('label', () => this.text(txt));
    // }

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
        };
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
        ['a', 'p', 'label', 'strong', 'br', 'span', 'h1', 'h2', 'h3', 'h4',
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
    // console.log('Compat? ');
    // console.log('d = ' + d.nodeValue);
    // console.log('v = ' + JSON.stringify(v));
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
                let dattr = dom.getAttribute(vattr);
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
        let dattr = dom.attributes[i];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNob3AuanMiLCIuLi9saWJpbWd1aS9saWJpbWd1aS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG4ndXNlIHN0cmljdCc7XG5cblxuLyoqXG4gKiBEYXRhIG1vZGVsXG4gKi9cblxudmFyIGF1dG9OdW1iZXIgPSAwO1xuXG5jbGFzcyBBcnRpY2xlIHtcbiAgICBjb25zdHJ1Y3RvciAobmFtZSwgcHJpY2UpIHtcblx0dGhpcy5pZCA9ICsrYXV0b051bWJlcjsgLy8gVVVJRCBmb3IgdGhpcyBhcnRpY2xlXG5cdHRoaXMubmFtZSA9IG5hbWU7XG5cdHRoaXMucHJpY2UgPSBwcmljZTtcbiAgICB9XG59XG5cbmNsYXNzIEVudHJ5IHtcbiAgICBjb25zdHJ1Y3RvciAoYXJ0aWNsZSkge1xuXHR0aGlzLmlkID0gKythdXRvTnVtYmVyOyAvLyBVVUlEIGZvciB0aGlzIGVudHJ5XG5cdHRoaXMuYXJ0aWNsZSA9IGFydGljbGU7XG5cdHRoaXMuYW1vdW50ID0gMTtcbiAgICB9XG5cbiAgICBnZXQgcHJpY2UoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFydGljbGUgPyB0aGlzLmFydGljbGUucHJpY2UgKiB0aGlzLmFtb3VudCA6IDA7XG4gICAgfVxufVxuXG5jbGFzcyBTaG9wcGluZ0NhcnQge1xuICAgIGNvbnN0cnVjdG9yICgpIHtcblx0dGhpcy5lbnRyaWVzID0gW107XG4gICAgfVxuXG4gICAgZ2V0IHRvdGFsKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5lbnRyaWVzLnJlZHVjZShmdW5jdGlvbihzdW0sIGVudHJ5KSB7XG4gICAgICAgICAgICByZXR1cm4gc3VtICsgZW50cnkucHJpY2U7XG4gICAgICAgIH0sIDApO1xuICAgIH1cbn1cblxuLy8gU29tZSBhdmFpbGFibGUgYXJ0aWNsZXNcbnZhciBhcnRpY2xlcyA9IFtcbiAgICBbJ0Z1bm55IEJ1bm5pZXMnLCAxNy42M10sXG4gICAgWydBd2Vzb21lIFJlYWN0JywgMjMuOTVdLFxuICAgIFsnU2Vjb25kIGhhbmQgTmV0Ym9vaycsIDUwLjAwXVxuXS5tYXAoZnVuY3Rpb24oZSkge1xuICAgIHJldHVybiBuZXcgQXJ0aWNsZShlWzBdLCBlWzFdKTtcbn0pO1xuXG4vLyBPdXIgc2hvcHBpbmcgY2FydFxudmFyIGNhcnQgPSBuZXcgU2hvcHBpbmdDYXJ0KCk7XG5cbi8vIFdpdGggYSBkZW1vIGl0ZW0gaW5zaWRlXG5jYXJ0LmVudHJpZXMucHVzaChuZXcgRW50cnkoYXJ0aWNsZXNbMF0pKTtcblxuXG52YXIgbW9kZWwgPSB7XG4gICAgYXJ0aWNsZXM6IGFydGljbGVzLFxuICAgIGNhcnQ6IGNhcnRcbn1cblxuXG4vKlxuICogR1VJXG4gKi8gXG5cbnZhciBMaWJpbWd1aSA9IHJlcXVpcmUoJy4uL2xpYmltZ3VpJyk7XG5cbnZhciB3bmQgPSBuZXcgTGliaW1ndWkoYXBwLCBtb2RlbCwgJ3Jvb3QnKTtcblxuXG5mdW5jdGlvbiBhcHAobW9kZWwpIHtcbiAgICBzaG9wRGVtb1ZpZXcobW9kZWwuYXJ0aWNsZXMsIG1vZGVsLmNhcnQpO1xufVxuXG5mdW5jdGlvbiBzaG9wRGVtb1ZpZXcoYXJ0aWNsZXMsIGNhcnQpIHtcbiAgICB3bmQudGFibGUoKCkgPT4ge1xuXHR3bmQudHIoKCkgPT4ge1xuXHQgICAgd25kLnRkKHtjb2xzcGFuOiAyfSwgKCkgPT4ge1xuXHRcdGlmICh3bmQuYnV0dG9uKCd1cGRhdGUgc29tZSBpdGVtcycpKSB7XG5cdFx0ICAgIHVwZGF0ZShhcnRpY2xlcyk7XG5cdFx0fVxuXHRcdGlmICh3bmQuYnV0dG9uKCdjcmVhdGUgYSBsb3Qgb2YgaXRlbXMnKSkge1xuXHRcdCAgICBnZW5lcmF0ZShhcnRpY2xlcywgY2FydCk7XG5cdFx0fVxuXHQgICAgfSk7XG5cdH0pO1xuXHR3bmQudHIoKCkgPT4ge1xuXHQgICAgd25kLnRkKCgpID0+IHtcblx0XHR3bmQuaDIoJ0F2YWlsYWJsZSBpdGVtcycpO1xuXHRcdGFydGljbGVzVmlldyhjYXJ0LCBhcnRpY2xlcyk7XG5cdCAgICB9KTtcblx0ICAgIHduZC50ZCgoKSA9PiB7XG5cdFx0d25kLmgyKCdZb3VyIHNob3BwaW5nIGNhcnQnKTtcblx0XHRjYXJ0VmlldyhjYXJ0KTtcblx0ICAgIH0pO1xuXHR9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGUoYXJ0aWNsZXMsIGNhcnQpIHtcbiAgICB2YXIgYW1vdW50ID0gcGFyc2VJbnQocHJvbXB0KCdIb3cgbWFueSBhcnRpY2xlcyBhbmQgZW50cmllcyBzaG91bGQgYmUgY3JlYXRlZD8nLCAxMDAwKSk7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGFtb3VudDsgaSsrKSB7XG4gICAgICAgIHZhciBhcnQgPSBuZXcgQXJ0aWNsZSgnR2VuZXJhdGVkIGl0ZW0gJyArIGFydGljbGVzLmxlbmd0aCwgYXJ0aWNsZXMubGVuZ3RoKTtcbiAgICAgICAgYXJ0aWNsZXMucHVzaChhcnQpO1xuICAgICAgICBjYXJ0LmVudHJpZXMucHVzaChuZXcgRW50cnkoYXJ0KSk7XG4gICAgfVxufVxuXG5cblxuZnVuY3Rpb24gdXBkYXRlKGFydGljbGVzKSB7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IDEwOyBpKyspIHtcbiAgICAgICAgdmFyIGFydGljbGUgPSBhcnRpY2xlc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBhcnRpY2xlcy5sZW5ndGgpXTtcbiAgICAgICAgYXJ0aWNsZS5uYW1lICs9ICd4JztcbiAgICAgICAgYXJ0aWNsZS5wcmljZSArPSAxO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gYXJ0aWNsZXNWaWV3KGNhcnQsIGFydGljbGVzKSB7XG4gICAgd25kLmRpdigoKSA9PiB7XG5cdGlmICh3bmQuYnV0dG9uKCduZXcgYXJ0aWNsZScpKSB7XG5cdCAgICBhcnRpY2xlcy5wdXNoKG5ldyBBcnRpY2xlKHByb21wdCgnQXJ0aWNsZSBuYW1lJyksXG5cdFx0XHRcdCAgICAgIHByb21wdCgnUHJpY2UgKHBsZWFzZSBmaWxsIGluIGEgbnVtYmVyKScpKSk7XG5cdH1cblx0d25kLnVsKCgpID0+IHtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJ0aWNsZXMubGVuZ3RoOyBpKyspIHtcblx0XHRhcnRpY2xlVmlldyhjYXJ0LCBhcnRpY2xlcywgYXJ0aWNsZXNbaV0sIGkpO1xuXHQgICAgfVxuXHR9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gYXJ0aWNsZVZpZXcoY2FydCwgYXJ0aWNsZXMsIGFydGljbGUsIGkpIHtcbiAgICB3bmQubGkoKCkgPT4ge1xuXHR3bmQuc3BhbihhcnRpY2xlLm5hbWUpO1xuXHRpZiAod25kLmJ1dHRvbignPj4nKSkge1xuXHQgICAgdmFyIGV4aXN0aW5nRW50cnkgPSBjYXJ0LmVudHJpZXMuZmluZChlbnRyeSA9PiBlbnRyeS5hcnRpY2xlID09PSBhcnRpY2xlKTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZ0VudHJ5KSB7XG5cdFx0ZXhpc3RpbmdFbnRyeS5hbW91bnQgKz0gMTtcbiAgICAgICAgICAgIH1cblx0ICAgIGVsc2Uge1xuXHRcdGNhcnQuZW50cmllcy51bnNoaWZ0KG5ldyBFbnRyeShhcnRpY2xlKSk7XG5cdCAgICB9XG5cdCAgICBcblx0fVxuXHRpZiAod25kLmJ1dHRvbignZWRpdCcpKSB7XG4gICAgICAgICAgICBhcnRpY2xlLm5hbWUgPSBwcm9tcHQoJ05ldyBuYW1lJywgYXJ0aWNsZS5uYW1lKTtcbiAgICAgICAgICAgIGFydGljbGUucHJpY2UgPSBwYXJzZUludChwcm9tcHQoJ05ldyBwcmljZScsIGFydGljbGUucHJpY2UpLCAxMCk7XG5cdH1cblx0d25kLmtsYXNzKCdwcmljZScpLnNwYW4oJ+KCrCAnICsgYXJ0aWNsZS5wcmljZSk7XG4gICAgfSk7XG59XG5cblxuZnVuY3Rpb24gY2FydFZpZXcoY2FydCkge1xuICAgIHduZC5kaXYoKCkgPT4ge1xuXHR3bmQudWwoKCkgPT4ge1xuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYXJ0LmVudHJpZXMubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgZW50cnkgPSBjYXJ0LmVudHJpZXNbaV07XG5cdFx0d25kLmxpKCgpID0+IHtcblx0XHQgICAgaWYgKHduZC5idXR0b24oJzw8JykpIHtcblx0XHRcdGlmICgtLWVudHJ5LmFtb3VudCA8IDEpIHtcblx0XHRcdCAgICBjYXJ0LmVudHJpZXMuc3BsaWNlKGNhcnQuZW50cmllcy5pbmRleE9mKGVudHJ5KSwgMSk7XG5cdFx0XHR9XG5cdFx0ICAgIH1cblx0XHQgICAgd25kLnNwYW4oZW50cnkuYXJ0aWNsZS5uYW1lKTtcblx0XHQgICAgd25kLmtsYXNzKCdwcmljZScpLnNwYW4oZW50cnkuYW1vdW50ICsgJ3gnKTsgXG5cdFx0fSk7XG5cdCAgICB9XG5cdH0pO1xuXHR3bmQuc3BhbigoJ1RvdGFsOiDigqwgJyArIGNhcnQudG90YWwpLnJlcGxhY2UoLyhcXC5cXGRcXGQpXFxkKi8sJyQxJykpO1xuICAgIH0pO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gd25kO1xuIiwiXG5cbid1c2Ugc3RyaWN0JztcblxuLypcbiAqIFRPRE86XG4gKiAtIGRvbid0IGJ1aWxkIHZub2RlIHdoZW4gaGFuZGxpbmcgZXZlbnQuXG4gKiAtIGVsaW1pbmF0ZSB0cnktZmluYWxseSBmb3IgcGVyZlxuICogLSBtYWtlIGBoZXJlYCBtb3JlIHJvYnVzdFxuICogLSBvcHRpbWl6ZSB1c2Ugb2YgaWRzIGluIGxpc3RzXG4gKiAtIGVsaW1pbmF0ZSAuY2xhc3MvI2lkIHBhcnNpbmdcbiAqIC0gc3VwcG9ydCBrZXktYmFzZWQgcGF0Y2hpbmcgKGF0dHIgYGtleWApXG4gKi9cblxuY2xhc3MgVHJpbUdVSSB7XG4gICAgY29uc3RydWN0b3IgKGFwcCwgbW9kZWwsIHJvb3QpIHtcbiAgICAgICAgdGhpcy5hcHAgPSBhcHA7XG4gICAgICAgIHRoaXMubW9kZWwgPSBtb2RlbDtcbiAgICAgICAgdGhpcy5yb290ID0gcm9vdDtcbiAgICAgICAgdGhpcy5ldmVudCA9IG51bGw7XG4gICAgICAgIHRoaXMuZm9jdXMgPSBbXTtcbiAgICAgICAgdGhpcy5ub2RlID0gbnVsbDtcbiAgICAgICAgdGhpcy5vbk1vdW50cyA9IHt9O1xuICAgICAgICB0aGlzLnRpbWVycyA9IHt9O1xuICAgICAgICB0aGlzLmhhbmRsZXJzID0ge307XG4gICAgICAgIHRoaXMuaWRzID0gMDtcbiAgICAgICAgdGhpcy5hdHRyaWJ1dGVzID0ge307XG4gICAgICAgIHRoaXMucm91dGUgPSBkb2N1bWVudC5sb2NhdGlvbi5oYXNoO1xuICAgICAgICB0aGlzLmFkZFNpbXBsZUVsZW1lbnRzKCk7XG4gICAgICAgIHRoaXMuYWRkSW5wdXRFbGVtZW50cygpO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignc3RvcmFnZScsIHRoaXMuZGVhbFdpdGhJdCwgZmFsc2UpO1xuICAgIH1cblxuICAgIHJ1bigpIHtcbiAgICAgICAgdGhpcy5tb3VudCh0aGlzLnJlbmRlck9uY2UoKSk7XG4gICAgfVxuICAgIFxuICAgIHJlZ2lzdGVyKGV2ZW50LCBpZCkge1xuICAgICAgICAvLyBvbmx5IGFkZCBvbmUgaGFuZGxlciB0byByb290LCBwZXIgZXZlbnQgdHlwZS5cbiAgICAgICAgaWYgKCF0aGlzLmhhbmRsZXJzLmhhc093blByb3BlcnR5KGV2ZW50KSkge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVyc1tldmVudF0gPSBbXTtcbiAgICAgICAgICAgIHZhciByID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5yb290KTtcbiAgICAgICAgICAgIHIuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgZSA9PiB7XG4gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTsgLy8gZG9uJ3QgbGVhayB1cHdhcmRzXG4gICAgICAgICAgICAgICAgdmFyIGlkID0gZS50YXJnZXQuZ2V0QXR0cmlidXRlKCdpZCcpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmhhbmRsZXJzW2V2ZW50XS5pbmRleE9mKGlkKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXZlbnQgPSBlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvUmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaGFuZGxlcnNbZXZlbnRdLnB1c2goaWQpO1xuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICBmb3IgKHZhciBrIGluIHRoaXMuaGFuZGxlcnMpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmhhbmRsZXJzLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVyc1trXSA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMub25Nb3VudHMgPSB7fTtcbiAgICAgICAgdGhpcy5mb2N1cyA9IFtdO1xuICAgICAgICB0aGlzLmlkcyA9IDA7XG4gICAgfVxuXG4gICAgcmVuZGVyT25jZSgpIHtcbiAgICAgICAgdGhpcy5yZXNldCgpO1xuICAgICAgICB0aGlzLmFwcCh0aGlzLm1vZGVsKTtcbiAgICB9XG5cbiAgICBkb1JlbmRlcigpIHtcbiAgICAgICAgLy8gdHdpY2U6IG9uZSB0byBoYW5kbGUgZXZlbnQsIG9uZSB0byBzeW5jIHZpZXcuXG4gICAgICAgIHZhciBfID0gdGhpcy5yZW5kZXJPbmNlKCk7XG4gICAgICAgIHZhciBub2RlID0gdGhpcy5yZW5kZXJPbmNlKCk7XG4gICAgICAgIHRoaXMubW91bnQobm9kZSk7XG4gICAgfVxuXG4gICAgbW91bnQobm9kZSkge1xuICAgICAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5yb290KTtcbiAgICAgICAgaWYgKHRoaXMubm9kZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVjb25jaWxlS2lkcyhjb250YWluZXIsIGNvbnRhaW5lci5jaGlsZE5vZGVzLCB0aGlzLmZvY3VzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHdoaWxlIChjb250YWluZXIuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5yZW1vdmVDaGlsZChjb250YWluZXIuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZm9jdXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoYnVpbGQodGhpcy5mb2N1c1tpXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMubm9kZSA9IG5vZGU7XG4gICAgICAgIFxuICAgICAgICBmb3IgKHZhciBpZCBpbiB0aGlzLm9uTW91bnRzKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5vbk1vdW50cy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgZG9Tb21ldGhpbmcgPSB0aGlzLm9uTW91bnRzW2lkXTtcbiAgICAgICAgICAgICAgICB2YXIgZWx0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuICAgICAgICAgICAgICAgIGRvU29tZXRoaW5nKGVsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgfVxuXG4gICAgZGVhbFdpdGhJdChlKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSBlO1xuICAgICAgICB0aGlzLmRvUmVuZGVyKCk7XG4gICAgfVxuXG5cbiAgICBhdHRycyhhcykge1xuICAgICAgICBmb3IgKHZhciBhIGluIGFzKSB7XG4gICAgICAgICAgICBpZiAoYXMuaGFzT3duUHJvcGVydHkoYSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZXNbYV0gPSBhc1thXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBlblJvdXRlKGhhc2gsIGJsb2NrKSB7XG4gICAgICAgIGlmICghdGhpcy5yb3V0ZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnJvdXRlID09PSBoYXNoKSB7XG4gICAgICAgICAgICB0aGlzLnJvdXRlID0gdW5kZWZpbmVkOyAvLyBvbmx5IHJ1biBvbmNlLlxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIG9uU3RvcmFnZShibG9jaykge1xuICAgICAgICB2YXIgZXZlbnQgPSB0aGlzLmV2ZW50O1xuICAgICAgICBpZiAoZXZlbnQgJiYgZXZlbnQudHlwZSA9PT0gJ3N0b3JhZ2UnKSB7XG4gICAgICAgICAgICB0aGlzLmV2ZW50ID0gdW5kZWZpbmVkOyBcbiAgICAgICAgICAgIGJsb2NrKGV2ZW50KTsgXG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgb24oZWx0LCBldmVudHMsIGJsb2NrKSB7XG4gICAgICAgIHZhciBpZCA9IHRoaXMuYXR0cmlidXRlc1snaWQnXSB8fCAoJ2lkJyArIHRoaXMuaWRzKyspO1xuICAgICAgICBldmVudHMuZm9yRWFjaChlID0+IHRoaXMucmVnaXN0ZXIoZSwgaWQpKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzLmlkKGlkKS53aXRoRWxlbWVudChlbHQsICgpID0+IHtcbiAgICAgICAgICAgIHZhciBldmVudCA9IHRoaXMuZXZlbnQ7XG4gICAgICAgICAgICBpZiAoZXZlbnQgJiYgZXZlbnQudGFyZ2V0LmdldEF0dHJpYnV0ZSgnaWQnKSA9PT0gaWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50ID0gdW5kZWZpbmVkOyAvLyBtYXliZSBkbyBpbiB0b3BsZXZlbD8/P1xuICAgICAgICAgICAgICAgIHJldHVybiBibG9jayhldmVudCk7IC8vIGxldCBpdCBiZSBoYW5kbGVkXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYmxvY2soKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgd2l0aEVsZW1lbnQoZWx0LCBmdW5jLCBldnMpIHtcbiAgICAgICAgLy8gVE9ETzogaWYgdGhpcy5wcmV0ZW5kLCBkb24ndCBidWlsZCB2bm9kZXNcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMuZm9jdXM7XG4gICAgICAgIHRoaXMuZm9jdXMgPSBbXTtcblxuICAgICAgICAvLyBDb3B5IHRoZSBjdXJyZW50IGF0dHJpYnV0ZSBzZXRcbiAgICAgICAgdmFyIG15QXR0cnMgPSB7fTtcbiAgICAgICAgZm9yICh2YXIgYSBpbiB0aGlzLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmF0dHJpYnV0ZXMuaGFzT3duUHJvcGVydHkoYSkpIHtcbiAgICAgICAgICAgICAgICBteUF0dHJzW2FdID0gdGhpcy5hdHRyaWJ1dGVzW2FdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IHt9OyAvLyBraWRzIGRvbid0IGluaGVyaXQgYXR0cnMuXG4gICAgICAgIFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmMoKTtcbiAgICAgICAgfVxuICAgICAgICBmaW5hbGx5IHtcbiAgICAgICAgICAgIGlmIChteUF0dHJzICYmIG15QXR0cnMub25Nb3VudCkge1xuICAgICAgICAgICAgICAgIHRoaXMub25Nb3VudHNbbXlBdHRyc1snaWQnXV0gPSBteUF0dHJzLm9uTW91bnQ7XG4gICAgICAgICAgICAgICAgZGVsZXRlIG15QXR0cnMub25Nb3VudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciB2bm9kZSA9IHt0YWc6IGVsdCwgYXR0cnM6IG15QXR0cnMsIGtpZHM6IHRoaXMuZm9jdXN9O1xuICAgICAgICAgICAgcGFyZW50LnB1c2godm5vZGUpO1xuICAgICAgICAgICAgdGhpcy5mb2N1cyA9IHBhcmVudDtcbiAgICAgICAgfSAgICBcbiAgICB9XG5cblxuICAgIGhlcmUoZnVuYywgYmxvY2spIHtcbiAgICAgICAgdmFyIHBvcyA9IHRoaXMuZm9jdXMubGVuZ3RoO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiBibG9jayhmdW5jdGlvbiAoKSB7IC8vIGJlY2F1c2UgYXJndW1lbnRzLlxuICAgICAgICAgICAgdmFyIHBhcmVudCA9IHNlbGYuZm9jdXM7XG4gICAgICAgICAgICBzZWxmLmZvY3VzID0gW107XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuZm9jdXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50LnNwbGljZShwb3MgKyBpLCAwLCBzZWxmLmZvY3VzW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2VsZi5mb2N1cyA9IHBhcmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICBjb250ZW50KGMsIGV2KSB7XG4gICAgICAgIGlmICh0eXBlb2YgYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYy5hcHBseSh1bmRlZmluZWQsIGV2KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aGlzLnRleHQoYyk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIHRleHQodHh0KSB7XG4gICAgICAgIHRoaXMuZm9jdXMucHVzaCh0eHQpO1xuICAgIH1cblxuICAgIG5leHRJZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaWRzICsgMTtcbiAgICB9XG4gICAgXG4gICAgXG4gICAgLy8gY29udmVuaWVuY2VcblxuICAgIGF0dHIobiwgeCkge1xuICAgICAgICB2YXIgb2JqID0ge307XG4gICAgICAgIG9ialtuXSA9IHg7XG4gICAgICAgIHJldHVybiB0aGlzLmF0dHJzKG9iaik7XG4gICAgfVxuXG4gICAgYXR0cklmKGMsIG4sIHgpIHtcbiAgICAgICAgaWYgKGMpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmF0dHIobiwgeCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIFxuICAgIGtsYXNzKHgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXR0cignY2xhc3MnLCB4KTtcbiAgICB9XG5cbiAgICBpZCh4KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmF0dHIoJ2lkJywgeCk7XG4gICAgfVxuXG4gICAgdGV4dGFyZWEoeCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vbigndGV4dGFyZWEnLCBbJ2tleXVwJywgJ2JsdXInXSwgZXYgPT4ge1xuICAgICAgICAgICAgdmFyIG5ld1ZhbHVlID0gZXYgPyBldi50YXJnZXQudmFsdWUgOiB2YWx1ZTtcbiAgICAgICAgICAgIHRoaXMuY29udGVudCh4LCBldik7XG4gICAgICAgICAgICByZXR1cm4gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICB0ZXh0Qm94KHZhbHVlKSB7XG4gICAgICAgIHZhciBhdHRycyA9IHt0eXBlOiAndGV4dCcsIHZhbHVlOiB2YWx1ZX07XG4gICAgICAgIGF0dHJzLm9uTW91bnQgPSBlbHQgPT4ge1xuICAgICAgICAgICAgICAgIGVsdC52YWx1ZSA9IHZhbHVlO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXMuYXR0cnMoYXR0cnMpLm9uKCdpbnB1dCcsIFsnaW5wdXQnXSwgZXYgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGV2ID8gZXYudGFyZ2V0LnZhbHVlIDogdmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGNoZWNrQm94KHZhbHVlKSB7XG4gICAgICAgIHZhciBhdHRycyA9IGF0dHJzIHx8IHt9O1xuICAgICAgICBhdHRycy50eXBlID0gJ2NoZWNrYm94JztcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBhdHRycy5jaGVja2VkID0gJ3RydWUnO1xuICAgICAgICB9XG4gICAgICAgIGF0dHJzLm9uTW91bnQgPSBlbHQgPT4ge1xuICAgICAgICAgICAgZWx0LmNoZWNrZWQgPSB2YWx1ZTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzLmF0dHJzKGF0dHJzKS5vbignaW5wdXQnLCBbJ2NsaWNrJ10sIGV2ID0+IHtcbiAgICAgICAgICAgIHJldHVybiBldiA/IGV2LnRhcmdldC5jaGVja2VkIDogdmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgYWZ0ZXIoaWQsIGRlbGF5KSB7XG4gICAgICAgIGlmICh0aGlzLnRpbWVycy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRpbWVyc1tpZF07XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnRpbWVyc1tpZF0gPSBmYWxzZTtcbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy50aW1lcnNbaWRdID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuZG9SZW5kZXIoKTtcbiAgICAgICAgfSwgZGVsYXkpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cblxuICAgIGFjbGljayh4KSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9uKCdhJywgWydjbGljayddLCBldiA9PiB7XG4gICAgICAgICAgICB0aGlzLmNvbnRlbnQoeCwgZXYpO1xuICAgICAgICAgICAgcmV0dXJuIGV2ICE9PSB1bmRlZmluZWQ7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBidXR0b24oeCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vbignYnV0dG9uJywgWydjbGljayddLCBldiA9PiB7XG4gICAgICAgICAgICB0aGlzLmNvbnRlbnQoeCwgZXYpO1xuICAgICAgICAgICAgcmV0dXJuIGV2ICE9PSB1bmRlZmluZWQ7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcblxuICAgIHNlbGVjdCh2YWx1ZSwgYmxvY2spIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgaWR4ID0gLTE7XG4gICAgICAgIHZhciBzZWxlY3RlZCA9IC0xO1xuICAgICAgICBmdW5jdGlvbiBvcHRpb24ob3B0VmFsdWUsIGxhYmVsKSB7XG4gICAgICAgICAgICB2YXIgYXR0cnMgPSB7dmFsdWU6IG9wdFZhbHVlfTtcbiAgICAgICAgICAgIGlkeCsrO1xuICAgICAgICAgICAgaWYgKG9wdFZhbHVlID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHNlbGVjdGVkID0gaWR4O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGFiZWwgPSBsYWJlbCB8fCBvcHRWYWx1ZTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmLmF0dHJzKGF0dHJzKS53aXRoRWxlbWVudCgnb3B0aW9uJywgKCkgPT4gc2VsZi50ZXh0KGxhYmVsKSk7XG4gICAgICAgIH1cblxuICAgICAgICBcbiAgICAgICAgdmFyIG15QXR0cnMgPSB7b25Nb3VudDogZWx0ID0+IHtcbiAgICAgICAgICAgIGVsdC5zZWxlY3RlZEluZGV4ID0gc2VsZWN0ZWQ7XG4gICAgICAgIH19O1xuXG4gICAgICAgIHJldHVybiB0aGlzLmF0dHJzKG15QXR0cnMpLm9uKCdzZWxlY3QnLCBbJ2NoYW5nZSddLCBldiA9PiB7XG4gICAgICAgICAgICBibG9jayhvcHRpb24pO1xuICAgICAgICAgICAgcmV0dXJuIGV2ICBcbiAgICAgICAgICAgICAgICA/IGV2LnRhcmdldC5vcHRpb25zW2V2LnRhcmdldC5zZWxlY3RlZEluZGV4XS52YWx1ZVxuICAgICAgICAgICAgICAgIDogdmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICByYWRpb0dyb3VwKHZhbHVlLCBibG9jaykge1xuICAgICAgICB2YXIgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIHZhciBuYW1lID0gJ25hbWUnICsgKHRoaXMuaWRzKyspO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIGZ1bmN0aW9uIHJhZGlvKHJhZGlvVmFsdWUsIGxhYmVsKSB7XG4gICAgICAgICAgICB2YXIgYXR0cnMgPSB7dHlwZTogJ3JhZGlvJywgbmFtZTogbmFtZX07XG4gICAgICAgICAgICBpZiAocmFkaW9WYWx1ZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBhdHRyc1snY2hlY2tlZCddID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGF0dHJzLm9uTW91bnQgPSBlbHQgPT4ge1xuICAgICAgICAgICAgICAgIGVsdC5jaGVja2VkID0gKHJhZGlvVmFsdWUgPT09IHZhbHVlKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gc2VsZi5vbignbGFiZWwnLCBbXSwgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHNlbGYuYXR0cnMoYXR0cnMpLm9uKCdpbnB1dCcsIFsnY2xpY2snXSwgZXYgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJhZGlvVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJhZGlvVmFsdWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc2VsZi50ZXh0KGxhYmVsIHx8IHJhZGlvVmFsdWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiByYWRpb1ZhbHVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGJsb2NrKHJhZGlvKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvLyBsYWJlbCh0eHQpIHtcbiAgICAvLyAgICAgICAgIC8vIEZJWE1FOiB0aGlzIGlzIGV4dHJlbWVseSBicml0dGxlLlxuICAgIC8vICAgICAgICAgdmFyIGlkID0gJ2lkJyArICh0aGlzLmlkcyArIDEpOyAvLyBOQjogbm90ICsrICEhXG4gICAgLy8gICAgICAgICByZXR1cm4gdGhpcy5hdHRyKCdmb3InLCBpZCkud2l0aEVsZW1lbnQoJ2xhYmVsJywgKCkgPT4gdGhpcy50ZXh0KHR4dCkpO1xuICAgIC8vIH1cblxuICAgIGFkZElucHV0RWxlbWVudHMoKSB7XG4gICAgICAgIHZhciBiYXNpY0lucHV0cyA9IHtcbiAgICAgICAgICAgIHNwaW5Cb3g6IHt0eXBlOiAnbnVtYmVyJywgZXZlbnQ6ICdpbnB1dCd9LFxuICAgICAgICAgICAgc2xpZGVyOiB7dHlwZTogJ3JhbmdlJywgZXZlbnQ6ICdpbnB1dCd9LFxuICAgICAgICAgICAgZW1haWxCb3g6IHt0eXBlOiAnZW1haWwnLCBldmVudDogJ2lucHV0J30sXG4gICAgICAgICAgICBzZWFyY2hCb3g6IHt0eXBlOiAnc2VhcmNoJywgZXZlbnQ6ICdpbnB1dCd9LFxuICAgICAgICAgICAgZGF0ZVBpY2tlcjoge3R5cGU6ICdkYXRlJywgZXZlbnQ6ICdjaGFuZ2UnfSxcbiAgICAgICAgICAgIGNvbG9yUGlja2VyOiB7dHlwZTogJ2NvbG9yJywgZXZlbnQ6ICdjaGFuZ2UnfSxcbiAgICAgICAgICAgIGRhdGVUaW1lUGlja2VyOiB7dHlwZTogJ2RhdGV0aW1lJywgZXZlbnQ6ICdjaGFuZ2UnfSxcbiAgICAgICAgICAgIGxvY2FsRGF0ZVRpbWVQaWNrZXI6IHt0eXBlOiAnZGF0ZXRpbWUtbG9jYWwnLCBldmVudDogJ2NoYW5nZSd9LFxuICAgICAgICAgICAgbW9udGhQaWNrZXI6IHt0eXBlOiAnd2VlaycsIGV2ZW50OiAnY2hhbmdlJ30sXG4gICAgICAgICAgICB3ZWVrUGlja2VyOiB7dHlwZTogJ3dlZWsnLCBldmVudDogJ2NoYW5nZSd9LFxuICAgICAgICAgICAgdGltZVBpY2tlcjoge3R5cGU6ICd0aW1lJywgZXZlbnQ6ICdjaGFuZ2UnfVxuICAgICAgICB9O1xuICAgICAgICBmb3IgKHZhciBuYW1lIGluIGJhc2ljSW5wdXRzKSB7XG4gICAgICAgICAgICBpZiAoYmFzaWNJbnB1dHMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgICAgICAgICAobmFtZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbbmFtZV0gPSB2YWx1ZSA9PiB0aGlzXG4gICAgICAgICAgICAgICAgICAgICAgICAuYXR0cnMoe3R5cGU6IGJhc2ljSW5wdXRzW25hbWVdLnR5cGUsIHZhbHVlOiB2YWx1ZX0pXG4gICAgICAgICAgICAgICAgICAgICAgICAub24oJ2lucHV0JywgW2Jhc2ljSW5wdXRzW25hbWVdLmV2ZW50XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldiA9PiBldiA/IGV2LnRhcmdldC52YWx1ZSA6IHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9KShuYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFkZFNpbXBsZUVsZW1lbnRzKCkge1xuICAgICAgICAvLyBDdXJyZW50bHksIHRoZXNlIGRvbid0IGhhdmUgZXZlbnRzLlxuICAgICAgICBbJ2EnLCAncCcsICdsYWJlbCcsICdzdHJvbmcnLCAnYnInLCAnc3BhbicsICdoMScsICdoMicsICdoMycsICdoNCcsXG4gICAgICAgICAnc2VjdGlvbicsICdkaXYnLCAndWwnLCAnb2wnLCAnbGknLCAnaGVhZGVyJywgJ2Zvb3RlcicsICdjb2RlJywgJ3ByZScsXG4gICAgICAgICAnZGwnLCAnZHQnLCAnZGQnLCAnZmllbGRzZXQnLCAndGFibGUnLCAndGQnLCAndHInLCAndGgnLCAnY29sJywgJ3RoZWFkJ11cbiAgICAgICAgICAgIC5mb3JFYWNoKGVsdCA9PiBcbiAgICAgICAgICAgICAgICAgICAgIChlbHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbZWx0XSA9IHggPT4gdGhpcy53aXRoRWxlbWVudChlbHQsICgpID0+IHRoaXMuY29udGVudCh4KSk7XG4gICAgICAgICAgICAgICAgICAgICB9KShlbHQpKTtcbiAgICB9XG4gICAgXG59XG5cblxuLypcblxuIFRoZSBmb2xsb3dpbmcgZnVuY3Rpb25zIGRvbid0IGFjY2VzcyBUcmltR1VJIHN0YXRlLCBidXQgc2ltcGx5XG4gcGF0Y2ggdGhlIHJlYWwgZG9tICgxc3QgYXJnKSBiYXNlZCBvbiB0aGUgdmRvbSAoMm5kIGFyZykuXG5cbiB2ZG9tIGVsZW1lbnRcbiB7dGFnOlxuIGF0dHJzOiB7fSBldGMuXG4ga2lkczogW10gfVxuXG4gKi9cblxuZnVuY3Rpb24gY29tcGF0KGQsIHYpIHtcbiAgICAvLyBjb25zb2xlLmxvZygnQ29tcGF0PyAnKTtcbiAgICAvLyBjb25zb2xlLmxvZygnZCA9ICcgKyBkLm5vZGVWYWx1ZSk7XG4gICAgLy8gY29uc29sZS5sb2coJ3YgPSAnICsgSlNPTi5zdHJpbmdpZnkodikpO1xuICAgIHJldHVybiAoZC5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUgJiYgKHR5cGVvZiB2ICE9PSAnb2JqZWN0JykpXG4gICAgICAgIHx8IChkLnRhZ05hbWUgPT09IHYudGFnLnRvVXBwZXJDYXNlKCkpO1xufVxuXG5cbmZ1bmN0aW9uIHJlY29uY2lsZShkb20sIHZkb20pIHtcbiAgICBpZiAoIWNvbXBhdChkb20sIHZkb20pKSB7XG4gICAgICAgIHRocm93ICdDYW4gb25seSByZWNvbmNpbGUgY29tcGF0aWJsZSBub2Rlcyc7XG4gICAgfVxuICAgIFxuICAgIC8vIFRleHQgbm9kZXNcbiAgICBpZiAodHlwZW9mIHZkb20gIT09ICdvYmplY3QnKSB7XG4gICAgICAgIGlmIChkb20ubm9kZVZhbHVlICE9PSB2ZG9tKSB7XG4gICAgICAgICAgICBkb20ubm9kZVZhbHVlID0gdmRvbS50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cblxuICAgIC8vIEVsZW1lbnQgbm9kZXNcbiAgICB2YXIgdmF0dHJzID0gdmRvbS5hdHRycyB8fCB7fTtcbiAgICBmb3IgKHZhciB2YXR0ciBpbiB2YXR0cnMpIHtcbiAgICAgICAgaWYgKHZhdHRycy5oYXNPd25Qcm9wZXJ0eSh2YXR0cikpIHtcbiAgICAgICAgICAgIGlmIChkb20uaGFzQXR0cmlidXRlKHZhdHRyKSkge1xuICAgICAgICAgICAgICAgIGxldCBkYXR0ciA9IGRvbS5nZXRBdHRyaWJ1dGUodmF0dHIpO1xuICAgICAgICAgICAgICAgIGlmIChkYXR0ciAhPT0gdmF0dHJzW3ZhdHRyXS50b1N0cmluZygpKSB7IFxuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdVcGRhdGluZyBhdHRyaWJ1dGU6ICcgKyB2YXR0ciArICcgPSAnICsgdmF0dHJzW3ZhdHRyXSk7XG4gICAgICAgICAgICAgICAgICAgIGRvbS5zZXRBdHRyaWJ1dGUodmF0dHIsIHZhdHRyc1t2YXR0cl0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ0FkZGluZyBhdHRyaWJ1dGU6ICcgKyB2YXR0ciArICcgPSAnICsgdmF0dHJzW3ZhdHRyXSk7XG4gICAgICAgICAgICAgICAgZG9tLnNldEF0dHJpYnV0ZSh2YXR0ciwgdmF0dHJzW3ZhdHRyXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkb20uYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgZGF0dHIgPSBkb20uYXR0cmlidXRlc1tpXTtcbiAgICAgICAgaWYgKCF2YXR0cnMuaGFzT3duUHJvcGVydHkoZGF0dHIubm9kZU5hbWUpKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdSZW1vdmluZyBhdHRyaWJ1dGU6ICcgKyBkYXR0ci5ub2RlTmFtZSk7XG4gICAgICAgICAgICBkb20ucmVtb3ZlQXR0cmlidXRlKGRhdHRyLm5vZGVOYW1lKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlY29uY2lsZUtpZHMoZG9tLCBkb20uY2hpbGROb2RlcywgdmRvbS5raWRzKTtcbn1cblxuZnVuY3Rpb24gcmVjb25jaWxlS2lkcyhkb20sIGRraWRzLCB2a2lkcykge1xuICAgIHZhciBsZW4gPSBNYXRoLm1pbihka2lkcy5sZW5ndGgsIHZraWRzLmxlbmd0aCk7XG4gICAgXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YXIgZGtpZCA9IGRraWRzW2ldO1xuICAgICAgICB2YXIgdmtpZCA9IHZraWRzW2ldO1xuICAgICAgICBpZiAoY29tcGF0KGRraWQsIHZraWQpKSB7XG4gICAgICAgICAgICByZWNvbmNpbGUoZGtpZCwgdmtpZCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdSZXBsYWNpbmcgY2hpbGQnKTtcbiAgICAgICAgICAgIGRvbS5yZXBsYWNlQ2hpbGQoYnVpbGQodmtpZCksIGRraWQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIGlmIChka2lkcy5sZW5ndGggPiBsZW4pIHtcbiAgICAgICAgd2hpbGUgKGRraWRzLmxlbmd0aCA+IGxlbikge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnUmVtb3ZpbmcgY2hpbGQgJyk7XG4gICAgICAgICAgICBkb20ucmVtb3ZlQ2hpbGQoZGtpZHNbbGVuXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAodmtpZHMubGVuZ3RoID4gbGVuKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSBsZW47IGkgPCB2a2lkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnQXBwZW5kaW5nIG5ldyBjaGlsZCAnKTtcbiAgICAgICAgICAgIGRvbS5hcHBlbmRDaGlsZChidWlsZCh2a2lkc1tpXSkpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBidWlsZCh2ZG9tKSB7XG4gICAgaWYgKHZkb20gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHZkb20gIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh2ZG9tLnRvU3RyaW5nKCkpO1xuICAgIH1cbiAgICBcbiAgICB2YXIgZWx0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh2ZG9tLnRhZyk7XG4gICAgdmFyIHZhdHRycyA9IHZkb20uYXR0cnMgfHwge307XG4gICAgZm9yICh2YXIgayBpbiB2YXR0cnMpIHtcbiAgICAgICAgaWYgKHZhdHRycy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgZWx0LnNldEF0dHJpYnV0ZShrLCB2YXR0cnNba10pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmRvbS5raWRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGVsdC5hcHBlbmRDaGlsZChidWlsZCh2ZG9tLmtpZHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIGVsdDsgICAgXG59XG5cbm1vZHVsZS5leHBvcnRzID0gVHJpbUdVSTtcblxuIl19
