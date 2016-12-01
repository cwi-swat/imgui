
var Libimgui = require('../libimgui');

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
    color: "#ffffff",
    clicks: 0,
    list: ['Aap', 'Noot', 'Mies']
};


var wnd = new Libimgui(examples, model, 'root');

function example(title, func) {
    wnd.attr('id', '#' + func.name).h3(title);
    wnd.pre(function() {
	wnd.text(func.toString());
    });
    wnd.br();
    wnd.klass('output').div(() => func(model));
}

var sections = {
    "Basics": basics,
    "Model": usingTheModel,
//    "View state (component)": viewState,
//    "State-less components": statelessComponents,
    "Upwards data flow (here)": upwardsDataFlow,
    "Editable List": listEditor,
//    "How to create a glitch": glitch,
//    "Defining widgets (on)": definingButton,
    "Select": selectExample,
    "Radio": radioExample,
     "Slider": sliderExample,
    "Pickers": pickersExample
//    "Simple todo app": todoApp,
//    "The current model": currentModel,
//    "Current view state": currentViewState
    
};



function examples(model) {
    wnd.h2("Examples");
    
    wnd.ul(function() {
	for (var k in sections) {
	    if (sections.hasOwnProperty(k)) {
		wnd.li(function() {
		    wnd.klass('toc').attr('href', "#" + sections[k].name).a(k);
		});
	    }
	}
    });

    wnd.pre(JSON.stringify(model, null, 2));
    
    for (var k in sections) {
	if (sections.hasOwnProperty(k)) {
	    example(k, sections[k]);
	}
    }

}

function basics() {
    wnd.h4("Todos");
    wnd.ul(() => {
	wnd.li(() => wnd.text("Email"));
	wnd.li(() => wnd.text("Reviewing"));
    });
}

function usingTheModel(m) {
    wnd.text("Enter some text: ");
    m.text = wnd.textBox(m.text);
    wnd.br();
    wnd.text("You entered: " + m.text);
}


function statelessComponents(m) {
    function enterText(s) {
	wnd.p("Enter some text: ");
	return wnd.textBox(s);
    }
    
    m.text = enterText(m.text);
    wnd.br();
    wnd.text("You entered: " + m.text);
}

function upwardsDataFlow(m) {

    function clickCount(clicked) {
	if (clicked) {
	    m.clicks++;
	}
	wnd.text("Number of clicks: " + m.clicks);
    }

    wnd.here(clickCount, function (f) {
	wnd.br();
	var clicked = wnd.button("Click me");
	f(clicked);
    });
}


function selectExample(m) {
    m.gender = wnd.select(m.gender, option => {
	option("Male");
	option("Female");
	option("Other");
    });
}

function radioExample(m) {
    m.gender = wnd.radioGroup(m.gender, radio => {
	radio("Male");
	radio("Female");
	radio("Other");
    });
}

function sliderExample(m) {
    m.number = wnd.attrs({min:0, max: 10, step: 1}).slider(m.number);
    wnd.text("The number is: " + m.number);
}

function pickersExample(m) {
    m.date = wnd.datePicker(m.date);
    wnd.text("The date is: " + m.date);
    wnd.br();
    m.color = wnd.colorPicker(m.color);
    wnd.text("The color is: " + m.color);
}



function editableValue(value) {
    if (value === null) {
	wnd.text("null");
	return null;
    }

    if (value === undefined) {
	wnd.text("undefined");
	return undefined;
    }

    if (value.constructor === Array) {
	return editableList(value, editableValue);
    }

    if (typeof value === "object") {
	return editableObject(value, editableValue);
    }

    if (typeof value === "number") {
	return parseInt(wnd.textBox(value));
    }

    if (typeof value === "string") {
	return wnd.textBox(value);
    }

    if (typeof value === "boolean") {
	return wnd.checkBox(value);
    }

    throw "Unsupported value: " + value;
}



function editableObject(obj, render) {
    wnd.klass('table-bordered').table(() => {
	wnd.thead(function() {
	    wnd.tr(function () {
		wnd.th(() => wnd.text("Property"));
		wnd.th(() => wnd.text("Value"));		
	    });
	});
	for (var k in obj) {
	    if (obj.hasOwnProperty(k)) {
		wnd.tr(() => {
		    wnd.td(() => wnd.text(k + ":"));
		    wnd.td(() => {
			obj[k] = render(obj[k]);
		    });
		});
	    }
	}
    });
    return obj;
}

function listEditor(m) {
    m.list = editableList(m.list, editableValue, 'someString');
}

function editableList(xs, renderx, newx) {

    function clone(obj) {
        if (obj.constructor === Array) {
            return obj.slice(0);
        }
        if (typeof obj === 'object') {
            var newObj = {};
            for (var x in obj) {
                if (obj.hasOwnProperty(x)) {
                    newObj[x] = obj[x];
                }
            }
            return newObj;
        }
        return obj;
    }
    
    function move(xs, idx, dir) {
	var elt = xs[idx]; // get the element
        //console.log("Elt at  " + idx + " is " + elt);
        xs.splice(idx, 1); // remove it, element after elt is now at idx
        //console.log(JSON.stringify(xs));
        xs.splice(idx + dir, 0, elt); // insert it at idx+dir
        //console.log(JSON.stringify(xs));
    }


    wnd.table(function () {
        if (newx && xs.length == 0 && wnd.button(" + ")) {
	    wnd.tr(function() {
		wnd.td(function () {
		    xs[0] = clone(newx);;
		});
	    });
        }

        let idx = 0;

        while (idx < xs.length) {
	    wnd.tr(function() {
		wnd.td(function () {
                    xs[idx] = renderx(xs[idx]);
		});

		wnd.td(function() {
                    if (newx && wnd.button(" + ")) {
			xs.splice(idx + 1, 0, clone(newx));
                        idx++;
                    }
		});
		
                wnd.td(function() {
		    if (wnd.button(" - ")) {
			xs.splice(idx, 1);
                        idx--;
                    }
		});

		wnd.td(function() {
                    if (idx > 0 && wnd.button(" ^ ")) {
			move(xs, idx, -1);
                    }
		});

		wnd.td(function() {
                    if (idx < xs.length - 1 && wnd.button(" v ")) {
			move(xs, idx, 1);
                    }
		});
            });
	    idx++;
        }
    });

    return xs;
}




module.exports = wnd;

