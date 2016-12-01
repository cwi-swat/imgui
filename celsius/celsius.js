

var Libimgui = require('../libimgui');

var m = {
    t: 0
};

var wnd = new Libimgui(c2f, m, 'root');

function toF(c) {
    return Math.round(c * 9.0/5.0 + 32);
}

function toC(f) {
    return Math.round((parseFloat(f) - 32) * 5.0/9.0);
}

function c2f(m) {
    wnd.text("C:")
    m.t = wnd.textBox(m.t);

    wnd.text("F:")
    m.t = toC(wnd.textBox(toF(m.t)));
}
				 

module.exports = wnd;
