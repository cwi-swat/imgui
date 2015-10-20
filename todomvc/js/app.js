// TODOMV using IMGUI.

'use strict';

// Data model


class Todos {
    constructor () {
        this.todos = [];
        this.newTodo = '';
        this.filter = x => true;
    }

    createTodo(value) {
        this.todos.push(new Todo(value, this, this.todos.length));
    }
    
}

class Todo {
    constructor (text, parent, index) {
        this.text = text;
        this.completed = false;
        this.editing = false;
        this.parent = parent;
        this.index = index;
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
        this.parent.todos.splice(this.index, 1);
        for (let i = this.index; i < this.parent.todos.length; i++) {
            this.parent.todos[i].index--;
        }
    }

    
}

var model = new Todos();


const TrimGUI = require('libimgui');

const ig = new TrimGUI(main, model, 'todoapp');

const ENTER_KEY = 13;
const ESCAPE_KEY = 27;


function main(model) {
    ig.onRoute('#/active', () => {
        model.filter = x => !x.completed;
    });

    ig.onRoute('#/completed', () => {
        model.filter = x => x.completed;
    });
    
    ig.klass('todoapp').section(() => {
        ig.klass('header').header(() => {
            ig.h1('todos');
            newTodo(model);
        });
        
        if (model.todos.length > 0 ) {
            mainSection(model.todos);
            footer(model);
        }
    });
    
    // todo: leave this in the html, since it is static.
    ig.klass('info').footer(() => {
        ig.p('Double-click to edit a todo');
        ig.p(() => {
            ig.text('Template by ');
            ig.attr('href', 'http://sindresorhus.com').a('Sindre Sorhus');
        });
        ig.p(() => {
            ig.text('Created by ');
            ig.attr('href', 'http://www.cwi.nl/~storm').a('Tijs van der Storm');
        });
        ig.p(() => {
            ig.text('Part of ');
            ig.attr('href', 'http://todomvc.com').a('TodoMVC');
        });        
    });
}

function newTodo(model) {
    var attrs = {'class': 'new-todo', type: 'text', value: model.newTodo,
                 placeholder: 'What needs to be done?',
                 onMount: elt => {elt.value=model.newTodo;}};
    
    ig.attrs(attrs).on('input', ['keyup'], ev => {
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


function mainSection(todos) {
    ig.klass('main').section(() => {
        if (ig.klass('toggle-all').checkBox(false)) {
            for (let i = 0; i < todos.length; i++) {
                todos[i].completed = true;
            }
        }
        ig.attr('for', 'toggle-all').label('Mark all as complete');
        
        ig.klass('todo-list').ul(() => {
            for (let i = 0; i < model.todos.length; i++) {
                let todo = model.todos[i];
                if (model.filter(todo)) {
                    showTodo(todo);
                }
            }
        });
    });
    
}

function footer(model) {
    ig.klass('footer').footer(() => {
        ig.klass('todo-count').span(() => {
            ig.strong(model.todos.length + ' item(s) left');
        });

        ig.klass('filters').ul(() => {
            ig.li(() => {
                if (ig.attrs({'class': 'selected', href: '#/'}).aclick('All')) {
                    model.filter = x => true;
                }
            });
            ig.li(() => {
                if (ig.attrs({href: '#/active'}).aclick('Active')) {
                    model.filter = x => !x.completed;
                }
            });
            ig.li(() => {
                if (ig.attrs({href: '#/completed'}).aclick('Completed')) {
                    model.filter = x => x.completed;
                }
            });
        });
        
        if (ig.klass('clear-completed').button('Clear completed')) {
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

    ig.attrs(attrs).li(() => {
        viewTodo(todo);
        if (todo.editing) {
            editTodo(todo);
        }
    });
}


function viewTodo(todo) {
    ig.klass('view').div(() => {
        todo.completed = ig.klass('toggle').checkBox(todo.completed);
        ig.on('label', ['dblclick'], ev => {
            if (ev) {
                todo.editing = true;
            }
            ig.text(todo.text);
        });
        if (ig.klass('destroy').button()) {
            todo.destroy();
        }
    });
}

function editTodo(todo) {
    ig.klass('edit')
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





module.exports = ig;
