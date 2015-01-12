
"use strict";


var imgui = require('../libimgui');
imgui.install(window);


var model = {
    items: [
        {label: "Email", done: false},
        {label: "Reviewing", done: true}
    ],
    text: "",
    flag: false,
    gender: "Male",
    number: 0,
    date: "2014-10-03",
    color: "#FFFFFF"
};

function run() {
    setup(examples, model);
}


function example(title, func) {
    h3(title, "#" + func.name);
    pre(function() {
	text(func.toString());
    });
    br();
    div(".output", function() {
	func(model);
    });
}

var sections = {
    "Basics": basics,
    "Model": usingTheModel,
    "View state (component)": viewState,
    "Simple todo app": todoApp,
    "State-less components": statelessComponents,
    "Upwards data flow (here)": upwardsDataFlow,
    "Defining widgets (on)": definingButton,
    "Select": selectExample,
    "Radio": radioExample,
    "Slider": sliderExample,
    "Pickers": pickersExample,
    "The current model": currentModel,
    "Current view state": currentViewState
};


function examples(model) {
    h2("Examples");

    ul(function() {
	for (var k in sections) {
	    if (sections.hasOwnProperty(k)) {
		li(function() {
		    a(k, ".toc", {href: "#" + sections[k].name});
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
    h4("Todos");
    ul(function() {
	li(function() { text("Email"); });
	li(function() { text("Reviewing"); });
    });
}

function usingTheModel(m) {
    text("Enter some text: ");
    m.text = textBox(m.text);
    br();
    text("You entered: " + m.text);
}

function todoApp(m) {
    var app = component({newTodo: ""}, function todoApp(self, model) {
	function todoView(item) {
	    item.done = checkBox(item.done);
	    item.label = editableLabel(item, item.label);
	}
	
	editableList(model.items, todoView, {done: false, label: "New todo"});
	
	if (button("Add")) {
            model.items.push({label: self.newTodo, done: false});
            self.newTodo = "";
	}
	
	self.newTodo = textBox(self.newTodo);
    });

    app(m);
}


function currentModel(m) {
    editableValue(m);
}


function viewState(m) {
    var myComponent = component({flag: false}, function myComponent(self, m) {
	text("Model flag: ");
	m.flag = checkBox(m.flag);
	
	text("View state flag: ");
	self.flag = checkBox(self.flag);
    });

    ol(function() {
	li(function() { myComponent(m); });
	li(function() { myComponent(m); });
	li(function() { text(JSON.stringify(memo)); });
    });
}

// this introduces glitches if rendered textually before rendering a component
// that handles an event in the same round, modifying the view state:
// a button then gets added in the sync round...

// you lose events
//

// the rule is: no observable side-effects except in event handler code.
// but view-state initialization is a side-effect, if we show the view state
// with widgets (buttons etc.) then this becomes observable if the view
// state is shown *before*
// There's also a locality thing: rendering memo is *global*.

function currentViewState(m) {
    // memo is the internal cache containing view states.
    editableValue(memo);
}

function definingButton() {

    function button(label) {
	return on("button", ["click"], {}, function(ev) {
	    text(label);
	    return ev !== undefined;
	});
    }

    button("My button");
}

function statelessComponents(m) {
    function enterText(s) {
	p("Enter some text: ");
	return textBox(s);
    }
    
    m.text = enterText(m.text);
    br();
    text("You entered: " + m.text);
}

var clickCount = component({clicks: 0}, function clickCount(self, clicked) {
    if (clicked) {
	self.clicks++;
    }
    text("Number of clicks: " + self.clicks);
});


function upwardsDataFlow() {
    here(clickCount, function (f) {
	br();
	var clicked = button("Click me");
	f(clicked);
    });
}

function selectExample(m) {
    m.gender = select(m.gender, function (option) {
	option("Male");
	option("Female");
	option("Other");
    });
}

function radioExample(m) {
    m.gender = radioGroup(m.gender, function (radio) {
	radio("Male");
	radio("Female");
	radio("Other");
    });
}

function sliderExample(m) {
    m.number = slider(m.number, {min:0, max: 10, step: 1});
    text("The number is: " + m.number);
}

function pickersExample(m) {
    m.date = datePicker(m.date);
    text("The date is: " + m.date);
    br();
    m.color = colorPicker(m.color);
    text("The color is: " + m.color);
}



function editableValue(value) {
    if (value === null) {
	text("null");
	return null;
    }

    if (value === undefined) {
	text("undefined");
	return;
    }

    if (value.constructor === Array) {
	return editableList(value, editableValue);
    }

    if (typeof value === "object") {
	return editableObject(value, editableValue);
    }

    if (typeof value === "number") {
	return parseInt(textBox(value));
    }

    if (typeof value === "string") {
	return textBox(value);
    }

    if (typeof value === "boolean") {
	return checkBox(value);
    }

    throw "Unsupported value: " + value;
}



function editableObject(obj, render) {
    table(".table-bordered", function() {
	thead(function() {
	    tr(function () {
		th(function () { text("Property"); });
		th(function () { text("Value"); });		
	    });
	});
	for (var k in obj) {
	    if (obj.hasOwnProperty(k) && k !== '__obj_id') {
		tr(function () {
		    td(function() {
			text(k + ":");
		    });
		    td(function() {
			obj[k] = render(obj[k]);
		    });
		});
	    }
	}
    });
    return obj;
}


function editableList(xs, renderx, newx) {

    function move(idx, dir) {
	var elt = xs[idx];
        xs.splice(idx, 1);
        xs.splice(idx + dir, 0, elt);
    }

    table(function () {
        if (newx && xs.length == 0 && button(" + ")) {
	    tr(function() {
		td(function () {
		    xs[0] = clone(newx);
		});
	    });
        }
	    
	// iterate over a copy
	var elts = xs.slice(0);
	
        for (var idx = 0; idx < elts.length; idx++) {
	    tr(function() {
		td(function () {
                    renderx(elts[idx]);
		});

		td(function() {
                    if (newx && button(" + ")) {
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

    return xs;
}


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


module.exports = run;

