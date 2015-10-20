// TODOMV using IMGUI.

'use strict';

// Data model


class Todos {
    constructor () {
        this.todos = [];
        this.newTodo = '';
        this.filter = x => true;
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
        for (let i = 0; i < this.todos.length; i++) {
            if (this.todos[i].id === todo.id) {
                this.todos.splice(i, 1);
                break;
            }
        }
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
        model.filter = x => !x.completed;
    }
    else if (wnd.inRoute('#/completed')) {
        model.filter = x => x.completed;
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
    
    // todo: leave this in the html, since it is static.
    wnd.klass('info').footer(() => {
        wnd.p('Double-click to edit a todo');
        wnd.p(() => {
            wnd.text('Template by ');
            wnd.attr('href', 'http://sindresorhus.com').a('Sindre Sorhus');
        });
        wnd.p(() => {
            wnd.text('Created by ');
            wnd.attr('href', 'http://www.cwi.nl/~storm').a('Tijs van der Storm');
        });
        wnd.p(() => {
            wnd.text('Part of ');
            wnd.attr('href', 'http://todomvc.com').a('TodoMVC');
        });        
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
            for (let i = 0; i < todos.length; i++) {
                let todo = todos[i];
                if (model.filter(todo)) {
                    showTodo(todo);
                }
            }
        });
    });
    
}

function footer(model) {
    wnd.klass('footer').footer(() => {
        wnd.klass('todo-count').span(() => {
            wnd.strong(model.todos.length + ' item(s) left');
        });

        wnd.klass('filters').ul(() => {
            wnd.li(() => {
                if (wnd.attrs({'class': 'selected', href: '#/'}).aclick('All')) {
                    model.filter = x => true;
                }
            });
            wnd.li(() => {
                if (wnd.attrs({href: '#/active'}).aclick('Active')) {
                    model.filter = x => !x.completed;
                }
            });
            wnd.li(() => {
                if (wnd.attrs({href: '#/completed'}).aclick('Completed')) {
                    model.filter = x => x.completed;
                }
            });
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
        if (wnd.klass('toggle').checkBox(todo.completed)) {
            todo.completed = true;
        }
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
