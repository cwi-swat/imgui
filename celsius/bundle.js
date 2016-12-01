!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.app=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){


var Libimgui = require('../libimgui');

var m = {
    t: 0
};

var wnd = new Libimgui(c2f, m, 'root');

function toF(c) {
    return Math.round(c * 9.0/5.0 + 32);
}

function toC(f) {
    return Math.round((parseFloat(f) - 32) * 5.0/9.0);
}

function c2f(m) {
    wnd.text("C:");
    m.t = wnd.textBox(m.t);

    wnd.text("F:");
    m.t = toC(wnd.textBox(toF(m.t)));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNlbHNpdXMuanMiLCIuLi9saWJpbWd1aS9saWJpbWd1aS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuXG52YXIgTGliaW1ndWkgPSByZXF1aXJlKCcuLi9saWJpbWd1aScpO1xuXG52YXIgbSA9IHtcbiAgICB0OiAwXG59O1xuXG52YXIgd25kID0gbmV3IExpYmltZ3VpKGMyZiwgbSwgJ3Jvb3QnKTtcblxuZnVuY3Rpb24gdG9GKGMpIHtcbiAgICByZXR1cm4gTWF0aC5yb3VuZChjICogOS4wLzUuMCArIDMyKTtcbn1cblxuZnVuY3Rpb24gdG9DKGYpIHtcbiAgICByZXR1cm4gTWF0aC5yb3VuZCgocGFyc2VGbG9hdChmKSAtIDMyKSAqIDUuMC85LjApO1xufVxuXG5mdW5jdGlvbiBjMmYobSkge1xuICAgIHduZC50ZXh0KFwiQzpcIik7XG4gICAgbS50ID0gd25kLnRleHRCb3gobS50KTtcblxuICAgIHduZC50ZXh0KFwiRjpcIik7XG4gICAgbS50ID0gdG9DKHduZC50ZXh0Qm94KHRvRihtLnQpKSk7XG59XG5cdFx0XHRcdCBcblxubW9kdWxlLmV4cG9ydHMgPSB3bmQ7XG4iLCJcblxuJ3VzZSBzdHJpY3QnO1xuXG4vKlxuICogVE9ETzpcbiAqIC0gZG9uJ3QgYnVpbGQgdm5vZGUgd2hlbiBoYW5kbGluZyBldmVudC5cbiAqIC0gZWxpbWluYXRlIHRyeS1maW5hbGx5IGZvciBwZXJmXG4gKiAtIG1ha2UgYGhlcmVgIG1vcmUgcm9idXN0XG4gKiAtIG9wdGltaXplIHVzZSBvZiBpZHMgaW4gbGlzdHNcbiAqIC0gZWxpbWluYXRlIC5jbGFzcy8jaWQgcGFyc2luZ1xuICogLSBzdXBwb3J0IGtleS1iYXNlZCBwYXRjaGluZyAoYXR0ciBga2V5YClcbiAqL1xuXG5jbGFzcyBUcmltR1VJIHtcbiAgICBjb25zdHJ1Y3RvciAoYXBwLCBtb2RlbCwgcm9vdCkge1xuICAgICAgICB0aGlzLmFwcCA9IGFwcDtcbiAgICAgICAgdGhpcy5tb2RlbCA9IG1vZGVsO1xuICAgICAgICB0aGlzLnJvb3QgPSByb290O1xuICAgICAgICB0aGlzLmV2ZW50ID0gbnVsbDtcbiAgICAgICAgdGhpcy5mb2N1cyA9IFtdO1xuICAgICAgICB0aGlzLm5vZGUgPSBudWxsO1xuICAgICAgICB0aGlzLm9uTW91bnRzID0ge307XG4gICAgICAgIHRoaXMudGltZXJzID0ge307XG4gICAgICAgIHRoaXMuaGFuZGxlcnMgPSB7fTtcbiAgICAgICAgdGhpcy5pZHMgPSAwO1xuICAgICAgICB0aGlzLmF0dHJpYnV0ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5yb3V0ZSA9IGRvY3VtZW50LmxvY2F0aW9uLmhhc2g7XG4gICAgICAgIHRoaXMuYWRkU2ltcGxlRWxlbWVudHMoKTtcbiAgICAgICAgdGhpcy5hZGRJbnB1dEVsZW1lbnRzKCk7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdzdG9yYWdlJywgdGhpcy5kZWFsV2l0aEl0LCBmYWxzZSk7XG4gICAgfVxuXG4gICAgcnVuKCkge1xuICAgICAgICB0aGlzLm1vdW50KHRoaXMucmVuZGVyT25jZSgpKTtcbiAgICB9XG4gICAgXG4gICAgcmVnaXN0ZXIoZXZlbnQsIGlkKSB7XG4gICAgICAgIC8vIG9ubHkgYWRkIG9uZSBoYW5kbGVyIHRvIHJvb3QsIHBlciBldmVudCB0eXBlLlxuICAgICAgICBpZiAoIXRoaXMuaGFuZGxlcnMuaGFzT3duUHJvcGVydHkoZXZlbnQpKSB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZXJzW2V2ZW50XSA9IFtdO1xuICAgICAgICAgICAgdmFyIHIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLnJvb3QpO1xuICAgICAgICAgICAgci5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBlID0+IHtcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpOyAvLyBkb24ndCBsZWFrIHVwd2FyZHNcbiAgICAgICAgICAgICAgICB2YXIgaWQgPSBlLnRhcmdldC5nZXRBdHRyaWJ1dGUoJ2lkJyk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaGFuZGxlcnNbZXZlbnRdLmluZGV4T2YoaWQpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudCA9IGU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZG9SZW5kZXIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5oYW5kbGVyc1tldmVudF0ucHVzaChpZCk7XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIGZvciAodmFyIGsgaW4gdGhpcy5oYW5kbGVycykge1xuICAgICAgICAgICAgaWYgKHRoaXMuaGFuZGxlcnMuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZXJzW2tdID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vbk1vdW50cyA9IHt9O1xuICAgICAgICB0aGlzLmZvY3VzID0gW107XG4gICAgICAgIHRoaXMuaWRzID0gMDtcbiAgICB9XG5cbiAgICByZW5kZXJPbmNlKCkge1xuICAgICAgICB0aGlzLnJlc2V0KCk7XG4gICAgICAgIHRoaXMuYXBwKHRoaXMubW9kZWwpO1xuICAgIH1cblxuICAgIGRvUmVuZGVyKCkge1xuICAgICAgICAvLyB0d2ljZTogb25lIHRvIGhhbmRsZSBldmVudCwgb25lIHRvIHN5bmMgdmlldy5cbiAgICAgICAgdmFyIF8gPSB0aGlzLnJlbmRlck9uY2UoKTtcbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzLnJlbmRlck9uY2UoKTtcbiAgICAgICAgdGhpcy5tb3VudChub2RlKTtcbiAgICB9XG5cbiAgICBtb3VudChub2RlKSB7XG4gICAgICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLnJvb3QpO1xuICAgICAgICBpZiAodGhpcy5ub2RlICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZWNvbmNpbGVLaWRzKGNvbnRhaW5lciwgY29udGFpbmVyLmNoaWxkTm9kZXMsIHRoaXMuZm9jdXMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgd2hpbGUgKGNvbnRhaW5lci5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLnJlbW92ZUNoaWxkKGNvbnRhaW5lci5maXJzdENoaWxkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5mb2N1cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChidWlsZCh0aGlzLmZvY3VzW2ldKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ub2RlID0gbm9kZTtcbiAgICAgICAgXG4gICAgICAgIGZvciAodmFyIGlkIGluIHRoaXMub25Nb3VudHMpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLm9uTW91bnRzLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgICAgIHZhciBkb1NvbWV0aGluZyA9IHRoaXMub25Nb3VudHNbaWRdO1xuICAgICAgICAgICAgICAgIHZhciBlbHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7XG4gICAgICAgICAgICAgICAgZG9Tb21ldGhpbmcoZWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9XG5cbiAgICBkZWFsV2l0aEl0KGUpIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IGU7XG4gICAgICAgIHRoaXMuZG9SZW5kZXIoKTtcbiAgICB9XG5cblxuICAgIGF0dHJzKGFzKSB7XG4gICAgICAgIGZvciAodmFyIGEgaW4gYXMpIHtcbiAgICAgICAgICAgIGlmIChhcy5oYXNPd25Qcm9wZXJ0eShhKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlc1thXSA9IGFzW2FdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGVuUm91dGUoaGFzaCwgYmxvY2spIHtcbiAgICAgICAgaWYgKCF0aGlzLnJvdXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMucm91dGUgPT09IGhhc2gpIHtcbiAgICAgICAgICAgIHRoaXMucm91dGUgPSB1bmRlZmluZWQ7IC8vIG9ubHkgcnVuIG9uY2UuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgb25TdG9yYWdlKGJsb2NrKSB7XG4gICAgICAgIHZhciBldmVudCA9IHRoaXMuZXZlbnQ7XG4gICAgICAgIGlmIChldmVudCAmJiBldmVudC50eXBlID09PSAnc3RvcmFnZScpIHtcbiAgICAgICAgICAgIHRoaXMuZXZlbnQgPSB1bmRlZmluZWQ7IFxuICAgICAgICAgICAgYmxvY2soZXZlbnQpOyBcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBvbihlbHQsIGV2ZW50cywgYmxvY2spIHtcbiAgICAgICAgdmFyIGlkID0gdGhpcy5hdHRyaWJ1dGVzWydpZCddIHx8ICgnaWQnICsgdGhpcy5pZHMrKyk7XG4gICAgICAgIGV2ZW50cy5mb3JFYWNoKGUgPT4gdGhpcy5yZWdpc3RlcihlLCBpZCkpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXMuaWQoaWQpLndpdGhFbGVtZW50KGVsdCwgKCkgPT4ge1xuICAgICAgICAgICAgdmFyIGV2ZW50ID0gdGhpcy5ldmVudDtcbiAgICAgICAgICAgIGlmIChldmVudCAmJiBldmVudC50YXJnZXQuZ2V0QXR0cmlidXRlKCdpZCcpID09PSBpZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnQgPSB1bmRlZmluZWQ7IC8vIG1heWJlIGRvIGluIHRvcGxldmVsPz8/XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJsb2NrKGV2ZW50KTsgLy8gbGV0IGl0IGJlIGhhbmRsZWRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBibG9jaygpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB3aXRoRWxlbWVudChlbHQsIGZ1bmMsIGV2cykge1xuICAgICAgICAvLyBUT0RPOiBpZiB0aGlzLnByZXRlbmQsIGRvbid0IGJ1aWxkIHZub2Rlc1xuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcy5mb2N1cztcbiAgICAgICAgdGhpcy5mb2N1cyA9IFtdO1xuXG4gICAgICAgIC8vIENvcHkgdGhlIGN1cnJlbnQgYXR0cmlidXRlIHNldFxuICAgICAgICB2YXIgbXlBdHRycyA9IHt9O1xuICAgICAgICBmb3IgKHZhciBhIGluIHRoaXMuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgaWYgKHRoaXMuYXR0cmlidXRlcy5oYXNPd25Qcm9wZXJ0eShhKSkge1xuICAgICAgICAgICAgICAgIG15QXR0cnNbYV0gPSB0aGlzLmF0dHJpYnV0ZXNbYV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hdHRyaWJ1dGVzID0ge307IC8vIGtpZHMgZG9uJ3QgaW5oZXJpdCBhdHRycy5cbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuYygpO1xuICAgICAgICB9XG4gICAgICAgIGZpbmFsbHkge1xuICAgICAgICAgICAgaWYgKG15QXR0cnMgJiYgbXlBdHRycy5vbk1vdW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbk1vdW50c1tteUF0dHJzWydpZCddXSA9IG15QXR0cnMub25Nb3VudDtcbiAgICAgICAgICAgICAgICBkZWxldGUgbXlBdHRycy5vbk1vdW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHZub2RlID0ge3RhZzogZWx0LCBhdHRyczogbXlBdHRycywga2lkczogdGhpcy5mb2N1c307XG4gICAgICAgICAgICBwYXJlbnQucHVzaCh2bm9kZSk7XG4gICAgICAgICAgICB0aGlzLmZvY3VzID0gcGFyZW50O1xuICAgICAgICB9ICAgIFxuICAgIH1cblxuXG4gICAgaGVyZShmdW5jLCBibG9jaykge1xuICAgICAgICB2YXIgcG9zID0gdGhpcy5mb2N1cy5sZW5ndGg7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgcmV0dXJuIGJsb2NrKGZ1bmN0aW9uICgpIHsgLy8gYmVjYXVzZSBhcmd1bWVudHMuXG4gICAgICAgICAgICB2YXIgcGFyZW50ID0gc2VsZi5mb2N1cztcbiAgICAgICAgICAgIHNlbGYuZm9jdXMgPSBbXTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5mb2N1cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBwYXJlbnQuc3BsaWNlKHBvcyArIGksIDAsIHNlbGYuZm9jdXNbaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzZWxmLmZvY3VzID0gcGFyZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cblxuICAgIGNvbnRlbnQoYywgZXYpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjLmFwcGx5KHVuZGVmaW5lZCwgZXYpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgYyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRoaXMudGV4dChjKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgdGV4dCh0eHQpIHtcbiAgICAgICAgdGhpcy5mb2N1cy5wdXNoKHR4dCk7XG4gICAgfVxuXG4gICAgbmV4dElkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5pZHMgKyAxO1xuICAgIH1cbiAgICBcbiAgICBcbiAgICAvLyBjb252ZW5pZW5jZVxuXG4gICAgYXR0cihuLCB4KSB7XG4gICAgICAgIHZhciBvYmogPSB7fTtcbiAgICAgICAgb2JqW25dID0geDtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXR0cnMob2JqKTtcbiAgICB9XG5cbiAgICBhdHRySWYoYywgbiwgeCkge1xuICAgICAgICBpZiAoYykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXR0cihuLCB4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgXG4gICAga2xhc3MoeCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hdHRyKCdjbGFzcycsIHgpO1xuICAgIH1cblxuICAgIGlkKHgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXR0cignaWQnLCB4KTtcbiAgICB9XG5cbiAgICB0ZXh0YXJlYSh4KSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9uKCd0ZXh0YXJlYScsIFsna2V5dXAnLCAnYmx1ciddLCBldiA9PiB7XG4gICAgICAgICAgICB2YXIgbmV3VmFsdWUgPSBldiA/IGV2LnRhcmdldC52YWx1ZSA6IHZhbHVlO1xuICAgICAgICAgICAgdGhpcy5jb250ZW50KHgsIGV2KTtcbiAgICAgICAgICAgIHJldHVybiBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHRleHRCb3godmFsdWUpIHtcbiAgICAgICAgdmFyIGF0dHJzID0ge3R5cGU6ICd0ZXh0JywgdmFsdWU6IHZhbHVlfTtcbiAgICAgICAgYXR0cnMub25Nb3VudCA9IGVsdCA9PiB7XG4gICAgICAgICAgICAgICAgZWx0LnZhbHVlID0gdmFsdWU7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcy5hdHRycyhhdHRycykub24oJ2lucHV0JywgWydpbnB1dCddLCBldiA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZXYgPyBldi50YXJnZXQudmFsdWUgOiB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgY2hlY2tCb3godmFsdWUpIHtcbiAgICAgICAgdmFyIGF0dHJzID0gYXR0cnMgfHwge307XG4gICAgICAgIGF0dHJzLnR5cGUgPSAnY2hlY2tib3gnO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIGF0dHJzLmNoZWNrZWQgPSAndHJ1ZSc7XG4gICAgICAgIH1cbiAgICAgICAgYXR0cnMub25Nb3VudCA9IGVsdCA9PiB7XG4gICAgICAgICAgICBlbHQuY2hlY2tlZCA9IHZhbHVlO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXMuYXR0cnMoYXR0cnMpLm9uKCdpbnB1dCcsIFsnY2xpY2snXSwgZXYgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGV2ID8gZXYudGFyZ2V0LmNoZWNrZWQgOiB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICBhZnRlcihpZCwgZGVsYXkpIHtcbiAgICAgICAgaWYgKHRoaXMudGltZXJzLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudGltZXJzW2lkXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudGltZXJzW2lkXSA9IGZhbHNlO1xuICAgICAgICB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnRpbWVyc1tpZF0gPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5kb1JlbmRlcigpO1xuICAgICAgICB9LCBkZWxheSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuXG4gICAgYWNsaWNrKHgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub24oJ2EnLCBbJ2NsaWNrJ10sIGV2ID0+IHtcbiAgICAgICAgICAgIHRoaXMuY29udGVudCh4LCBldik7XG4gICAgICAgICAgICByZXR1cm4gZXYgIT09IHVuZGVmaW5lZDtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIGJ1dHRvbih4KSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9uKCdidXR0b24nLCBbJ2NsaWNrJ10sIGV2ID0+IHtcbiAgICAgICAgICAgIHRoaXMuY29udGVudCh4LCBldik7XG4gICAgICAgICAgICByZXR1cm4gZXYgIT09IHVuZGVmaW5lZDtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuXG4gICAgc2VsZWN0KHZhbHVlLCBibG9jaykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBpZHggPSAtMTtcbiAgICAgICAgdmFyIHNlbGVjdGVkID0gLTE7XG4gICAgICAgIGZ1bmN0aW9uIG9wdGlvbihvcHRWYWx1ZSwgbGFiZWwpIHtcbiAgICAgICAgICAgIHZhciBhdHRycyA9IHt2YWx1ZTogb3B0VmFsdWV9O1xuICAgICAgICAgICAgaWR4Kys7XG4gICAgICAgICAgICBpZiAob3B0VmFsdWUgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgc2VsZWN0ZWQgPSBpZHg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsYWJlbCA9IGxhYmVsIHx8IG9wdFZhbHVlO1xuICAgICAgICAgICAgcmV0dXJuIHNlbGYuYXR0cnMoYXR0cnMpLndpdGhFbGVtZW50KCdvcHRpb24nLCAoKSA9PiBzZWxmLnRleHQobGFiZWwpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIFxuICAgICAgICB2YXIgbXlBdHRycyA9IHtvbk1vdW50OiBlbHQgPT4ge1xuICAgICAgICAgICAgZWx0LnNlbGVjdGVkSW5kZXggPSBzZWxlY3RlZDtcbiAgICAgICAgfX07XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuYXR0cnMobXlBdHRycykub24oJ3NlbGVjdCcsIFsnY2hhbmdlJ10sIGV2ID0+IHtcbiAgICAgICAgICAgIGJsb2NrKG9wdGlvbik7XG4gICAgICAgICAgICByZXR1cm4gZXYgIFxuICAgICAgICAgICAgICAgID8gZXYudGFyZ2V0Lm9wdGlvbnNbZXYudGFyZ2V0LnNlbGVjdGVkSW5kZXhdLnZhbHVlXG4gICAgICAgICAgICAgICAgOiB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHJhZGlvR3JvdXAodmFsdWUsIGJsb2NrKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgdmFyIG5hbWUgPSAnbmFtZScgKyAodGhpcy5pZHMrKyk7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgZnVuY3Rpb24gcmFkaW8ocmFkaW9WYWx1ZSwgbGFiZWwpIHtcbiAgICAgICAgICAgIHZhciBhdHRycyA9IHt0eXBlOiAncmFkaW8nLCBuYW1lOiBuYW1lfTtcbiAgICAgICAgICAgIGlmIChyYWRpb1ZhbHVlID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGF0dHJzWydjaGVja2VkJ10gPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYXR0cnMub25Nb3VudCA9IGVsdCA9PiB7XG4gICAgICAgICAgICAgICAgZWx0LmNoZWNrZWQgPSAocmFkaW9WYWx1ZSA9PT0gdmFsdWUpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmLm9uKCdsYWJlbCcsIFtdLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgc2VsZi5hdHRycyhhdHRycykub24oJ2lucHV0JywgWydjbGljayddLCBldiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChldikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcmFkaW9WYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmFkaW9WYWx1ZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzZWxmLnRleHQobGFiZWwgfHwgcmFkaW9WYWx1ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJhZGlvVmFsdWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgYmxvY2socmFkaW8pO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8vIGxhYmVsKHR4dCkge1xuICAgIC8vICAgICAgICAgLy8gRklYTUU6IHRoaXMgaXMgZXh0cmVtZWx5IGJyaXR0bGUuXG4gICAgLy8gICAgICAgICB2YXIgaWQgPSAnaWQnICsgKHRoaXMuaWRzICsgMSk7IC8vIE5COiBub3QgKysgISFcbiAgICAvLyAgICAgICAgIHJldHVybiB0aGlzLmF0dHIoJ2ZvcicsIGlkKS53aXRoRWxlbWVudCgnbGFiZWwnLCAoKSA9PiB0aGlzLnRleHQodHh0KSk7XG4gICAgLy8gfVxuXG4gICAgYWRkSW5wdXRFbGVtZW50cygpIHtcbiAgICAgICAgdmFyIGJhc2ljSW5wdXRzID0ge1xuICAgICAgICAgICAgc3BpbkJveDoge3R5cGU6ICdudW1iZXInLCBldmVudDogJ2lucHV0J30sXG4gICAgICAgICAgICBzbGlkZXI6IHt0eXBlOiAncmFuZ2UnLCBldmVudDogJ2lucHV0J30sXG4gICAgICAgICAgICBlbWFpbEJveDoge3R5cGU6ICdlbWFpbCcsIGV2ZW50OiAnaW5wdXQnfSxcbiAgICAgICAgICAgIHNlYXJjaEJveDoge3R5cGU6ICdzZWFyY2gnLCBldmVudDogJ2lucHV0J30sXG4gICAgICAgICAgICBkYXRlUGlja2VyOiB7dHlwZTogJ2RhdGUnLCBldmVudDogJ2NoYW5nZSd9LFxuICAgICAgICAgICAgY29sb3JQaWNrZXI6IHt0eXBlOiAnY29sb3InLCBldmVudDogJ2NoYW5nZSd9LFxuICAgICAgICAgICAgZGF0ZVRpbWVQaWNrZXI6IHt0eXBlOiAnZGF0ZXRpbWUnLCBldmVudDogJ2NoYW5nZSd9LFxuICAgICAgICAgICAgbG9jYWxEYXRlVGltZVBpY2tlcjoge3R5cGU6ICdkYXRldGltZS1sb2NhbCcsIGV2ZW50OiAnY2hhbmdlJ30sXG4gICAgICAgICAgICBtb250aFBpY2tlcjoge3R5cGU6ICd3ZWVrJywgZXZlbnQ6ICdjaGFuZ2UnfSxcbiAgICAgICAgICAgIHdlZWtQaWNrZXI6IHt0eXBlOiAnd2VlaycsIGV2ZW50OiAnY2hhbmdlJ30sXG4gICAgICAgICAgICB0aW1lUGlja2VyOiB7dHlwZTogJ3RpbWUnLCBldmVudDogJ2NoYW5nZSd9XG4gICAgICAgIH07XG4gICAgICAgIGZvciAodmFyIG5hbWUgaW4gYmFzaWNJbnB1dHMpIHtcbiAgICAgICAgICAgIGlmIChiYXNpY0lucHV0cy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICAgICAgICAgIChuYW1lID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tuYW1lXSA9IHZhbHVlID0+IHRoaXNcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRycyh7dHlwZTogYmFzaWNJbnB1dHNbbmFtZV0udHlwZSwgdmFsdWU6IHZhbHVlfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5vbignaW5wdXQnLCBbYmFzaWNJbnB1dHNbbmFtZV0uZXZlbnRdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ID0+IGV2ID8gZXYudGFyZ2V0LnZhbHVlIDogdmFsdWUpO1xuICAgICAgICAgICAgICAgIH0pKG5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgYWRkU2ltcGxlRWxlbWVudHMoKSB7XG4gICAgICAgIC8vIEN1cnJlbnRseSwgdGhlc2UgZG9uJ3QgaGF2ZSBldmVudHMuXG4gICAgICAgIFsnYScsICdwJywgJ2xhYmVsJywgJ3N0cm9uZycsICdicicsICdzcGFuJywgJ2gxJywgJ2gyJywgJ2gzJywgJ2g0JyxcbiAgICAgICAgICdzZWN0aW9uJywgJ2RpdicsICd1bCcsICdvbCcsICdsaScsICdoZWFkZXInLCAnZm9vdGVyJywgJ2NvZGUnLCAncHJlJyxcbiAgICAgICAgICdkbCcsICdkdCcsICdkZCcsICdmaWVsZHNldCcsICd0YWJsZScsICd0ZCcsICd0cicsICd0aCcsICdjb2wnLCAndGhlYWQnXVxuICAgICAgICAgICAgLmZvckVhY2goZWx0ID0+IFxuICAgICAgICAgICAgICAgICAgICAgKGVsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1tlbHRdID0geCA9PiB0aGlzLndpdGhFbGVtZW50KGVsdCwgKCkgPT4gdGhpcy5jb250ZW50KHgpKTtcbiAgICAgICAgICAgICAgICAgICAgIH0pKGVsdCkpO1xuICAgIH1cbiAgICBcbn1cblxuXG4vKlxuXG4gVGhlIGZvbGxvd2luZyBmdW5jdGlvbnMgZG9uJ3QgYWNjZXNzIFRyaW1HVUkgc3RhdGUsIGJ1dCBzaW1wbHlcbiBwYXRjaCB0aGUgcmVhbCBkb20gKDFzdCBhcmcpIGJhc2VkIG9uIHRoZSB2ZG9tICgybmQgYXJnKS5cblxuIHZkb20gZWxlbWVudFxuIHt0YWc6XG4gYXR0cnM6IHt9IGV0Yy5cbiBraWRzOiBbXSB9XG5cbiAqL1xuXG5mdW5jdGlvbiBjb21wYXQoZCwgdikge1xuICAgIC8vIGNvbnNvbGUubG9nKCdDb21wYXQ/ICcpO1xuICAgIC8vIGNvbnNvbGUubG9nKCdkID0gJyArIGQubm9kZVZhbHVlKTtcbiAgICAvLyBjb25zb2xlLmxvZygndiA9ICcgKyBKU09OLnN0cmluZ2lmeSh2KSk7XG4gICAgcmV0dXJuIChkLm5vZGVUeXBlID09PSBOb2RlLlRFWFRfTk9ERSAmJiAodHlwZW9mIHYgIT09ICdvYmplY3QnKSlcbiAgICAgICAgfHwgKGQudGFnTmFtZSA9PT0gdi50YWcudG9VcHBlckNhc2UoKSk7XG59XG5cblxuZnVuY3Rpb24gcmVjb25jaWxlKGRvbSwgdmRvbSkge1xuICAgIGlmICghY29tcGF0KGRvbSwgdmRvbSkpIHtcbiAgICAgICAgdGhyb3cgJ0NhbiBvbmx5IHJlY29uY2lsZSBjb21wYXRpYmxlIG5vZGVzJztcbiAgICB9XG4gICAgXG4gICAgLy8gVGV4dCBub2Rlc1xuICAgIGlmICh0eXBlb2YgdmRvbSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgaWYgKGRvbS5ub2RlVmFsdWUgIT09IHZkb20pIHtcbiAgICAgICAgICAgIGRvbS5ub2RlVmFsdWUgPSB2ZG9tLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuXG4gICAgLy8gRWxlbWVudCBub2Rlc1xuICAgIHZhciB2YXR0cnMgPSB2ZG9tLmF0dHJzIHx8IHt9O1xuICAgIGZvciAodmFyIHZhdHRyIGluIHZhdHRycykge1xuICAgICAgICBpZiAodmF0dHJzLmhhc093blByb3BlcnR5KHZhdHRyKSkge1xuICAgICAgICAgICAgaWYgKGRvbS5oYXNBdHRyaWJ1dGUodmF0dHIpKSB7XG4gICAgICAgICAgICAgICAgbGV0IGRhdHRyID0gZG9tLmdldEF0dHJpYnV0ZSh2YXR0cik7XG4gICAgICAgICAgICAgICAgaWYgKGRhdHRyICE9PSB2YXR0cnNbdmF0dHJdLnRvU3RyaW5nKCkpIHsgXG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ1VwZGF0aW5nIGF0dHJpYnV0ZTogJyArIHZhdHRyICsgJyA9ICcgKyB2YXR0cnNbdmF0dHJdKTtcbiAgICAgICAgICAgICAgICAgICAgZG9tLnNldEF0dHJpYnV0ZSh2YXR0ciwgdmF0dHJzW3ZhdHRyXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnQWRkaW5nIGF0dHJpYnV0ZTogJyArIHZhdHRyICsgJyA9ICcgKyB2YXR0cnNbdmF0dHJdKTtcbiAgICAgICAgICAgICAgICBkb20uc2V0QXR0cmlidXRlKHZhdHRyLCB2YXR0cnNbdmF0dHJdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRvbS5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxldCBkYXR0ciA9IGRvbS5hdHRyaWJ1dGVzW2ldO1xuICAgICAgICBpZiAoIXZhdHRycy5oYXNPd25Qcm9wZXJ0eShkYXR0ci5ub2RlTmFtZSkpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ1JlbW92aW5nIGF0dHJpYnV0ZTogJyArIGRhdHRyLm5vZGVOYW1lKTtcbiAgICAgICAgICAgIGRvbS5yZW1vdmVBdHRyaWJ1dGUoZGF0dHIubm9kZU5hbWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVjb25jaWxlS2lkcyhkb20sIGRvbS5jaGlsZE5vZGVzLCB2ZG9tLmtpZHMpO1xufVxuXG5mdW5jdGlvbiByZWNvbmNpbGVLaWRzKGRvbSwgZGtpZHMsIHZraWRzKSB7XG4gICAgdmFyIGxlbiA9IE1hdGgubWluKGRraWRzLmxlbmd0aCwgdmtpZHMubGVuZ3RoKTtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHZhciBka2lkID0gZGtpZHNbaV07XG4gICAgICAgIHZhciB2a2lkID0gdmtpZHNbaV07XG4gICAgICAgIGlmIChjb21wYXQoZGtpZCwgdmtpZCkpIHtcbiAgICAgICAgICAgIHJlY29uY2lsZShka2lkLCB2a2lkKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ1JlcGxhY2luZyBjaGlsZCcpO1xuICAgICAgICAgICAgZG9tLnJlcGxhY2VDaGlsZChidWlsZCh2a2lkKSwgZGtpZCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgaWYgKGRraWRzLmxlbmd0aCA+IGxlbikge1xuICAgICAgICB3aGlsZSAoZGtpZHMubGVuZ3RoID4gbGVuKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdSZW1vdmluZyBjaGlsZCAnKTtcbiAgICAgICAgICAgIGRvbS5yZW1vdmVDaGlsZChka2lkc1tsZW5dKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICh2a2lkcy5sZW5ndGggPiBsZW4pIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IGxlbjsgaSA8IHZraWRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdBcHBlbmRpbmcgbmV3IGNoaWxkICcpO1xuICAgICAgICAgICAgZG9tLmFwcGVuZENoaWxkKGJ1aWxkKHZraWRzW2ldKSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkKHZkb20pIHtcbiAgICBpZiAodmRvbSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgdmRvbSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHZkb20udG9TdHJpbmcoKSk7XG4gICAgfVxuICAgIFxuICAgIHZhciBlbHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHZkb20udGFnKTtcbiAgICB2YXIgdmF0dHJzID0gdmRvbS5hdHRycyB8fCB7fTtcbiAgICBmb3IgKHZhciBrIGluIHZhdHRycykge1xuICAgICAgICBpZiAodmF0dHJzLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICBlbHQuc2V0QXR0cmlidXRlKGssIHZhdHRyc1trXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZG9tLmtpZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZWx0LmFwcGVuZENoaWxkKGJ1aWxkKHZkb20ua2lkc1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gZWx0OyAgICBcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUcmltR1VJO1xuXG4iXX0=
