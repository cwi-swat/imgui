"use strict";

var imgui = require('../libimgui');
imgui.install(window);

var model = {
    subtree: {paths: [[]], selected: hole()}
};

function run() {
    setup(streditApp, model, 'root');
}


function pp(tree) {
    function op(tree) {
	return tree.focus ? "[" : "(";
    }

    function cl(tree) {
	return tree.focus ? "]" : ")";
    }

    if (tree.label === null) {
	return op(tree) + cl(tree);
    }


    if (tree.label.match(/[abc]/)) {
	return op(tree) + tree.label + cl(tree);
    }

    if (tree.label === "Add") {
	return op(tree) + pp(tree.kids[0]) + " + " + pp(tree.kids[1]) + cl(tree);
    }

    if (tree.label === "Mul") {
	return op(tree) + pp(tree.kids[0]) + " * " + pp(tree.kids[1]) + cl(tree);
    }

    if (tree.label === "If") {
	return op(tree) + "if " + pp(tree.kids[0]) + " then " + pp(tree.kids[1]) + " else " + pp(tree.kids[2]) + cl(tree);
    }

}


function focused(tree, f) {
    if (tree.focus) {
	delete tree.focus;
	on("span", [], {class: "focus"}, f);
    }
    else {
	f();
    }
}


function renderInfix(tree, symbol, parent, left) {
    function parens(f) {
	if (precedence[parent] > precedence[tree.label]
	    || (tree.label === parent && left && !associatesLeft[parent] )) {
	    text("(");
	    f();
	    text(")");
	}
	else {
	    f();
	}
    }
    
    focused(tree, function () {
	parens(function () {
	    renderTree(tree.kids[0], tree.label, true);
	    text(" " + symbol + " ");
	    renderTree(tree.kids[1], tree.label, false);
	});
    });
}

function renderTree(tree, parent, side) {

    if (tree.label === null) {
	focused(tree, function() { text("<>") });
    }
    else if (tree.label === "Add") {
	renderInfix(tree, "+", parent, side);
    }
    else if (tree.label === "Mul") {
	renderInfix(tree, "*", parent, side);
    }
    else if (tree.label === "Exp") {
	renderInfix(tree, "^", parent, side);
    }
    else if (tree.label === "(") {
	text("(");
	renderTree(tree.kids[0]);
    }
    else {
	focused(tree, function() { text(tree.label); });
    }

}

function keyDiv(keys, body) {
    function setFocus(elt) {
	elt.focus();
    }

    on("div", ["keydown:" + keys.join("/")], {tabindex: 1, extra: setFocus}, body);
}

var streditApp = component({keys: []}, function streditApp(self, model) {
    var tokens = ["a", "b", "c", "Add", "Mul", "Exp", "If"];
    
     for (var i = 0; i < tokens.length; i++) {
    	if (button(tokens[i])) {
    	    model.subtree = entry2(tokens[i], model.subtree);
    	}
    }

    if (button("(")) {
    	model.subtree = open(model.subtree);
    }

    if (button(")")) {
    	model.subtree = close(model.subtree);
    }

    var navs = {
	Up: lift1(up),
	Down: lift1(down),
	Left: lift1(left),
	Right: lift1(right),
	Del: lift1(kill),
	Prom: lift1(promote),
	Next: lift1(next),
	Prev: lift1(previous2)
    };
    for (var n in navs) {
	if (navs.hasOwnProperty(n)) {
	    if (button(n)) {
		model.subtree = navs[n](model.subtree);
	    }
	}
    }

    br();

    var t = hostWithParens(model.subtree);

    keyDiv(["shift+9", "shift+0", "[a-z]", "shift+=", "shift+8", "shift+6", "shift+arrow-up", "[←-↓]", "backspace"],
	   function (ev) {
	       renderTree(t);
	       if (ev) {
		   if (ev.isKey("arrow-up")) {
		       model.subtree = navs.Up(model.subtree);
		   }
		   else if (ev.isKey("arrow-down")) {
		       model.subtree = navs.Down(model.subtree);
		   }
		   else if (ev.isKey("arrow-left")) {
		       model.subtree = navs.Prev(model.subtree);
		   }
		   else if (ev.isKey("arrow-right")) {
		       model.subtree = navs.Next(model.subtree);
		   }
		   else if (ev.isKey('backspace')) {
    		       model.subtree = navs.Del(model.subtree);
		   }
		   else if (ev.isKey('shift+arrow-up')) {
    		       model.subtree = navs.Prom(model.subtree);
		   }
		   else if (ev.isKey('shift+9')) {
    		       model.subtree = open(model.subtree);
		   }
		   else if (ev.isKey('shift+0')) {
    		       model.subtree = close(model.subtree);
		   }
		   else if (ev.isKey('[a-z]')) {
		       var ch = String.fromCharCode(ev.keyCode).toLowerCase();
		       model.subtree = entry2(ch, model.subtree);
		   }
		   else if (ev.isKey('shift+=')) {
		       model.subtree = entry2("Add", model.subtree);
		   }
		   else if (ev.isKey('shift+6')) {
		       model.subtree = entry2("Exp", model.subtree);
		   }
		   else if (ev.isKey('shift+8')) {
		       model.subtree = entry2("Mul", model.subtree);
		   }
		   else {
		       self.keys.push("ugh: " + String.fromCharCode(ev.keyCode));
		   }
	       }	    
	       p(self.keys.join(', '));
	   });
    


    h3("Model.subtree");
    p(JSON.stringify(model.subtree));

    h3("Host");
    p(JSON.stringify(t));
});




var aTree = {
    label: "Some label",
    kids: []
};

function atomic(t) {
    return t.kids.length === 0;
}

function hole() {
    return {label: null, kids: []};
}


function preorder(tree) {
    var l = [];
    for (var i = 0; i < t.kids.length; i++) {
	l = l.concat(preorder(t.kids[i]));
    }
    return l;
}

var aSubTree = {
    path: [], // layers
    selected: aTree
};

function atHole(subtree) {
    return subtree.selected.label === null;
}

var aLayer = {
    label: "a label",
    left: [], // trees
    right: [], // trees
};

function embed(tree, layer) {
    var kids = [];
    for (var i = 0; i < layer.left.length; i++) {
	kids.push(layer.left[i]);
    }
    kids.push(tree); 
    for (var i = 0; i < layer.right.length; i++) {
	kids.push(layer.right[i]);
    }
    return {label: layer.label, kids: kids};
}


function hostWithParens(subtree2) {
    // like host, but inserts open "(" for each level
    // in paths (except outermost).
    
    var t = {label: subtree2.selected.label, kids: subtree2.selected.kids, focus: true};
    for (var i = 0; i < subtree2.paths.length; i++) {
	var path = subtree2.paths[i];
	for (var j = 0; j < path.length; j++) {
	    t = embed(t, path[j]);
	}
	t = {label: "(", kids: [t]};
    }
    return t.kids[0]; // remove outer "("
}


function host(subtree) {
    var t = {label: subtree.selected.label, kids: subtree.selected.kids, focus: true};
    for (var i = 0; i < subtree.path.length; i++) {
	//console.log("layer = " + util.inspect(subtree.path[i], {depth: null}));
	//console.log("t = " + util.inspect(t, {depth: null}));
	t = embed(t, subtree.path[i]);
    }
    //console.log("result t = " + util.inspect(t, {depth: null}));
    return t;
}

function left(subtree) {
    if (isLeftMost(subtree)) {
	return subtree;
    }

    var lab = subtree.path[0].label;

    // get the new tree
    var lft = subtree.path[0].left;
    var last = lft[lft.length - 1];

    // what remains on the left
    var l = lft.slice(0, lft.length - 1);

    // the right
    var r = subtree.path[0].right;

    var ls = subtree.path.slice(1); // tail

    // the old position
    var sel = subtree.selected;
    
    var result = {path: [{label: lab, left: l, right: [sel].concat(r)}].concat(ls), selected: last};
    //console.log("in left: ");
    //console.log(result);
    return result;
}

function right(subtree) {
    if (isRightMost(subtree)) {
	return subtree;
    }
    
    var lab = subtree.path[0].label;

    // get the new tree
    var rght = subtree.path[0].right;
    var first = rght[0];

    // what remains on the right
    var r = rght.slice(1);

    // the left
    var l = subtree.path[0].left;

    var ls = subtree.path.slice(1);

    // the old position
    var sel = subtree.selected;
    // console.log("l = ");
    // console.log(l);
    // console.log(sel);
    // console.log(l.concat([sel]));
    
    var result = {path: [{label: lab, left: l.concat([sel]), right: r}].concat(ls), selected: first};
    // console.log("in right: ");
    // console.log(result);
    return result;
}


function isLeftMost(subtree) {
    return subtree.path.length === 0 || subtree.path[0].left.length === 0;
}

function isRightMost(subtree) {
    return subtree.path.length === 0 || subtree.path[0].right.length === 0;
}

function up(subtree) {
    if (isTopMost(subtree)) {
	return subtree;
    }
    var layer = subtree.path[0];
    var above = subtree.path.slice(1);
    return {path: above, selected: embed(subtree.selected, layer) };
}

function isTopMost(subtree) {
    return subtree.path.length === 0;
}

function down(subtree) {
    if (isBottomMost(subtree)) {
	return subtree;
    }
    var p = subtree.path;
    var lab = subtree.selected.label;
    var t = subtree.selected.kids[0];
    var ts = subtree.selected.kids.slice(1);
    
    return {path: [{label: lab, left: [], right: ts}].concat(p), selected: t};
}

function isBottomMost(subtree) {
    return subtree.selected.kids.length === 0;
}


function rightUp(subtree) {
    while (!isTopMost(subtree) && isRightMost(subtree)) {
	subtree = up(subtree);
    }
    return right(subtree);
}

function leftDown(subtree) {
    while (!isBottomMost(subtree) && isLeftMost(subtree)) {
	subtree = down(subtree);
    }
    return left(subtree);
}

function next(subtree) {
    if (isBottomMost(subtree)) {
	return rightUp(subtree);
    }
    return down(subtree);
}

function previous2(subtree) {
    if (isRightMost(subtree)) {
	return left(subtree);
    }
    return nextSuchThat(function (s) { return isRightMost(s) && isBottomMost(s); }, up(subtree));
}

function previous(subtree) {
    if (isTopMost(subtree)) {
	return leftDown(subtree);
    }
    return up(subtree);
}

function nextSuchThat(pred, subtree) {
    var st2 = next(subtree); // always move.
    while (!isTopMost(st2) && !pred(st2)) {
	st2 = next(st2);
    }
    return pred(st2) ? st2 : subtree;
}

function replace(tree, subtree) {
    return {path: subtree.path, selected: tree};
}


var templates = {
    "(": {label: "(", kids: [hole()] },
    If: {label: "If", kids: [hole(), hole(), hole()]},
    Add: {label: "Add", kids: [hole(), hole()]},
    Mul: {label: "Mul", kids: [hole(), hole()]},
    Exp: {label: "Exp", kids: [hole(), hole()]}
}

function insert(label, subtree) {
    //console.log("Insert: " + label);
    //console.log("Subtree: ");
    //console.log(subtree);
    // this doesn't work: we're moving to next immediately,
    // if there are more holes to be filled.
    if (!templates[label]) { //&& !atHole(subtree) && subtree.selected.kids.length === 0) {
	var l = subtree.selected.label;
	var t = {label: (l === null ? "" : l) + label, kids: []};
	return {path: subtree.path, selected: t};
    }
    var template = templates[label] || {label: label, kids: []};
    return treeInsert(template, subtree);
}

function treeInsert(tree, subtree) {
    if (atHole(subtree)) {
	return replace(tree, subtree);
    }
    return replace(subtree.selected, down(replace(tree, subtree)));
}

function kill(subtree) {
    return replace(hole(), subtree);
}

function promote(subtree) {
    return replace(subtree.selected, up(subtree));
}

function situation(subtree) {
    if (subtree.path.length === 0) {
	return [];
    }
    return subtree.path.slice(0,1);
}

function graft(path, subtree) {
    return {path: path.concat(subtree.path), selected: subtree.selected};
}

function enter(label, subtree) {
    return nextSuchThat(atHole, insert(label, subtree));
}

function entry(label, subtree) {
    return enter(label, reduce(label, subtree));
}

function reduce(label, subtree) {
    while (!isIrreducible(label, subtree)) {
	//console.log("Reducing: " + util.inspect(subtree, {depth: null}));
	subtree = up(subtree);
    }
    return subtree;
}

function isIrreducible(label, subtree) {
    return atHole(subtree)
	|| isTopMost(subtree)
	|| !isRightMost(subtree)
	|| !(isProducable(label, up(subtree).selected.label));
}


var associatesLeft = {
    If: false,
    Add: true,
    Mul: true,
    Exp: false,
    a: false,
    b: false,
    c: false,
    d: false
};


var precedence = {
    If: 1000,
    Add: 100,
    Mul: 200,
    Exp: 300,
    a: 10000,
    b: 10000,
    c: 10000,
    d: 10000
};

function isProducable(op2, op1) {
    // console.log("Checking producable: " + op2 + ", " + op1);
    // console.log("Precedence: " + precedence[op2] + ", " + precedence[op1]);
    var r = (op1 === op2 && associatesLeft[op1]) || precedence[op1] > precedence[op2];
    //console.log("Result: " + r);
    return r;
}






function flatten(subtree2) {
    var path = [];
    //console.log("FLATTEN:");
    //console.log(util.inspect(subtree2, {depth: null}));
    for (var i = 0; i < subtree2.paths.length; i++) {
	path = path.concat(subtree2.paths[i]);
    }
    return {path: path, selected: subtree2.selected};
}

function lift1(s2s) {
    return function (s2) {
	//console.log(s2);
	var s = s2s({path: s2.paths[0], selected: s2.selected});
	return {paths: [s.path].concat(s2.paths.slice(1)), selected: s.selected};
    }
}

function lift2(s2s) {
    return function (x, s2) {
	var s = s2s(x, {path: s2.paths[0], selected: s2.selected});
	return {paths: [s.path].concat(s2.paths.slice(1)), selected: s.selected};
    };
}

var entry2 = lift2(entry);
var right2 = lift1(right);

function open(subtree2) {
    return {paths: [[]].concat(subtree2.paths), selected: subtree2.selected};
}

function close(subtree2) {
    if (subtree2.paths.length <= 1) {
	return subtree2;
    }
    var p = subtree2.paths[0];
    var ps = subtree2.paths.slice(1);
    var t = subtree2.selected;
    var s = host({path: p, selected: t});
    return right2({paths: ps, selected: s});
}

var util = require('util');


function enterString(arr) {
    //console.log("INPUT = " + arr);
    var st = {path: [], selected: hole()};
    for (var i = 0; i < arr.length; i++) {
	//console.log("================> Entering: " + arr[i]);
	st = entry(arr[i], st);
	//console.log("RESULT: ");
	//console.log(util.inspect(st, {depth: null}));
    }
    return st;
}

console.log("EXAMPLE: a * b + c * d");
var example = enterString(["a", "Mul", "b", "Add", "c", "Mul", "d"]);
console.log(util.inspect(host(example), {showHidden: false, depth: null}));


console.log("\n\n\n\nEXAMPLE: * + a b + c d)");
var example2 = enterString(["Mul", "Add", "a", "b", "Add", "c", "d"]);
console.log(util.inspect(host(example2), {showHidden: false, depth: null}));

//console.log("\nSubtree:");
//console.log(util.inspect(example2, {showHidden: false, depth: null}));


// console.log("\n\n\n\nEXAMPLE:  + * a b * c d");
// var example3 = enterString(["Add", "Mul", "a", "b", "Mul", "c", "d"]);
// console.log(util.inspect(host(example3), {showHidden: false, depth: null}));


// console.log("\n\n\n\nEXAMPLE: (a + b) * c");
// var example4 = enterString(["Add", "Mul", "a", "b", "c"]);
// console.log("END RESULT:");
// console.log(util.inspect(host(example4), {showHidden: false, depth: null}));

// console.log("\nSubtree:");
// console.log(util.inspect(example4, {showHidden: false, depth: null}));



function enterBracketedString(arr) {
    var st = {paths: [[]], selected: hole()};
    for (var i = 0; i < arr.length; i++) {
	//console.log("=====> Entering: " + arr[i]);
	if (arr[i] === "(") {
	    st = open(st);
	    //console.log("After open: " + util.inspect(st, {depth: null}));
	    continue;
	}
	if (arr[i] === ")") {
	    st = close(st);
	    continue;
	}
	st = entry2(arr[i], st);
	//console.log("RESULT: ");
	//console.log(st);
    }
    return st;
}




console.log("\n\n\n\nEXAMPLE: (a + b) * (c + d)");
var example3 = enterBracketedString(["(", "a", "Add", "b", ")", "Mul", "(", "c", "Add", "d", ")"]);
console.log("SUBTREE2");
//console.log(util.inspect(example3, {depth: null}));
console.log(util.inspect(host(flatten(example3)), {showHidden: false, depth: null}));


module.exports = run;
