

var TrimGUI = require('../libimgui');

var m = {
    t: 0
};

var ig = new TrimGUI(c2f, m, 'root');

function toF(c) {
    return Math.round(c * 9.0/5.0 + 32);
}

function toC(f) {
    return Math.round((parseFloat(f) - 32) * 5.0/9.0);
}

function c2f(m) {
    ig.text("C:")
    m.t = ig.textBox(m.t);

    ig.text("F:")
    m.t = toC(ig.textBox(toF(m.t)));
}
				 

module.exports = ig;
