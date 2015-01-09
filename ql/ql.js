

var imgui = require('../libimgui');


/*
  QL

  questions: 
    answerable: name, label, type
    computed: name, label, expr
    conditional: exp, list[question]
  
  type: one-of(int, str, bool)

  renderQL:

*/


var model = {
    meta: {
	title: "A title",
	questions: [
	    {name: "name", label: "What is your name?", type: "String", computed: false},
	    {name: "age", label: "What is your age?", type: "Integer", computed: false},
	    {name: "adult", label: "Are you adult?", type: "Boolean", computed: true, expr: "age > 18"}
	]
    },
    instance: [],
    state: {}
};

function runQL() {
    imgui.setup(main, model, "container");
}


function main(model) {
    imgui.div(".row", function() {
	imgui.div(".col-md-3", function () {
	    preview(model.instance, model.state);
	});
	
	imgui.div(".col-md-9", function() {
	    editor(model.meta);
	});
    });
}

function preview(model) {
    imgui.p("This is the preview");
}

function editor(model) {
    imgui.p("This is the editor");
    var newq = {name: "aName", label: "A label.", type: "Integer", computed: false};
    editableList(model.questions, questionEditor, newq);
}

function questionEditor(q) {
    imgui.fieldset(function() {
	imgui.label("Name: ");
	q.name = imgui.textbox(q.name);
	imgui.label("Label: ");
	q.label = imgui.textbox(q.label);

	imgui.label("Type: ");
	var types = ["Integer", "String", "Boolean"];

	q.type = imgui.select(q.type, function () {
	    for (var i = 0; i < types.length; i++) {
		var selected = types[i] === q.type;
		imgui.option(types[i], types[i], selected);
	    }
	});

	imgui.text(" ");
	q.computed = imgui.checkbox(q.computed);
	if (q.computed) {
	    imgui.label("Expression: ");
	    q.expr = imgui.textbox(q.expr || "<expr>");
	}

    });

    imgui.text(JSON.stringify(q));
}

var editableLabel = imgui.component({editing: false}, function editableLabel(self, txt) {
    var result = txt;
    function setFocus(elt) {
	elt.focus();
    }
    
    if (self.editing) {
	result = imgui.textbox(txt, {extra: setFocus});
	self.editing = false;
    }
    else {
	imgui.on("span", ["dblclick"], {}, function (ev) {
	    if (ev) self.editing = true;
	    imgui.text(txt);
	});
    }
    return result;
});

var editableList = imgui.component({}, function editableList(self, xs, renderx, newx) {

    function move(idx, dir) {
	var elt = xs[idx];
        xs.splice(idx, 1);
        xs.splice(idx + dir, 0, elt);
    }

    imgui.ul(function() {
        if (xs.length == 0 && imgui.button(" + ")) {
	    xs[0] = imgui.clone(newx);
        }

	// iterate over a copy
	var elts = xs.slice(0);
	
        for (var idx = 0; idx < elts.length; idx++) {

            imgui.li(".completed", function() {
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
            });
        }
    });
});

module.exports = runQL;
