
"use strict";


var imgui = require('../libimgui');
imgui.install(window);


var data = [
    [{text: 6.0}, {text: 9.5}, {text: "=(A1 + B1) / 2"}],
    [{text: 9.0}, {text: 7.0}, {text: ""}],
    [{text: 5.0}, {text: 3.5}, {text: ""}]
];

function run() {
    setup(theGrid, data, 'root');
}

function theGrid() {
    h3("Grids example");
    grid(10, 10, data, cell);
    br();

    h4("Model");
    //editableValue(data);

    h4("View state");
    //editableValue(memo);

}

var grid = component({}, function grid(self, h, w, data, renderCell) {
    // data = array of rows

    table(function() {
	for (var k = 0; k < w; k++) {
	    col({width: "110px"});
	}
	for (var i = 0; i < data.length && i < h; i++) {
	    var row = data[i];
	    tr({height: "20px"}, function() {
		for (var j = 0; j < row.length && j < w; j++) {
		    td(function() {
			renderCell(row[j]);
		    });
		}
		for (var l = 0; l < w - row.length; l++) {
		    td(function() {
			renderCell({text: " "});
		    });
		}
	    });
	}
	for (var i = data.length; i < h - data.length; i++) {
	    tr({height: "20px"}, function () {
		for (var j = 0; j < w; j++) {
		    td(function() {
			renderCell({text: " "});
		    });
		}
	    });
	}
    });
    
    return data;
});


var cell = component({editing: false}, function cell(self, c) {
    function setFocus(elt) { elt.focus(); }
    
    if (self.editing) {
	on("input", ["input", "focusout"], {type: "text", value: c.text}, function (ev) {
	    if (ev) {
		if (ev.type === 'focusout') {
		    self.editing = false;
		    c.text = ev.target.value;
		}
		if (ev.type === 'input') {
		    c.text = ev.target.value;
		}
	    }
	});
    }
    else {
	on("span", ["click"], {}, function (ev) {
	    if (ev) {
		self.editing = true;
	    }
	    text(c.text);
	});
    }
});


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



