"use strict";

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


var h = require('virtual-dom/h');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');


var GUI = {
    event: null,
    root: null,
    app: null,
    model: null,
    focus: [],
    node: null
}

// module.exports = setup;
// module.exports = component;
// module.exports = ul;
// module.exports = li;
// module.exports = p;
// module.exports = clone;
// module.exports = textbox;
// module.exports = checkbox;
// module.exports = button;


function setup(root, app, model) {
    GUI.root = root;
    GUI.app = app;
    GUI.model = model;
}

function doRender() {

    function iter() {
	GUI.focus = [];
	GUI.app(GUI.model);
    }

    // twice: one to handle event, one to sync view.
    iter();
    iter();
    var node = GUI.focus[0];

    var k = GUI.root.childNodes[0];
    
    if (GUI.node !== null) {
	patch(k, diff(node, GUI.node));
    }
    else {
	GUI.root.replaceChild(k, createElement(node));
    }
    
    GUI.node = node;
}



var __ids = 0;
function* on(elt, events, attrs) {
    attrs["id"] = "id" + __ids++;

    for (var i = 0; i < events.length; i++) {
	attrs[events[i]] = "function(e){e.preventDefault();GUI.event=e;doRender();}";
    }

    for (var _ of withElement(elt, attrs)) {
	var event = GUI.event;
	if (event && event.target.getAttribute('id') === id) { 
	    yield event; // let it be handled
	    GUI.dirty = true;
	}
	else {
	    yield undefined;
	}
    }
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


var callStack = [];
var memo = {};
function component(state, func) {
    var fname = func.name || func.toString();
    return function() {
	var model = arguments[0]; // first arguments *must* be a model
	callStack.push([fname, model.__obj_id].toString());
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

var __next_objid=1;
function objectId(obj) {
    if (obj==null) return null;
    if (obj.__obj_id==null) obj.__obj_id=__next_objid++;
    return obj.__obj_id;
}

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

function* when(elt, event, attrs) {
    for (var ev of on(elt, [event], attrs)) {
	if (ev.type == event) {
	    yield ev;
	}
	else {
	    yield undefined;
	}
    }
}


// Basic widgets


function* textbox(value) {
    for (var ev of when("input", "onBlur", {type: "text", value: value})) {
	yield ev.target.value;
    }
}

function* ul() {
    for (var _ of withElement("ul")) {
	yield;
    }
}

function* li() {
    for (var _ of withElement("li")) {
	yield;
    }
}


function* checkbox(value) {
    var attrs = {type: "checkbox"};
    if (value) {
	attrs["checked"] = "true";
    }
    
    for (var ev of when("input", "onClick", attrs)) {
	yield ev.target.checked !== "";
    }
}

function button(id, label) {
    var result = false;
    
    for (var ev of on("button", ["onClick"], id)) {
	text(label);
	result = (ev.type === "click");
    }

    return result;
}

function text(txt) {
    GUI.focus.push(new VTextNode(txt));
}

function p(txt, attrs) {
    for (var _ of withElement("span", attrs)) {
	text(txt);
    }
}

function span(txt, attrs) {
    for (var _ of withElement("span", attrs)) {
	text(txt);
    }
}

