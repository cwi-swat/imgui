

var imgui = require('../libimgui');

var m = {
    source: "this is the source code"
};



function run(src) {
    m.source = src;
    imgui.setup(selfEdit, m);
}


function selfEdit(m) {
    for (var txt of imgui.textarea(m.source, {rows: 10, cols: 50})) {
	try {
	    imgui.init(eval(txt), m);
	    m.source = txt;
	}
	catch (e) {
	    console.log(e);
	}
    }

    imgui.p("Code: ");

    for (var _ of imgui.pre()) {
	imgui.text(m.source);
    }
}
				 

module.exports = run;

selfEdit;
