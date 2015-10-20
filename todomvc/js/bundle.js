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

    deleteTodo(todo, idx) {
        idx = idx || this.todos.findIndex(x => x.id === todo.id);
        this.todos.splice(idx, 1);
    }

    clearCompleted() {
        let j = 0;
        let len = this.todos.length;
        for (let i = 0; i < len; i++) {
            let todo = this.todos[i - j];
            if (todo.completed) {
                this.deleteTodo(todo, i - j);
                j++;
            }
        }
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
            model.clearCompleted();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImpzL2FwcC5qcyIsIm5vZGVfbW9kdWxlcy9saWJpbWd1aS9saWJpbWd1aS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIFRPRE9NViB1c2luZyBJTUdVSS5cblxuJ3VzZSBzdHJpY3QnO1xuXG4vLyBEYXRhIG1vZGVsXG5cblxuY2xhc3MgVG9kb3Mge1xuICAgIGNvbnN0cnVjdG9yICgpIHtcbiAgICAgICAgdGhpcy50b2RvcyA9IFtdO1xuICAgICAgICB0aGlzLm5ld1RvZG8gPSAnJztcbiAgICAgICAgdGhpcy5maWx0ZXIgPSAnbm9uZSc7XG4gICAgICAgIHRoaXMuaWRzID0gMDtcbiAgICAgICAgdGhpcy5sb2FkKCk7XG4gICAgfVxuXG4gICAgdG9KU09OKCkge1xuICAgICAgICByZXR1cm4ge25ld1RvZG86IHRoaXMubmV3VG9kbywgaWRzOiB0aGlzLmlkcyxcbiAgICAgICAgICAgICAgICB0b2RvczogdGhpcy50b2Rvcy5tYXAodCA9PiB0LnRvSlNPTigpKX07XG4gICAgfVxuICAgIFxuICAgIGxvYWQoKSB7XG4gICAgICAgIHZhciB0eHQgPSB3aW5kb3cubG9jYWxTdG9yYWdlWyd0b2RvLW12YyddO1xuICAgICAgICBpZiAodHh0KSB7XG4gICAgICAgICAgICB2YXIganNvbiA9IEpTT04ucGFyc2UodHh0KTtcbiAgICAgICAgICAgIHRoaXMuaWRzID0ganNvbi5pZHM7XG4gICAgICAgICAgICB0aGlzLm5ld1RvZG8gPSBqc29uLm5ld1RvZG87XG4gICAgICAgICAgICB0aGlzLnRvZG9zID0ganNvbi50b2Rvcy5tYXAodCA9PiBUb2RvLmZyb21KU09OKHRoaXMsIHQpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBwZXJzaXN0KCkge1xuICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlWyd0b2RvLW12YyddID0gSlNPTi5zdHJpbmdpZnkodGhpcy50b0pTT04oKSk7XG4gICAgfVxuXG4gICAgY3JlYXRlVG9kbyh2YWx1ZSkge1xuICAgICAgICB2YXIgdG9kbyA9IG5ldyBUb2RvKHZhbHVlLCB0aGlzLCB0aGlzLmlkcysrKTtcbiAgICAgICAgdGhpcy50b2Rvcy5wdXNoKHRvZG8pO1xuICAgIH1cblxuICAgIGRlbGV0ZVRvZG8odG9kbywgaWR4KSB7XG4gICAgICAgIGlkeCA9IGlkeCB8fCB0aGlzLnRvZG9zLmZpbmRJbmRleCh4ID0+IHguaWQgPT09IHRvZG8uaWQpO1xuICAgICAgICB0aGlzLnRvZG9zLnNwbGljZShpZHgsIDEpO1xuICAgIH1cblxuICAgIGNsZWFyQ29tcGxldGVkKCkge1xuICAgICAgICBsZXQgaiA9IDA7XG4gICAgICAgIGxldCBsZW4gPSB0aGlzLnRvZG9zLmxlbmd0aDtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgbGV0IHRvZG8gPSB0aGlzLnRvZG9zW2kgLSBqXTtcbiAgICAgICAgICAgIGlmICh0b2RvLmNvbXBsZXRlZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZGVsZXRlVG9kbyh0b2RvLCBpIC0gaik7XG4gICAgICAgICAgICAgICAgaisrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZmlsdGVyZWRUb2RvcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9kb3MuZmlsdGVyKHggPT4gdGhpcy5zaG91bGRTaG93KHgpKTtcbiAgICB9XG4gICAgXG4gICAgc2hvdWxkU2hvdyh0b2RvKSB7XG4gICAgICAgIHN3aXRjaCAodGhpcy5maWx0ZXIpIHtcbiAgICAgICAgY2FzZSAnbm9uZSc6IHJldHVybiB0cnVlO1xuICAgICAgICBjYXNlICdhY3RpdmUnOiByZXR1cm4gIXRvZG8uY29tcGxldGVkO1xuICAgICAgICBjYXNlICdjb21wbGV0ZWQnOiByZXR1cm4gdG9kby5jb21wbGV0ZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgXG59XG5cbmNsYXNzIFRvZG8ge1xuICAgIGNvbnN0cnVjdG9yICh0ZXh0LCBtb2RlbCwgaWQpIHtcbiAgICAgICAgdGhpcy50ZXh0ID0gdGV4dDtcbiAgICAgICAgdGhpcy5jb21wbGV0ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5lZGl0aW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMubW9kZWwgPSBtb2RlbDtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgIH1cblxuICAgIHN0YXRpYyBmcm9tSlNPTihtb2RlbCwgb2JqKSB7XG4gICAgICAgIHZhciB0b2RvID0gbmV3IFRvZG8ob2JqLnRleHQsIG1vZGVsLCBvYmouaWQpO1xuICAgICAgICB0b2RvLmNvbXBsZXRlZCA9IG9iai5jb21wbGV0ZWQ7XG4gICAgICAgIHRvZG8uZWRpdGluZyA9IG9iai5lZGl0aW5nO1xuICAgICAgICByZXR1cm4gdG9kbztcbiAgICB9XG4gICAgXG4gICAgdG9KU09OKCkge1xuICAgICAgICByZXR1cm4ge3RleHQ6IHRoaXMudGV4dCxcbiAgICAgICAgICAgICAgICBjb21wbGV0ZWQ6IHRoaXMuY29tcGxldGVkLFxuICAgICAgICAgICAgICAgIGVkaXRpbmc6IHRoaXMuZWRpdGluZyxcbiAgICAgICAgICAgICAgICBpZDogdGhpcy5pZH07XG4gICAgfVxuXG4gICAgc2F2ZSh2YWx1ZSkge1xuICAgICAgICBsZXQgdHh0ID0gdmFsdWUudHJpbSgpO1xuICAgICAgICBpZiAodHh0ICE9PSAnJykge1xuICAgICAgICAgICAgdGhpcy50ZXh0ID0gdHh0O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkZXN0cm95KCkge1xuICAgICAgICB0aGlzLm1vZGVsLmRlbGV0ZVRvZG8odGhpcyk7XG4gICAgfVxuICAgIFxufVxuXG5cbmNvbnN0IFRyaW1HVUkgPSByZXF1aXJlKCdsaWJpbWd1aScpO1xuXG5jb25zdCB3bmQgPSBuZXcgVHJpbUdVSShtYWluLCBuZXcgVG9kb3MoKSwgJ3RvZG9hcHAnKTtcblxuY29uc3QgRU5URVJfS0VZID0gMTM7XG5jb25zdCBFU0NBUEVfS0VZID0gMjc7XG5cbmZ1bmN0aW9uIG1haW4obW9kZWwpIHtcbiAgICBpZiAod25kLmluUm91dGUoJyMvYWN0aXZlJykpIHtcbiAgICAgICAgbW9kZWwuZmlsdGVyID0gJ2FjdGl2ZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHduZC5pblJvdXRlKCcjL2NvbXBsZXRlZCcpKSB7XG4gICAgICAgIG1vZGVsLmZpbHRlciA9ICdjb21wbGV0ZWQnO1xuICAgIH1cbiAgICBcbiAgICB3bmQua2xhc3MoJ3RvZG9hcHAnKS5zZWN0aW9uKCgpID0+IHtcbiAgICAgICAgd25kLmtsYXNzKCdoZWFkZXInKS5oZWFkZXIoKCkgPT4ge1xuICAgICAgICAgICAgd25kLmgxKCd0b2RvcycpO1xuICAgICAgICAgICAgbmV3VG9kbyhtb2RlbCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKG1vZGVsLnRvZG9zLmxlbmd0aCA+IDAgKSB7XG4gICAgICAgICAgICBtYWluU2VjdGlvbihtb2RlbCwgbW9kZWwudG9kb3MpO1xuICAgICAgICAgICAgZm9vdGVyKG1vZGVsKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIFxuICAgIG1vZGVsLnBlcnNpc3QoKTsgICAgXG59XG5cblxuZnVuY3Rpb24gbmV3VG9kbyhtb2RlbCkge1xuICAgIHZhciBhdHRycyA9IHsnY2xhc3MnOiAnbmV3LXRvZG8nLCB0eXBlOiAndGV4dCcsIHZhbHVlOiBtb2RlbC5uZXdUb2RvLFxuICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogJ1doYXQgbmVlZHMgdG8gYmUgZG9uZT8nLFxuICAgICAgICAgICAgICAgICBvbk1vdW50OiBlbHQgPT4ge2VsdC52YWx1ZT1tb2RlbC5uZXdUb2RvO319O1xuICAgIFxuICAgIHduZC5hdHRycyhhdHRycykub24oJ2lucHV0JywgWydrZXl1cCddLCBldiA9PiB7XG4gICAgICAgIGlmIChldikge1xuICAgICAgICAgICAgaWYgKGV2LmtleUNvZGUgPT09IEVOVEVSX0tFWSkge1xuICAgICAgICAgICAgICAgIGxldCB0eHQgPSBldi50YXJnZXQudmFsdWUudHJpbSgpO1xuICAgICAgICAgICAgICAgIGlmICh0eHQgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsLmNyZWF0ZVRvZG8oZXYudGFyZ2V0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgbW9kZWwubmV3VG9kbyA9ICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGV2LmtleUNvZGUgPT09IEVTQ0FQRV9LRVkpIHtcbiAgICAgICAgICAgICAgICBtb2RlbC5uZXdUb2RvID0gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBtb2RlbC5uZXdUb2RvID0gZXYudGFyZ2V0LnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59XG5cblxuZnVuY3Rpb24gbWFpblNlY3Rpb24obW9kZWwsIHRvZG9zKSB7XG4gICAgd25kLmtsYXNzKCdtYWluJykuc2VjdGlvbigoKSA9PiB7XG4gICAgICAgIGlmICh3bmQua2xhc3MoJ3RvZ2dsZS1hbGwnKS5jaGVja0JveChmYWxzZSkpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG9kb3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0b2Rvc1tpXS5jb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHduZC5hdHRyKCdmb3InLCAndG9nZ2xlLWFsbCcpLmxhYmVsKCdNYXJrIGFsbCBhcyBjb21wbGV0ZScpO1xuICAgICAgICBcbiAgICAgICAgd25kLmtsYXNzKCd0b2RvLWxpc3QnKS51bCgoKSA9PiB7XG4gICAgICAgICAgICBtb2RlbC5maWx0ZXJlZFRvZG9zKCkuZm9yRWFjaChzaG93VG9kbyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIFxufVxuXG5mdW5jdGlvbiBmaWx0ZXJCdXR0b24obW9kZWwsIHRpdGxlLCBuYW1lLCBoYXNoKSB7XG4gICAgaGFzaCA9IGhhc2ggPT09IHVuZGVmaW5lZCA/IG5hbWUgOiBoYXNoO1xuICAgIHduZC5saSgoKSA9PiB7XG4gICAgICAgIGlmICh3bmQuYXR0cklmKG1vZGVsLmZpbHRlciA9PT0gbmFtZSwgJ2NsYXNzJywgJ3NlbGVjdGVkJylcbiAgICAgICAgICAgIC5hdHRyKCdocmVmJywgJyMvJyArIGhhc2gpLmFjbGljayh0aXRsZSkpIHtcbiAgICAgICAgICAgIG1vZGVsLmZpbHRlciA9IG5hbWU7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gZm9vdGVyKG1vZGVsKSB7XG4gICAgd25kLmtsYXNzKCdmb290ZXInKS5mb290ZXIoKCkgPT4ge1xuICAgICAgICB3bmQua2xhc3MoJ3RvZG8tY291bnQnKS5zcGFuKCgpID0+IHtcbiAgICAgICAgICAgIHduZC5zdHJvbmcobW9kZWwudG9kb3MubGVuZ3RoICsgJyBpdGVtKHMpIGxlZnQnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgd25kLmtsYXNzKCdmaWx0ZXJzJykudWwoKCkgPT4ge1xuICAgICAgICAgICAgZmlsdGVyQnV0dG9uKG1vZGVsLCAnQWxsJywgJ25vbmUnLCAnJyk7XG4gICAgICAgICAgICBmaWx0ZXJCdXR0b24obW9kZWwsICdBY3RpdmUnLCAnYWN0aXZlJyk7XG4gICAgICAgICAgICBmaWx0ZXJCdXR0b24obW9kZWwsICdDb21wbGV0ZWQnLCAnY29tcGxldGVkJyk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKHduZC5rbGFzcygnY2xlYXItY29tcGxldGVkJykuYnV0dG9uKCdDbGVhciBjb21wbGV0ZWQnKSkge1xuICAgICAgICAgICAgbW9kZWwuY2xlYXJDb21wbGV0ZWQoKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBzaG93VG9kbyh0b2RvKSB7XG4gICAgbGV0IGNscyA9IHRvZG8uY29tcGxldGVkID8gJ2NvbXBsZXRlZCcgOiAgJyc7XG4gICAgY2xzICs9IHRvZG8uZWRpdGluZyA/ICcgZWRpdGluZycgOiAnJztcbiAgICBsZXQgYXR0cnMgPSBjbHMgPyB7J2NsYXNzJzogY2xzLnRyaW0oKX0gOiB7fTtcblxuICAgIHduZC5hdHRycyhhdHRycykubGkoKCkgPT4ge1xuICAgICAgICB2aWV3VG9kbyh0b2RvKTtcbiAgICAgICAgaWYgKHRvZG8uZWRpdGluZykge1xuICAgICAgICAgICAgZWRpdFRvZG8odG9kbyk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuXG5mdW5jdGlvbiB2aWV3VG9kbyh0b2RvKSB7XG4gICAgd25kLmtsYXNzKCd2aWV3JykuZGl2KCgpID0+IHtcbiAgICAgICAgdG9kby5jb21wbGV0ZWQgPSB3bmQua2xhc3MoJ3RvZ2dsZScpLmNoZWNrQm94KHRvZG8uY29tcGxldGVkKTtcblxuICAgICAgICB3bmQub24oJ2xhYmVsJywgWydkYmxjbGljayddLCBldiA9PiB7XG4gICAgICAgICAgICBpZiAoZXYpIHtcbiAgICAgICAgICAgICAgICB0b2RvLmVkaXRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd25kLnRleHQodG9kby50ZXh0KTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBpZiAod25kLmtsYXNzKCdkZXN0cm95JykuYnV0dG9uKCkpIHtcbiAgICAgICAgICAgIHRvZG8uZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cblxuXG5mdW5jdGlvbiBlZGl0VG9kbyh0b2RvKSB7XG4gICAgd25kLmtsYXNzKCdlZGl0JylcbiAgICAgICAgLmF0dHIoJ3ZhbHVlJywgdG9kby50ZXh0KVxuICAgICAgICAuYXR0cignb25Nb3VudCcsIGUgPT4gZS5mb2N1cygpKVxuICAgICAgICAub24oJ2lucHV0JywgWydrZXl1cCcsICdmb2N1c291dCddLCBldiA9PiB7XG4gICAgICAgICAgICBpZiAoZXYpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXYudHlwZSA9PT0gJ2tleXVwJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXYua2V5Q29kZSA9PT0gRU5URVJfS0VZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b2RvLmVkaXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvZG8uc2F2ZShldi50YXJnZXQudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChldi5rZXlDb2RlID09PSBFU0NBUEVfS0VZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b2RvLmVkaXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZXYudHlwZSA9PT0gJ2ZvY3Vzb3V0JykgeyAvLyBibHVyIGRvZXNuJ3QgYnViYmxlIHVwLi4uLlxuICAgICAgICAgICAgICAgICAgICB0b2RvLmVkaXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgdG9kby5zYXZlKGV2LnRhcmdldC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHduZDtcbiIsIlxuJ3VzZSBzdHJpY3QnO1xuXG4vKlxuICogVE9ETzpcbiAqIC0gZG9uJ3QgYnVpbGQgdm5vZGUgd2hlbiBoYW5kbGluZyBldmVudC5cbiAqIC0gbWFrZSBgaGVyZWAgbW9yZSByb2J1c3RcbiAqIC0gb3B0aW1pemUgdXNlIG9mIGlkcyBpbiBsaXN0c1xuICogLSBlbGltaW5hdGUgLmNsYXNzLyNpZCBwYXJzaW5nXG4gKiAtIHN1cHBvcnQga2V5LWJhc2VkIHBhdGNoaW5nIChhdHRyIGBrZXlgKVxuICovXG5cbmNsYXNzIFRyaW1HVUkge1xuICAgIGNvbnN0cnVjdG9yIChhcHAsIG1vZGVsLCByb290KSB7XG4gICAgICAgIHRoaXMuYXBwID0gYXBwO1xuICAgICAgICB0aGlzLm1vZGVsID0gbW9kZWw7XG4gICAgICAgIHRoaXMucm9vdCA9IHJvb3Q7XG4gICAgICAgIHRoaXMuZXZlbnQgPSBudWxsO1xuICAgICAgICB0aGlzLmZvY3VzID0gW107XG4gICAgICAgIHRoaXMubm9kZSA9IG51bGw7XG4gICAgICAgIHRoaXMub25Nb3VudHMgPSB7fTtcbiAgICAgICAgdGhpcy50aW1lcnMgPSB7fTtcbiAgICAgICAgdGhpcy5oYW5kbGVycyA9IHt9O1xuICAgICAgICB0aGlzLmlkcyA9IDA7XG4gICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IHt9O1xuICAgICAgICB0aGlzLnJvdXRlID0gZG9jdW1lbnQubG9jYXRpb24uaGFzaDtcbiAgICAgICAgdGhpcy5hZGRTaW1wbGVFbGVtZW50cygpO1xuICAgICAgICB0aGlzLmFkZElucHV0RWxlbWVudHMoKTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3N0b3JhZ2UnLCB0aGlzLmRlYWxXaXRoSXQsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBydW4oKSB7XG4gICAgICAgIHRoaXMubW91bnQodGhpcy5yZW5kZXJPbmNlKCkpO1xuICAgIH1cbiAgICBcbiAgICByZWdpc3RlcihldmVudCwgaWQpIHtcbiAgICAgICAgLy8gb25seSBhZGQgb25lIGhhbmRsZXIgdG8gcm9vdCwgcGVyIGV2ZW50IHR5cGUuXG4gICAgICAgIGlmICghdGhpcy5oYW5kbGVycy5oYXNPd25Qcm9wZXJ0eShldmVudCkpIHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlcnNbZXZlbnRdID0gW107XG4gICAgICAgICAgICB2YXIgciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMucm9vdCk7XG4gICAgICAgICAgICByLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGUgPT4ge1xuICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIGRvbid0IGxlYWsgdXB3YXJkc1xuICAgICAgICAgICAgICAgIHZhciBpZCA9IGUudGFyZ2V0LmdldEF0dHJpYnV0ZSgnaWQnKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5oYW5kbGVyc1tldmVudF0uaW5kZXhPZihpZCkgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmV2ZW50ID0gZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kb1JlbmRlcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmhhbmRsZXJzW2V2ZW50XS5wdXNoKGlkKTtcbiAgICB9XG5cbiAgICByZXNldCgpIHtcbiAgICAgICAgZm9yICh2YXIgayBpbiB0aGlzLmhhbmRsZXJzKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5oYW5kbGVycy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlcnNba10gPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9uTW91bnRzID0ge307XG4gICAgICAgIHRoaXMuZm9jdXMgPSBbXTtcbiAgICAgICAgdGhpcy5pZHMgPSAwO1xuICAgIH1cblxuICAgIHJlbmRlck9uY2UoKSB7XG4gICAgICAgIHRoaXMucmVzZXQoKTtcbiAgICAgICAgdGhpcy5hcHAodGhpcy5tb2RlbCk7XG4gICAgfVxuXG4gICAgZG9SZW5kZXIoKSB7XG4gICAgICAgIC8vIHR3aWNlOiBvbmUgdG8gaGFuZGxlIGV2ZW50LCBvbmUgdG8gc3luYyB2aWV3LlxuICAgICAgICB2YXIgXyA9IHRoaXMucmVuZGVyT25jZSgpO1xuICAgICAgICB2YXIgbm9kZSA9IHRoaXMucmVuZGVyT25jZSgpO1xuICAgICAgICB0aGlzLm1vdW50KG5vZGUpO1xuICAgIH1cblxuICAgIG1vdW50KG5vZGUpIHtcbiAgICAgICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMucm9vdCk7XG4gICAgICAgIGlmICh0aGlzLm5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlY29uY2lsZUtpZHMoY29udGFpbmVyLCBjb250YWluZXIuY2hpbGROb2RlcywgdGhpcy5mb2N1cyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB3aGlsZSAoY29udGFpbmVyLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICBjb250YWluZXIucmVtb3ZlQ2hpbGQoY29udGFpbmVyLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmZvY3VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGJ1aWxkKHRoaXMuZm9jdXNbaV0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLm5vZGUgPSBub2RlO1xuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gdGhpcy5vbk1vdW50cykge1xuICAgICAgICAgICAgaWYgKHRoaXMub25Nb3VudHMuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRvU29tZXRoaW5nID0gdGhpcy5vbk1vdW50c1tpZF07XG4gICAgICAgICAgICAgICAgdmFyIGVsdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcbiAgICAgICAgICAgICAgICBkb1NvbWV0aGluZyhlbHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgIH1cblxuICAgIGRlYWxXaXRoSXQoZSkge1xuICAgICAgICB0aGlzLmV2ZW50ID0gZTtcbiAgICAgICAgdGhpcy5kb1JlbmRlcigpO1xuICAgIH1cblxuXG4gICAgYXR0cnMoYXMpIHtcbiAgICAgICAgZm9yICh2YXIgYSBpbiBhcykge1xuICAgICAgICAgICAgaWYgKGFzLmhhc093blByb3BlcnR5KGEpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzW2FdID0gYXNbYV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaW5Sb3V0ZShoYXNoLCBibG9jaykge1xuICAgICAgICBpZiAoIXRoaXMucm91dGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5yb3V0ZSA9PT0gaGFzaCkge1xuICAgICAgICAgICAgdGhpcy5yb3V0ZSA9IHVuZGVmaW5lZDsgLy8gb25seSBydW4gb25jZS5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBvblN0b3JhZ2UoYmxvY2spIHtcbiAgICAgICAgdmFyIGV2ZW50ID0gdGhpcy5ldmVudDtcbiAgICAgICAgaWYgKGV2ZW50ICYmIGV2ZW50LnR5cGUgPT09ICdzdG9yYWdlJykge1xuICAgICAgICAgICAgdGhpcy5ldmVudCA9IHVuZGVmaW5lZDsgXG4gICAgICAgICAgICBibG9jayhldmVudCk7IFxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIG9uKGVsdCwgZXZlbnRzLCBibG9jaykge1xuICAgICAgICB2YXIgaWQgPSB0aGlzLmF0dHJpYnV0ZXNbJ2lkJ10gfHwgKCdpZCcgKyB0aGlzLmlkcysrKTtcbiAgICAgICAgZXZlbnRzLmZvckVhY2goZSA9PiB0aGlzLnJlZ2lzdGVyKGUsIGlkKSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcy5pZChpZCkud2l0aEVsZW1lbnQoZWx0LCAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgZXZlbnQgPSB0aGlzLmV2ZW50O1xuICAgICAgICAgICAgaWYgKGV2ZW50ICYmIGV2ZW50LnRhcmdldC5nZXRBdHRyaWJ1dGUoJ2lkJykgPT09IGlkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudCA9IHVuZGVmaW5lZDsgLy8gbWF5YmUgZG8gaW4gdG9wbGV2ZWw/Pz9cbiAgICAgICAgICAgICAgICByZXR1cm4gYmxvY2soZXZlbnQpOyAvLyBsZXQgaXQgYmUgaGFuZGxlZFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGJsb2NrKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHdpdGhFbGVtZW50KGVsdCwgZnVuYywgZXZzKSB7XG4gICAgICAgIC8vIFRPRE86IGlmIHRoaXMucHJldGVuZCwgZG9uJ3QgYnVpbGQgdm5vZGVzXG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLmZvY3VzO1xuICAgICAgICB0aGlzLmZvY3VzID0gW107XG5cbiAgICAgICAgLy8gQ29weSB0aGUgY3VycmVudCBhdHRyaWJ1dGUgc2V0XG4gICAgICAgIHZhciBteUF0dHJzID0ge307XG4gICAgICAgIGZvciAodmFyIGEgaW4gdGhpcy5hdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5hdHRyaWJ1dGVzLmhhc093blByb3BlcnR5KGEpKSB7XG4gICAgICAgICAgICAgICAgbXlBdHRyc1thXSA9IHRoaXMuYXR0cmlidXRlc1thXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmF0dHJpYnV0ZXMgPSB7fTsgLy8ga2lkcyBkb24ndCBpbmhlcml0IGF0dHJzLlxuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jKCk7XG4gICAgICAgIH1cbiAgICAgICAgZmluYWxseSB7XG4gICAgICAgICAgICBpZiAobXlBdHRycyAmJiBteUF0dHJzLm9uTW91bnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uTW91bnRzW215QXR0cnNbJ2lkJ11dID0gbXlBdHRycy5vbk1vdW50O1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBteUF0dHJzLm9uTW91bnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgdm5vZGUgPSB7dGFnOiBlbHQsIGF0dHJzOiBteUF0dHJzLCBraWRzOiB0aGlzLmZvY3VzfTtcbiAgICAgICAgICAgIHBhcmVudC5wdXNoKHZub2RlKTtcbiAgICAgICAgICAgIHRoaXMuZm9jdXMgPSBwYXJlbnQ7XG4gICAgICAgIH0gICAgXG4gICAgfVxuXG5cbiAgICBoZXJlKGZ1bmMsIGJsb2NrKSB7XG4gICAgICAgIHZhciBwb3MgPSB0aGlzLmZvY3VzLmxlbmd0aDtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICByZXR1cm4gYmxvY2soZnVuY3Rpb24gKCkgeyAvLyBiZWNhdXNlIGFyZ3VtZW50cy5cbiAgICAgICAgICAgIHZhciBwYXJlbnQgPSBzZWxmLmZvY3VzO1xuICAgICAgICAgICAgc2VsZi5mb2N1cyA9IFtdO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuYy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmluYWxseSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLmZvY3VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudC5zcGxpY2UocG9zICsgaSwgMCwgc2VsZi5mb2N1c1tpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNlbGYuZm9jdXMgPSBwYXJlbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgY29udGVudChjLCBldikge1xuICAgICAgICBpZiAodHlwZW9mIGMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGMuYXBwbHkodW5kZWZpbmVkLCBldik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBjID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhpcy50ZXh0KGMpO1xuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICB0ZXh0KHR4dCkge1xuICAgICAgICB0aGlzLmZvY3VzLnB1c2godHh0KTtcbiAgICB9XG5cbiAgICBuZXh0SWQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmlkcyArIDE7XG4gICAgfVxuICAgIFxuICAgIFxuICAgIC8vIGNvbnZlbmllbmNlXG5cbiAgICBhdHRyKG4sIHgpIHtcbiAgICAgICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICBvYmpbbl0gPSB4O1xuICAgICAgICByZXR1cm4gdGhpcy5hdHRycyhvYmopO1xuICAgIH1cblxuICAgIGF0dHJJZihjLCBuLCB4KSB7XG4gICAgICAgIGlmIChjKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hdHRyKG4sIHgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBcbiAgICBrbGFzcyh4KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmF0dHIoJ2NsYXNzJywgeCk7XG4gICAgfVxuXG4gICAgaWQoeCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hdHRyKCdpZCcsIHgpO1xuICAgIH1cblxuICAgIHRleHRhcmVhKHgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub24oJ3RleHRhcmVhJywgWydrZXl1cCcsICdibHVyJ10sIGV2ID0+IHtcbiAgICAgICAgICAgIHZhciBuZXdWYWx1ZSA9IGV2ID8gZXYudGFyZ2V0LnZhbHVlIDogdmFsdWU7XG4gICAgICAgICAgICB0aGlzLmNvbnRlbnQoeCwgZXYpO1xuICAgICAgICAgICAgcmV0dXJuIG5ld1ZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgdGV4dEJveCh2YWx1ZSkge1xuICAgICAgICB2YXIgYXR0cnMgPSB7fTtcbiAgICAgICAgYXR0cnMudHlwZSA9ICd0ZXh0JztcbiAgICAgICAgYXR0cnMudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgYXR0cnMub25Nb3VudCA9IGVsdCA9PiB7XG4gICAgICAgICAgICAgICAgZWx0LnZhbHVlID0gdmFsdWU7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcy5hdHRycyhhdHRycykub24oJ2lucHV0JywgWydpbnB1dCddLCBldiA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZXYgPyBldi50YXJnZXQudmFsdWUgOiB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgY2hlY2tCb3godmFsdWUpIHtcbiAgICAgICAgdmFyIGF0dHJzID0gYXR0cnMgfHwge307XG4gICAgICAgIGF0dHJzLnR5cGUgPSAnY2hlY2tib3gnO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIGF0dHJzLmNoZWNrZWQgPSAndHJ1ZSc7XG4gICAgICAgIH1cbiAgICAgICAgYXR0cnMub25Nb3VudCA9IGVsdCA9PiB7XG4gICAgICAgICAgICBlbHQuY2hlY2tlZCA9IHZhbHVlO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXMuYXR0cnMoYXR0cnMpLm9uKCdpbnB1dCcsIFsnY2xpY2snXSwgZXYgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGV2ID8gZXYudGFyZ2V0LmNoZWNrZWQgOiB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICBhZnRlcihpZCwgZGVsYXkpIHtcbiAgICAgICAgaWYgKHRoaXMudGltZXJzLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudGltZXJzW2lkXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudGltZXJzW2lkXSA9IGZhbHNlO1xuICAgICAgICB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnRpbWVyc1tpZF0gPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5kb1JlbmRlcigpO1xuICAgICAgICB9LCBkZWxheSk7XG4gICAgfVxuXG5cbiAgICBhY2xpY2soeCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vbignYScsIFsnY2xpY2snXSwgZXYgPT4ge1xuICAgICAgICAgICAgdGhpcy5jb250ZW50KHgsIGV2KTtcbiAgICAgICAgICAgIHJldHVybiBldiAhPT0gdW5kZWZpbmVkO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgYnV0dG9uKHgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub24oJ2J1dHRvbicsIFsnY2xpY2snXSwgZXYgPT4ge1xuICAgICAgICAgICAgdGhpcy5jb250ZW50KHgsIGV2KTtcbiAgICAgICAgICAgIHJldHVybiBldiAhPT0gdW5kZWZpbmVkO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG5cbiAgICBzZWxlY3QodmFsdWUsIGJsb2NrKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgZnVuY3Rpb24gb3B0aW9uKG9wdFZhbHVlLCBsYWJlbCkge1xuICAgICAgICAgICAgdmFyIGF0dHJzID0ge3ZhbHVlOiBvcHRWYWx1ZX07XG4gICAgICAgICAgICBpZiAob3B0VmFsdWUgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYXR0cnNbJ3NlbGVjdGVkJ10gPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGFiZWwgPSBsYWJlbCB8fCBvcHRWYWx1ZTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmLmF0dHJzKGF0dHJzKS53aXRoRWxlbWVudCgnb3B0aW9uJywgKCkgPT4gc2VsZi50ZXh0KGxhYmVsKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzLm9uKCdzZWxlY3QnLCBbJ2NoYW5nZSddLCBldiA9PiB7XG4gICAgICAgICAgICBibG9jayhvcHRpb24pO1xuICAgICAgICAgICAgcmV0dXJuIGV2ICBcbiAgICAgICAgICAgICAgICA/IGV2LnRhcmdldC5vcHRpb25zW2V2LnRhcmdldC5zZWxlY3RlZEluZGV4XS52YWx1ZVxuICAgICAgICAgICAgICAgIDogdmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICByYWRpb0dyb3VwKHZhbHVlLCBibG9jaykge1xuICAgICAgICB2YXIgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIHZhciBuYW1lID0gJ25hbWUnICsgKHRoaXMuaWRzKyspO1xuICAgICAgICBmdW5jdGlvbiByYWRpbyhyYWRpb1ZhbHVlLCBsYWJlbCkge1xuICAgICAgICAgICAgdmFyIGF0dHJzID0ge3R5cGU6ICdyYWRpbycsIG5hbWU6IG5hbWV9O1xuICAgICAgICAgICAgaWYgKHJhZGlvVmFsdWUgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYXR0cnNbJ2NoZWNrZWQnXSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhdHRycy5vbk1vdW50ID0gZnVuY3Rpb24gKGVsdCkge1xuICAgICAgICAgICAgICAgIGVsdC5jaGVja2VkID0gKHJhZGlvVmFsdWUgPT09IHZhbHVlKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vbignbGFiZWwnLCBbXSwgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuYXR0cnMoYXR0cnMpLm9uKCdpbnB1dCcsIFsnY2xpY2snXSwgZXYgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJhZGlvVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJhZGlvVmFsdWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy50ZXh0KGxhYmVsIHx8IHJhZGlvVmFsdWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiByYWRpb1ZhbHVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGJsb2NrKHJhZGlvKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvLyBsYWJlbCh0eHQpIHtcbiAgICAvLyAgICAgICAgIC8vIEZJWE1FOiB0aGlzIGlzIGV4dHJlbWVseSBicml0dGxlLlxuICAgIC8vICAgICAgICAgdmFyIGlkID0gJ2lkJyArICh0aGlzLmlkcyArIDEpOyAvLyBOQjogbm90ICsrICEhXG4gICAgLy8gICAgICAgICByZXR1cm4gdGhpcy5hdHRyKCdmb3InLCBpZCkud2l0aEVsZW1lbnQoJ2xhYmVsJywgKCkgPT4gdGhpcy50ZXh0KHR4dCkpO1xuICAgIC8vIH1cblxuICAgIGFkZElucHV0RWxlbWVudHMoKSB7XG4gICAgICAgIHZhciBiYXNpY0lucHV0cyA9IHtcbiAgICAgICAgICAgIHNwaW5Cb3g6IHt0eXBlOiAnbnVtYmVyJywgZXZlbnQ6ICdpbnB1dCd9LFxuICAgICAgICAgICAgc2xpZGVyOiB7dHlwZTogJ3JhbmdlJywgZXZlbnQ6ICdpbnB1dCd9LFxuICAgICAgICAgICAgZW1haWxCb3g6IHt0eXBlOiAnZW1haWwnLCBldmVudDogJ2lucHV0J30sXG4gICAgICAgICAgICBzZWFyY2hCb3g6IHt0eXBlOiAnc2VhcmNoJywgZXZlbnQ6ICdpbnB1dCd9LFxuICAgICAgICAgICAgZGF0ZVBpY2tlcjoge3R5cGU6ICdkYXRlJywgZXZlbnQ6ICdjaGFuZ2UnfSxcbiAgICAgICAgICAgIGNvbG9yUGlja2VyOiB7dHlwZTogJ2NvbG9yJywgZXZlbnQ6ICdjaGFuZ2UnfSxcbiAgICAgICAgICAgIGRhdGVUaW1lUGlja2VyOiB7dHlwZTogJ2RhdGV0aW1lJywgZXZlbnQ6ICdjaGFuZ2UnfSxcbiAgICAgICAgICAgIGxvY2FsRGF0ZVRpbWVQaWNrZXI6IHt0eXBlOiAnZGF0ZXRpbWUtbG9jYWwnLCBldmVudDogJ2NoYW5nZSd9LFxuICAgICAgICAgICAgbW9udGhQaWNrZXI6IHt0eXBlOiAnd2VlaycsIGV2ZW50OiAnY2hhbmdlJ30sXG4gICAgICAgICAgICB3ZWVrUGlja2VyOiB7dHlwZTogJ3dlZWsnLCBldmVudDogJ2NoYW5nZSd9LFxuICAgICAgICAgICAgdGltZVBpY2tlcjoge3R5cGU6ICd0aW1lJywgZXZlbnQ6ICdjaGFuZ2UnfVxuICAgICAgICB9O1xuICAgICAgICBmb3IgKHZhciBuYW1lIGluIGJhc2ljSW5wdXRzKSB7XG4gICAgICAgICAgICBpZiAoYmFzaWNJbnB1dHMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgICAgICAgICAobmFtZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbbmFtZV0gPSB2YWx1ZSA9PiB0aGlzXG4gICAgICAgICAgICAgICAgICAgICAgICAuYXR0cnMoe3R5cGU6IGJhc2ljSW5wdXRzW25hbWVdLnR5cGUsIHZhbHVlOiB2YWx1ZX0pXG4gICAgICAgICAgICAgICAgICAgICAgICAub24oJ2lucHV0JywgW2Jhc2ljSW5wdXRzW25hbWVdLmV2ZW50XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldiA9PiBldiA/IGV2LnRhcmdldC52YWx1ZSA6IHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9KShuYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFkZFNpbXBsZUVsZW1lbnRzKCkge1xuICAgICAgICAvLyBDdXJyZW50bHksIHRoZXNlIGRvbid0IGhhdmUgZXZlbnRzLlxuICAgICAgICBbJ2EnLCAncCcsICdsYWJlbCcsICdzdHJvbmcnLCAnYnInLCAnc3BhbicsICdoMScsICdoMicsICdoMycsICdoNCcsXG4gICAgICAgICAnc2VjdGlvbicsICdkaXYnLCAndWwnLCAnb2wnLCAnbGknLCAnaGVhZGVyJywgJ2Zvb3RlcicsICdjb2RlJywgJ3ByZScsXG4gICAgICAgICAnZGwnLCAnZHQnLCAnZGQnLCAnZmllbGRzZXQnLCAndGFibGUnLCAndGQnLCAndHInLCAndGgnLCAnY29sJywgJ3RoZWFkJ11cbiAgICAgICAgICAgIC5mb3JFYWNoKGVsdCA9PiBcbiAgICAgICAgICAgICAgICAgICAgIChlbHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbZWx0XSA9IHggPT4gdGhpcy53aXRoRWxlbWVudChlbHQsICgpID0+IHRoaXMuY29udGVudCh4KSk7XG4gICAgICAgICAgICAgICAgICAgICB9KShlbHQpKTtcbiAgICB9XG4gICAgXG59XG5cblxuLypcblxuIFRoZSBmb2xsb3dpbmcgZnVuY3Rpb25zIGRvbid0IGFjY2VzcyBUcmltR1VJIHN0YXRlLCBidXQgc2ltcGx5XG4gcGF0Y2ggdGhlIHJlYWwgZG9tICgxc3QgYXJnKSBiYXNlZCBvbiB0aGUgdmRvbSAoMm5kIGFyZykuXG5cbiB2ZG9tIGVsZW1lbnRcbiB7dGFnOlxuIGF0dHJzOiB7fSBldGMuXG4ga2lkczogW10gfVxuXG4gKi9cblxuZnVuY3Rpb24gY29tcGF0KGQsIHYpIHtcbiAgICAvL2NvbnNvbGUubG9nKCdDb21wYXQ/ICcpO1xuICAgIC8vY29uc29sZS5sb2coJ2QgPSAnICsgZC5ub2RlVmFsdWUpO1xuICAgIC8vY29uc29sZS5sb2coJ3YgPSAnICsgSlNPTi5zdHJpbmdpZnkodikpO1xuICAgIHJldHVybiAoZC5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUgJiYgKHR5cGVvZiB2ICE9PSAnb2JqZWN0JykpXG4gICAgICAgIHx8IChkLnRhZ05hbWUgPT09IHYudGFnLnRvVXBwZXJDYXNlKCkpO1xufVxuXG5cbmZ1bmN0aW9uIHJlY29uY2lsZShkb20sIHZkb20pIHtcbiAgICBpZiAoIWNvbXBhdChkb20sIHZkb20pKSB7XG4gICAgICAgIHRocm93ICdDYW4gb25seSByZWNvbmNpbGUgY29tcGF0aWJsZSBub2Rlcyc7XG4gICAgfVxuICAgIFxuICAgIC8vIFRleHQgbm9kZXNcbiAgICBpZiAodHlwZW9mIHZkb20gIT09ICdvYmplY3QnKSB7XG4gICAgICAgIGlmIChkb20ubm9kZVZhbHVlICE9PSB2ZG9tKSB7XG4gICAgICAgICAgICBkb20ubm9kZVZhbHVlID0gdmRvbS50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cblxuICAgIC8vIEVsZW1lbnQgbm9kZXNcbiAgICB2YXIgdmF0dHJzID0gdmRvbS5hdHRycyB8fCB7fTtcbiAgICBmb3IgKHZhciB2YXR0ciBpbiB2YXR0cnMpIHtcbiAgICAgICAgaWYgKHZhdHRycy5oYXNPd25Qcm9wZXJ0eSh2YXR0cikpIHtcbiAgICAgICAgICAgIGlmIChkb20uaGFzQXR0cmlidXRlKHZhdHRyKSkge1xuICAgICAgICAgICAgICAgIHZhciBkYXR0ciA9IGRvbS5nZXRBdHRyaWJ1dGUodmF0dHIpO1xuICAgICAgICAgICAgICAgIGlmIChkYXR0ciAhPT0gdmF0dHJzW3ZhdHRyXS50b1N0cmluZygpKSB7IFxuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdVcGRhdGluZyBhdHRyaWJ1dGU6ICcgKyB2YXR0ciArICcgPSAnICsgdmF0dHJzW3ZhdHRyXSk7XG4gICAgICAgICAgICAgICAgICAgIGRvbS5zZXRBdHRyaWJ1dGUodmF0dHIsIHZhdHRyc1t2YXR0cl0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ0FkZGluZyBhdHRyaWJ1dGU6ICcgKyB2YXR0ciArICcgPSAnICsgdmF0dHJzW3ZhdHRyXSk7XG4gICAgICAgICAgICAgICAgZG9tLnNldEF0dHJpYnV0ZSh2YXR0ciwgdmF0dHJzW3ZhdHRyXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkb20uYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZGF0dHIgPSBkb20uYXR0cmlidXRlc1tpXTtcbiAgICAgICAgaWYgKCF2YXR0cnMuaGFzT3duUHJvcGVydHkoZGF0dHIubm9kZU5hbWUpKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdSZW1vdmluZyBhdHRyaWJ1dGU6ICcgKyBkYXR0ci5ub2RlTmFtZSk7XG4gICAgICAgICAgICBkb20ucmVtb3ZlQXR0cmlidXRlKGRhdHRyLm5vZGVOYW1lKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlY29uY2lsZUtpZHMoZG9tLCBkb20uY2hpbGROb2RlcywgdmRvbS5raWRzKTtcbn1cblxuZnVuY3Rpb24gcmVjb25jaWxlS2lkcyhkb20sIGRraWRzLCB2a2lkcykge1xuICAgIHZhciBsZW4gPSBNYXRoLm1pbihka2lkcy5sZW5ndGgsIHZraWRzLmxlbmd0aCk7XG4gICAgXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YXIgZGtpZCA9IGRraWRzW2ldO1xuICAgICAgICB2YXIgdmtpZCA9IHZraWRzW2ldO1xuICAgICAgICBpZiAoY29tcGF0KGRraWQsIHZraWQpKSB7XG4gICAgICAgICAgICByZWNvbmNpbGUoZGtpZCwgdmtpZCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdSZXBsYWNpbmcgY2hpbGQnKTtcbiAgICAgICAgICAgIGRvbS5yZXBsYWNlQ2hpbGQoYnVpbGQodmtpZCksIGRraWQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIGlmIChka2lkcy5sZW5ndGggPiBsZW4pIHtcbiAgICAgICAgd2hpbGUgKGRraWRzLmxlbmd0aCA+IGxlbikge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnUmVtb3ZpbmcgY2hpbGQgJyk7XG4gICAgICAgICAgICBkb20ucmVtb3ZlQ2hpbGQoZGtpZHNbbGVuXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAodmtpZHMubGVuZ3RoID4gbGVuKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSBsZW47IGkgPCB2a2lkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnQXBwZW5kaW5nIG5ldyBjaGlsZCAnKTtcbiAgICAgICAgICAgIGRvbS5hcHBlbmRDaGlsZChidWlsZCh2a2lkc1tpXSkpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBidWlsZCh2ZG9tKSB7XG4gICAgaWYgKHZkb20gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHZkb20gIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh2ZG9tLnRvU3RyaW5nKCkpO1xuICAgIH1cbiAgICBcbiAgICB2YXIgZWx0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh2ZG9tLnRhZyk7XG4gICAgdmFyIHZhdHRycyA9IHZkb20uYXR0cnMgfHwge307XG4gICAgZm9yICh2YXIgayBpbiB2YXR0cnMpIHtcbiAgICAgICAgaWYgKHZhdHRycy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgZWx0LnNldEF0dHJpYnV0ZShrLCB2YXR0cnNba10pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmRvbS5raWRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGVsdC5hcHBlbmRDaGlsZChidWlsZCh2ZG9tLmtpZHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIGVsdDsgICAgXG59XG5cbm1vZHVsZS5leHBvcnRzID0gVHJpbUdVSTtcblxuIl19
