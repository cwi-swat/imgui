

var imgui = require('../libimgui');

var model = {
    correct: false
};

function run() {
    imgui.setup("content", abbabaApp, model);
}

/*
Given that we have two buttons, A and B, we want to print a message if
a “secret combination” (ABBABA) is clicked within 5 seconds. To make
things a bit harder the following must also be true:

The message should be printed immediately when the secret combination
is clicked. We should not wait until the end of the 5 second interval
before the message is printed.  As soon as the secret combination is
fulfilled (within 5 seconds) the message should be displayed
regardless of what has been clicked before. For example a combination
like “BBABBABA” is ok as long as “ABBABA” is clicked within 5 seconds.
*/

// timers are side-effects, so if you want multiple ones, use multiple
// ids. Take away: components should not have side effects except on
// view-state, and model, conditional on events.
var abbabaApp = imgui.component({tokens: ""}, function abbabaApp(model) {
    for (var _ of imgui.div()) {
	if (imgui.button("A")) this.tokens += "a";
	if (imgui.button("B")) this.tokens += "b";

	var tooLate = imgui.after("timer", 5000);
	var correct = this.tokens.slice(-6) === 'abbaba';

	if (correct && !tooLate) imgui.p("Ok!");
	if (!correct && tooLate) imgui.p("Fail!");
    }
});


module.exports = run;
