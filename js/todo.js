

var todos = {
    items:   [
        { 
            label: "Reviewing",
            done: false
        }
    ]
};


var todoApp = component({newTodo: ""}, function todoApp(model) {
    editableList(model.items, todoView, {done: false, label: ""});
 
    if (button("Add")) {
        todo.items.push({label: this.newTodo, done: false});
        this.newTodo = "";
    }
    
    for (var txt of textbox(this.newTodo)) {
        this.newTodo = txt;
    }
});


var todoView = component({toggle: false}, function (item) {
    p(item.label);
    
    for (var chk of checkBox(item.done)) {
        item.done = chk;
    }

    if (button("Toggle viewstate"))  {
        this.toggle = !this.toggle;
    }
    
    p(this.toggle);
 
});



function editableList(xs, renderx, newx) {

    function move(idx, dir) {
	var elt = xs[idx];
        xs.splice(idx, 1);
        xs.splice(idx + dir, 0, elt);
    }

    for (var _ of ul()) {
        if (xs.length == 0 && button(" + ")) {
	    xs[0] = clone(newx);
        }

	// iterate over a copy
	var elts = xs.slice(0);
	
        for (var idx = 0; idx < elts.length; idx++) {

            for (var _ of li()) {
                renderx(elts[idx]);

                if (button(" + ")) {
		    xs.splice(idx + 1, 0, clone(newx));
                }
                if (button(" - ")) {
		    xs.splice(idx, 1);
                }
                if (idx > 0 && button(" ^ ")) {
		    move(idx, -1);
                }
                if (idx < xs.length - 1 && button(" v ")) {
		    move(idx, +1);
                }
            }
	    
        }
    }
}
