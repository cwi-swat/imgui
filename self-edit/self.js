
"use strict";

var imgui = require('../libimgui');

var m = {source: ""};

function run(src) {
    m.source = src;
    imgui.setup(selfEdit, m);
}


function selfEdit(m) {
    for (var txt of imgui.textarea(m.source, {rows: 30, cols: 120})) {
	var m1 = imgui.clone(m);
	imgui.init(eval(txt), m);
        for (var k in m) {
           if (m1.hasOwnProperty(k)) {
              m[k] = m1[k];
           }
        }
	m.source = txt;
    }

    /* do stuff here */
    
}

module.exports = run;

selfEdit;
