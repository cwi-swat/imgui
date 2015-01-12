

var imgui = require('../libimgui');
imgui.install(window);

var todos = {
    items: [
        {label: "Email", done: false},
        {label: "Reviewing", done: true},
        {label: "Buy milk", done: false},
        {label: "Send postcard", done: true},
        {label: "Finish annual report", done: false}
    ]
};

function run() {
    setup(todoApp, todos);
}


var todoApp = component({newTodo: "", errors: []}, function todoApp(self, model) {

    h2("Todo App");


    function todoView(item) {
	item.done = checkBox(item.done);
	item.label = editableLabel(item, item.label);
    }
    
    
    var newTodo = {done: false, label: "New todo"};
    editableList(model.items, todoView, newTodo);

    if (button("Add")) {
	self.errors = [];
	if (self.newTodo[0].toUpperCase() !== self.newTodo[0]) {
	    self.errors.push("Need to be capitalized");
	}
	else {
            model.items.push({label: self.newTodo, done: false});
            self.newTodo = "";
	}
    }
    
    self.newTodo = textBox(self.newTodo);
    for (var i = 0; i < self.errors.length; i++) {
	br();
	p(self.errors[i]);
    }

    p(JSON.stringify(memo));
    
});




var editableLabel = component({editing: false}, function editableLabel(self, _, txt) {
    var result = txt;

    function setFocus(elt) {
	elt.focus();
    }
    
    if (self.editing) {
	on("input", ["blur"], {type: "text", value: txt, extra: setFocus}, function (ev) {
	    if (ev) {
		self.editing = false;
		result = ev.target.value;
	    }
	});
    }
    else {
	on("span", ["dblclick"], {}, function (ev) {
	    if (ev) {
		self.editing = true;
	    }
	    text(txt);
	});
    }

    return result;
});



function editableList(xs, renderx, newx) {

    if (xs.length == 0 && button(" + ")) {
	xs[0] = clone(newx);
	return xs;
    }

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
