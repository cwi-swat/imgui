
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
    color: "#ffffff"
};

function run() {
    setup(examples, model, 'root');
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
    "State-less components": statelessComponents,
    "Upwards data flow (here)": upwardsDataFlow,
//    "How to create a glitch": glitch,
    "Defining widgets (on)": definingButton,
    "Select": selectExample,
    "Radio": radioExample,
    // "Slider": sliderExample,
    "Pickers": pickersExample,
    "Simple todo app": todoApp,
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
    var todoView = component({deleted: false}, function todoView(self, item) {
	tr(function () {
	    td(function () { item.done = checkBox(item.done); });
	    td(function () { item.label = editableLabel(item, item.label); });
	    td(function () { self.deleted = checkBox(self.deleted, {id: "myid" + item.__obj_id}); });
	})
	return self.deleted;
    });


    function headerTable(headings, body) {
	table(function() {
	    thead(function() {
		tr(function() {
		    for (var i = 0; i < headings.length; i++)
			th(function() { text(headings[i]); });
		});
	    });
	    body();
	});
    }


    function showTodos(items) {
	var dels = [];
	headerTable(["Done", "Text", "Delete"], function() {
	    for (var i = 0; i < items.length; i++) 
		if (todoView(items[i])) 
		    dels.push(i);
	});
	return dels;
    }

    var toolbar = component({newTodo: ""}, function toolbar(self, items, deleted) {	
	if (button("Add")) {
            model.items.push({label: self.newTodo, done: false});
            self.newTodo = "";
	}
	self.newTodo = textBox(self.newTodo);

	deleted = deleted.sort(function (a, b) { return a - b; });
	if (button("Delete")) {
	    for (var i = 0; i < deleted.length; i++) {
		model.items.splice(deleted[i] - i, 1);
	    }
	}
    });

    function app(model) {
	var deleted = showTodos(model.items);
	toolbar(model.items, deleted);
    }

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

    var statefulButton = component({count: 0}, function statefulButton(self, label) {
	return on("button", ["click"], {}, function(ev) {
	    if (ev) self.count++;
	    text(label + ": " + self.count);
	});
    });

    button("My button");
    statefulButton("My button");
				   
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

function upwardsDataFlow() {

    var clickCount = component({clicks: 0}, function clickCount(self, clicked) {
	if (clicked) {
	    self.clicks++;
	}
	text("Number of clicks: " + self.clicks);
    });

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
	    if (obj.hasOwnProperty(k)) {
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

