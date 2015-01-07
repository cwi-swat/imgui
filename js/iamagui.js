

var h = require('virtual-dom/h');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');

var parseTag = require('virtual-dom/virtual-hyperscript/parse-tag');

module.exports = clone;
module.exports = render;
module.exports = run;
module.exports = $;
module.exports = echo;


function run(elt, app, model) {
    var oldNode = null;
    var content = document.getElementById(elt);

    function self() {
	if (gui.change) {
            gui.change = false;
	    gui.focus = [];
            var newNode = callit("main", app, model, [], {});
	    if (oldNode === null) {
		var oldChild = content.childNodes[0];
		content.replaceChild(oldChild, newNode);
		oldNode = newNode;
	    }
	    else {
		var patches = diff(oldNode, newNode);
		patch(content.childNodes[0], patches);
	    }
	}
	window.requestAnimationFrame(self);
    }

    window.requestAnimationFrame(self);
}


function eventHandler(ev) {
    return ev + "='function(e){GUI.event=e; GUI.elt=this; GUI.change=true;}'}";
}


var GUI = {
    focus: [],
    event: undefined,
    change: true,
    setChanged: function setChanged() {
	this.event = undefined;
	this.change = true;
    },
    reset: function reset() {
	this.change = false;
	this.focus = [];
    }
}
 

var __next_objid=1;
function objectId(obj) {
    if (obj==null) return null;
    if (obj.__obj_id==null) obj.__obj_id=__next_objid++;
    return obj.__obj_id;
}

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

var memo = {};

var callStack = [];
function render(func, model, args, initViewState) {
    callStack.push([func.name, objectId(model), args.toString()].toString());
    var key = callStack.toString();
    console.log("Key = " + key);
    if (!memo[key]) {
        memo[key] = clone(initViewState);
        memo[key].__owner = key
    }
    var mval = memo[key];
    var newArgs = [model].concat(args).concat([mval]);
    try {
	return func.apply(this, newArgs);
    }
    finally {
	callStack.pop();
    }
}


function echo(txt) {
    GUI.focus.push(new VText(txt));
}

function extractId(selector) {
    var props = {};
    parseTag(selector, props);
    return props['id'];
}

function* $(selector, evs, props) {
    var properties = props || {};
    var events = evs || [];
    
    var id = extractId(selector);
    

    if (id === undefined && events.length > 0) {
	console.log("WARNING: need id for handling events.");
    }
  
    for (var i = 0; i < events.length; i++) {
	properties[events[i]] = eventHandler(events[i]);
    }

    
    var parent = GUI.focus;
    GUI.focus = [];

    try {
	var event = GUI.event;
	if (event && event.target.getAttribute('id') === id) {
	    yield event;
	    GUI.setChanged();
	}
	else {
	    yield undefined;
	}
    }
    finally {
	var vnode = h(selector, properties, GUI.focus);
	parent.push(vnode);
	GUI.focus = parent;
    }
    
}
    

// h('span#warning.alert', "Some text");
// h('a', "Click me", {href: "http://example.com"});
/*

parse the arguments
first => selector (always)
opt second => if string, don't call yield, create directly.
          if array it's the events list
          if object it's the additional properties.

opt third: additional properties
*/
