
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
    imgui.h3(title, "#" + func.name);
    imgui.pre(function() {
	imgui.text(func.toString());
    });
    imgui.br();
    imgui.div(".output", function() {
	func(model);
    });
}

var sections = {
    "Basics": basics,
    "Model": usingTheModel,
    "View state (component)": viewState,
    "State-less components": statelessComponents,
    "Upwards data flow (here)": upwardsDataFlow,
    "Defining widgets (on)": definingButton
};


function examples(model) {
    imgui.h2("Examples");

    imgui.ul(function() {
	for (var k in sections) {
	    if (sections.hasOwnProperty(k)) {
		imgui.li(function() {
		    imgui.a(k, ".toc", {href: "#" + sections[k].name});
		});
	    }
	}
    });
    for (var k in sections) {
	if (sections.hasOwnProperty(k)) {
	    example(k, sections[k]);
	}
    }

}

function basics() {
    imgui.h4("Todos");
    imgui.ul(function() {
	imgui.li(function() { imgui.text("Email"); });
	imgui.li(function() { imgui.text("Reviewing"); });
    });
}

function usingTheModel(m) {
    imgui.text("Enter some text: ");
    model.text = imgui.textbox(model.text);
    imgui.br();
    imgui.text("You entered: " + model.text);
}

function viewState(m) {
    var myComponent = imgui.component({flag: false}, function myComponent(self, m) {
	imgui.text("Model flag: ");
	m.flag = imgui.checkbox(m.flag);
	
	imgui.text("View state flag: ");
	self.flag = imgui.checkbox(self.flag);
    });

    imgui.ol(function() {
	imgui.li(function() { imgui.named("first", myComponent, m); });
	imgui.li(function() { imgui.named("second", myComponent, m); });
    });
}

function definingButton() {

    function button(label) {
	return imgui.on("button", ["click"], {}, function(ev) {
	    imgui.text(label);
	    return ev !== undefined;
	});
    }

    button("My button");
}

function statelessComponents(m) {
    function enterText(s) {
	imgui.p("Enter some text: ");
	return imgui.textbox(s);
    }
    
    m.text = enterText(m.text);
    imgui.br();
    imgui.text("You entered: " + m.text);
}

function upwardsDataFlow() {
    var clickCount = imgui.component({clicks: 0}, function clickCount(self, clicked) {
	if (clicked) {
	    self.clicks++;
	}
	imgui.text("Number of clicks: " + self.clicks);
    });
    
    imgui.here(clickCount, function (f) {
	imgui.br();
	var clicked = imgui.button("Click me");
	f(clicked);
    });
}



module.exports = run;
