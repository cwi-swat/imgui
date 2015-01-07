
"use strict";

var imgui = require('../libimgui');

var model = {
    items: [
        {label: "Email", done: false},
        {label: "Reviewing", done: true}
    ],
    text: "",
    flag: false
};

function run() {
    imgui.setup(examples, model);
}


function example(title, func) {
    imgui.h3(title);
    for (var _ of imgui.pre()) {
	imgui.text(func.toString());
    }
    imgui.br();
    for (var _ of imgui.div(".output")) {
	func(model);
    }
}

function examples(model) {
    example("Basics", basics);
    example("Model", usingTheModel);
    example("View state (component)", viewState);
    example("State-less components", statelessComponents);
    example("Upwards data flow (here)", upwardsDataFlow);
    example("Defining widgets (on)", definingButton);
}

function basics() {
    imgui.h4("Todos");
    for (var _ of imgui.ul()) {
	for (var _ of imgui.li()) 
	    imgui.text("Email");
	for (var _ of imgui.li()) 
	    imgui.text("Reviewing");
    }
}

function usingTheModel(m) {
    imgui.text("Enter some text: ");
    for (var txt of imgui.textbox(model.text)) {
	model.text = txt;
    }
    imgui.br();
    imgui.text("You entered: " + model.text);
}

function viewState(m) {
    var myComponent = imgui.component({flag: false}, function myComponent(m) {
	imgui.text("Model flag: ");
	for (var chk of imgui.checkbox(m.flag))
	    m.flag = chk;
	
	imgui.text("View state flag: ");
	for (var chk of imgui.checkbox(this.flag))
	    this.flag = chk;
    });

    for (var _ of imgui.ol()) {
	for (var _ of imgui.li()) 
	    imgui.named("first", myComponent, m);
	
	for (var _ of imgui.li()) 
	    imgui.named("second", myComponent, m);
    }

    //imgui.text(JSON.stringify(imgui.memo));
    
}

function definingButton() {

    function button(label) {
	var result = false;
	for (var ev of imgui.on("button", ["click"], {})) {
	    result = ev != undefined;
	    imgui.text(label);
	}
	return result;
    }

    button("My button");
}

function statelessComponents(m) {
    function enterText(s) {
	var result = s;
	for (var txt of imgui.textbox(s)) {
	    result = txt;
	}
	return result;
    }

    m.text = enterText(m.text);
    imgui.br();
    imgui.text("You entered: " + m.text);
}

function upwardsDataFlow() {
    var clickCount = imgui.component({clicks: 0}, function clickCount(clicked) {
	if (clicked) 
	    this.clicks++;
	imgui.text("Number of clicks: " + this.clicks);
    });
    
    for (var f of imgui.here(clickCount)) {
	imgui.br();
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
