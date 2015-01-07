
"use strict";


/*

The point:

- uniformity: just function calls
  -> client code is oblivious to whether a function/component is stateless or not.
  -> promotes factoring in intermediate functions (cannot in React?)
  -> easy to build small helper abstractions (e.g. button)
  -> higher-order functions just work -> higher-order gui components.
- directness: no closures, so for loops can be used just as normal.
- how the code unfolds, is how the gui is drawn
  -> position in this unfolding === key into view state + model element

"Metaphor" 
- the GUI = stdout
- widget return/yield events
- components are functions
  information flow: params and return values

Others so hooked up on functional: return the virtual dom as value.
But the dom is the canvas; use return values for information flow.
You never analyze the returned dom anyway!!!!

Maybe TODO: batch up model modifications, and do them inbetween renderings.
(so that intermediate states are not visible).

do {
  vdom', deltas = render(model);  
  apply(deltas, model);
  patch = diff(vdom', vdom);
  vdom = vdom'
  applyToDOM(patch);
} while (true);


*/

var todos = {
    items:   [
        { 
            label: "Reviewing",
            done: false
        }
    ]
};




var callStack = [];
var memo = {};
function component(state, func) {
    var fname = func.name || func.toString();
    return function() {
	var model = arguments[0]; // first arguments *must* be a model
	callStack.push([fname, model.__path].toString());
	try {
	    var key = callStack.toString();
	    console.log("Key = " + key);
	    if (!memo[key]) {
		memo[key] = clone(state);
		memo[key].__owner = key
	    }
	    var mval = memo[key];
	    // state becomes "this"
	    return func.apply(mval, arguments);
	}
	finally {
	    callStack.pop();
	}
    };
}





var editableList2 = component({dels: []}, function editableList2(xs, renderx, newx) {

    function move(idx, dir) {
	var elt = xs[idx];
        xs.splice(idx, 1);
        xs.splice(idx + dir, 0, elt);
	// todo: adjust this.dels.
    }

    for (var _ of ul()) {
        if (xs.length == 0 && button(" + ")) {
	    xs[0] = clone(newx);
        }
	
        for (var idx = 0; idx < xs.length; idx++) {
            for (var _ of li()) {
                renderx(xs[idx]);
		
                if (button(" + ")) {
		    xs.splice(idx + 1, 0, clone(newx));
                }
		var delIdx = this.dels.indexOf(idx)
                if (checkbox(delIdx > - 1)) {
		    if (delIdx > - 1) { // it *was* deleted, so undelete
			this.dels.splice(delIdx, 1);
		    }
		    else { // mark for deletion.
			this.dels.push(idx);
		    }
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
    if (button("Delete")) {
	for (var i = 0; i < this.dels.length; i++) {
	    xs.splice(dels[i], 1);
	}
    }
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
	
        for (var idx = 0; idx < xs.length; idx++) {
            for (var _ of li()) {
                renderx(xs[idx]);
		
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


var editableList3 = component({dels: []}, function editableList2(xs, renderx, newx) {

    function move(idx, dir) {
	var elt = xs[idx];
        xs.splice(idx, 1);
        xs.splice(idx + dir, 0, elt);
	// todo: adjust this.dels.
    }

    for (var _ of ul()) {
        if (xs.length == 0 && button(" + ")) {
	    xs[0] = clone(newx);
        }
	
        for (var idx = 0; idx < xs.length; idx++) {
            for (var _ of li()) {
                renderx(xs[idx]);
		
                if (button(" + ")) {
		    xs.splice(idx + 1, 0, clone(newx));
                }
		var delIdx = this.dels.indexOf(idx)
                if (checkbox(delIdx > - 1)) {
		    if (delIdx > - 1) { // it *was* deleted, so undelete
			this.dels.splice(delIdx, 1);
		    }
		    else { // mark for deletion.
			this.dels.push(idx);
		    }
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

    return this.dels;
});


function deleteButton(dels, xs) {
    if (button("Delete")) {
	for (var i = 0; i < dels.length; i++) {
	   xs.splice(dels[i], 1); 
	}
    }
}

function displayWithDelete(xs) {
    // NB: toBeDeleted is transient, -- editable list has view state
    var toBeDeleted = editableList3(xs, todoView, {done: false, label: ""}); 
    deleteButton(toBeDeleted, xs);
}


function button(id, label) {
    for (var ev of h("button", id)) {
	text(label);
	if (ev.type === "click") {
	    return true;
	}
    }
    return false;
}


function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function* withElement(elt, attrs) {
    var parent = GUI.focus;
    GUI.focus = [];
    try {
	yield;
    }
    finally {
	var vnode = h(elt, attrs, GUI.focus);
	parent.push(vnode);
	GUI.focus = parent;
    }    
}


    

    /*
      in the main loop do
      // GUI.change is needed for when the last event is handled.
      while (GUI.events.length > 0 || GUI.change) {
        GUI.change = false; 
	render();
      }
      
     */







var todoView = component({toggle: false}, function (item, idx, items) {
    h("p", item.label);
    
    if (checkBox(item.done)) {
        item.done = !item.done;
    }

    if (button("Delete")) {
        items.splice(idx, 1); // bad!!!
    }

    if (button("Toggle viewstate"))  {
        this.toggle = !this.toggle;
    }
    
    h("p", vs.toggle);
 
});


var todoList = component(function(todo, vs) {
    function f(lst, vs) {
        editableList(lst, todoView, {label: "", done: false}, vs);
    }
    $render(f, todo.items, [], {});
})

function todoApp(todo, vs) {
    $render(todoList, todo, [1], {});
    $render(todoList, todo, [2], {});
 
     for (var _ of button("addit", "Add")) {
        todo.items.push({label: vs.newTodo, done: false});
        vs.newTodo = "";
    }
    for (var newTodo of textbox("new", vs.newTodo)) 
        vs.newTodo = newTodo;


    br();
    label("A", "Model: ");
    label("json", JSON.stringify(todo));
    br();
    label("B", "View state: ");
    label("viewstate", JSON.stringify(memo));

}



