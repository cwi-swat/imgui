!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.app=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){


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


},{}],2:[function(require,module,exports){
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


const IMGUI = require('../../libimgui');

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

},{"../../libimgui":1}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4uL2xpYmltZ3VpL2xpYmltZ3VpLmpzIiwianMvYXBwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMWdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuXG4ndXNlIHN0cmljdCc7XG5cbi8qXG4gKiBUT0RPOlxuICogLSBkb24ndCBidWlsZCB2bm9kZSB3aGVuIGhhbmRsaW5nIGV2ZW50LlxuICogLSBlbGltaW5hdGUgdHJ5LWZpbmFsbHkgZm9yIHBlcmZcbiAqIC0gbWFrZSBgaGVyZWAgbW9yZSByb2J1c3RcbiAqIC0gb3B0aW1pemUgdXNlIG9mIGlkcyBpbiBsaXN0c1xuICogLSBlbGltaW5hdGUgLmNsYXNzLyNpZCBwYXJzaW5nXG4gKiAtIHN1cHBvcnQga2V5LWJhc2VkIHBhdGNoaW5nIChhdHRyIGBrZXlgKVxuICovXG5cbmNsYXNzIFRyaW1HVUkge1xuICAgIGNvbnN0cnVjdG9yIChhcHAsIG1vZGVsLCByb290KSB7XG4gICAgICAgIHRoaXMuYXBwID0gYXBwO1xuICAgICAgICB0aGlzLm1vZGVsID0gbW9kZWw7XG4gICAgICAgIHRoaXMucm9vdCA9IHJvb3Q7XG4gICAgICAgIHRoaXMuZXZlbnQgPSBudWxsO1xuICAgICAgICB0aGlzLmZvY3VzID0gW107XG4gICAgICAgIHRoaXMubm9kZSA9IG51bGw7XG4gICAgICAgIHRoaXMub25Nb3VudHMgPSB7fTtcbiAgICAgICAgdGhpcy50aW1lcnMgPSB7fTtcbiAgICAgICAgdGhpcy5oYW5kbGVycyA9IHt9O1xuICAgICAgICB0aGlzLmlkcyA9IDA7XG4gICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IHt9O1xuICAgICAgICB0aGlzLnJvdXRlID0gZG9jdW1lbnQubG9jYXRpb24uaGFzaDtcbiAgICAgICAgdGhpcy5hZGRTaW1wbGVFbGVtZW50cygpO1xuICAgICAgICB0aGlzLmFkZElucHV0RWxlbWVudHMoKTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3N0b3JhZ2UnLCB0aGlzLmRlYWxXaXRoSXQsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBydW4oKSB7XG4gICAgICAgIHRoaXMubW91bnQodGhpcy5yZW5kZXJPbmNlKCkpO1xuICAgIH1cbiAgICBcbiAgICByZWdpc3RlcihldmVudCwgaWQpIHtcbiAgICAgICAgLy8gb25seSBhZGQgb25lIGhhbmRsZXIgdG8gcm9vdCwgcGVyIGV2ZW50IHR5cGUuXG4gICAgICAgIGlmICghdGhpcy5oYW5kbGVycy5oYXNPd25Qcm9wZXJ0eShldmVudCkpIHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlcnNbZXZlbnRdID0gW107XG4gICAgICAgICAgICB2YXIgciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMucm9vdCk7XG4gICAgICAgICAgICByLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGUgPT4ge1xuICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIGRvbid0IGxlYWsgdXB3YXJkc1xuICAgICAgICAgICAgICAgIHZhciBpZCA9IGUudGFyZ2V0LmdldEF0dHJpYnV0ZSgnaWQnKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5oYW5kbGVyc1tldmVudF0uaW5kZXhPZihpZCkgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmV2ZW50ID0gZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kb1JlbmRlcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmhhbmRsZXJzW2V2ZW50XS5wdXNoKGlkKTtcbiAgICB9XG5cbiAgICByZXNldCgpIHtcbiAgICAgICAgZm9yICh2YXIgayBpbiB0aGlzLmhhbmRsZXJzKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5oYW5kbGVycy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlcnNba10gPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9uTW91bnRzID0ge307XG4gICAgICAgIHRoaXMuZm9jdXMgPSBbXTtcbiAgICAgICAgdGhpcy5pZHMgPSAwO1xuICAgIH1cblxuICAgIHJlbmRlck9uY2UoKSB7XG4gICAgICAgIHRoaXMucmVzZXQoKTtcbiAgICAgICAgdGhpcy5hcHAodGhpcy5tb2RlbCk7XG4gICAgfVxuXG4gICAgZG9SZW5kZXIoKSB7XG4gICAgICAgIC8vIHR3aWNlOiBvbmUgdG8gaGFuZGxlIGV2ZW50LCBvbmUgdG8gc3luYyB2aWV3LlxuICAgICAgICB2YXIgXyA9IHRoaXMucmVuZGVyT25jZSgpO1xuICAgICAgICB2YXIgbm9kZSA9IHRoaXMucmVuZGVyT25jZSgpO1xuICAgICAgICB0aGlzLm1vdW50KG5vZGUpO1xuICAgIH1cblxuICAgIG1vdW50KG5vZGUpIHtcbiAgICAgICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMucm9vdCk7XG4gICAgICAgIGlmICh0aGlzLm5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlY29uY2lsZUtpZHMoY29udGFpbmVyLCBjb250YWluZXIuY2hpbGROb2RlcywgdGhpcy5mb2N1cyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB3aGlsZSAoY29udGFpbmVyLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICBjb250YWluZXIucmVtb3ZlQ2hpbGQoY29udGFpbmVyLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmZvY3VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGJ1aWxkKHRoaXMuZm9jdXNbaV0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLm5vZGUgPSBub2RlO1xuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gdGhpcy5vbk1vdW50cykge1xuICAgICAgICAgICAgaWYgKHRoaXMub25Nb3VudHMuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRvU29tZXRoaW5nID0gdGhpcy5vbk1vdW50c1tpZF07XG4gICAgICAgICAgICAgICAgdmFyIGVsdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcbiAgICAgICAgICAgICAgICBkb1NvbWV0aGluZyhlbHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgIH1cblxuICAgIGRlYWxXaXRoSXQoZSkge1xuICAgICAgICB0aGlzLmV2ZW50ID0gZTtcbiAgICAgICAgdGhpcy5kb1JlbmRlcigpO1xuICAgIH1cblxuXG4gICAgYXR0cnMoYXMpIHtcbiAgICAgICAgZm9yICh2YXIgYSBpbiBhcykge1xuICAgICAgICAgICAgaWYgKGFzLmhhc093blByb3BlcnR5KGEpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzW2FdID0gYXNbYV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgZW5Sb3V0ZShoYXNoLCBibG9jaykge1xuICAgICAgICBpZiAoIXRoaXMucm91dGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5yb3V0ZSA9PT0gaGFzaCkge1xuICAgICAgICAgICAgdGhpcy5yb3V0ZSA9IHVuZGVmaW5lZDsgLy8gb25seSBydW4gb25jZS5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBvblN0b3JhZ2UoYmxvY2spIHtcbiAgICAgICAgdmFyIGV2ZW50ID0gdGhpcy5ldmVudDtcbiAgICAgICAgaWYgKGV2ZW50ICYmIGV2ZW50LnR5cGUgPT09ICdzdG9yYWdlJykge1xuICAgICAgICAgICAgdGhpcy5ldmVudCA9IHVuZGVmaW5lZDsgXG4gICAgICAgICAgICBibG9jayhldmVudCk7IFxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIG9uKGVsdCwgZXZlbnRzLCBibG9jaykge1xuICAgICAgICB2YXIgaWQgPSB0aGlzLmF0dHJpYnV0ZXNbJ2lkJ10gfHwgKCdpZCcgKyB0aGlzLmlkcysrKTtcbiAgICAgICAgZXZlbnRzLmZvckVhY2goZSA9PiB0aGlzLnJlZ2lzdGVyKGUsIGlkKSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcy5pZChpZCkud2l0aEVsZW1lbnQoZWx0LCAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgZXZlbnQgPSB0aGlzLmV2ZW50O1xuICAgICAgICAgICAgaWYgKGV2ZW50ICYmIGV2ZW50LnRhcmdldC5nZXRBdHRyaWJ1dGUoJ2lkJykgPT09IGlkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudCA9IHVuZGVmaW5lZDsgLy8gbWF5YmUgZG8gaW4gdG9wbGV2ZWw/Pz9cbiAgICAgICAgICAgICAgICByZXR1cm4gYmxvY2soZXZlbnQpOyAvLyBsZXQgaXQgYmUgaGFuZGxlZFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGJsb2NrKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHdpdGhFbGVtZW50KGVsdCwgZnVuYywgZXZzKSB7XG4gICAgICAgIC8vIFRPRE86IGlmIHRoaXMucHJldGVuZCwgZG9uJ3QgYnVpbGQgdm5vZGVzXG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLmZvY3VzO1xuICAgICAgICB0aGlzLmZvY3VzID0gW107XG5cbiAgICAgICAgLy8gQ29weSB0aGUgY3VycmVudCBhdHRyaWJ1dGUgc2V0XG4gICAgICAgIHZhciBteUF0dHJzID0ge307XG4gICAgICAgIGZvciAodmFyIGEgaW4gdGhpcy5hdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5hdHRyaWJ1dGVzLmhhc093blByb3BlcnR5KGEpKSB7XG4gICAgICAgICAgICAgICAgbXlBdHRyc1thXSA9IHRoaXMuYXR0cmlidXRlc1thXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmF0dHJpYnV0ZXMgPSB7fTsgLy8ga2lkcyBkb24ndCBpbmhlcml0IGF0dHJzLlxuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jKCk7XG4gICAgICAgIH1cbiAgICAgICAgZmluYWxseSB7XG4gICAgICAgICAgICBpZiAobXlBdHRycyAmJiBteUF0dHJzLm9uTW91bnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uTW91bnRzW215QXR0cnNbJ2lkJ11dID0gbXlBdHRycy5vbk1vdW50O1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBteUF0dHJzLm9uTW91bnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgdm5vZGUgPSB7dGFnOiBlbHQsIGF0dHJzOiBteUF0dHJzLCBraWRzOiB0aGlzLmZvY3VzfTtcbiAgICAgICAgICAgIHBhcmVudC5wdXNoKHZub2RlKTtcbiAgICAgICAgICAgIHRoaXMuZm9jdXMgPSBwYXJlbnQ7XG4gICAgICAgIH0gICAgXG4gICAgfVxuXG5cbiAgICBoZXJlKGZ1bmMsIGJsb2NrKSB7XG4gICAgICAgIHZhciBwb3MgPSB0aGlzLmZvY3VzLmxlbmd0aDtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICByZXR1cm4gYmxvY2soZnVuY3Rpb24gKCkgeyAvLyBiZWNhdXNlIGFyZ3VtZW50cy5cbiAgICAgICAgICAgIHZhciBwYXJlbnQgPSBzZWxmLmZvY3VzO1xuICAgICAgICAgICAgc2VsZi5mb2N1cyA9IFtdO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuYy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmluYWxseSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLmZvY3VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudC5zcGxpY2UocG9zICsgaSwgMCwgc2VsZi5mb2N1c1tpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNlbGYuZm9jdXMgPSBwYXJlbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgY29udGVudChjLCBldikge1xuICAgICAgICBpZiAodHlwZW9mIGMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGMuYXBwbHkodW5kZWZpbmVkLCBldik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBjID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhpcy50ZXh0KGMpO1xuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICB0ZXh0KHR4dCkge1xuICAgICAgICB0aGlzLmZvY3VzLnB1c2godHh0KTtcbiAgICB9XG5cbiAgICBuZXh0SWQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmlkcyArIDE7XG4gICAgfVxuICAgIFxuICAgIFxuICAgIC8vIGNvbnZlbmllbmNlXG5cbiAgICBhdHRyKG4sIHgpIHtcbiAgICAgICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICBvYmpbbl0gPSB4O1xuICAgICAgICByZXR1cm4gdGhpcy5hdHRycyhvYmopO1xuICAgIH1cblxuICAgIGF0dHJJZihjLCBuLCB4KSB7XG4gICAgICAgIGlmIChjKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hdHRyKG4sIHgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBcbiAgICBrbGFzcyh4KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmF0dHIoJ2NsYXNzJywgeCk7XG4gICAgfVxuXG4gICAgaWQoeCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hdHRyKCdpZCcsIHgpO1xuICAgIH1cblxuICAgIHRleHRhcmVhKHgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub24oJ3RleHRhcmVhJywgWydrZXl1cCcsICdibHVyJ10sIGV2ID0+IHtcbiAgICAgICAgICAgIHZhciBuZXdWYWx1ZSA9IGV2ID8gZXYudGFyZ2V0LnZhbHVlIDogdmFsdWU7XG4gICAgICAgICAgICB0aGlzLmNvbnRlbnQoeCwgZXYpO1xuICAgICAgICAgICAgcmV0dXJuIG5ld1ZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgdGV4dEJveCh2YWx1ZSkge1xuICAgICAgICB2YXIgYXR0cnMgPSB7dHlwZTogJ3RleHQnLCB2YWx1ZTogdmFsdWV9O1xuICAgICAgICBhdHRycy5vbk1vdW50ID0gZWx0ID0+IHtcbiAgICAgICAgICAgICAgICBlbHQudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzLmF0dHJzKGF0dHJzKS5vbignaW5wdXQnLCBbJ2lucHV0J10sIGV2ID0+IHtcbiAgICAgICAgICAgIHJldHVybiBldiA/IGV2LnRhcmdldC52YWx1ZSA6IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjaGVja0JveCh2YWx1ZSkge1xuICAgICAgICB2YXIgYXR0cnMgPSBhdHRycyB8fCB7fTtcbiAgICAgICAgYXR0cnMudHlwZSA9ICdjaGVja2JveCc7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgYXR0cnMuY2hlY2tlZCA9ICd0cnVlJztcbiAgICAgICAgfVxuICAgICAgICBhdHRycy5vbk1vdW50ID0gZWx0ID0+IHtcbiAgICAgICAgICAgIGVsdC5jaGVja2VkID0gdmFsdWU7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcy5hdHRycyhhdHRycykub24oJ2lucHV0JywgWydjbGljayddLCBldiA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZXYgPyBldi50YXJnZXQuY2hlY2tlZCA6IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9XG5cblxuICAgIGFmdGVyKGlkLCBkZWxheSkge1xuICAgICAgICBpZiAodGhpcy50aW1lcnMuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50aW1lcnNbaWRdO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50aW1lcnNbaWRdID0gZmFsc2U7XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW2lkXSA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLmRvUmVuZGVyKCk7XG4gICAgICAgIH0sIGRlbGF5KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG5cbiAgICBhY2xpY2soeCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vbignYScsIFsnY2xpY2snXSwgZXYgPT4ge1xuICAgICAgICAgICAgdGhpcy5jb250ZW50KHgsIGV2KTtcbiAgICAgICAgICAgIHJldHVybiBldiAhPT0gdW5kZWZpbmVkO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgYnV0dG9uKHgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub24oJ2J1dHRvbicsIFsnY2xpY2snXSwgZXYgPT4ge1xuICAgICAgICAgICAgdGhpcy5jb250ZW50KHgsIGV2KTtcbiAgICAgICAgICAgIHJldHVybiBldiAhPT0gdW5kZWZpbmVkO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG5cbiAgICBzZWxlY3QodmFsdWUsIGJsb2NrKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIGlkeCA9IC0xO1xuICAgICAgICB2YXIgc2VsZWN0ZWQgPSAtMTtcbiAgICAgICAgZnVuY3Rpb24gb3B0aW9uKG9wdFZhbHVlLCBsYWJlbCkge1xuICAgICAgICAgICAgdmFyIGF0dHJzID0ge3ZhbHVlOiBvcHRWYWx1ZX07XG4gICAgICAgICAgICBpZHgrKztcbiAgICAgICAgICAgIGlmIChvcHRWYWx1ZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBzZWxlY3RlZCA9IGlkeDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxhYmVsID0gbGFiZWwgfHwgb3B0VmFsdWU7XG4gICAgICAgICAgICByZXR1cm4gc2VsZi5hdHRycyhhdHRycykud2l0aEVsZW1lbnQoJ29wdGlvbicsICgpID0+IHNlbGYudGV4dChsYWJlbCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgXG4gICAgICAgIHZhciBteUF0dHJzID0ge29uTW91bnQ6IGVsdCA9PiB7XG4gICAgICAgICAgICBlbHQuc2VsZWN0ZWRJbmRleCA9IHNlbGVjdGVkO1xuICAgICAgICB9fTtcblxuICAgICAgICByZXR1cm4gdGhpcy5hdHRycyhteUF0dHJzKS5vbignc2VsZWN0JywgWydjaGFuZ2UnXSwgZXYgPT4ge1xuICAgICAgICAgICAgYmxvY2sob3B0aW9uKTtcbiAgICAgICAgICAgIHJldHVybiBldiAgXG4gICAgICAgICAgICAgICAgPyBldi50YXJnZXQub3B0aW9uc1tldi50YXJnZXQuc2VsZWN0ZWRJbmRleF0udmFsdWVcbiAgICAgICAgICAgICAgICA6IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgcmFkaW9Hcm91cCh2YWx1ZSwgYmxvY2spIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICB2YXIgbmFtZSA9ICduYW1lJyArICh0aGlzLmlkcysrKTtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBmdW5jdGlvbiByYWRpbyhyYWRpb1ZhbHVlLCBsYWJlbCkge1xuICAgICAgICAgICAgdmFyIGF0dHJzID0ge3R5cGU6ICdyYWRpbycsIG5hbWU6IG5hbWV9O1xuICAgICAgICAgICAgaWYgKHJhZGlvVmFsdWUgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYXR0cnNbJ2NoZWNrZWQnXSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhdHRycy5vbk1vdW50ID0gZWx0ID0+IHtcbiAgICAgICAgICAgICAgICBlbHQuY2hlY2tlZCA9IChyYWRpb1ZhbHVlID09PSB2YWx1ZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIHNlbGYub24oJ2xhYmVsJywgW10sICgpID0+IHtcbiAgICAgICAgICAgICAgICBzZWxmLmF0dHJzKGF0dHJzKS5vbignaW5wdXQnLCBbJ2NsaWNrJ10sIGV2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSByYWRpb1ZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByYWRpb1ZhbHVlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHNlbGYudGV4dChsYWJlbCB8fCByYWRpb1ZhbHVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmFkaW9WYWx1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBibG9jayhyYWRpbyk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLy8gbGFiZWwodHh0KSB7XG4gICAgLy8gICAgICAgICAvLyBGSVhNRTogdGhpcyBpcyBleHRyZW1lbHkgYnJpdHRsZS5cbiAgICAvLyAgICAgICAgIHZhciBpZCA9ICdpZCcgKyAodGhpcy5pZHMgKyAxKTsgLy8gTkI6IG5vdCArKyAhIVxuICAgIC8vICAgICAgICAgcmV0dXJuIHRoaXMuYXR0cignZm9yJywgaWQpLndpdGhFbGVtZW50KCdsYWJlbCcsICgpID0+IHRoaXMudGV4dCh0eHQpKTtcbiAgICAvLyB9XG5cbiAgICBhZGRJbnB1dEVsZW1lbnRzKCkge1xuICAgICAgICB2YXIgYmFzaWNJbnB1dHMgPSB7XG4gICAgICAgICAgICBzcGluQm94OiB7dHlwZTogJ251bWJlcicsIGV2ZW50OiAnaW5wdXQnfSxcbiAgICAgICAgICAgIHNsaWRlcjoge3R5cGU6ICdyYW5nZScsIGV2ZW50OiAnaW5wdXQnfSxcbiAgICAgICAgICAgIGVtYWlsQm94OiB7dHlwZTogJ2VtYWlsJywgZXZlbnQ6ICdpbnB1dCd9LFxuICAgICAgICAgICAgc2VhcmNoQm94OiB7dHlwZTogJ3NlYXJjaCcsIGV2ZW50OiAnaW5wdXQnfSxcbiAgICAgICAgICAgIGRhdGVQaWNrZXI6IHt0eXBlOiAnZGF0ZScsIGV2ZW50OiAnY2hhbmdlJ30sXG4gICAgICAgICAgICBjb2xvclBpY2tlcjoge3R5cGU6ICdjb2xvcicsIGV2ZW50OiAnY2hhbmdlJ30sXG4gICAgICAgICAgICBkYXRlVGltZVBpY2tlcjoge3R5cGU6ICdkYXRldGltZScsIGV2ZW50OiAnY2hhbmdlJ30sXG4gICAgICAgICAgICBsb2NhbERhdGVUaW1lUGlja2VyOiB7dHlwZTogJ2RhdGV0aW1lLWxvY2FsJywgZXZlbnQ6ICdjaGFuZ2UnfSxcbiAgICAgICAgICAgIG1vbnRoUGlja2VyOiB7dHlwZTogJ3dlZWsnLCBldmVudDogJ2NoYW5nZSd9LFxuICAgICAgICAgICAgd2Vla1BpY2tlcjoge3R5cGU6ICd3ZWVrJywgZXZlbnQ6ICdjaGFuZ2UnfSxcbiAgICAgICAgICAgIHRpbWVQaWNrZXI6IHt0eXBlOiAndGltZScsIGV2ZW50OiAnY2hhbmdlJ31cbiAgICAgICAgfTtcbiAgICAgICAgZm9yICh2YXIgbmFtZSBpbiBiYXNpY0lucHV0cykge1xuICAgICAgICAgICAgaWYgKGJhc2ljSW5wdXRzLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgKG5hbWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW25hbWVdID0gdmFsdWUgPT4gdGhpc1xuICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHJzKHt0eXBlOiBiYXNpY0lucHV0c1tuYW1lXS50eXBlLCB2YWx1ZTogdmFsdWV9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLm9uKCdpbnB1dCcsIFtiYXNpY0lucHV0c1tuYW1lXS5ldmVudF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYgPT4gZXYgPyBldi50YXJnZXQudmFsdWUgOiB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSkobmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhZGRTaW1wbGVFbGVtZW50cygpIHtcbiAgICAgICAgLy8gQ3VycmVudGx5LCB0aGVzZSBkb24ndCBoYXZlIGV2ZW50cy5cbiAgICAgICAgWydhJywgJ3AnLCAnbGFiZWwnLCAnc3Ryb25nJywgJ2JyJywgJ3NwYW4nLCAnaDEnLCAnaDInLCAnaDMnLCAnaDQnLFxuICAgICAgICAgJ3NlY3Rpb24nLCAnZGl2JywgJ3VsJywgJ29sJywgJ2xpJywgJ2hlYWRlcicsICdmb290ZXInLCAnY29kZScsICdwcmUnLFxuICAgICAgICAgJ2RsJywgJ2R0JywgJ2RkJywgJ2ZpZWxkc2V0JywgJ3RhYmxlJywgJ3RkJywgJ3RyJywgJ3RoJywgJ2NvbCcsICd0aGVhZCddXG4gICAgICAgICAgICAuZm9yRWFjaChlbHQgPT4gXG4gICAgICAgICAgICAgICAgICAgICAoZWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW2VsdF0gPSB4ID0+IHRoaXMud2l0aEVsZW1lbnQoZWx0LCAoKSA9PiB0aGlzLmNvbnRlbnQoeCkpO1xuICAgICAgICAgICAgICAgICAgICAgfSkoZWx0KSk7XG4gICAgfVxuICAgIFxufVxuXG5cbi8qXG5cbiBUaGUgZm9sbG93aW5nIGZ1bmN0aW9ucyBkb24ndCBhY2Nlc3MgVHJpbUdVSSBzdGF0ZSwgYnV0IHNpbXBseVxuIHBhdGNoIHRoZSByZWFsIGRvbSAoMXN0IGFyZykgYmFzZWQgb24gdGhlIHZkb20gKDJuZCBhcmcpLlxuXG4gdmRvbSBlbGVtZW50XG4ge3RhZzpcbiBhdHRyczoge30gZXRjLlxuIGtpZHM6IFtdIH1cblxuICovXG5cbmZ1bmN0aW9uIGNvbXBhdChkLCB2KSB7XG4gICAgLy8gY29uc29sZS5sb2coJ0NvbXBhdD8gJyk7XG4gICAgLy8gY29uc29sZS5sb2coJ2QgPSAnICsgZC5ub2RlVmFsdWUpO1xuICAgIC8vIGNvbnNvbGUubG9nKCd2ID0gJyArIEpTT04uc3RyaW5naWZ5KHYpKTtcbiAgICByZXR1cm4gKGQubm9kZVR5cGUgPT09IE5vZGUuVEVYVF9OT0RFICYmICh0eXBlb2YgdiAhPT0gJ29iamVjdCcpKVxuICAgICAgICB8fCAoZC50YWdOYW1lID09PSB2LnRhZy50b1VwcGVyQ2FzZSgpKTtcbn1cblxuXG5mdW5jdGlvbiByZWNvbmNpbGUoZG9tLCB2ZG9tKSB7XG4gICAgaWYgKCFjb21wYXQoZG9tLCB2ZG9tKSkge1xuICAgICAgICB0aHJvdyAnQ2FuIG9ubHkgcmVjb25jaWxlIGNvbXBhdGlibGUgbm9kZXMnO1xuICAgIH1cbiAgICBcbiAgICAvLyBUZXh0IG5vZGVzXG4gICAgaWYgKHR5cGVvZiB2ZG9tICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBpZiAoZG9tLm5vZGVWYWx1ZSAhPT0gdmRvbSkge1xuICAgICAgICAgICAgZG9tLm5vZGVWYWx1ZSA9IHZkb20udG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG5cbiAgICAvLyBFbGVtZW50IG5vZGVzXG4gICAgdmFyIHZhdHRycyA9IHZkb20uYXR0cnMgfHwge307XG4gICAgZm9yICh2YXIgdmF0dHIgaW4gdmF0dHJzKSB7XG4gICAgICAgIGlmICh2YXR0cnMuaGFzT3duUHJvcGVydHkodmF0dHIpKSB7XG4gICAgICAgICAgICBpZiAoZG9tLmhhc0F0dHJpYnV0ZSh2YXR0cikpIHtcbiAgICAgICAgICAgICAgICBsZXQgZGF0dHIgPSBkb20uZ2V0QXR0cmlidXRlKHZhdHRyKTtcbiAgICAgICAgICAgICAgICBpZiAoZGF0dHIgIT09IHZhdHRyc1t2YXR0cl0udG9TdHJpbmcoKSkgeyBcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnVXBkYXRpbmcgYXR0cmlidXRlOiAnICsgdmF0dHIgKyAnID0gJyArIHZhdHRyc1t2YXR0cl0pO1xuICAgICAgICAgICAgICAgICAgICBkb20uc2V0QXR0cmlidXRlKHZhdHRyLCB2YXR0cnNbdmF0dHJdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdBZGRpbmcgYXR0cmlidXRlOiAnICsgdmF0dHIgKyAnID0gJyArIHZhdHRyc1t2YXR0cl0pO1xuICAgICAgICAgICAgICAgIGRvbS5zZXRBdHRyaWJ1dGUodmF0dHIsIHZhdHRyc1t2YXR0cl0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZG9tLmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbGV0IGRhdHRyID0gZG9tLmF0dHJpYnV0ZXNbaV07XG4gICAgICAgIGlmICghdmF0dHJzLmhhc093blByb3BlcnR5KGRhdHRyLm5vZGVOYW1lKSkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnUmVtb3ZpbmcgYXR0cmlidXRlOiAnICsgZGF0dHIubm9kZU5hbWUpO1xuICAgICAgICAgICAgZG9tLnJlbW92ZUF0dHJpYnV0ZShkYXR0ci5ub2RlTmFtZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZWNvbmNpbGVLaWRzKGRvbSwgZG9tLmNoaWxkTm9kZXMsIHZkb20ua2lkcyk7XG59XG5cbmZ1bmN0aW9uIHJlY29uY2lsZUtpZHMoZG9tLCBka2lkcywgdmtpZHMpIHtcbiAgICB2YXIgbGVuID0gTWF0aC5taW4oZGtpZHMubGVuZ3RoLCB2a2lkcy5sZW5ndGgpO1xuICAgIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIGRraWQgPSBka2lkc1tpXTtcbiAgICAgICAgdmFyIHZraWQgPSB2a2lkc1tpXTtcbiAgICAgICAgaWYgKGNvbXBhdChka2lkLCB2a2lkKSkge1xuICAgICAgICAgICAgcmVjb25jaWxlKGRraWQsIHZraWQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnUmVwbGFjaW5nIGNoaWxkJyk7XG4gICAgICAgICAgICBkb20ucmVwbGFjZUNoaWxkKGJ1aWxkKHZraWQpLCBka2lkKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBpZiAoZGtpZHMubGVuZ3RoID4gbGVuKSB7XG4gICAgICAgIHdoaWxlIChka2lkcy5sZW5ndGggPiBsZW4pIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ1JlbW92aW5nIGNoaWxkICcpO1xuICAgICAgICAgICAgZG9tLnJlbW92ZUNoaWxkKGRraWRzW2xlbl0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHZraWRzLmxlbmd0aCA+IGxlbikge1xuICAgICAgICBmb3IgKHZhciBpID0gbGVuOyBpIDwgdmtpZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ0FwcGVuZGluZyBuZXcgY2hpbGQgJyk7XG4gICAgICAgICAgICBkb20uYXBwZW5kQ2hpbGQoYnVpbGQodmtpZHNbaV0pKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gYnVpbGQodmRvbSkge1xuICAgIGlmICh2ZG9tID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB2ZG9tICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodmRvbS50b1N0cmluZygpKTtcbiAgICB9XG4gICAgXG4gICAgdmFyIGVsdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodmRvbS50YWcpO1xuICAgIHZhciB2YXR0cnMgPSB2ZG9tLmF0dHJzIHx8IHt9O1xuICAgIGZvciAodmFyIGsgaW4gdmF0dHJzKSB7XG4gICAgICAgIGlmICh2YXR0cnMuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgIGVsdC5zZXRBdHRyaWJ1dGUoaywgdmF0dHJzW2tdKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZkb20ua2lkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBlbHQuYXBwZW5kQ2hpbGQoYnVpbGQodmRvbS5raWRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBlbHQ7ICAgIFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRyaW1HVUk7XG5cbiIsIi8vIFRPRE9NViB1c2luZyBJTUdVSS5cblxuJ3VzZSBzdHJpY3QnO1xuXG4vLyBEYXRhIG1vZGVsXG5cblxuY29uc3QgU1RPUkFHRV9LRVkgPSAndG9kby1tdmMnO1xuXG5jbGFzcyBUb2RvcyB7ICAgIFxuICAgIGNvbnN0cnVjdG9yICgpIHtcbiAgICAgICAgdGhpcy50b2RvcyA9IFtdO1xuICAgICAgICB0aGlzLm5ld1RvZG8gPSAnJztcbiAgICAgICAgdGhpcy5maWx0ZXIgPSAnbm9uZSc7XG4gICAgICAgIHRoaXMuaWRzID0gMDtcbiAgICAgICAgdGhpcy5maWx0ZXJzID0ge1xuICAgICAgICAgICAgbm9uZTogeCA9PiB0cnVlLFxuICAgICAgICAgICAgYWN0aXZlOiB4ID0+ICF4LmNvbXBsZXRlZCxcbiAgICAgICAgICAgIGNvbXBsZXRlZDogeCA9PiB4LmNvbXBsZXRlZFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmxvYWQoKTtcbiAgICB9XG5cbiAgICB0b0pTT04oKSB7XG4gICAgICAgIHJldHVybiB7bmV3VG9kbzogdGhpcy5uZXdUb2RvLCBpZHM6IHRoaXMuaWRzLFxuICAgICAgICAgICAgICAgIHRvZG9zOiB0aGlzLnRvZG9zLm1hcCh0ID0+IHQudG9KU09OKCkpfTtcbiAgICB9XG4gICAgXG4gICAgbG9hZCgpIHtcbiAgICAgICAgdmFyIHR4dCA9IHdpbmRvdy5sb2NhbFN0b3JhZ2VbU1RPUkFHRV9LRVldO1xuICAgICAgICBpZiAodHh0KSB7XG4gICAgICAgICAgICB2YXIganNvbiA9IEpTT04ucGFyc2UodHh0KTtcbiAgICAgICAgICAgIHRoaXMuaWRzID0ganNvbi5pZHM7XG4gICAgICAgICAgICB0aGlzLm5ld1RvZG8gPSBqc29uLm5ld1RvZG87XG4gICAgICAgICAgICB0aGlzLnRvZG9zID0ganNvbi50b2Rvcy5tYXAodCA9PiBUb2RvLmZyb21KU09OKHRoaXMsIHQpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBwZXJzaXN0KCkge1xuICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlW1NUT1JBR0VfS0VZXSA9IEpTT04uc3RyaW5naWZ5KHRoaXMudG9KU09OKCkpO1xuICAgIH1cblxuICAgIGNyZWF0ZVRvZG8odmFsdWUpIHtcbiAgICAgICAgdmFyIHRvZG8gPSBuZXcgVG9kbyh2YWx1ZSwgdGhpcywgdGhpcy5pZHMrKyk7XG4gICAgICAgIHRoaXMudG9kb3MucHVzaCh0b2RvKTtcbiAgICB9XG5cbiAgICBkZWxldGVUb2RvKHRvZG8sIGlkeCkge1xuICAgICAgICBpZHggPSBpZHggfHwgdGhpcy50b2Rvcy5maW5kSW5kZXgoeCA9PiB4LmlkID09PSB0b2RvLmlkKTtcbiAgICAgICAgdGhpcy50b2Rvcy5zcGxpY2UoaWR4LCAxKTtcbiAgICB9XG5cbiAgICBjbGVhckNvbXBsZXRlZCgpIHtcbiAgICAgICAgbGV0IGogPSAwO1xuICAgICAgICBsZXQgbGVuID0gdGhpcy50b2Rvcy5sZW5ndGg7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIGxldCB0b2RvID0gdGhpcy50b2Rvc1tpIC0gal07XG4gICAgICAgICAgICBpZiAodG9kby5jb21wbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRlbGV0ZVRvZG8odG9kbywgaSAtIGopO1xuICAgICAgICAgICAgICAgIGorKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZpbHRlcmVkVG9kb3MoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRvZG9zLmZpbHRlcih0aGlzLmZpbHRlcnNbdGhpcy5maWx0ZXJdKTtcbiAgICB9XG4gICAgXG59XG5cbmNsYXNzIFRvZG8ge1xuICAgIGNvbnN0cnVjdG9yICh0ZXh0LCBtb2RlbCwgaWQpIHtcbiAgICAgICAgdGhpcy50ZXh0ID0gdGV4dDtcbiAgICAgICAgdGhpcy5jb21wbGV0ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5lZGl0aW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMubW9kZWwgPSBtb2RlbDtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgIH1cblxuICAgIHN0YXRpYyBmcm9tSlNPTihtb2RlbCwgb2JqKSB7XG4gICAgICAgIHZhciB0b2RvID0gbmV3IFRvZG8ob2JqLnRleHQsIG1vZGVsLCBvYmouaWQpO1xuICAgICAgICB0b2RvLmNvbXBsZXRlZCA9IG9iai5jb21wbGV0ZWQ7XG4gICAgICAgIHRvZG8uZWRpdGluZyA9IG9iai5lZGl0aW5nO1xuICAgICAgICByZXR1cm4gdG9kbztcbiAgICB9XG4gICAgXG4gICAgdG9KU09OKCkge1xuICAgICAgICByZXR1cm4ge3RleHQ6IHRoaXMudGV4dCxcbiAgICAgICAgICAgICAgICBjb21wbGV0ZWQ6IHRoaXMuY29tcGxldGVkLFxuICAgICAgICAgICAgICAgIGVkaXRpbmc6IHRoaXMuZWRpdGluZyxcbiAgICAgICAgICAgICAgICBpZDogdGhpcy5pZH07XG4gICAgfVxuXG4gICAgdXBkYXRlKHZhbHVlKSB7XG4gICAgICAgIGxldCB0eHQgPSB2YWx1ZS50cmltKCk7XG4gICAgICAgIGlmICh0eHQgIT09ICcnKSB7XG4gICAgICAgICAgICB0aGlzLnRleHQgPSB0eHQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIHRoaXMubW9kZWwuZGVsZXRlVG9kbyh0aGlzKTtcbiAgICB9XG4gICAgXG59XG5cblxuY29uc3QgSU1HVUkgPSByZXF1aXJlKCcuLi8uLi9saWJpbWd1aScpO1xuXG5jb25zdCB3bmQgPSBuZXcgSU1HVUkobWFpbiwgbmV3IFRvZG9zKCksICd0b2RvYXBwJyk7XG5cbmNvbnN0IEVOVEVSX0tFWSA9IDEzO1xuY29uc3QgRVNDQVBFX0tFWSA9IDI3O1xuXG5mdW5jdGlvbiBtYWluKG1vZGVsKSB7XG4gICAgaWYgKHduZC5lblJvdXRlKCcjL2FjdGl2ZScpKSB7XG4gICAgICAgIG1vZGVsLmZpbHRlciA9ICdhY3RpdmUnO1xuICAgIH1cbiAgICBlbHNlIGlmICh3bmQuZW5Sb3V0ZSgnIy9jb21wbGV0ZWQnKSkge1xuICAgICAgICBtb2RlbC5maWx0ZXIgPSAnY29tcGxldGVkJztcbiAgICB9XG4gICAgXG4gICAgd25kLmtsYXNzKCd0b2RvYXBwJykuc2VjdGlvbigoKSA9PiB7XG4gICAgICAgIHduZC5rbGFzcygnaGVhZGVyJykuaGVhZGVyKCgpID0+IHtcbiAgICAgICAgICAgIHduZC5oMSgndG9kb3MnKTtcbiAgICAgICAgICAgIG5ld1RvZG8obW9kZWwpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChtb2RlbC50b2Rvcy5sZW5ndGggPiAwICkge1xuICAgICAgICAgICAgbWFpblNlY3Rpb24obW9kZWwsIG1vZGVsLnRvZG9zKTtcbiAgICAgICAgICAgIGZvb3Rlcihtb2RlbCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBcbiAgICBtb2RlbC5wZXJzaXN0KCk7ICAgIFxufVxuXG5cbmZ1bmN0aW9uIG5ld1RvZG8obW9kZWwpIHtcbiAgICB2YXIgYXR0cnMgPSB7J2NsYXNzJzogJ25ldy10b2RvJywgdHlwZTogJ3RleHQnLCB2YWx1ZTogbW9kZWwubmV3VG9kbyxcbiAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6ICdXaGF0IG5lZWRzIHRvIGJlIGRvbmU/JyxcbiAgICAgICAgICAgICAgICAgb25Nb3VudDogZWx0ID0+IHtlbHQudmFsdWU9bW9kZWwubmV3VG9kbzt9fTtcbiAgICBcbiAgICB3bmQuYXR0cnMoYXR0cnMpLm9uKCdpbnB1dCcsIFsna2V5dXAnXSwgZXYgPT4ge1xuICAgICAgICBpZiAoZXYpIHtcbiAgICAgICAgICAgIGlmIChldi5rZXlDb2RlID09PSBFTlRFUl9LRVkpIHtcbiAgICAgICAgICAgICAgICBsZXQgdHh0ID0gZXYudGFyZ2V0LnZhbHVlLnRyaW0oKTtcbiAgICAgICAgICAgICAgICBpZiAodHh0ICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBtb2RlbC5jcmVhdGVUb2RvKGV2LnRhcmdldC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsLm5ld1RvZG8gPSAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChldi5rZXlDb2RlID09PSBFU0NBUEVfS0VZKSB7XG4gICAgICAgICAgICAgICAgbW9kZWwubmV3VG9kbyA9ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbW9kZWwubmV3VG9kbyA9IGV2LnRhcmdldC52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5cbmZ1bmN0aW9uIG1haW5TZWN0aW9uKG1vZGVsLCB0b2Rvcykge1xuICAgIHduZC5rbGFzcygnbWFpbicpLnNlY3Rpb24oKCkgPT4ge1xuICAgICAgICBpZiAod25kLmtsYXNzKCd0b2dnbGUtYWxsJykuY2hlY2tCb3goZmFsc2UpKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRvZG9zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdG9kb3NbaV0uY29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB3bmQuYXR0cignZm9yJywgJ3RvZ2dsZS1hbGwnKS5sYWJlbCgnTWFyayBhbGwgYXMgY29tcGxldGUnKTtcbiAgICAgICAgXG4gICAgICAgIHduZC5rbGFzcygndG9kby1saXN0JykudWwoKCkgPT4ge1xuICAgICAgICAgICAgbW9kZWwuZmlsdGVyZWRUb2RvcygpLmZvckVhY2goc2hvd1RvZG8pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBcbn1cblxuZnVuY3Rpb24gZmlsdGVyQnV0dG9uKG1vZGVsLCB0aXRsZSwgbmFtZSwgaGFzaCkge1xuICAgIGhhc2ggPSBoYXNoID09PSB1bmRlZmluZWQgPyBuYW1lIDogaGFzaDtcbiAgICB3bmQubGkoKCkgPT4ge1xuICAgICAgICBpZiAod25kLmF0dHJJZihtb2RlbC5maWx0ZXIgPT09IG5hbWUsICdjbGFzcycsICdzZWxlY3RlZCcpXG4gICAgICAgICAgICAuYXR0cignaHJlZicsICcjLycgKyBoYXNoKS5hY2xpY2sodGl0bGUpKSB7XG4gICAgICAgICAgICBtb2RlbC5maWx0ZXIgPSBuYW1lO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGZvb3Rlcihtb2RlbCkge1xuICAgIHduZC5rbGFzcygnZm9vdGVyJykuZm9vdGVyKCgpID0+IHtcbiAgICAgICAgd25kLmtsYXNzKCd0b2RvLWNvdW50Jykuc3BhbigoKSA9PiB7XG4gICAgICAgICAgICB3bmQuc3Ryb25nKG1vZGVsLnRvZG9zLmxlbmd0aCArICcgaXRlbShzKSBsZWZ0Jyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHduZC5rbGFzcygnZmlsdGVycycpLnVsKCgpID0+IHtcbiAgICAgICAgICAgIGZpbHRlckJ1dHRvbihtb2RlbCwgJ0FsbCcsICdub25lJywgJycpO1xuICAgICAgICAgICAgZmlsdGVyQnV0dG9uKG1vZGVsLCAnQWN0aXZlJywgJ2FjdGl2ZScpO1xuICAgICAgICAgICAgZmlsdGVyQnV0dG9uKG1vZGVsLCAnQ29tcGxldGVkJywgJ2NvbXBsZXRlZCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmICh3bmQua2xhc3MoJ2NsZWFyLWNvbXBsZXRlZCcpLmJ1dHRvbignQ2xlYXIgY29tcGxldGVkJykpIHtcbiAgICAgICAgICAgIG1vZGVsLmNsZWFyQ29tcGxldGVkKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gc2hvd1RvZG8odG9kbykge1xuICAgIGxldCBjbHMgPSB0b2RvLmNvbXBsZXRlZCA/ICdjb21wbGV0ZWQnIDogICcnO1xuICAgIGNscyArPSB0b2RvLmVkaXRpbmcgPyAnIGVkaXRpbmcnIDogJyc7XG4gICAgbGV0IGF0dHJzID0gY2xzID8geydjbGFzcyc6IGNscy50cmltKCl9IDoge307XG5cbiAgICB3bmQuYXR0cnMoYXR0cnMpLmxpKCgpID0+IHtcbiAgICAgICAgdmlld1RvZG8odG9kbyk7XG4gICAgICAgIGlmICh0b2RvLmVkaXRpbmcpIHtcbiAgICAgICAgICAgIGVkaXRUb2RvKHRvZG8pO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cblxuZnVuY3Rpb24gdmlld1RvZG8odG9kbykge1xuICAgIHduZC5rbGFzcygndmlldycpLmRpdigoKSA9PiB7XG4gICAgICAgIHRvZG8uY29tcGxldGVkID0gd25kLmtsYXNzKCd0b2dnbGUnKS5jaGVja0JveCh0b2RvLmNvbXBsZXRlZCk7XG5cbiAgICAgICAgd25kLm9uKCdsYWJlbCcsIFsnZGJsY2xpY2snXSwgZXYgPT4ge1xuICAgICAgICAgICAgaWYgKGV2KSB7XG4gICAgICAgICAgICAgICAgdG9kby5lZGl0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHduZC50ZXh0KHRvZG8udGV4dCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKHduZC5rbGFzcygnZGVzdHJveScpLmJ1dHRvbigpKSB7XG4gICAgICAgICAgICB0b2RvLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5cblxuZnVuY3Rpb24gZWRpdFRvZG8odG9kbykge1xuICAgIHduZC5rbGFzcygnZWRpdCcpXG4gICAgICAgIC5hdHRyKCd2YWx1ZScsIHRvZG8udGV4dClcbiAgICAgICAgLmF0dHIoJ29uTW91bnQnLCBlID0+IGUuZm9jdXMoKSlcbiAgICAgICAgLm9uKCdpbnB1dCcsIFsna2V5dXAnLCAnZm9jdXNvdXQnXSwgZXYgPT4ge1xuICAgICAgICAgICAgaWYgKGV2KSB7XG4gICAgICAgICAgICAgICAgaWYgKGV2LnR5cGUgPT09ICdrZXl1cCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2LmtleUNvZGUgPT09IEVOVEVSX0tFWSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdG9kby5lZGl0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b2RvLnVwZGF0ZShldi50YXJnZXQudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChldi5rZXlDb2RlID09PSBFU0NBUEVfS0VZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b2RvLmVkaXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZXYudHlwZSA9PT0gJ2ZvY3Vzb3V0JykgeyAvLyBibHVyIGRvZXNuJ3QgYnViYmxlIHVwLi4uLlxuICAgICAgICAgICAgICAgICAgICB0b2RvLmVkaXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgdG9kby51cGRhdGUoZXYudGFyZ2V0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gd25kO1xuIl19
