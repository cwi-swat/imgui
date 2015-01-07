

var imgui = require('../libimgui');

var m = {source: ""};

function run(src) {
    m.source = src;
    imgui.setup(selfEdit, m);
}


function selfEdit(m) {
    for (var txt of imgui.textarea(m.source, {rows: 30, cols: 120, style: "font-family: monospace;"})) {
	try {
	    imgui.init(eval(txt), m);
	    m.source = txt;
	}
	catch (e) {
	    console.log(e);
	}
    }

    imgui.p("");

    /* do stuff here */
    
}

module.exports = run;

selfEdit;
