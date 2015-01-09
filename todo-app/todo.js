

var imgui = require('../libimgui');

var todos = {
    items: [
        {label: "Email", done: false},
        {label: "Reviewing", done: true}
    ]
};

function run() {
    imgui.setup(todoApp, todos);
}


var todoApp = imgui.component({newTodo: ""}, function todoApp(self, model) {

    imgui.h2("Todo App");
    
    imgui.named("todos1", editableList, model.items, todoView, {done: false, label: ""});
    imgui.named("todos2", editableList, model.items, todoView, {done: false, label: ""});
    
    if (imgui.button("Add")) {
        model.items.push({label: self.newTodo, done: false});
        self.newTodo = "";
    }
    
    self.newTodo = imgui.textbox(self.newTodo);
    
    // imgui.h3("The model");
    // editableValue(model);

    // imgui.h3("The memo table containing viewstates");
    // editableValue(imgui.memo);
});




var editableLabel = imgui.component({editing: false}, function editableLabel(self, txt) {
    var result = txt;
    function setFocus(elt) {
	elt.focus();
    }
    
    if (self.editing) {
	result = imgui.textbox(txt, {extra: setFocus});
	self.editing = false;
    }
    else {
	imgui.on("span", ["dblclick"], {}, function (ev) {
	    if (ev) self.editing = true;
	    imgui.text(txt);
	});
    }
    return result;
});


var todoView = imgui.component({toggle: false}, function todoView(self, item) {
    item.label = editableLabel(item.label);
    
    item.done = imgui.checkbox(item.done);
    if (imgui.button("Toggle viewstate"))  {
        self.toggle = !self.toggle;
    }
    
    imgui.text(self.toggle);
 
});




var editableList = imgui.component({}, function editableList(self, xs, renderx, newx) {

    function move(idx, dir) {
	var elt = xs[idx];
        xs.splice(idx, 1);
        xs.splice(idx + dir, 0, elt);
    }

    imgui.ul(function () {
        if (xs.length == 0 && imgui.button(" + ")) {
	    xs[0] = imgui.clone(newx);
        }

	// iterate over a copy
	var elts = xs.slice(0);
	
        for (var idx = 0; idx < elts.length; idx++) {

            imgui.li(".completed", function () {
                renderx(elts[idx]);

                if (imgui.button(" + ")) {
		    xs.splice(idx + 1, 0, imgui.clone(newx));
                }
                if (imgui.button(" - ")) {
		    xs.splice(idx, 1);
                }
                if (idx > 0 && imgui.button(" ^ ")) {
		    move(idx, -1);
                }
                if (idx < xs.length - 1 && imgui.button(" v ")) {
		    move(idx, +1);
                }
            });
	    
        }
	
    });
});

module.exports = run;
