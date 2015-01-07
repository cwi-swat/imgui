

var imgui = require('../libimgui');

var model = {
    temp: 0
};

function run() {
    imgui.setup(celsiusApp, model);
}

var celsiusApp = imgui.component({}, function celsiusApp(model) {
    imgui.text("Celsius:");
    for (var c of imgui.textbox(Math.round(model.temp))) 
        model.temp = c;

    imgui.text("Fahrenheit:");
    for (var f of imgui.textbox(Math.round(model.temp * 9.0/5.0 + 32))) 
        model.temp = (parseFloat(f) - 32) * 5.0/9.0;
	
});
				 

module.exports = run;
