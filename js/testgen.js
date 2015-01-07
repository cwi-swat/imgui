

// for (var x of generate()) {
//     console.log(x * x);
//     3;
// }


x = generate();
console.log(x.next());


function getLine(offset) {
    var stack = new Error().stack.split('\n'),
	line = stack[(offset || 1) + 2].split(':');
    console.log(stack);
    return parseInt(line[line.length - 2], 10);
}



function args() {
    console.log("args = " + Array.prototype.slice.call(arguments, 1, arguments.length));
}

args(1,2,3);


function f(i) {
    console.log(getLine());
    return i + 2;
}


function* generate() {
    for (var i = 0; i < 10; i++) {
	console.log(yield i * f(i));
    }
}

function* generate2() {
    try {
	yield 3;
    }
    finally {
	console.log("In finally");
    }
}

function call2() {
    for (var x of generate2()) {
	console.log("x = " + x);
	continue;
    }
}

call2();



function generateElements() {
    var elts = ["section", "div", "ul", "li", "header", "footer"];
    var obj = {};
    for (var i = 0; i < elts.length; i++) {
	obj[elts[i]] = function () {
	    var elt = elts[i];
	    return function* (idClass, attrs) {
		yield [idClass, attrs];
	    }
	}();
    }
    return obj;
}

var obj = generateElements();

console.log(obj);

for (var x of obj.section(".alert#main", {value: 3})) {
    console.log(x);
}
