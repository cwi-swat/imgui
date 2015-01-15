

var imgui = require('../libimgui');
imgui.install(window);

function run() {
    setup(abbabaApp, "ABBABA");
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


var abbabaApp = component({tokens: "", times: []}, function abbabaApp(self, secret) {

    function codeButton(token) {
	if (button(token)) {
	    self.times.push(new Date().getTime());
	    self.tokens += token;
	}
    }

    function isCorrect() {
	return self.tokens.slice(-secret.length) === secret;
    }

    function isWithin(limit) {
	var sub = self.times.slice(-secret.length);
	return sub[sub.length-1] - sub[0] <= limit;
    }

    function isAvailable() {
	return self.tokens.length >= secret.length;
    }


    codeButton("A");
    codeButton("B");

    if (isAvailable()) {
	if (isCorrect()) {
	    if (isWithin(5000)) 
		p("Unlocked");
	    else 
		p("Too slow");
	}
	else 
	    p("Wrong");
    }

});


module.exports = run;
