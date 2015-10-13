

var imgui = require('../libimgui');
imgui.install(window);

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

function run() {
    setup(todoApp, todos, 'root');
}


function todoApp(model) {

    h2("Todo App");


    function todoView(item) {
	item.done = checkBox(item.done);
	text(item.label);
    }
        
    editableList(model.items, todoView);
    
    if (button("Add")) {
        model.items.push({label: model.newTodo, done: false});
        model.newTodo = "";
    }
    
    model.newTodo = textBox(model.newTodo);

    pre(function() {
	text(JSON.stringify(model, null, '  '));
    });
}



function editableList(xs, renderx) {
    function move(idx, dir) {
	var elt = xs[idx];
        xs.splice(idx, 1);
        xs.splice(idx + dir, 0, elt);
    }

    
    table(function () {

	// iterate over a copy
	var elts = xs.slice(0);
	
        for (var idx = 0; idx < elts.length; idx++) {
	    tr(function() {
		td(function () {
                    renderx(elts[idx]);
		});

		td(function() {
                    if (button(" + ")) {
			xs.splice(idx + 1, 0, clone(newx));
                    }
		});
		
                td(function() {
		    if (button(" - ")) {
			xs.splice(idx, 1);
                    }
		});

		td(function() {
                    if (idx > 0 && button(" ^ ")) {
			move(idx, -1);
                    }
		});

		td(function() {
                    if (idx < xs.length - 1 && button(" v ")) {
			move(idx, +1);
                    }
		});
            });
	    
        }
	
    });
}

module.exports = run;
