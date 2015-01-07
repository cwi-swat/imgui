
"use strict";

var imgui = require('../libimgui');

var model = {
    items: [
        {label: "Email", done: false},
        {label: "Reviewing", done: true}
    ]
};

function run() {
    imgui.setup(examples, model);
}


function examples(model) {
    imgui.h3("Upwards data flow");
    upwardsDataFlow();
    imgui.h3("Defining widgets");
    definingButton();
}

function definingButton() {
    var f = ["function button(label) {",
	     "  var result = false;",
	     "  for (var ev of imgui.on(\"button\", [\"click\"], {})) {",
	     "    result = ev != undefined;",
	     "    imgui.text(label);",
	     "  }",
	     "  return result;",
	     "}"].join("\n");
    for (var _ of imgui.pre()) {
	imgui.text(f);
    }

    var button = eval(f + " button;");

    imgui.p("");
    
    button("My button");
}

function upwardsDataFlow() {
    var clickCount = imgui.component({clicks: 0}, function clickCount(clicked) {
	if (clicked) 
	    this.clicks++;
	imgui.text("Number of clicks: " + this.clicks);
    });
    
    for (var f of imgui.here(clickCount)) {
	var clicked = imgui.button("Click me");
	f(clicked);
    }
}



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



function editableValue(value) {
    var result = value;
    if (value === null) {
	text("null");
    }
    else if (value === undefined) {
	text("undefined");
    }
    else if (value.constructor === Array) {
	editableList(value, editableValue, function () { return {}; });
    }
    else if (typeof value === "object") {
	editableObject(value, editableValue);
    }
    else if (typeof value === "number") {
	for (var txt of imgui.textbox(value)) {
	    result = parseInt(txt);
	}
    }
    else if (typeof value === "string") {
	for (var txt of imgui.textbox(value)) {
	    result = txt;
	}
    }
    else if (typeof value === "boolean") {
	for (var chk of imgui.checkbox(value)) {
	    result = chk;
	}
    }
    return result;
}



function editableObject(obj, render) {
    for (var _ of imgui.dl()) {
	for (var k in obj) {
	    if (obj.hasOwnProperty(k) && k !== '__obj_id' && k !== '__owner') {
		for (var _ of imgui.dt()) {
		    imgui.text(k + ":");
		}
		for (var _ of imgui.dd()) {
		    obj[k] = render(obj[k]);
		}
	    }
	}
    }
}

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
