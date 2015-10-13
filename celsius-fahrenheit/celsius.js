

var imgui = require('../libimgui');
imgui.install(window);

var m = {
    t: 0
};

function run() {
    setup(c2f, m, 'root');
} 

function toF(c) {
    return Math.round(c * 9.0/5.0 + 32);
}

function toC(f) {
    return Math.round((parseFloat(f) - 32) * 5.0/9.0);
}

function c2f(m) {
    text("C:")
    m.t = textBox(m.t);

    text("F:")
    m.t = toC(textBox(toF(m.t)));
}
				 

module.exports = run;
