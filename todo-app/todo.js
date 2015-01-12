

var imgui = require('../libimgui');

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
    imgui.setup(todoApp, todos);
}


var todoApp = imgui.component({newTodo: ""}, function todoApp(self, model) {

    imgui.h2("Todo App");


    function todoView(item) {
	item.done = imgui.checkBox(item.done);
	item.label = editableLabel(item.label);
    }
    
    
    var newTodo = {done: false, label: "New todo"};
    editableList(model.items, todoView, newTodo);
    
    if (imgui.button("Add")) {
        model.items.push({label: self.newTodo, done: false});
        self.newTodo = "";
    }
    
    self.newTodo = imgui.textBox(self.newTodo);

    imgui.p(JSON.stringify(imgui.memo));
    
});




var editableLabel = imgui.component({editing: false}, function editableLabel(self, txt) {
    var result = txt;

    function setFocus(elt) {
	elt.focus();
    }
    
    if (self.editing) {
	imgui.on("input", ["blur"], {type: "text", value: txt, extra: setFocus}, function (ev) {
	    if (ev) {
		self.editing = false;
		result = ev.target.value;
	    }
	});
    }
    else {
	imgui.on("span", ["dblclick"], {}, function (ev) {
	    if (ev) {
		self.editing = true;
	    }
	    imgui.text(txt);
	});
    }

    return result;
});



var editableList = imgui.component({}, function editableList(self, xs, renderx, newx) {

    if (xs.length == 0 && imgui.button(" + ")) {
	xs[0] = imgui.clone(newx);
	return xs;
    }

    function move(idx, dir) {
	var elt = xs[idx];
        xs.splice(idx, 1);
        xs.splice(idx + dir, 0, elt);
    }

    
    imgui.table(function () {

	// iterate over a copy
	var elts = xs.slice(0);
	
        for (var idx = 0; idx < elts.length; idx++) {
	    imgui.tr(function() {
		imgui.td(function () {
                    renderx(elts[idx]);
		});

		imgui.td(function() {
                    if (imgui.button(" + ")) {
			xs.splice(idx + 1, 0, imgui.clone(newx));
                    }
		});
		
                imgui.td(function() {
		    if (imgui.button(" - ")) {
			xs.splice(idx, 1);
                    }
		});

		imgui.td(function() {
                    if (idx > 0 && imgui.button(" ^ ")) {
			move(idx, -1);
                    }
		});

		imgui.td(function() {
                    if (idx < xs.length - 1 && imgui.button(" v ")) {
			move(idx, +1);
                    }
		});
            });
	    
        }
	
    });
});

module.exports = run;
