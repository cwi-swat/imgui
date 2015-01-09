

var g = require('../libimgui');

var m = {
    t: 0
};

function run() {
    g.setup(c2f, m);
}

function toF(c) {
    return Math.round(c * 9.0/5.0 + 32);
}

function toC(f) {
    return Math.round((parseFloat(f) - 32) * 5.0/9.0);
}

function c2f(m) {
    g.text("C:")
    m.t = g.textbox(m.t);

    g.text("F:")
    m.t = toC(g.textbox(toF(m.t)));
}
				 

module.exports = run;
