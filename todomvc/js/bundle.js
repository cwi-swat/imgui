!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.app=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// TODOMV using IMGUI.

'use strict';

// Data model


class Todos {
    constructor () {
        this.todos = [];
        this.newTodo = '';
        this.filter = 'none';
        this.ids = 0;
        this.load();
    }

    toJSON() {
        return {newTodo: this.newTodo, ids: this.ids,
                todos: this.todos.map(t => t.toJSON())};
    }
    
    load() {
        var txt = window.localStorage['todo-mvc'];
        if (txt) {
            var json = JSON.parse(txt);
            this.ids = json.ids;
            this.newTodo = json.newTodo;
            this.todos = json.todos.map(t => Todo.fromJSON(this, t));
        }
    }
    
    persist() {
        window.localStorage['todo-mvc'] = JSON.stringify(this.toJSON());
    }

    createTodo(value) {
        var todo = new Todo(value, this, this.ids++);
        this.todos.push(todo);
    }

    deleteTodo(todo) {
        var idx = this.todos.findIndex(x => x.id === todo.id);
        this.todos.splice(idx, 1);
    }

    filteredTodos() {
        return this.todos.filter(x => this.shouldShow(x));
    }
    
    shouldShow(todo) {
        switch (this.filter) {
        case 'none': return true;
        case 'active': return !todo.completed;
        case 'completed': return todo.completed;
        }
        return undefined;
    }
    
}

class Todo {
    constructor (text, model, id) {
        this.text = text;
        this.completed = false;
        this.editing = false;
        this.model = model;
        this.id = id;
    }

    static fromJSON(model, obj) {
        var todo = new Todo(obj.text, model, obj.id);
        todo.completed = obj.completed;
        todo.editing = obj.editing;
        return todo;
    }
    
    toJSON() {
        return {text: this.text,
                completed: this.completed,
                editing: this.editing,
                id: this.id};
    }

    save(value) {
        let txt = value.trim();
        if (txt !== '') {
            this.text = txt;
        }
        else {
            this.destroy();
        }
    }

    destroy() {
        this.model.deleteTodo(this);
    }
    
}


const TrimGUI = require('libimgui');

const wnd = new TrimGUI(main, new Todos(), 'todoapp');

const ENTER_KEY = 13;
const ESCAPE_KEY = 27;

function main(model) {
    if (wnd.inRoute('#/active')) {
        model.filter = 'active';
    }
    else if (wnd.inRoute('#/completed')) {
        model.filter = 'completed';
    }
    
    wnd.klass('todoapp').section(() => {
        wnd.klass('header').header(() => {
            wnd.h1('todos');
            newTodo(model);
        });
        
        if (model.todos.length > 0 ) {
            mainSection(model, model.todos);
            footer(model);
        }
    });
    
    model.persist();    
}


function newTodo(model) {
    var attrs = {'class': 'new-todo', type: 'text', value: model.newTodo,
                 placeholder: 'What needs to be done?',
                 onMount: elt => {elt.value=model.newTodo;}};
    
    wnd.attrs(attrs).on('input', ['keyup'], ev => {
        if (ev) {
            if (ev.keyCode === ENTER_KEY) {
                let txt = ev.target.value.trim();
                if (txt !== '') {
                    model.createTodo(ev.target.value);
                    model.newTodo = '';
                }
            }
            else if (ev.keyCode === ESCAPE_KEY) {
                model.newTodo = '';
            }
            else {
                model.newTodo = ev.target.value;
            }
        }
    });
}


function mainSection(model, todos) {
    wnd.klass('main').section(() => {
        if (wnd.klass('toggle-all').checkBox(false)) {
            for (let i = 0; i < todos.length; i++) {
                todos[i].completed = true;
            }
        }
        wnd.attr('for', 'toggle-all').label('Mark all as complete');
        
        wnd.klass('todo-list').ul(() => {
            model.filteredTodos().forEach(showTodo);
        });
    });
    
}

function filterButton(model, title, name, hash) {
    hash = hash === undefined ? name : hash;
    wnd.li(() => {
        if (wnd.attrIf(model.filter === name, 'class', 'selected')
            .attr('href', '#/' + hash).aclick(title)) {
            model.filter = name;
        }
    });
}

function footer(model) {
    wnd.klass('footer').footer(() => {
        wnd.klass('todo-count').span(() => {
            wnd.strong(model.todos.length + ' item(s) left');
        });

        wnd.klass('filters').ul(() => {
            filterButton(model, 'All', 'none', '');
            filterButton(model, 'Active', 'active');
            filterButton(model, 'Completed', 'completed');
        });
        
        if (wnd.klass('clear-completed').button('Clear completed')) {
            let j = 0;
            let len = model.todos.length;
            for (let i = 0; i < len; i++) {
                let todo = model.todos[i - j];
                if (todo.completed) {
                    todo.destroy(); 
                    j++;
                }
            }
        }
    });
}

function showTodo(todo) {
    let cls = todo.completed ? 'completed' :  '';
    cls += todo.editing ? ' editing' : '';
    let attrs = cls ? {'class': cls.trim()} : {};

    wnd.attrs(attrs).li(() => {
        viewTodo(todo);
        if (todo.editing) {
            editTodo(todo);
        }
    });
}


function viewTodo(todo) {
    wnd.klass('view').div(() => {
        todo.completed = wnd.klass('toggle').checkBox(todo.completed);

        wnd.on('label', ['dblclick'], ev => {
            if (ev) {
                todo.editing = true;
            }
            wnd.text(todo.text);
        });
        
        if (wnd.klass('destroy').button()) {
            todo.destroy();
        }
    });
}



function editTodo(todo) {
    wnd.klass('edit')
        .attr('value', todo.text)
        .attr('onMount', e => e.focus())
        .on('input', ['keyup', 'focusout'], ev => {
            if (ev) {
                if (ev.type === 'keyup') {
                    if (ev.keyCode === ENTER_KEY) {
                        todo.editing = false;
                        todo.save(ev.target.value);
                    }
                    if (ev.keyCode === ESCAPE_KEY) {
                        todo.editing = false;
                    }
                }
                if (ev.type === 'focusout') { // blur doesn't bubble up....
                    todo.editing = false;
                    todo.save(ev.target.value);
                }
            }
        });
}


module.exports = wnd;

},{"libimgui":2}],2:[function(require,module,exports){

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

    inRoute(hash, block) {
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
                });
                this.text(label || radioValue);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImpzL2FwcC5qcyIsIm5vZGVfbW9kdWxlcy9saWJpbWd1aS9saWJpbWd1aS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBUT0RPTVYgdXNpbmcgSU1HVUkuXG5cbid1c2Ugc3RyaWN0JztcblxuLy8gRGF0YSBtb2RlbFxuXG5cbmNsYXNzIFRvZG9zIHtcbiAgICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgICAgIHRoaXMudG9kb3MgPSBbXTtcbiAgICAgICAgdGhpcy5uZXdUb2RvID0gJyc7XG4gICAgICAgIHRoaXMuZmlsdGVyID0gJ25vbmUnO1xuICAgICAgICB0aGlzLmlkcyA9IDA7XG4gICAgICAgIHRoaXMubG9hZCgpO1xuICAgIH1cblxuICAgIHRvSlNPTigpIHtcbiAgICAgICAgcmV0dXJuIHtuZXdUb2RvOiB0aGlzLm5ld1RvZG8sIGlkczogdGhpcy5pZHMsXG4gICAgICAgICAgICAgICAgdG9kb3M6IHRoaXMudG9kb3MubWFwKHQgPT4gdC50b0pTT04oKSl9O1xuICAgIH1cbiAgICBcbiAgICBsb2FkKCkge1xuICAgICAgICB2YXIgdHh0ID0gd2luZG93LmxvY2FsU3RvcmFnZVsndG9kby1tdmMnXTtcbiAgICAgICAgaWYgKHR4dCkge1xuICAgICAgICAgICAgdmFyIGpzb24gPSBKU09OLnBhcnNlKHR4dCk7XG4gICAgICAgICAgICB0aGlzLmlkcyA9IGpzb24uaWRzO1xuICAgICAgICAgICAgdGhpcy5uZXdUb2RvID0ganNvbi5uZXdUb2RvO1xuICAgICAgICAgICAgdGhpcy50b2RvcyA9IGpzb24udG9kb3MubWFwKHQgPT4gVG9kby5mcm9tSlNPTih0aGlzLCB0KSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcGVyc2lzdCgpIHtcbiAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZVsndG9kby1tdmMnXSA9IEpTT04uc3RyaW5naWZ5KHRoaXMudG9KU09OKCkpO1xuICAgIH1cblxuICAgIGNyZWF0ZVRvZG8odmFsdWUpIHtcbiAgICAgICAgdmFyIHRvZG8gPSBuZXcgVG9kbyh2YWx1ZSwgdGhpcywgdGhpcy5pZHMrKyk7XG4gICAgICAgIHRoaXMudG9kb3MucHVzaCh0b2RvKTtcbiAgICB9XG5cbiAgICBkZWxldGVUb2RvKHRvZG8pIHtcbiAgICAgICAgdmFyIGlkeCA9IHRoaXMudG9kb3MuZmluZEluZGV4KHggPT4geC5pZCA9PT0gdG9kby5pZCk7XG4gICAgICAgIHRoaXMudG9kb3Muc3BsaWNlKGlkeCwgMSk7XG4gICAgfVxuXG4gICAgZmlsdGVyZWRUb2RvcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9kb3MuZmlsdGVyKHggPT4gdGhpcy5zaG91bGRTaG93KHgpKTtcbiAgICB9XG4gICAgXG4gICAgc2hvdWxkU2hvdyh0b2RvKSB7XG4gICAgICAgIHN3aXRjaCAodGhpcy5maWx0ZXIpIHtcbiAgICAgICAgY2FzZSAnbm9uZSc6IHJldHVybiB0cnVlO1xuICAgICAgICBjYXNlICdhY3RpdmUnOiByZXR1cm4gIXRvZG8uY29tcGxldGVkO1xuICAgICAgICBjYXNlICdjb21wbGV0ZWQnOiByZXR1cm4gdG9kby5jb21wbGV0ZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgXG59XG5cbmNsYXNzIFRvZG8ge1xuICAgIGNvbnN0cnVjdG9yICh0ZXh0LCBtb2RlbCwgaWQpIHtcbiAgICAgICAgdGhpcy50ZXh0ID0gdGV4dDtcbiAgICAgICAgdGhpcy5jb21wbGV0ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5lZGl0aW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMubW9kZWwgPSBtb2RlbDtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgIH1cblxuICAgIHN0YXRpYyBmcm9tSlNPTihtb2RlbCwgb2JqKSB7XG4gICAgICAgIHZhciB0b2RvID0gbmV3IFRvZG8ob2JqLnRleHQsIG1vZGVsLCBvYmouaWQpO1xuICAgICAgICB0b2RvLmNvbXBsZXRlZCA9IG9iai5jb21wbGV0ZWQ7XG4gICAgICAgIHRvZG8uZWRpdGluZyA9IG9iai5lZGl0aW5nO1xuICAgICAgICByZXR1cm4gdG9kbztcbiAgICB9XG4gICAgXG4gICAgdG9KU09OKCkge1xuICAgICAgICByZXR1cm4ge3RleHQ6IHRoaXMudGV4dCxcbiAgICAgICAgICAgICAgICBjb21wbGV0ZWQ6IHRoaXMuY29tcGxldGVkLFxuICAgICAgICAgICAgICAgIGVkaXRpbmc6IHRoaXMuZWRpdGluZyxcbiAgICAgICAgICAgICAgICBpZDogdGhpcy5pZH07XG4gICAgfVxuXG4gICAgc2F2ZSh2YWx1ZSkge1xuICAgICAgICBsZXQgdHh0ID0gdmFsdWUudHJpbSgpO1xuICAgICAgICBpZiAodHh0ICE9PSAnJykge1xuICAgICAgICAgICAgdGhpcy50ZXh0ID0gdHh0O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkZXN0cm95KCkge1xuICAgICAgICB0aGlzLm1vZGVsLmRlbGV0ZVRvZG8odGhpcyk7XG4gICAgfVxuICAgIFxufVxuXG5cbmNvbnN0IFRyaW1HVUkgPSByZXF1aXJlKCdsaWJpbWd1aScpO1xuXG5jb25zdCB3bmQgPSBuZXcgVHJpbUdVSShtYWluLCBuZXcgVG9kb3MoKSwgJ3RvZG9hcHAnKTtcblxuY29uc3QgRU5URVJfS0VZID0gMTM7XG5jb25zdCBFU0NBUEVfS0VZID0gMjc7XG5cbmZ1bmN0aW9uIG1haW4obW9kZWwpIHtcbiAgICBpZiAod25kLmluUm91dGUoJyMvYWN0aXZlJykpIHtcbiAgICAgICAgbW9kZWwuZmlsdGVyID0gJ2FjdGl2ZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHduZC5pblJvdXRlKCcjL2NvbXBsZXRlZCcpKSB7XG4gICAgICAgIG1vZGVsLmZpbHRlciA9ICdjb21wbGV0ZWQnO1xuICAgIH1cbiAgICBcbiAgICB3bmQua2xhc3MoJ3RvZG9hcHAnKS5zZWN0aW9uKCgpID0+IHtcbiAgICAgICAgd25kLmtsYXNzKCdoZWFkZXInKS5oZWFkZXIoKCkgPT4ge1xuICAgICAgICAgICAgd25kLmgxKCd0b2RvcycpO1xuICAgICAgICAgICAgbmV3VG9kbyhtb2RlbCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKG1vZGVsLnRvZG9zLmxlbmd0aCA+IDAgKSB7XG4gICAgICAgICAgICBtYWluU2VjdGlvbihtb2RlbCwgbW9kZWwudG9kb3MpO1xuICAgICAgICAgICAgZm9vdGVyKG1vZGVsKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIFxuICAgIG1vZGVsLnBlcnNpc3QoKTsgICAgXG59XG5cblxuZnVuY3Rpb24gbmV3VG9kbyhtb2RlbCkge1xuICAgIHZhciBhdHRycyA9IHsnY2xhc3MnOiAnbmV3LXRvZG8nLCB0eXBlOiAndGV4dCcsIHZhbHVlOiBtb2RlbC5uZXdUb2RvLFxuICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogJ1doYXQgbmVlZHMgdG8gYmUgZG9uZT8nLFxuICAgICAgICAgICAgICAgICBvbk1vdW50OiBlbHQgPT4ge2VsdC52YWx1ZT1tb2RlbC5uZXdUb2RvO319O1xuICAgIFxuICAgIHduZC5hdHRycyhhdHRycykub24oJ2lucHV0JywgWydrZXl1cCddLCBldiA9PiB7XG4gICAgICAgIGlmIChldikge1xuICAgICAgICAgICAgaWYgKGV2LmtleUNvZGUgPT09IEVOVEVSX0tFWSkge1xuICAgICAgICAgICAgICAgIGxldCB0eHQgPSBldi50YXJnZXQudmFsdWUudHJpbSgpO1xuICAgICAgICAgICAgICAgIGlmICh0eHQgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsLmNyZWF0ZVRvZG8oZXYudGFyZ2V0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgbW9kZWwubmV3VG9kbyA9ICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGV2LmtleUNvZGUgPT09IEVTQ0FQRV9LRVkpIHtcbiAgICAgICAgICAgICAgICBtb2RlbC5uZXdUb2RvID0gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBtb2RlbC5uZXdUb2RvID0gZXYudGFyZ2V0LnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59XG5cblxuZnVuY3Rpb24gbWFpblNlY3Rpb24obW9kZWwsIHRvZG9zKSB7XG4gICAgd25kLmtsYXNzKCdtYWluJykuc2VjdGlvbigoKSA9PiB7XG4gICAgICAgIGlmICh3bmQua2xhc3MoJ3RvZ2dsZS1hbGwnKS5jaGVja0JveChmYWxzZSkpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG9kb3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0b2Rvc1tpXS5jb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHduZC5hdHRyKCdmb3InLCAndG9nZ2xlLWFsbCcpLmxhYmVsKCdNYXJrIGFsbCBhcyBjb21wbGV0ZScpO1xuICAgICAgICBcbiAgICAgICAgd25kLmtsYXNzKCd0b2RvLWxpc3QnKS51bCgoKSA9PiB7XG4gICAgICAgICAgICBtb2RlbC5maWx0ZXJlZFRvZG9zKCkuZm9yRWFjaChzaG93VG9kbyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIFxufVxuXG5mdW5jdGlvbiBmaWx0ZXJCdXR0b24obW9kZWwsIHRpdGxlLCBuYW1lLCBoYXNoKSB7XG4gICAgaGFzaCA9IGhhc2ggPT09IHVuZGVmaW5lZCA/IG5hbWUgOiBoYXNoO1xuICAgIHduZC5saSgoKSA9PiB7XG4gICAgICAgIGlmICh3bmQuYXR0cklmKG1vZGVsLmZpbHRlciA9PT0gbmFtZSwgJ2NsYXNzJywgJ3NlbGVjdGVkJylcbiAgICAgICAgICAgIC5hdHRyKCdocmVmJywgJyMvJyArIGhhc2gpLmFjbGljayh0aXRsZSkpIHtcbiAgICAgICAgICAgIG1vZGVsLmZpbHRlciA9IG5hbWU7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gZm9vdGVyKG1vZGVsKSB7XG4gICAgd25kLmtsYXNzKCdmb290ZXInKS5mb290ZXIoKCkgPT4ge1xuICAgICAgICB3bmQua2xhc3MoJ3RvZG8tY291bnQnKS5zcGFuKCgpID0+IHtcbiAgICAgICAgICAgIHduZC5zdHJvbmcobW9kZWwudG9kb3MubGVuZ3RoICsgJyBpdGVtKHMpIGxlZnQnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgd25kLmtsYXNzKCdmaWx0ZXJzJykudWwoKCkgPT4ge1xuICAgICAgICAgICAgZmlsdGVyQnV0dG9uKG1vZGVsLCAnQWxsJywgJ25vbmUnLCAnJyk7XG4gICAgICAgICAgICBmaWx0ZXJCdXR0b24obW9kZWwsICdBY3RpdmUnLCAnYWN0aXZlJyk7XG4gICAgICAgICAgICBmaWx0ZXJCdXR0b24obW9kZWwsICdDb21wbGV0ZWQnLCAnY29tcGxldGVkJyk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKHduZC5rbGFzcygnY2xlYXItY29tcGxldGVkJykuYnV0dG9uKCdDbGVhciBjb21wbGV0ZWQnKSkge1xuICAgICAgICAgICAgbGV0IGogPSAwO1xuICAgICAgICAgICAgbGV0IGxlbiA9IG1vZGVsLnRvZG9zLmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgdG9kbyA9IG1vZGVsLnRvZG9zW2kgLSBqXTtcbiAgICAgICAgICAgICAgICBpZiAodG9kby5jb21wbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9kby5kZXN0cm95KCk7IFxuICAgICAgICAgICAgICAgICAgICBqKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHNob3dUb2RvKHRvZG8pIHtcbiAgICBsZXQgY2xzID0gdG9kby5jb21wbGV0ZWQgPyAnY29tcGxldGVkJyA6ICAnJztcbiAgICBjbHMgKz0gdG9kby5lZGl0aW5nID8gJyBlZGl0aW5nJyA6ICcnO1xuICAgIGxldCBhdHRycyA9IGNscyA/IHsnY2xhc3MnOiBjbHMudHJpbSgpfSA6IHt9O1xuXG4gICAgd25kLmF0dHJzKGF0dHJzKS5saSgoKSA9PiB7XG4gICAgICAgIHZpZXdUb2RvKHRvZG8pO1xuICAgICAgICBpZiAodG9kby5lZGl0aW5nKSB7XG4gICAgICAgICAgICBlZGl0VG9kbyh0b2RvKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5cbmZ1bmN0aW9uIHZpZXdUb2RvKHRvZG8pIHtcbiAgICB3bmQua2xhc3MoJ3ZpZXcnKS5kaXYoKCkgPT4ge1xuICAgICAgICB0b2RvLmNvbXBsZXRlZCA9IHduZC5rbGFzcygndG9nZ2xlJykuY2hlY2tCb3godG9kby5jb21wbGV0ZWQpO1xuXG4gICAgICAgIHduZC5vbignbGFiZWwnLCBbJ2RibGNsaWNrJ10sIGV2ID0+IHtcbiAgICAgICAgICAgIGlmIChldikge1xuICAgICAgICAgICAgICAgIHRvZG8uZWRpdGluZyA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3bmQudGV4dCh0b2RvLnRleHQpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmICh3bmQua2xhc3MoJ2Rlc3Ryb3knKS5idXR0b24oKSkge1xuICAgICAgICAgICAgdG9kby5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuXG5cbmZ1bmN0aW9uIGVkaXRUb2RvKHRvZG8pIHtcbiAgICB3bmQua2xhc3MoJ2VkaXQnKVxuICAgICAgICAuYXR0cigndmFsdWUnLCB0b2RvLnRleHQpXG4gICAgICAgIC5hdHRyKCdvbk1vdW50JywgZSA9PiBlLmZvY3VzKCkpXG4gICAgICAgIC5vbignaW5wdXQnLCBbJ2tleXVwJywgJ2ZvY3Vzb3V0J10sIGV2ID0+IHtcbiAgICAgICAgICAgIGlmIChldikge1xuICAgICAgICAgICAgICAgIGlmIChldi50eXBlID09PSAna2V5dXAnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChldi5rZXlDb2RlID09PSBFTlRFUl9LRVkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvZG8uZWRpdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdG9kby5zYXZlKGV2LnRhcmdldC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2LmtleUNvZGUgPT09IEVTQ0FQRV9LRVkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvZG8uZWRpdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChldi50eXBlID09PSAnZm9jdXNvdXQnKSB7IC8vIGJsdXIgZG9lc24ndCBidWJibGUgdXAuLi4uXG4gICAgICAgICAgICAgICAgICAgIHRvZG8uZWRpdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB0b2RvLnNhdmUoZXYudGFyZ2V0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gd25kO1xuIiwiXG4ndXNlIHN0cmljdCc7XG5cbi8qXG4gKiBUT0RPOlxuICogLSBkb24ndCBidWlsZCB2bm9kZSB3aGVuIGhhbmRsaW5nIGV2ZW50LlxuICogLSBtYWtlIGBoZXJlYCBtb3JlIHJvYnVzdFxuICogLSBvcHRpbWl6ZSB1c2Ugb2YgaWRzIGluIGxpc3RzXG4gKiAtIGVsaW1pbmF0ZSAuY2xhc3MvI2lkIHBhcnNpbmdcbiAqIC0gc3VwcG9ydCBrZXktYmFzZWQgcGF0Y2hpbmcgKGF0dHIgYGtleWApXG4gKi9cblxuY2xhc3MgVHJpbUdVSSB7XG4gICAgY29uc3RydWN0b3IgKGFwcCwgbW9kZWwsIHJvb3QpIHtcbiAgICAgICAgdGhpcy5hcHAgPSBhcHA7XG4gICAgICAgIHRoaXMubW9kZWwgPSBtb2RlbDtcbiAgICAgICAgdGhpcy5yb290ID0gcm9vdDtcbiAgICAgICAgdGhpcy5ldmVudCA9IG51bGw7XG4gICAgICAgIHRoaXMuZm9jdXMgPSBbXTtcbiAgICAgICAgdGhpcy5ub2RlID0gbnVsbDtcbiAgICAgICAgdGhpcy5vbk1vdW50cyA9IHt9O1xuICAgICAgICB0aGlzLnRpbWVycyA9IHt9O1xuICAgICAgICB0aGlzLmhhbmRsZXJzID0ge307XG4gICAgICAgIHRoaXMuaWRzID0gMDtcbiAgICAgICAgdGhpcy5hdHRyaWJ1dGVzID0ge307XG4gICAgICAgIHRoaXMucm91dGUgPSBkb2N1bWVudC5sb2NhdGlvbi5oYXNoO1xuICAgICAgICB0aGlzLmFkZFNpbXBsZUVsZW1lbnRzKCk7XG4gICAgICAgIHRoaXMuYWRkSW5wdXRFbGVtZW50cygpO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignc3RvcmFnZScsIHRoaXMuZGVhbFdpdGhJdCwgZmFsc2UpO1xuICAgIH1cblxuICAgIHJ1bigpIHtcbiAgICAgICAgdGhpcy5tb3VudCh0aGlzLnJlbmRlck9uY2UoKSk7XG4gICAgfVxuICAgIFxuICAgIHJlZ2lzdGVyKGV2ZW50LCBpZCkge1xuICAgICAgICAvLyBvbmx5IGFkZCBvbmUgaGFuZGxlciB0byByb290LCBwZXIgZXZlbnQgdHlwZS5cbiAgICAgICAgaWYgKCF0aGlzLmhhbmRsZXJzLmhhc093blByb3BlcnR5KGV2ZW50KSkge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVyc1tldmVudF0gPSBbXTtcbiAgICAgICAgICAgIHZhciByID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5yb290KTtcbiAgICAgICAgICAgIHIuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgZSA9PiB7XG4gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTsgLy8gZG9uJ3QgbGVhayB1cHdhcmRzXG4gICAgICAgICAgICAgICAgdmFyIGlkID0gZS50YXJnZXQuZ2V0QXR0cmlidXRlKCdpZCcpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmhhbmRsZXJzW2V2ZW50XS5pbmRleE9mKGlkKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXZlbnQgPSBlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvUmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaGFuZGxlcnNbZXZlbnRdLnB1c2goaWQpO1xuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICBmb3IgKHZhciBrIGluIHRoaXMuaGFuZGxlcnMpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmhhbmRsZXJzLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVyc1trXSA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMub25Nb3VudHMgPSB7fTtcbiAgICAgICAgdGhpcy5mb2N1cyA9IFtdO1xuICAgICAgICB0aGlzLmlkcyA9IDA7XG4gICAgfVxuXG4gICAgcmVuZGVyT25jZSgpIHtcbiAgICAgICAgdGhpcy5yZXNldCgpO1xuICAgICAgICB0aGlzLmFwcCh0aGlzLm1vZGVsKTtcbiAgICB9XG5cbiAgICBkb1JlbmRlcigpIHtcbiAgICAgICAgLy8gdHdpY2U6IG9uZSB0byBoYW5kbGUgZXZlbnQsIG9uZSB0byBzeW5jIHZpZXcuXG4gICAgICAgIHZhciBfID0gdGhpcy5yZW5kZXJPbmNlKCk7XG4gICAgICAgIHZhciBub2RlID0gdGhpcy5yZW5kZXJPbmNlKCk7XG4gICAgICAgIHRoaXMubW91bnQobm9kZSk7XG4gICAgfVxuXG4gICAgbW91bnQobm9kZSkge1xuICAgICAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5yb290KTtcbiAgICAgICAgaWYgKHRoaXMubm9kZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVjb25jaWxlS2lkcyhjb250YWluZXIsIGNvbnRhaW5lci5jaGlsZE5vZGVzLCB0aGlzLmZvY3VzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHdoaWxlIChjb250YWluZXIuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5yZW1vdmVDaGlsZChjb250YWluZXIuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZm9jdXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoYnVpbGQodGhpcy5mb2N1c1tpXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMubm9kZSA9IG5vZGU7XG4gICAgICAgIFxuICAgICAgICBmb3IgKHZhciBpZCBpbiB0aGlzLm9uTW91bnRzKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5vbk1vdW50cy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgZG9Tb21ldGhpbmcgPSB0aGlzLm9uTW91bnRzW2lkXTtcbiAgICAgICAgICAgICAgICB2YXIgZWx0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuICAgICAgICAgICAgICAgIGRvU29tZXRoaW5nKGVsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgfVxuXG4gICAgZGVhbFdpdGhJdChlKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSBlO1xuICAgICAgICB0aGlzLmRvUmVuZGVyKCk7XG4gICAgfVxuXG5cbiAgICBhdHRycyhhcykge1xuICAgICAgICBmb3IgKHZhciBhIGluIGFzKSB7XG4gICAgICAgICAgICBpZiAoYXMuaGFzT3duUHJvcGVydHkoYSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZXNbYV0gPSBhc1thXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpblJvdXRlKGhhc2gsIGJsb2NrKSB7XG4gICAgICAgIGlmICghdGhpcy5yb3V0ZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnJvdXRlID09PSBoYXNoKSB7XG4gICAgICAgICAgICB0aGlzLnJvdXRlID0gdW5kZWZpbmVkOyAvLyBvbmx5IHJ1biBvbmNlLlxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIG9uU3RvcmFnZShibG9jaykge1xuICAgICAgICB2YXIgZXZlbnQgPSB0aGlzLmV2ZW50O1xuICAgICAgICBpZiAoZXZlbnQgJiYgZXZlbnQudHlwZSA9PT0gJ3N0b3JhZ2UnKSB7XG4gICAgICAgICAgICB0aGlzLmV2ZW50ID0gdW5kZWZpbmVkOyBcbiAgICAgICAgICAgIGJsb2NrKGV2ZW50KTsgXG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgb24oZWx0LCBldmVudHMsIGJsb2NrKSB7XG4gICAgICAgIHZhciBpZCA9IHRoaXMuYXR0cmlidXRlc1snaWQnXSB8fCAoJ2lkJyArIHRoaXMuaWRzKyspO1xuICAgICAgICBldmVudHMuZm9yRWFjaChlID0+IHRoaXMucmVnaXN0ZXIoZSwgaWQpKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzLmlkKGlkKS53aXRoRWxlbWVudChlbHQsICgpID0+IHtcbiAgICAgICAgICAgIHZhciBldmVudCA9IHRoaXMuZXZlbnQ7XG4gICAgICAgICAgICBpZiAoZXZlbnQgJiYgZXZlbnQudGFyZ2V0LmdldEF0dHJpYnV0ZSgnaWQnKSA9PT0gaWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50ID0gdW5kZWZpbmVkOyAvLyBtYXliZSBkbyBpbiB0b3BsZXZlbD8/P1xuICAgICAgICAgICAgICAgIHJldHVybiBibG9jayhldmVudCk7IC8vIGxldCBpdCBiZSBoYW5kbGVkXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYmxvY2soKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgd2l0aEVsZW1lbnQoZWx0LCBmdW5jLCBldnMpIHtcbiAgICAgICAgLy8gVE9ETzogaWYgdGhpcy5wcmV0ZW5kLCBkb24ndCBidWlsZCB2bm9kZXNcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMuZm9jdXM7XG4gICAgICAgIHRoaXMuZm9jdXMgPSBbXTtcblxuICAgICAgICAvLyBDb3B5IHRoZSBjdXJyZW50IGF0dHJpYnV0ZSBzZXRcbiAgICAgICAgdmFyIG15QXR0cnMgPSB7fTtcbiAgICAgICAgZm9yICh2YXIgYSBpbiB0aGlzLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmF0dHJpYnV0ZXMuaGFzT3duUHJvcGVydHkoYSkpIHtcbiAgICAgICAgICAgICAgICBteUF0dHJzW2FdID0gdGhpcy5hdHRyaWJ1dGVzW2FdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IHt9OyAvLyBraWRzIGRvbid0IGluaGVyaXQgYXR0cnMuXG4gICAgICAgIFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmMoKTtcbiAgICAgICAgfVxuICAgICAgICBmaW5hbGx5IHtcbiAgICAgICAgICAgIGlmIChteUF0dHJzICYmIG15QXR0cnMub25Nb3VudCkge1xuICAgICAgICAgICAgICAgIHRoaXMub25Nb3VudHNbbXlBdHRyc1snaWQnXV0gPSBteUF0dHJzLm9uTW91bnQ7XG4gICAgICAgICAgICAgICAgZGVsZXRlIG15QXR0cnMub25Nb3VudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciB2bm9kZSA9IHt0YWc6IGVsdCwgYXR0cnM6IG15QXR0cnMsIGtpZHM6IHRoaXMuZm9jdXN9O1xuICAgICAgICAgICAgcGFyZW50LnB1c2godm5vZGUpO1xuICAgICAgICAgICAgdGhpcy5mb2N1cyA9IHBhcmVudDtcbiAgICAgICAgfSAgICBcbiAgICB9XG5cblxuICAgIGhlcmUoZnVuYywgYmxvY2spIHtcbiAgICAgICAgdmFyIHBvcyA9IHRoaXMuZm9jdXMubGVuZ3RoO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiBibG9jayhmdW5jdGlvbiAoKSB7IC8vIGJlY2F1c2UgYXJndW1lbnRzLlxuICAgICAgICAgICAgdmFyIHBhcmVudCA9IHNlbGYuZm9jdXM7XG4gICAgICAgICAgICBzZWxmLmZvY3VzID0gW107XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuZm9jdXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50LnNwbGljZShwb3MgKyBpLCAwLCBzZWxmLmZvY3VzW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2VsZi5mb2N1cyA9IHBhcmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICBjb250ZW50KGMsIGV2KSB7XG4gICAgICAgIGlmICh0eXBlb2YgYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYy5hcHBseSh1bmRlZmluZWQsIGV2KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aGlzLnRleHQoYyk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIHRleHQodHh0KSB7XG4gICAgICAgIHRoaXMuZm9jdXMucHVzaCh0eHQpO1xuICAgIH1cblxuICAgIG5leHRJZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaWRzICsgMTtcbiAgICB9XG4gICAgXG4gICAgXG4gICAgLy8gY29udmVuaWVuY2VcblxuICAgIGF0dHIobiwgeCkge1xuICAgICAgICB2YXIgb2JqID0ge307XG4gICAgICAgIG9ialtuXSA9IHg7XG4gICAgICAgIHJldHVybiB0aGlzLmF0dHJzKG9iaik7XG4gICAgfVxuXG4gICAgYXR0cklmKGMsIG4sIHgpIHtcbiAgICAgICAgaWYgKGMpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmF0dHIobiwgeCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIFxuICAgIGtsYXNzKHgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXR0cignY2xhc3MnLCB4KTtcbiAgICB9XG5cbiAgICBpZCh4KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmF0dHIoJ2lkJywgeCk7XG4gICAgfVxuXG4gICAgdGV4dGFyZWEoeCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vbigndGV4dGFyZWEnLCBbJ2tleXVwJywgJ2JsdXInXSwgZXYgPT4ge1xuICAgICAgICAgICAgdmFyIG5ld1ZhbHVlID0gZXYgPyBldi50YXJnZXQudmFsdWUgOiB2YWx1ZTtcbiAgICAgICAgICAgIHRoaXMuY29udGVudCh4LCBldik7XG4gICAgICAgICAgICByZXR1cm4gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICB0ZXh0Qm94KHZhbHVlKSB7XG4gICAgICAgIHZhciBhdHRycyA9IHt9O1xuICAgICAgICBhdHRycy50eXBlID0gJ3RleHQnO1xuICAgICAgICBhdHRycy52YWx1ZSA9IHZhbHVlO1xuICAgICAgICBhdHRycy5vbk1vdW50ID0gZWx0ID0+IHtcbiAgICAgICAgICAgICAgICBlbHQudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzLmF0dHJzKGF0dHJzKS5vbignaW5wdXQnLCBbJ2lucHV0J10sIGV2ID0+IHtcbiAgICAgICAgICAgIHJldHVybiBldiA/IGV2LnRhcmdldC52YWx1ZSA6IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjaGVja0JveCh2YWx1ZSkge1xuICAgICAgICB2YXIgYXR0cnMgPSBhdHRycyB8fCB7fTtcbiAgICAgICAgYXR0cnMudHlwZSA9ICdjaGVja2JveCc7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgYXR0cnMuY2hlY2tlZCA9ICd0cnVlJztcbiAgICAgICAgfVxuICAgICAgICBhdHRycy5vbk1vdW50ID0gZWx0ID0+IHtcbiAgICAgICAgICAgIGVsdC5jaGVja2VkID0gdmFsdWU7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcy5hdHRycyhhdHRycykub24oJ2lucHV0JywgWydjbGljayddLCBldiA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZXYgPyBldi50YXJnZXQuY2hlY2tlZCA6IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9XG5cblxuICAgIGFmdGVyKGlkLCBkZWxheSkge1xuICAgICAgICBpZiAodGhpcy50aW1lcnMuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50aW1lcnNbaWRdO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50aW1lcnNbaWRdID0gZmFsc2U7XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW2lkXSA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLmRvUmVuZGVyKCk7XG4gICAgICAgIH0sIGRlbGF5KTtcbiAgICB9XG5cblxuICAgIGFjbGljayh4KSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9uKCdhJywgWydjbGljayddLCBldiA9PiB7XG4gICAgICAgICAgICB0aGlzLmNvbnRlbnQoeCwgZXYpO1xuICAgICAgICAgICAgcmV0dXJuIGV2ICE9PSB1bmRlZmluZWQ7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBidXR0b24oeCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vbignYnV0dG9uJywgWydjbGljayddLCBldiA9PiB7XG4gICAgICAgICAgICB0aGlzLmNvbnRlbnQoeCwgZXYpO1xuICAgICAgICAgICAgcmV0dXJuIGV2ICE9PSB1bmRlZmluZWQ7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcblxuICAgIHNlbGVjdCh2YWx1ZSwgYmxvY2spIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBmdW5jdGlvbiBvcHRpb24ob3B0VmFsdWUsIGxhYmVsKSB7XG4gICAgICAgICAgICB2YXIgYXR0cnMgPSB7dmFsdWU6IG9wdFZhbHVlfTtcbiAgICAgICAgICAgIGlmIChvcHRWYWx1ZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBhdHRyc1snc2VsZWN0ZWQnXSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsYWJlbCA9IGxhYmVsIHx8IG9wdFZhbHVlO1xuICAgICAgICAgICAgcmV0dXJuIHNlbGYuYXR0cnMoYXR0cnMpLndpdGhFbGVtZW50KCdvcHRpb24nLCAoKSA9PiBzZWxmLnRleHQobGFiZWwpKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXMub24oJ3NlbGVjdCcsIFsnY2hhbmdlJ10sIGV2ID0+IHtcbiAgICAgICAgICAgIGJsb2NrKG9wdGlvbik7XG4gICAgICAgICAgICByZXR1cm4gZXYgIFxuICAgICAgICAgICAgICAgID8gZXYudGFyZ2V0Lm9wdGlvbnNbZXYudGFyZ2V0LnNlbGVjdGVkSW5kZXhdLnZhbHVlXG4gICAgICAgICAgICAgICAgOiB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHJhZGlvR3JvdXAodmFsdWUsIGJsb2NrKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgdmFyIG5hbWUgPSAnbmFtZScgKyAodGhpcy5pZHMrKyk7XG4gICAgICAgIGZ1bmN0aW9uIHJhZGlvKHJhZGlvVmFsdWUsIGxhYmVsKSB7XG4gICAgICAgICAgICB2YXIgYXR0cnMgPSB7dHlwZTogJ3JhZGlvJywgbmFtZTogbmFtZX07XG4gICAgICAgICAgICBpZiAocmFkaW9WYWx1ZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBhdHRyc1snY2hlY2tlZCddID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGF0dHJzLm9uTW91bnQgPSBmdW5jdGlvbiAoZWx0KSB7XG4gICAgICAgICAgICAgICAgZWx0LmNoZWNrZWQgPSAocmFkaW9WYWx1ZSA9PT0gdmFsdWUpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9uKCdsYWJlbCcsIFtdLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5hdHRycyhhdHRycykub24oJ2lucHV0JywgWydjbGljayddLCBldiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChldikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcmFkaW9WYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmFkaW9WYWx1ZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLnRleHQobGFiZWwgfHwgcmFkaW9WYWx1ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJhZGlvVmFsdWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgYmxvY2socmFkaW8pO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8vIGxhYmVsKHR4dCkge1xuICAgIC8vICAgICAgICAgLy8gRklYTUU6IHRoaXMgaXMgZXh0cmVtZWx5IGJyaXR0bGUuXG4gICAgLy8gICAgICAgICB2YXIgaWQgPSAnaWQnICsgKHRoaXMuaWRzICsgMSk7IC8vIE5COiBub3QgKysgISFcbiAgICAvLyAgICAgICAgIHJldHVybiB0aGlzLmF0dHIoJ2ZvcicsIGlkKS53aXRoRWxlbWVudCgnbGFiZWwnLCAoKSA9PiB0aGlzLnRleHQodHh0KSk7XG4gICAgLy8gfVxuXG4gICAgYWRkSW5wdXRFbGVtZW50cygpIHtcbiAgICAgICAgdmFyIGJhc2ljSW5wdXRzID0ge1xuICAgICAgICAgICAgc3BpbkJveDoge3R5cGU6ICdudW1iZXInLCBldmVudDogJ2lucHV0J30sXG4gICAgICAgICAgICBzbGlkZXI6IHt0eXBlOiAncmFuZ2UnLCBldmVudDogJ2lucHV0J30sXG4gICAgICAgICAgICBlbWFpbEJveDoge3R5cGU6ICdlbWFpbCcsIGV2ZW50OiAnaW5wdXQnfSxcbiAgICAgICAgICAgIHNlYXJjaEJveDoge3R5cGU6ICdzZWFyY2gnLCBldmVudDogJ2lucHV0J30sXG4gICAgICAgICAgICBkYXRlUGlja2VyOiB7dHlwZTogJ2RhdGUnLCBldmVudDogJ2NoYW5nZSd9LFxuICAgICAgICAgICAgY29sb3JQaWNrZXI6IHt0eXBlOiAnY29sb3InLCBldmVudDogJ2NoYW5nZSd9LFxuICAgICAgICAgICAgZGF0ZVRpbWVQaWNrZXI6IHt0eXBlOiAnZGF0ZXRpbWUnLCBldmVudDogJ2NoYW5nZSd9LFxuICAgICAgICAgICAgbG9jYWxEYXRlVGltZVBpY2tlcjoge3R5cGU6ICdkYXRldGltZS1sb2NhbCcsIGV2ZW50OiAnY2hhbmdlJ30sXG4gICAgICAgICAgICBtb250aFBpY2tlcjoge3R5cGU6ICd3ZWVrJywgZXZlbnQ6ICdjaGFuZ2UnfSxcbiAgICAgICAgICAgIHdlZWtQaWNrZXI6IHt0eXBlOiAnd2VlaycsIGV2ZW50OiAnY2hhbmdlJ30sXG4gICAgICAgICAgICB0aW1lUGlja2VyOiB7dHlwZTogJ3RpbWUnLCBldmVudDogJ2NoYW5nZSd9XG4gICAgICAgIH07XG4gICAgICAgIGZvciAodmFyIG5hbWUgaW4gYmFzaWNJbnB1dHMpIHtcbiAgICAgICAgICAgIGlmIChiYXNpY0lucHV0cy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICAgICAgICAgIChuYW1lID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tuYW1lXSA9IHZhbHVlID0+IHRoaXNcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRycyh7dHlwZTogYmFzaWNJbnB1dHNbbmFtZV0udHlwZSwgdmFsdWU6IHZhbHVlfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5vbignaW5wdXQnLCBbYmFzaWNJbnB1dHNbbmFtZV0uZXZlbnRdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ID0+IGV2ID8gZXYudGFyZ2V0LnZhbHVlIDogdmFsdWUpO1xuICAgICAgICAgICAgICAgIH0pKG5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgYWRkU2ltcGxlRWxlbWVudHMoKSB7XG4gICAgICAgIC8vIEN1cnJlbnRseSwgdGhlc2UgZG9uJ3QgaGF2ZSBldmVudHMuXG4gICAgICAgIFsnYScsICdwJywgJ2xhYmVsJywgJ3N0cm9uZycsICdicicsICdzcGFuJywgJ2gxJywgJ2gyJywgJ2gzJywgJ2g0JyxcbiAgICAgICAgICdzZWN0aW9uJywgJ2RpdicsICd1bCcsICdvbCcsICdsaScsICdoZWFkZXInLCAnZm9vdGVyJywgJ2NvZGUnLCAncHJlJyxcbiAgICAgICAgICdkbCcsICdkdCcsICdkZCcsICdmaWVsZHNldCcsICd0YWJsZScsICd0ZCcsICd0cicsICd0aCcsICdjb2wnLCAndGhlYWQnXVxuICAgICAgICAgICAgLmZvckVhY2goZWx0ID0+IFxuICAgICAgICAgICAgICAgICAgICAgKGVsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1tlbHRdID0geCA9PiB0aGlzLndpdGhFbGVtZW50KGVsdCwgKCkgPT4gdGhpcy5jb250ZW50KHgpKTtcbiAgICAgICAgICAgICAgICAgICAgIH0pKGVsdCkpO1xuICAgIH1cbiAgICBcbn1cblxuXG4vKlxuXG4gVGhlIGZvbGxvd2luZyBmdW5jdGlvbnMgZG9uJ3QgYWNjZXNzIFRyaW1HVUkgc3RhdGUsIGJ1dCBzaW1wbHlcbiBwYXRjaCB0aGUgcmVhbCBkb20gKDFzdCBhcmcpIGJhc2VkIG9uIHRoZSB2ZG9tICgybmQgYXJnKS5cblxuIHZkb20gZWxlbWVudFxuIHt0YWc6XG4gYXR0cnM6IHt9IGV0Yy5cbiBraWRzOiBbXSB9XG5cbiAqL1xuXG5mdW5jdGlvbiBjb21wYXQoZCwgdikge1xuICAgIC8vY29uc29sZS5sb2coJ0NvbXBhdD8gJyk7XG4gICAgLy9jb25zb2xlLmxvZygnZCA9ICcgKyBkLm5vZGVWYWx1ZSk7XG4gICAgLy9jb25zb2xlLmxvZygndiA9ICcgKyBKU09OLnN0cmluZ2lmeSh2KSk7XG4gICAgcmV0dXJuIChkLm5vZGVUeXBlID09PSBOb2RlLlRFWFRfTk9ERSAmJiAodHlwZW9mIHYgIT09ICdvYmplY3QnKSlcbiAgICAgICAgfHwgKGQudGFnTmFtZSA9PT0gdi50YWcudG9VcHBlckNhc2UoKSk7XG59XG5cblxuZnVuY3Rpb24gcmVjb25jaWxlKGRvbSwgdmRvbSkge1xuICAgIGlmICghY29tcGF0KGRvbSwgdmRvbSkpIHtcbiAgICAgICAgdGhyb3cgJ0NhbiBvbmx5IHJlY29uY2lsZSBjb21wYXRpYmxlIG5vZGVzJztcbiAgICB9XG4gICAgXG4gICAgLy8gVGV4dCBub2Rlc1xuICAgIGlmICh0eXBlb2YgdmRvbSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgaWYgKGRvbS5ub2RlVmFsdWUgIT09IHZkb20pIHtcbiAgICAgICAgICAgIGRvbS5ub2RlVmFsdWUgPSB2ZG9tLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuXG4gICAgLy8gRWxlbWVudCBub2Rlc1xuICAgIHZhciB2YXR0cnMgPSB2ZG9tLmF0dHJzIHx8IHt9O1xuICAgIGZvciAodmFyIHZhdHRyIGluIHZhdHRycykge1xuICAgICAgICBpZiAodmF0dHJzLmhhc093blByb3BlcnR5KHZhdHRyKSkge1xuICAgICAgICAgICAgaWYgKGRvbS5oYXNBdHRyaWJ1dGUodmF0dHIpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRhdHRyID0gZG9tLmdldEF0dHJpYnV0ZSh2YXR0cik7XG4gICAgICAgICAgICAgICAgaWYgKGRhdHRyICE9PSB2YXR0cnNbdmF0dHJdLnRvU3RyaW5nKCkpIHsgXG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ1VwZGF0aW5nIGF0dHJpYnV0ZTogJyArIHZhdHRyICsgJyA9ICcgKyB2YXR0cnNbdmF0dHJdKTtcbiAgICAgICAgICAgICAgICAgICAgZG9tLnNldEF0dHJpYnV0ZSh2YXR0ciwgdmF0dHJzW3ZhdHRyXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnQWRkaW5nIGF0dHJpYnV0ZTogJyArIHZhdHRyICsgJyA9ICcgKyB2YXR0cnNbdmF0dHJdKTtcbiAgICAgICAgICAgICAgICBkb20uc2V0QXR0cmlidXRlKHZhdHRyLCB2YXR0cnNbdmF0dHJdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRvbS5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBkYXR0ciA9IGRvbS5hdHRyaWJ1dGVzW2ldO1xuICAgICAgICBpZiAoIXZhdHRycy5oYXNPd25Qcm9wZXJ0eShkYXR0ci5ub2RlTmFtZSkpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ1JlbW92aW5nIGF0dHJpYnV0ZTogJyArIGRhdHRyLm5vZGVOYW1lKTtcbiAgICAgICAgICAgIGRvbS5yZW1vdmVBdHRyaWJ1dGUoZGF0dHIubm9kZU5hbWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVjb25jaWxlS2lkcyhkb20sIGRvbS5jaGlsZE5vZGVzLCB2ZG9tLmtpZHMpO1xufVxuXG5mdW5jdGlvbiByZWNvbmNpbGVLaWRzKGRvbSwgZGtpZHMsIHZraWRzKSB7XG4gICAgdmFyIGxlbiA9IE1hdGgubWluKGRraWRzLmxlbmd0aCwgdmtpZHMubGVuZ3RoKTtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHZhciBka2lkID0gZGtpZHNbaV07XG4gICAgICAgIHZhciB2a2lkID0gdmtpZHNbaV07XG4gICAgICAgIGlmIChjb21wYXQoZGtpZCwgdmtpZCkpIHtcbiAgICAgICAgICAgIHJlY29uY2lsZShka2lkLCB2a2lkKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ1JlcGxhY2luZyBjaGlsZCcpO1xuICAgICAgICAgICAgZG9tLnJlcGxhY2VDaGlsZChidWlsZCh2a2lkKSwgZGtpZCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgaWYgKGRraWRzLmxlbmd0aCA+IGxlbikge1xuICAgICAgICB3aGlsZSAoZGtpZHMubGVuZ3RoID4gbGVuKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdSZW1vdmluZyBjaGlsZCAnKTtcbiAgICAgICAgICAgIGRvbS5yZW1vdmVDaGlsZChka2lkc1tsZW5dKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICh2a2lkcy5sZW5ndGggPiBsZW4pIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IGxlbjsgaSA8IHZraWRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdBcHBlbmRpbmcgbmV3IGNoaWxkICcpO1xuICAgICAgICAgICAgZG9tLmFwcGVuZENoaWxkKGJ1aWxkKHZraWRzW2ldKSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkKHZkb20pIHtcbiAgICBpZiAodmRvbSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgdmRvbSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHZkb20udG9TdHJpbmcoKSk7XG4gICAgfVxuICAgIFxuICAgIHZhciBlbHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHZkb20udGFnKTtcbiAgICB2YXIgdmF0dHJzID0gdmRvbS5hdHRycyB8fCB7fTtcbiAgICBmb3IgKHZhciBrIGluIHZhdHRycykge1xuICAgICAgICBpZiAodmF0dHJzLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICBlbHQuc2V0QXR0cmlidXRlKGssIHZhdHRyc1trXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZG9tLmtpZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZWx0LmFwcGVuZENoaWxkKGJ1aWxkKHZkb20ua2lkc1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gZWx0OyAgICBcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUcmltR1VJO1xuXG4iXX0=
