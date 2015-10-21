!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.app=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// TODOMV using IMGUI.

'use strict';

// Data model


const STORAGE_KEY = 'todo-mvc';

class Todos {    
    constructor () {
        this.todos = [];
        this.newTodo = '';
        this.filter = 'none';
        this.ids = 0;
        this.filters = {
            none: x => true,
            active: x => !x.completed,
            completed: x => x.completed
        };
        this.load();
    }

    toJSON() {
        return {newTodo: this.newTodo, ids: this.ids,
                todos: this.todos.map(t => t.toJSON())};
    }
    
    load() {
        var txt = window.localStorage[STORAGE_KEY];
        if (txt) {
            var json = JSON.parse(txt);
            this.ids = json.ids;
            this.newTodo = json.newTodo;
            this.todos = json.todos.map(t => Todo.fromJSON(this, t));
        }
    }
    
    persist() {
        window.localStorage[STORAGE_KEY] = JSON.stringify(this.toJSON());
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
        return this.todos.filter(this.filters[this.filter]);
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

    update(value) {
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


const IMGUI = require('libimgui');

const wnd = new IMGUI(main, new Todos(), 'todoapp');

const ENTER_KEY = 13;
const ESCAPE_KEY = 27;

function main(model) {
    if (wnd.enRoute('#/active')) {
        model.filter = 'active';
    }
    else if (wnd.enRoute('#/completed')) {
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
                        todo.update(ev.target.value);
                    }
                    if (ev.keyCode === ESCAPE_KEY) {
                        todo.editing = false;
                    }
                }
                if (ev.type === 'focusout') { // blur doesn't bubble up....
                    todo.editing = false;
                    todo.update(ev.target.value);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImpzL2FwcC5qcyIsIm5vZGVfbW9kdWxlcy9saWJpbWd1aS9saWJpbWd1aS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gVE9ET01WIHVzaW5nIElNR1VJLlxuXG4ndXNlIHN0cmljdCc7XG5cbi8vIERhdGEgbW9kZWxcblxuXG5jb25zdCBTVE9SQUdFX0tFWSA9ICd0b2RvLW12Yyc7XG5cbmNsYXNzIFRvZG9zIHsgICAgXG4gICAgY29uc3RydWN0b3IgKCkge1xuICAgICAgICB0aGlzLnRvZG9zID0gW107XG4gICAgICAgIHRoaXMubmV3VG9kbyA9ICcnO1xuICAgICAgICB0aGlzLmZpbHRlciA9ICdub25lJztcbiAgICAgICAgdGhpcy5pZHMgPSAwO1xuICAgICAgICB0aGlzLmZpbHRlcnMgPSB7XG4gICAgICAgICAgICBub25lOiB4ID0+IHRydWUsXG4gICAgICAgICAgICBhY3RpdmU6IHggPT4gIXguY29tcGxldGVkLFxuICAgICAgICAgICAgY29tcGxldGVkOiB4ID0+IHguY29tcGxldGVkXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMubG9hZCgpO1xuICAgIH1cblxuICAgIHRvSlNPTigpIHtcbiAgICAgICAgcmV0dXJuIHtuZXdUb2RvOiB0aGlzLm5ld1RvZG8sIGlkczogdGhpcy5pZHMsXG4gICAgICAgICAgICAgICAgdG9kb3M6IHRoaXMudG9kb3MubWFwKHQgPT4gdC50b0pTT04oKSl9O1xuICAgIH1cbiAgICBcbiAgICBsb2FkKCkge1xuICAgICAgICB2YXIgdHh0ID0gd2luZG93LmxvY2FsU3RvcmFnZVtTVE9SQUdFX0tFWV07XG4gICAgICAgIGlmICh0eHQpIHtcbiAgICAgICAgICAgIHZhciBqc29uID0gSlNPTi5wYXJzZSh0eHQpO1xuICAgICAgICAgICAgdGhpcy5pZHMgPSBqc29uLmlkcztcbiAgICAgICAgICAgIHRoaXMubmV3VG9kbyA9IGpzb24ubmV3VG9kbztcbiAgICAgICAgICAgIHRoaXMudG9kb3MgPSBqc29uLnRvZG9zLm1hcCh0ID0+IFRvZG8uZnJvbUpTT04odGhpcywgdCkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHBlcnNpc3QoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2VbU1RPUkFHRV9LRVldID0gSlNPTi5zdHJpbmdpZnkodGhpcy50b0pTT04oKSk7XG4gICAgfVxuXG4gICAgY3JlYXRlVG9kbyh2YWx1ZSkge1xuICAgICAgICB2YXIgdG9kbyA9IG5ldyBUb2RvKHZhbHVlLCB0aGlzLCB0aGlzLmlkcysrKTtcbiAgICAgICAgdGhpcy50b2Rvcy5wdXNoKHRvZG8pO1xuICAgIH1cblxuICAgIGRlbGV0ZVRvZG8odG9kbywgaWR4KSB7XG4gICAgICAgIGlkeCA9IGlkeCB8fCB0aGlzLnRvZG9zLmZpbmRJbmRleCh4ID0+IHguaWQgPT09IHRvZG8uaWQpO1xuICAgICAgICB0aGlzLnRvZG9zLnNwbGljZShpZHgsIDEpO1xuICAgIH1cblxuICAgIGNsZWFyQ29tcGxldGVkKCkge1xuICAgICAgICBsZXQgaiA9IDA7XG4gICAgICAgIGxldCBsZW4gPSB0aGlzLnRvZG9zLmxlbmd0aDtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgbGV0IHRvZG8gPSB0aGlzLnRvZG9zW2kgLSBqXTtcbiAgICAgICAgICAgIGlmICh0b2RvLmNvbXBsZXRlZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZGVsZXRlVG9kbyh0b2RvLCBpIC0gaik7XG4gICAgICAgICAgICAgICAgaisrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZmlsdGVyZWRUb2RvcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9kb3MuZmlsdGVyKHRoaXMuZmlsdGVyc1t0aGlzLmZpbHRlcl0pO1xuICAgIH1cbiAgICBcbn1cblxuY2xhc3MgVG9kbyB7XG4gICAgY29uc3RydWN0b3IgKHRleHQsIG1vZGVsLCBpZCkge1xuICAgICAgICB0aGlzLnRleHQgPSB0ZXh0O1xuICAgICAgICB0aGlzLmNvbXBsZXRlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmVkaXRpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5tb2RlbCA9IG1vZGVsO1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgfVxuXG4gICAgc3RhdGljIGZyb21KU09OKG1vZGVsLCBvYmopIHtcbiAgICAgICAgdmFyIHRvZG8gPSBuZXcgVG9kbyhvYmoudGV4dCwgbW9kZWwsIG9iai5pZCk7XG4gICAgICAgIHRvZG8uY29tcGxldGVkID0gb2JqLmNvbXBsZXRlZDtcbiAgICAgICAgdG9kby5lZGl0aW5nID0gb2JqLmVkaXRpbmc7XG4gICAgICAgIHJldHVybiB0b2RvO1xuICAgIH1cbiAgICBcbiAgICB0b0pTT04oKSB7XG4gICAgICAgIHJldHVybiB7dGV4dDogdGhpcy50ZXh0LFxuICAgICAgICAgICAgICAgIGNvbXBsZXRlZDogdGhpcy5jb21wbGV0ZWQsXG4gICAgICAgICAgICAgICAgZWRpdGluZzogdGhpcy5lZGl0aW5nLFxuICAgICAgICAgICAgICAgIGlkOiB0aGlzLmlkfTtcbiAgICB9XG5cbiAgICB1cGRhdGUodmFsdWUpIHtcbiAgICAgICAgbGV0IHR4dCA9IHZhbHVlLnRyaW0oKTtcbiAgICAgICAgaWYgKHR4dCAhPT0gJycpIHtcbiAgICAgICAgICAgIHRoaXMudGV4dCA9IHR4dDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZGVzdHJveSgpIHtcbiAgICAgICAgdGhpcy5tb2RlbC5kZWxldGVUb2RvKHRoaXMpO1xuICAgIH1cbiAgICBcbn1cblxuXG5jb25zdCBJTUdVSSA9IHJlcXVpcmUoJ2xpYmltZ3VpJyk7XG5cbmNvbnN0IHduZCA9IG5ldyBJTUdVSShtYWluLCBuZXcgVG9kb3MoKSwgJ3RvZG9hcHAnKTtcblxuY29uc3QgRU5URVJfS0VZID0gMTM7XG5jb25zdCBFU0NBUEVfS0VZID0gMjc7XG5cbmZ1bmN0aW9uIG1haW4obW9kZWwpIHtcbiAgICBpZiAod25kLmVuUm91dGUoJyMvYWN0aXZlJykpIHtcbiAgICAgICAgbW9kZWwuZmlsdGVyID0gJ2FjdGl2ZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHduZC5lblJvdXRlKCcjL2NvbXBsZXRlZCcpKSB7XG4gICAgICAgIG1vZGVsLmZpbHRlciA9ICdjb21wbGV0ZWQnO1xuICAgIH1cbiAgICBcbiAgICB3bmQua2xhc3MoJ3RvZG9hcHAnKS5zZWN0aW9uKCgpID0+IHtcbiAgICAgICAgd25kLmtsYXNzKCdoZWFkZXInKS5oZWFkZXIoKCkgPT4ge1xuICAgICAgICAgICAgd25kLmgxKCd0b2RvcycpO1xuICAgICAgICAgICAgbmV3VG9kbyhtb2RlbCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKG1vZGVsLnRvZG9zLmxlbmd0aCA+IDAgKSB7XG4gICAgICAgICAgICBtYWluU2VjdGlvbihtb2RlbCwgbW9kZWwudG9kb3MpO1xuICAgICAgICAgICAgZm9vdGVyKG1vZGVsKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIFxuICAgIG1vZGVsLnBlcnNpc3QoKTsgICAgXG59XG5cblxuZnVuY3Rpb24gbmV3VG9kbyhtb2RlbCkge1xuICAgIHZhciBhdHRycyA9IHsnY2xhc3MnOiAnbmV3LXRvZG8nLCB0eXBlOiAndGV4dCcsIHZhbHVlOiBtb2RlbC5uZXdUb2RvLFxuICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogJ1doYXQgbmVlZHMgdG8gYmUgZG9uZT8nLFxuICAgICAgICAgICAgICAgICBvbk1vdW50OiBlbHQgPT4ge2VsdC52YWx1ZT1tb2RlbC5uZXdUb2RvO319O1xuICAgIFxuICAgIHduZC5hdHRycyhhdHRycykub24oJ2lucHV0JywgWydrZXl1cCddLCBldiA9PiB7XG4gICAgICAgIGlmIChldikge1xuICAgICAgICAgICAgaWYgKGV2LmtleUNvZGUgPT09IEVOVEVSX0tFWSkge1xuICAgICAgICAgICAgICAgIGxldCB0eHQgPSBldi50YXJnZXQudmFsdWUudHJpbSgpO1xuICAgICAgICAgICAgICAgIGlmICh0eHQgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsLmNyZWF0ZVRvZG8oZXYudGFyZ2V0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgbW9kZWwubmV3VG9kbyA9ICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGV2LmtleUNvZGUgPT09IEVTQ0FQRV9LRVkpIHtcbiAgICAgICAgICAgICAgICBtb2RlbC5uZXdUb2RvID0gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBtb2RlbC5uZXdUb2RvID0gZXYudGFyZ2V0LnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59XG5cblxuZnVuY3Rpb24gbWFpblNlY3Rpb24obW9kZWwsIHRvZG9zKSB7XG4gICAgd25kLmtsYXNzKCdtYWluJykuc2VjdGlvbigoKSA9PiB7XG4gICAgICAgIGlmICh3bmQua2xhc3MoJ3RvZ2dsZS1hbGwnKS5jaGVja0JveChmYWxzZSkpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG9kb3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0b2Rvc1tpXS5jb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHduZC5hdHRyKCdmb3InLCAndG9nZ2xlLWFsbCcpLmxhYmVsKCdNYXJrIGFsbCBhcyBjb21wbGV0ZScpO1xuICAgICAgICBcbiAgICAgICAgd25kLmtsYXNzKCd0b2RvLWxpc3QnKS51bCgoKSA9PiB7XG4gICAgICAgICAgICBtb2RlbC5maWx0ZXJlZFRvZG9zKCkuZm9yRWFjaChzaG93VG9kbyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIFxufVxuXG5mdW5jdGlvbiBmaWx0ZXJCdXR0b24obW9kZWwsIHRpdGxlLCBuYW1lLCBoYXNoKSB7XG4gICAgaGFzaCA9IGhhc2ggPT09IHVuZGVmaW5lZCA/IG5hbWUgOiBoYXNoO1xuICAgIHduZC5saSgoKSA9PiB7XG4gICAgICAgIGlmICh3bmQuYXR0cklmKG1vZGVsLmZpbHRlciA9PT0gbmFtZSwgJ2NsYXNzJywgJ3NlbGVjdGVkJylcbiAgICAgICAgICAgIC5hdHRyKCdocmVmJywgJyMvJyArIGhhc2gpLmFjbGljayh0aXRsZSkpIHtcbiAgICAgICAgICAgIG1vZGVsLmZpbHRlciA9IG5hbWU7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gZm9vdGVyKG1vZGVsKSB7XG4gICAgd25kLmtsYXNzKCdmb290ZXInKS5mb290ZXIoKCkgPT4ge1xuICAgICAgICB3bmQua2xhc3MoJ3RvZG8tY291bnQnKS5zcGFuKCgpID0+IHtcbiAgICAgICAgICAgIHduZC5zdHJvbmcobW9kZWwudG9kb3MubGVuZ3RoICsgJyBpdGVtKHMpIGxlZnQnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgd25kLmtsYXNzKCdmaWx0ZXJzJykudWwoKCkgPT4ge1xuICAgICAgICAgICAgZmlsdGVyQnV0dG9uKG1vZGVsLCAnQWxsJywgJ25vbmUnLCAnJyk7XG4gICAgICAgICAgICBmaWx0ZXJCdXR0b24obW9kZWwsICdBY3RpdmUnLCAnYWN0aXZlJyk7XG4gICAgICAgICAgICBmaWx0ZXJCdXR0b24obW9kZWwsICdDb21wbGV0ZWQnLCAnY29tcGxldGVkJyk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKHduZC5rbGFzcygnY2xlYXItY29tcGxldGVkJykuYnV0dG9uKCdDbGVhciBjb21wbGV0ZWQnKSkge1xuICAgICAgICAgICAgbW9kZWwuY2xlYXJDb21wbGV0ZWQoKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBzaG93VG9kbyh0b2RvKSB7XG4gICAgbGV0IGNscyA9IHRvZG8uY29tcGxldGVkID8gJ2NvbXBsZXRlZCcgOiAgJyc7XG4gICAgY2xzICs9IHRvZG8uZWRpdGluZyA/ICcgZWRpdGluZycgOiAnJztcbiAgICBsZXQgYXR0cnMgPSBjbHMgPyB7J2NsYXNzJzogY2xzLnRyaW0oKX0gOiB7fTtcblxuICAgIHduZC5hdHRycyhhdHRycykubGkoKCkgPT4ge1xuICAgICAgICB2aWV3VG9kbyh0b2RvKTtcbiAgICAgICAgaWYgKHRvZG8uZWRpdGluZykge1xuICAgICAgICAgICAgZWRpdFRvZG8odG9kbyk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuXG5mdW5jdGlvbiB2aWV3VG9kbyh0b2RvKSB7XG4gICAgd25kLmtsYXNzKCd2aWV3JykuZGl2KCgpID0+IHtcbiAgICAgICAgdG9kby5jb21wbGV0ZWQgPSB3bmQua2xhc3MoJ3RvZ2dsZScpLmNoZWNrQm94KHRvZG8uY29tcGxldGVkKTtcblxuICAgICAgICB3bmQub24oJ2xhYmVsJywgWydkYmxjbGljayddLCBldiA9PiB7XG4gICAgICAgICAgICBpZiAoZXYpIHtcbiAgICAgICAgICAgICAgICB0b2RvLmVkaXRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd25kLnRleHQodG9kby50ZXh0KTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBpZiAod25kLmtsYXNzKCdkZXN0cm95JykuYnV0dG9uKCkpIHtcbiAgICAgICAgICAgIHRvZG8uZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cblxuXG5mdW5jdGlvbiBlZGl0VG9kbyh0b2RvKSB7XG4gICAgd25kLmtsYXNzKCdlZGl0JylcbiAgICAgICAgLmF0dHIoJ3ZhbHVlJywgdG9kby50ZXh0KVxuICAgICAgICAuYXR0cignb25Nb3VudCcsIGUgPT4gZS5mb2N1cygpKVxuICAgICAgICAub24oJ2lucHV0JywgWydrZXl1cCcsICdmb2N1c291dCddLCBldiA9PiB7XG4gICAgICAgICAgICBpZiAoZXYpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXYudHlwZSA9PT0gJ2tleXVwJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXYua2V5Q29kZSA9PT0gRU5URVJfS0VZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b2RvLmVkaXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvZG8udXBkYXRlKGV2LnRhcmdldC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2LmtleUNvZGUgPT09IEVTQ0FQRV9LRVkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvZG8uZWRpdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChldi50eXBlID09PSAnZm9jdXNvdXQnKSB7IC8vIGJsdXIgZG9lc24ndCBidWJibGUgdXAuLi4uXG4gICAgICAgICAgICAgICAgICAgIHRvZG8uZWRpdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB0b2RvLnVwZGF0ZShldi50YXJnZXQudmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB3bmQ7XG4iLCJcbid1c2Ugc3RyaWN0JztcblxuLypcbiAqIFRPRE86XG4gKiAtIGRvbid0IGJ1aWxkIHZub2RlIHdoZW4gaGFuZGxpbmcgZXZlbnQuXG4gKiAtIG1ha2UgYGhlcmVgIG1vcmUgcm9idXN0XG4gKiAtIG9wdGltaXplIHVzZSBvZiBpZHMgaW4gbGlzdHNcbiAqIC0gZWxpbWluYXRlIC5jbGFzcy8jaWQgcGFyc2luZ1xuICogLSBzdXBwb3J0IGtleS1iYXNlZCBwYXRjaGluZyAoYXR0ciBga2V5YClcbiAqL1xuXG5jbGFzcyBUcmltR1VJIHtcbiAgICBjb25zdHJ1Y3RvciAoYXBwLCBtb2RlbCwgcm9vdCkge1xuICAgICAgICB0aGlzLmFwcCA9IGFwcDtcbiAgICAgICAgdGhpcy5tb2RlbCA9IG1vZGVsO1xuICAgICAgICB0aGlzLnJvb3QgPSByb290O1xuICAgICAgICB0aGlzLmV2ZW50ID0gbnVsbDtcbiAgICAgICAgdGhpcy5mb2N1cyA9IFtdO1xuICAgICAgICB0aGlzLm5vZGUgPSBudWxsO1xuICAgICAgICB0aGlzLm9uTW91bnRzID0ge307XG4gICAgICAgIHRoaXMudGltZXJzID0ge307XG4gICAgICAgIHRoaXMuaGFuZGxlcnMgPSB7fTtcbiAgICAgICAgdGhpcy5pZHMgPSAwO1xuICAgICAgICB0aGlzLmF0dHJpYnV0ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5yb3V0ZSA9IGRvY3VtZW50LmxvY2F0aW9uLmhhc2g7XG4gICAgICAgIHRoaXMuYWRkU2ltcGxlRWxlbWVudHMoKTtcbiAgICAgICAgdGhpcy5hZGRJbnB1dEVsZW1lbnRzKCk7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdzdG9yYWdlJywgdGhpcy5kZWFsV2l0aEl0LCBmYWxzZSk7XG4gICAgfVxuXG4gICAgcnVuKCkge1xuICAgICAgICB0aGlzLm1vdW50KHRoaXMucmVuZGVyT25jZSgpKTtcbiAgICB9XG4gICAgXG4gICAgcmVnaXN0ZXIoZXZlbnQsIGlkKSB7XG4gICAgICAgIC8vIG9ubHkgYWRkIG9uZSBoYW5kbGVyIHRvIHJvb3QsIHBlciBldmVudCB0eXBlLlxuICAgICAgICBpZiAoIXRoaXMuaGFuZGxlcnMuaGFzT3duUHJvcGVydHkoZXZlbnQpKSB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZXJzW2V2ZW50XSA9IFtdO1xuICAgICAgICAgICAgdmFyIHIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLnJvb3QpO1xuICAgICAgICAgICAgci5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBlID0+IHtcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpOyAvLyBkb24ndCBsZWFrIHVwd2FyZHNcbiAgICAgICAgICAgICAgICB2YXIgaWQgPSBlLnRhcmdldC5nZXRBdHRyaWJ1dGUoJ2lkJyk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaGFuZGxlcnNbZXZlbnRdLmluZGV4T2YoaWQpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudCA9IGU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZG9SZW5kZXIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5oYW5kbGVyc1tldmVudF0ucHVzaChpZCk7XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIGZvciAodmFyIGsgaW4gdGhpcy5oYW5kbGVycykge1xuICAgICAgICAgICAgaWYgKHRoaXMuaGFuZGxlcnMuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZXJzW2tdID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vbk1vdW50cyA9IHt9O1xuICAgICAgICB0aGlzLmZvY3VzID0gW107XG4gICAgICAgIHRoaXMuaWRzID0gMDtcbiAgICB9XG5cbiAgICByZW5kZXJPbmNlKCkge1xuICAgICAgICB0aGlzLnJlc2V0KCk7XG4gICAgICAgIHRoaXMuYXBwKHRoaXMubW9kZWwpO1xuICAgIH1cblxuICAgIGRvUmVuZGVyKCkge1xuICAgICAgICAvLyB0d2ljZTogb25lIHRvIGhhbmRsZSBldmVudCwgb25lIHRvIHN5bmMgdmlldy5cbiAgICAgICAgdmFyIF8gPSB0aGlzLnJlbmRlck9uY2UoKTtcbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzLnJlbmRlck9uY2UoKTtcbiAgICAgICAgdGhpcy5tb3VudChub2RlKTtcbiAgICB9XG5cbiAgICBtb3VudChub2RlKSB7XG4gICAgICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLnJvb3QpO1xuICAgICAgICBpZiAodGhpcy5ub2RlICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZWNvbmNpbGVLaWRzKGNvbnRhaW5lciwgY29udGFpbmVyLmNoaWxkTm9kZXMsIHRoaXMuZm9jdXMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgd2hpbGUgKGNvbnRhaW5lci5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLnJlbW92ZUNoaWxkKGNvbnRhaW5lci5maXJzdENoaWxkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5mb2N1cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChidWlsZCh0aGlzLmZvY3VzW2ldKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ub2RlID0gbm9kZTtcbiAgICAgICAgXG4gICAgICAgIGZvciAodmFyIGlkIGluIHRoaXMub25Nb3VudHMpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLm9uTW91bnRzLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgICAgIHZhciBkb1NvbWV0aGluZyA9IHRoaXMub25Nb3VudHNbaWRdO1xuICAgICAgICAgICAgICAgIHZhciBlbHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7XG4gICAgICAgICAgICAgICAgZG9Tb21ldGhpbmcoZWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9XG5cbiAgICBkZWFsV2l0aEl0KGUpIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IGU7XG4gICAgICAgIHRoaXMuZG9SZW5kZXIoKTtcbiAgICB9XG5cblxuICAgIGF0dHJzKGFzKSB7XG4gICAgICAgIGZvciAodmFyIGEgaW4gYXMpIHtcbiAgICAgICAgICAgIGlmIChhcy5oYXNPd25Qcm9wZXJ0eShhKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlc1thXSA9IGFzW2FdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGVuUm91dGUoaGFzaCwgYmxvY2spIHtcbiAgICAgICAgaWYgKCF0aGlzLnJvdXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMucm91dGUgPT09IGhhc2gpIHtcbiAgICAgICAgICAgIHRoaXMucm91dGUgPSB1bmRlZmluZWQ7IC8vIG9ubHkgcnVuIG9uY2UuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgb25TdG9yYWdlKGJsb2NrKSB7XG4gICAgICAgIHZhciBldmVudCA9IHRoaXMuZXZlbnQ7XG4gICAgICAgIGlmIChldmVudCAmJiBldmVudC50eXBlID09PSAnc3RvcmFnZScpIHtcbiAgICAgICAgICAgIHRoaXMuZXZlbnQgPSB1bmRlZmluZWQ7IFxuICAgICAgICAgICAgYmxvY2soZXZlbnQpOyBcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBvbihlbHQsIGV2ZW50cywgYmxvY2spIHtcbiAgICAgICAgdmFyIGlkID0gdGhpcy5hdHRyaWJ1dGVzWydpZCddIHx8ICgnaWQnICsgdGhpcy5pZHMrKyk7XG4gICAgICAgIGV2ZW50cy5mb3JFYWNoKGUgPT4gdGhpcy5yZWdpc3RlcihlLCBpZCkpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXMuaWQoaWQpLndpdGhFbGVtZW50KGVsdCwgKCkgPT4ge1xuICAgICAgICAgICAgdmFyIGV2ZW50ID0gdGhpcy5ldmVudDtcbiAgICAgICAgICAgIGlmIChldmVudCAmJiBldmVudC50YXJnZXQuZ2V0QXR0cmlidXRlKCdpZCcpID09PSBpZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnQgPSB1bmRlZmluZWQ7IC8vIG1heWJlIGRvIGluIHRvcGxldmVsPz8/XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJsb2NrKGV2ZW50KTsgLy8gbGV0IGl0IGJlIGhhbmRsZWRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBibG9jaygpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB3aXRoRWxlbWVudChlbHQsIGZ1bmMsIGV2cykge1xuICAgICAgICAvLyBUT0RPOiBpZiB0aGlzLnByZXRlbmQsIGRvbid0IGJ1aWxkIHZub2Rlc1xuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcy5mb2N1cztcbiAgICAgICAgdGhpcy5mb2N1cyA9IFtdO1xuXG4gICAgICAgIC8vIENvcHkgdGhlIGN1cnJlbnQgYXR0cmlidXRlIHNldFxuICAgICAgICB2YXIgbXlBdHRycyA9IHt9O1xuICAgICAgICBmb3IgKHZhciBhIGluIHRoaXMuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgaWYgKHRoaXMuYXR0cmlidXRlcy5oYXNPd25Qcm9wZXJ0eShhKSkge1xuICAgICAgICAgICAgICAgIG15QXR0cnNbYV0gPSB0aGlzLmF0dHJpYnV0ZXNbYV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hdHRyaWJ1dGVzID0ge307IC8vIGtpZHMgZG9uJ3QgaW5oZXJpdCBhdHRycy5cbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuYygpO1xuICAgICAgICB9XG4gICAgICAgIGZpbmFsbHkge1xuICAgICAgICAgICAgaWYgKG15QXR0cnMgJiYgbXlBdHRycy5vbk1vdW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbk1vdW50c1tteUF0dHJzWydpZCddXSA9IG15QXR0cnMub25Nb3VudDtcbiAgICAgICAgICAgICAgICBkZWxldGUgbXlBdHRycy5vbk1vdW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHZub2RlID0ge3RhZzogZWx0LCBhdHRyczogbXlBdHRycywga2lkczogdGhpcy5mb2N1c307XG4gICAgICAgICAgICBwYXJlbnQucHVzaCh2bm9kZSk7XG4gICAgICAgICAgICB0aGlzLmZvY3VzID0gcGFyZW50O1xuICAgICAgICB9ICAgIFxuICAgIH1cblxuXG4gICAgaGVyZShmdW5jLCBibG9jaykge1xuICAgICAgICB2YXIgcG9zID0gdGhpcy5mb2N1cy5sZW5ndGg7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgcmV0dXJuIGJsb2NrKGZ1bmN0aW9uICgpIHsgLy8gYmVjYXVzZSBhcmd1bWVudHMuXG4gICAgICAgICAgICB2YXIgcGFyZW50ID0gc2VsZi5mb2N1cztcbiAgICAgICAgICAgIHNlbGYuZm9jdXMgPSBbXTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5mb2N1cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBwYXJlbnQuc3BsaWNlKHBvcyArIGksIDAsIHNlbGYuZm9jdXNbaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzZWxmLmZvY3VzID0gcGFyZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cblxuICAgIGNvbnRlbnQoYywgZXYpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjLmFwcGx5KHVuZGVmaW5lZCwgZXYpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgYyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRoaXMudGV4dChjKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgdGV4dCh0eHQpIHtcbiAgICAgICAgdGhpcy5mb2N1cy5wdXNoKHR4dCk7XG4gICAgfVxuXG4gICAgbmV4dElkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5pZHMgKyAxO1xuICAgIH1cbiAgICBcbiAgICBcbiAgICAvLyBjb252ZW5pZW5jZVxuXG4gICAgYXR0cihuLCB4KSB7XG4gICAgICAgIHZhciBvYmogPSB7fTtcbiAgICAgICAgb2JqW25dID0geDtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXR0cnMob2JqKTtcbiAgICB9XG5cbiAgICBhdHRySWYoYywgbiwgeCkge1xuICAgICAgICBpZiAoYykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXR0cihuLCB4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgXG4gICAga2xhc3MoeCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hdHRyKCdjbGFzcycsIHgpO1xuICAgIH1cblxuICAgIGlkKHgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXR0cignaWQnLCB4KTtcbiAgICB9XG5cbiAgICB0ZXh0YXJlYSh4KSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9uKCd0ZXh0YXJlYScsIFsna2V5dXAnLCAnYmx1ciddLCBldiA9PiB7XG4gICAgICAgICAgICB2YXIgbmV3VmFsdWUgPSBldiA/IGV2LnRhcmdldC52YWx1ZSA6IHZhbHVlO1xuICAgICAgICAgICAgdGhpcy5jb250ZW50KHgsIGV2KTtcbiAgICAgICAgICAgIHJldHVybiBuZXdWYWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHRleHRCb3godmFsdWUpIHtcbiAgICAgICAgdmFyIGF0dHJzID0ge307XG4gICAgICAgIGF0dHJzLnR5cGUgPSAndGV4dCc7XG4gICAgICAgIGF0dHJzLnZhbHVlID0gdmFsdWU7XG4gICAgICAgIGF0dHJzLm9uTW91bnQgPSBlbHQgPT4ge1xuICAgICAgICAgICAgICAgIGVsdC52YWx1ZSA9IHZhbHVlO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXMuYXR0cnMoYXR0cnMpLm9uKCdpbnB1dCcsIFsnaW5wdXQnXSwgZXYgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGV2ID8gZXYudGFyZ2V0LnZhbHVlIDogdmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGNoZWNrQm94KHZhbHVlKSB7XG4gICAgICAgIHZhciBhdHRycyA9IGF0dHJzIHx8IHt9O1xuICAgICAgICBhdHRycy50eXBlID0gJ2NoZWNrYm94JztcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBhdHRycy5jaGVja2VkID0gJ3RydWUnO1xuICAgICAgICB9XG4gICAgICAgIGF0dHJzLm9uTW91bnQgPSBlbHQgPT4ge1xuICAgICAgICAgICAgZWx0LmNoZWNrZWQgPSB2YWx1ZTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzLmF0dHJzKGF0dHJzKS5vbignaW5wdXQnLCBbJ2NsaWNrJ10sIGV2ID0+IHtcbiAgICAgICAgICAgIHJldHVybiBldiA/IGV2LnRhcmdldC5jaGVja2VkIDogdmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgYWZ0ZXIoaWQsIGRlbGF5KSB7XG4gICAgICAgIGlmICh0aGlzLnRpbWVycy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRpbWVyc1tpZF07XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnRpbWVyc1tpZF0gPSBmYWxzZTtcbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy50aW1lcnNbaWRdID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuZG9SZW5kZXIoKTtcbiAgICAgICAgfSwgZGVsYXkpO1xuICAgIH1cblxuXG4gICAgYWNsaWNrKHgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub24oJ2EnLCBbJ2NsaWNrJ10sIGV2ID0+IHtcbiAgICAgICAgICAgIHRoaXMuY29udGVudCh4LCBldik7XG4gICAgICAgICAgICByZXR1cm4gZXYgIT09IHVuZGVmaW5lZDtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIGJ1dHRvbih4KSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9uKCdidXR0b24nLCBbJ2NsaWNrJ10sIGV2ID0+IHtcbiAgICAgICAgICAgIHRoaXMuY29udGVudCh4LCBldik7XG4gICAgICAgICAgICByZXR1cm4gZXYgIT09IHVuZGVmaW5lZDtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuXG4gICAgc2VsZWN0KHZhbHVlLCBibG9jaykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIGZ1bmN0aW9uIG9wdGlvbihvcHRWYWx1ZSwgbGFiZWwpIHtcbiAgICAgICAgICAgIHZhciBhdHRycyA9IHt2YWx1ZTogb3B0VmFsdWV9O1xuICAgICAgICAgICAgaWYgKG9wdFZhbHVlID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGF0dHJzWydzZWxlY3RlZCddID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxhYmVsID0gbGFiZWwgfHwgb3B0VmFsdWU7XG4gICAgICAgICAgICByZXR1cm4gc2VsZi5hdHRycyhhdHRycykud2l0aEVsZW1lbnQoJ29wdGlvbicsICgpID0+IHNlbGYudGV4dChsYWJlbCkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcy5vbignc2VsZWN0JywgWydjaGFuZ2UnXSwgZXYgPT4ge1xuICAgICAgICAgICAgYmxvY2sob3B0aW9uKTtcbiAgICAgICAgICAgIHJldHVybiBldiAgXG4gICAgICAgICAgICAgICAgPyBldi50YXJnZXQub3B0aW9uc1tldi50YXJnZXQuc2VsZWN0ZWRJbmRleF0udmFsdWVcbiAgICAgICAgICAgICAgICA6IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgcmFkaW9Hcm91cCh2YWx1ZSwgYmxvY2spIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICB2YXIgbmFtZSA9ICduYW1lJyArICh0aGlzLmlkcysrKTtcbiAgICAgICAgZnVuY3Rpb24gcmFkaW8ocmFkaW9WYWx1ZSwgbGFiZWwpIHtcbiAgICAgICAgICAgIHZhciBhdHRycyA9IHt0eXBlOiAncmFkaW8nLCBuYW1lOiBuYW1lfTtcbiAgICAgICAgICAgIGlmIChyYWRpb1ZhbHVlID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGF0dHJzWydjaGVja2VkJ10gPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYXR0cnMub25Nb3VudCA9IGZ1bmN0aW9uIChlbHQpIHtcbiAgICAgICAgICAgICAgICBlbHQuY2hlY2tlZCA9IChyYWRpb1ZhbHVlID09PSB2YWx1ZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMub24oJ2xhYmVsJywgW10sICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmF0dHJzKGF0dHJzKS5vbignaW5wdXQnLCBbJ2NsaWNrJ10sIGV2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSByYWRpb1ZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByYWRpb1ZhbHVlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMudGV4dChsYWJlbCB8fCByYWRpb1ZhbHVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmFkaW9WYWx1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBibG9jayhyYWRpbyk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLy8gbGFiZWwodHh0KSB7XG4gICAgLy8gICAgICAgICAvLyBGSVhNRTogdGhpcyBpcyBleHRyZW1lbHkgYnJpdHRsZS5cbiAgICAvLyAgICAgICAgIHZhciBpZCA9ICdpZCcgKyAodGhpcy5pZHMgKyAxKTsgLy8gTkI6IG5vdCArKyAhIVxuICAgIC8vICAgICAgICAgcmV0dXJuIHRoaXMuYXR0cignZm9yJywgaWQpLndpdGhFbGVtZW50KCdsYWJlbCcsICgpID0+IHRoaXMudGV4dCh0eHQpKTtcbiAgICAvLyB9XG5cbiAgICBhZGRJbnB1dEVsZW1lbnRzKCkge1xuICAgICAgICB2YXIgYmFzaWNJbnB1dHMgPSB7XG4gICAgICAgICAgICBzcGluQm94OiB7dHlwZTogJ251bWJlcicsIGV2ZW50OiAnaW5wdXQnfSxcbiAgICAgICAgICAgIHNsaWRlcjoge3R5cGU6ICdyYW5nZScsIGV2ZW50OiAnaW5wdXQnfSxcbiAgICAgICAgICAgIGVtYWlsQm94OiB7dHlwZTogJ2VtYWlsJywgZXZlbnQ6ICdpbnB1dCd9LFxuICAgICAgICAgICAgc2VhcmNoQm94OiB7dHlwZTogJ3NlYXJjaCcsIGV2ZW50OiAnaW5wdXQnfSxcbiAgICAgICAgICAgIGRhdGVQaWNrZXI6IHt0eXBlOiAnZGF0ZScsIGV2ZW50OiAnY2hhbmdlJ30sXG4gICAgICAgICAgICBjb2xvclBpY2tlcjoge3R5cGU6ICdjb2xvcicsIGV2ZW50OiAnY2hhbmdlJ30sXG4gICAgICAgICAgICBkYXRlVGltZVBpY2tlcjoge3R5cGU6ICdkYXRldGltZScsIGV2ZW50OiAnY2hhbmdlJ30sXG4gICAgICAgICAgICBsb2NhbERhdGVUaW1lUGlja2VyOiB7dHlwZTogJ2RhdGV0aW1lLWxvY2FsJywgZXZlbnQ6ICdjaGFuZ2UnfSxcbiAgICAgICAgICAgIG1vbnRoUGlja2VyOiB7dHlwZTogJ3dlZWsnLCBldmVudDogJ2NoYW5nZSd9LFxuICAgICAgICAgICAgd2Vla1BpY2tlcjoge3R5cGU6ICd3ZWVrJywgZXZlbnQ6ICdjaGFuZ2UnfSxcbiAgICAgICAgICAgIHRpbWVQaWNrZXI6IHt0eXBlOiAndGltZScsIGV2ZW50OiAnY2hhbmdlJ31cbiAgICAgICAgfTtcbiAgICAgICAgZm9yICh2YXIgbmFtZSBpbiBiYXNpY0lucHV0cykge1xuICAgICAgICAgICAgaWYgKGJhc2ljSW5wdXRzLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgKG5hbWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW25hbWVdID0gdmFsdWUgPT4gdGhpc1xuICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHJzKHt0eXBlOiBiYXNpY0lucHV0c1tuYW1lXS50eXBlLCB2YWx1ZTogdmFsdWV9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLm9uKCdpbnB1dCcsIFtiYXNpY0lucHV0c1tuYW1lXS5ldmVudF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYgPT4gZXYgPyBldi50YXJnZXQudmFsdWUgOiB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSkobmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhZGRTaW1wbGVFbGVtZW50cygpIHtcbiAgICAgICAgLy8gQ3VycmVudGx5LCB0aGVzZSBkb24ndCBoYXZlIGV2ZW50cy5cbiAgICAgICAgWydhJywgJ3AnLCAnbGFiZWwnLCAnc3Ryb25nJywgJ2JyJywgJ3NwYW4nLCAnaDEnLCAnaDInLCAnaDMnLCAnaDQnLFxuICAgICAgICAgJ3NlY3Rpb24nLCAnZGl2JywgJ3VsJywgJ29sJywgJ2xpJywgJ2hlYWRlcicsICdmb290ZXInLCAnY29kZScsICdwcmUnLFxuICAgICAgICAgJ2RsJywgJ2R0JywgJ2RkJywgJ2ZpZWxkc2V0JywgJ3RhYmxlJywgJ3RkJywgJ3RyJywgJ3RoJywgJ2NvbCcsICd0aGVhZCddXG4gICAgICAgICAgICAuZm9yRWFjaChlbHQgPT4gXG4gICAgICAgICAgICAgICAgICAgICAoZWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW2VsdF0gPSB4ID0+IHRoaXMud2l0aEVsZW1lbnQoZWx0LCAoKSA9PiB0aGlzLmNvbnRlbnQoeCkpO1xuICAgICAgICAgICAgICAgICAgICAgfSkoZWx0KSk7XG4gICAgfVxuICAgIFxufVxuXG5cbi8qXG5cbiBUaGUgZm9sbG93aW5nIGZ1bmN0aW9ucyBkb24ndCBhY2Nlc3MgVHJpbUdVSSBzdGF0ZSwgYnV0IHNpbXBseVxuIHBhdGNoIHRoZSByZWFsIGRvbSAoMXN0IGFyZykgYmFzZWQgb24gdGhlIHZkb20gKDJuZCBhcmcpLlxuXG4gdmRvbSBlbGVtZW50XG4ge3RhZzpcbiBhdHRyczoge30gZXRjLlxuIGtpZHM6IFtdIH1cblxuICovXG5cbmZ1bmN0aW9uIGNvbXBhdChkLCB2KSB7XG4gICAgLy9jb25zb2xlLmxvZygnQ29tcGF0PyAnKTtcbiAgICAvL2NvbnNvbGUubG9nKCdkID0gJyArIGQubm9kZVZhbHVlKTtcbiAgICAvL2NvbnNvbGUubG9nKCd2ID0gJyArIEpTT04uc3RyaW5naWZ5KHYpKTtcbiAgICByZXR1cm4gKGQubm9kZVR5cGUgPT09IE5vZGUuVEVYVF9OT0RFICYmICh0eXBlb2YgdiAhPT0gJ29iamVjdCcpKVxuICAgICAgICB8fCAoZC50YWdOYW1lID09PSB2LnRhZy50b1VwcGVyQ2FzZSgpKTtcbn1cblxuXG5mdW5jdGlvbiByZWNvbmNpbGUoZG9tLCB2ZG9tKSB7XG4gICAgaWYgKCFjb21wYXQoZG9tLCB2ZG9tKSkge1xuICAgICAgICB0aHJvdyAnQ2FuIG9ubHkgcmVjb25jaWxlIGNvbXBhdGlibGUgbm9kZXMnO1xuICAgIH1cbiAgICBcbiAgICAvLyBUZXh0IG5vZGVzXG4gICAgaWYgKHR5cGVvZiB2ZG9tICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBpZiAoZG9tLm5vZGVWYWx1ZSAhPT0gdmRvbSkge1xuICAgICAgICAgICAgZG9tLm5vZGVWYWx1ZSA9IHZkb20udG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG5cbiAgICAvLyBFbGVtZW50IG5vZGVzXG4gICAgdmFyIHZhdHRycyA9IHZkb20uYXR0cnMgfHwge307XG4gICAgZm9yICh2YXIgdmF0dHIgaW4gdmF0dHJzKSB7XG4gICAgICAgIGlmICh2YXR0cnMuaGFzT3duUHJvcGVydHkodmF0dHIpKSB7XG4gICAgICAgICAgICBpZiAoZG9tLmhhc0F0dHJpYnV0ZSh2YXR0cikpIHtcbiAgICAgICAgICAgICAgICB2YXIgZGF0dHIgPSBkb20uZ2V0QXR0cmlidXRlKHZhdHRyKTtcbiAgICAgICAgICAgICAgICBpZiAoZGF0dHIgIT09IHZhdHRyc1t2YXR0cl0udG9TdHJpbmcoKSkgeyBcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnVXBkYXRpbmcgYXR0cmlidXRlOiAnICsgdmF0dHIgKyAnID0gJyArIHZhdHRyc1t2YXR0cl0pO1xuICAgICAgICAgICAgICAgICAgICBkb20uc2V0QXR0cmlidXRlKHZhdHRyLCB2YXR0cnNbdmF0dHJdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdBZGRpbmcgYXR0cmlidXRlOiAnICsgdmF0dHIgKyAnID0gJyArIHZhdHRyc1t2YXR0cl0pO1xuICAgICAgICAgICAgICAgIGRvbS5zZXRBdHRyaWJ1dGUodmF0dHIsIHZhdHRyc1t2YXR0cl0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZG9tLmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGRhdHRyID0gZG9tLmF0dHJpYnV0ZXNbaV07XG4gICAgICAgIGlmICghdmF0dHJzLmhhc093blByb3BlcnR5KGRhdHRyLm5vZGVOYW1lKSkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnUmVtb3ZpbmcgYXR0cmlidXRlOiAnICsgZGF0dHIubm9kZU5hbWUpO1xuICAgICAgICAgICAgZG9tLnJlbW92ZUF0dHJpYnV0ZShkYXR0ci5ub2RlTmFtZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZWNvbmNpbGVLaWRzKGRvbSwgZG9tLmNoaWxkTm9kZXMsIHZkb20ua2lkcyk7XG59XG5cbmZ1bmN0aW9uIHJlY29uY2lsZUtpZHMoZG9tLCBka2lkcywgdmtpZHMpIHtcbiAgICB2YXIgbGVuID0gTWF0aC5taW4oZGtpZHMubGVuZ3RoLCB2a2lkcy5sZW5ndGgpO1xuICAgIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIGRraWQgPSBka2lkc1tpXTtcbiAgICAgICAgdmFyIHZraWQgPSB2a2lkc1tpXTtcbiAgICAgICAgaWYgKGNvbXBhdChka2lkLCB2a2lkKSkge1xuICAgICAgICAgICAgcmVjb25jaWxlKGRraWQsIHZraWQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnUmVwbGFjaW5nIGNoaWxkJyk7XG4gICAgICAgICAgICBkb20ucmVwbGFjZUNoaWxkKGJ1aWxkKHZraWQpLCBka2lkKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBpZiAoZGtpZHMubGVuZ3RoID4gbGVuKSB7XG4gICAgICAgIHdoaWxlIChka2lkcy5sZW5ndGggPiBsZW4pIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ1JlbW92aW5nIGNoaWxkICcpO1xuICAgICAgICAgICAgZG9tLnJlbW92ZUNoaWxkKGRraWRzW2xlbl0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHZraWRzLmxlbmd0aCA+IGxlbikge1xuICAgICAgICBmb3IgKHZhciBpID0gbGVuOyBpIDwgdmtpZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ0FwcGVuZGluZyBuZXcgY2hpbGQgJyk7XG4gICAgICAgICAgICBkb20uYXBwZW5kQ2hpbGQoYnVpbGQodmtpZHNbaV0pKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gYnVpbGQodmRvbSkge1xuICAgIGlmICh2ZG9tID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB2ZG9tICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodmRvbS50b1N0cmluZygpKTtcbiAgICB9XG4gICAgXG4gICAgdmFyIGVsdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodmRvbS50YWcpO1xuICAgIHZhciB2YXR0cnMgPSB2ZG9tLmF0dHJzIHx8IHt9O1xuICAgIGZvciAodmFyIGsgaW4gdmF0dHJzKSB7XG4gICAgICAgIGlmICh2YXR0cnMuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgIGVsdC5zZXRBdHRyaWJ1dGUoaywgdmF0dHJzW2tdKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZkb20ua2lkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBlbHQuYXBwZW5kQ2hpbGQoYnVpbGQodmRvbS5raWRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBlbHQ7ICAgIFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRyaW1HVUk7XG5cbiJdfQ==
