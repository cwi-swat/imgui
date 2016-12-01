
"use strict";

var todos = {
    items: [
        {label: "Email", done: false},
        {label: "Reviewing", done: true},
        {label: "Buy milk", done: false},
        {label: "Send postcard", done: true},
        {label: "Finish annual report", done: false}
    ],
    newTodo: ""
};


var TrimGUI = require('../libimgui');

var ig = new TrimGUI(todoApp, todos, 'root');


function todoApp(model) {

    ig.h2("Todo App");

    function todoView(item) {
	item.done = ig.checkBox(item.done);
	ig.text(item.label);
    }
        
    editableList(model.items, todoView);
    
    if (ig.button("Add")) {
        model.items.push({label: model.newTodo, done: false});
        model.newTodo = "";
    }
    
    model.newTodo = ig.textBox(model.newTodo);

    ig.pre(function() {
	ig.text(JSON.stringify(model, null, '  '));
    });
}



function editableList(xs, renderx) {
    function move(idx, dir) {
	var elt = xs[idx];
        xs.splice(idx, 1);
        xs.splice(idx + dir, 0, elt);
    }

    
    ig.table(function () {

	// iterate over a copy
	var elts = xs.slice(0);
	
        for (var idx = 0; idx < elts.length; idx++) {
	    ig.tr(function() {
		ig.td(function () {
                    renderx(elts[idx]);
		});

		ig.td(function() {
                    if (ig.button(" + ")) {
			xs.splice(idx + 1, 0, clone(newx));
                    }
		});
		
                ig.td(function() {
		    if (ig.button(" - ")) {
			xs.splice(idx, 1);
                    }
		});

		ig.td(function() {
                    if (idx > 0 && ig.button(" ^ ")) {
			move(idx, -1);
                    }
		});

		ig.td(function() {
                    if (idx < xs.length - 1 && ig.button(" v ")) {
			move(idx, +1);
                    }
		});
            });
        }
	
    });
}

module.exports = ig;
