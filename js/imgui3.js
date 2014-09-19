
"use strict";

var GUI = {
    change: true,
    onClick: null,
    hasFocus: null,
    textBox: null,
    checkBox: null,
    value: null,
    checked: false,
    timerDone: null,
    timeActive: null
}


function clearScreen() {
    $("#content").empty();
}


var todos = {
    items:   [
        { 
            label: "Reviewing",
            done: false
        }
    ]
};


function renderLoop() {
    if (GUI.change) {
        GUI.change = false;
        clearScreen();
        callit(__LINE__, todoApp, todos, [], {newTodo: ""});
    }
    window.requestAnimationFrame(renderLoop);
}

var FOCUS;
function run() {
    FOCUS = $("#content");
    window.requestAnimationFrame(renderLoop);
}


function getLine(offset) {
  var stack = new Error().stack.split('\n'),
      line = stack[(offset || 1) + 1].split(':');
  return parseInt(line[line.length - 2], 10);
}
 
window.__defineGetter__('__LINE__', function () {
  return getLine(2);
});


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
/*

- we need the stack because of nesting
def f()
  g()
  g()
end

def g()
  h() > all h's will share viewstate even though they come via different g's
end

- view-state ~=~ with presentation structure ~=~ how the code unfolds
- we need __LINE__ to deal with duplicate calls to same thing
- we need model items to deal with for
- a (minor?) problem
if (x)
  f(m, true)
else
  f(m, false)
although you could say the intent is to share view-state, they won't be
because different lines (could rewrite in this case to f(m, x), but is
that general?

Idea: visualize components as nested boxes + associated state.


Paper
- imgui: guis = output only, like drawing/printing
- mutable
- view-state maintenance: call traces + object ids + memoization (?)
  - render different things of same type -> different view states
  - render same thing multiple times (why we need loc)

- immutable: render functions compute new values (models = algebraic data types)
- paths for identity: view state update
- application logic: compute new value
- align view-state patch paths in memo table.

*/


var callStack = [];
function callit(site, func, model, args, initViewState) {
    callStack.push([site, func.name, objectId(model)].toString());
    var key = callStack.toString();
    console.log("Key = " + key);
    if (!memo[key]) {
        memo[key] = clone(initViewState);
        memo[key].__owner = key
    }
    var mval = memo[key];
    var newArgs = [model].concat(args).concat([mval]);
    var x = func.apply(this, newArgs);
    callStack.pop();
    return x;
}

// TODO: invent ids automatically.

function todoView(item, idx, items, vs) {
    label("lab" + idx, item.label); 
    for (var ev of checkBox("chk" + callStack.toString(), item.done)) {
        if (ev)
            item.done = GUI.checked;
    }
    for (var _ of button("del" + callStack.toString(), "Delete")) 
        items.splice(idx, 1);

    for (var _ of button("vs" + callStack.toString(), "Toggle viewstate"))  {
        vs.toggle = !vs.toggle;
    }
    
    label("toggle", vs.toggle);
 
}

function todoList(todo, vs) {
    for (var ulEvent of ul("todos")) {
        for (var idx in todo.items) {
            for (var liEvent of li())
                callit(__LINE__, todoView, todo.items[idx], [idx, todo.items], {toggle: false});
        }
    }
}

function todoApp(todo, vs) {
    callit(__LINE__, todoList, todo, [], {});

    callit(__LINE__, todoList, todo, [], {});
 
    br();
    
    for (var _ of button("addit", "Add")) {
        todo.items.push({label: vs.newTodo, done: false});
        //vs.newTodo = "";
    }
    for (var newTodo of textbox("new", vs.newTodo)) 
        vs.newTodo = newTodo;


    br();
    label("A", "Model: ");
    label("json", JSON.stringify(todo));
    br();
    label("B", "View state: ");
    label("viewstate", JSON.stringify(memo));

}



function *timer(id, delay) {
    // NB: we can have only one timer at a time, for now. 
    
    if (GUI.timerDone === id) {
        GUI.timerDone = null;
        GUI.timerActive = null;
        yield true;
        GUI.change = true;
        return;
    }
    if (GUI.timerActive === id) {
        // don't restart the timer
        return;
    }
    GUI.timerActive = id;
    window.setTimeout(function(){
        GUI.timeActive = null;
        GUI.timerDone = id;
        GUI.change = true;
    }, delay);
}

function* li() {
    var elt = $("<li></li>");
    var parent = FOCUS;
    parent.append(elt);
    FOCUS = elt;
    yield null;
    FOCUS = parent;
}

function br() {
    FOCUS.append("<br/>");
}

function* ul(id) {
    var elt = $("<ul id='" + id + "'></ul>");
    var parent = FOCUS;
    parent.append(elt);
    FOCUS = elt;
    yield false;
    FOCUS = parent;
}

function* button(id, label) {
    FOCUS.append("<button id='" + id + "' " 
                          + "onClick='GUI.onClick = \"" + id + "\"; GUI.change = true;'"
                          + ">" 
                          + label + "</button>");
    if (GUI.onClick === id) {
        GUI.onClick = null;
        yield true;
        GUI.change = true;
    }
}

function* checkBox(id, chk) {
    if (GUI.checkBox === id) {
        if (GUI.checked) {
            FOCUS.append("<input id='" + id + "' type='checkbox' checked='true' onChange='GUI.checkBox=\"" + id + "\"; GUI.checked = this.checked; GUI.change = true;'>");
        }
        else {
            FOCUS.append("<input id='" + id + "' type='checkbox' onChange='GUI.checkBox=\"" + id + "\"; GUI.checked = this.checked; GUI.change = true;'>");
        }

        GUI.checkBox = null;
        yield true;
        GUI.change = true;
    }
    else {
        if (chk) {
            FOCUS.append("<input id='" + id + "' type='checkbox' checked='" + chk + "' onChange='GUI.checkBox=\"" + id + "\"; GUI.checked = this.checked; GUI.change = true;'>");
        }
        else {
            FOCUS.append("<input id='" + id + "' type='checkbox' onChange='GUI.checkBox=\"" + id + "\"; GUI.checked = this.checked; GUI.change = true;'>");
        }
        yield false;
    }
}

function* textbox(id, value) {
    if (GUI.textBox === id) {
        FOCUS.append("<input type='text' id='" + id + "' " 
                     + "onFocus='GUI.hasFocus = \"" + id + "\";' "
                     + "onInput='GUI.textBox = \"" + id + "\"; GUI.value = this.value; GUI.change = true;' "
                     + "value='" + GUI.value + "'>");
        GUI.textBox = null;
        yield GUI.value;
        GUI.change = true;
    }
    else {
        FOCUS.append("<input type='text' id='" + id + "' " 
                     + "onFocus='GUI.hasFocus = \"" + id + "\";' "
                     + "onInput='GUI.textBox = \"" + id + "\"; GUI.value = this.value; GUI.change = true;'"
                     + " value='" + value + "'>");
    }
    if (GUI.hasFocus === id) {
        $("#" + id).putCursorAtEnd();
    }
    
}


function label(id, value) {
    FOCUS.append("<span id='" + id + "'>" + value + "</span>");
}


function* label_(id, value) {
    FOCUS.append("<span id='" + id + "' onClick='GUI.onClick=\"" + id + "\"';>" + value + "</span>");
    if (GUI.onClick === id) {
        GUI.onClick = null;
        yield true;
    }
}



// function todo(t) {
//     var isEditable = false;
//     if (isEditable) {
//         var x = textbox(t.text);
//         if (x) {
//             isEditable = false;
//             t.text = x;
//         }
//     }
//     else {
//         if (label(t.text)) { // if clicked
//             isEditable = true;
//         }
//     }
//     return t;
// }




// From http://css-tricks.com/snippets/jquery/move-cursor-to-end-of-textarea-or-input/
jQuery.fn.putCursorAtEnd = function() {

  return this.each(function() {

    $(this).focus()

    // If this function exists...
    if (this.setSelectionRange) {
      // ... then use it (Doesn't work in IE)

      // Double the length because Opera is inconsistent about whether a carriage return is one character or two. Sigh.
      var len = $(this).val().length * 2;

      this.setSelectionRange(len, len);
    
    } else {
    // ... otherwise replace the contents with itself
    // (Doesn't work in Google Chrome)

      $(this).val($(this).val());
      
    }

    // Scroll to the bottom, in case we're in a tall textarea
    // (Necessary for Firefox and Google Chrome)
    this.scrollTop = 999999;

  });

};
