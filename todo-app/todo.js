

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

var todos1 = imgui.component({}, function todos1(items, view, init) {
    editableList(items, view, init);
});

var todos2 = imgui.component({}, function todos2(items, view, init) {
    editableList(items, view, init);
});

var todoApp = imgui.component({newTodo: ""}, function todoApp(model) {
    todos1(model.items, todoView, {done: false, label: ""});
    todos2(model.items, todoView, {done: false, label: ""});
    
    if (imgui.button("Add")) {
        model.items.push({label: this.newTodo, done: false});
        this.newTodo = "";
    }
    
    for (var txt of imgui.textbox(this.newTodo)) {
        this.newTodo = txt;
    }
    
    imgui.p(JSON.stringify(model));
    imgui.p(JSON.stringify(imgui.callStack));
    imgui.p(JSON.stringify(imgui.memo));
});




var editableLabel = imgui.component({editing: false}, function editableLabel(txt) {
    var result = txt;
    function setFocus(elt) {
	elt.focus();
    }
    
    if (this.editing) {
	for (var newTxt of imgui.textbox(txt, {extra: setFocus})) {
	    result = newTxt;
	    this.editing = false;
	}
    }
    else {
	for (var ev of imgui.on("span", ["dblclick"])) {
	    if (ev) this.editing = true;
	    imgui.text(txt);
	}
    }
    return result;
});


var todoView = imgui.component({toggle: false}, function todoView(item) {
    item.label = editableLabel(item.label);
    
    for (var chk of imgui.checkbox(item.done)) {
        item.done = chk;
    }

    if (imgui.button("Toggle viewstate"))  {
        this.toggle = !this.toggle;
    }
    
    imgui.text(this.toggle);
 
});



var editableList = imgui.component({}, function editableList(xs, renderx, newx) {

    function move(idx, dir) {
	var elt = xs[idx];
        xs.splice(idx, 1);
        xs.splice(idx + dir, 0, elt);
    }

    for (var _ of imgui.ul()) {
        if (xs.length == 0 && imgui.button(" + ")) {
	    xs[0] = imgui.clone(newx);
        }

	// iterate over a copy
	var elts = xs.slice(0);
	
        for (var idx = 0; idx < elts.length; idx++) {

            for (var _ of imgui.li(".completed")) {
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
            }
	    
        }
    }
});

module.exports = run;
