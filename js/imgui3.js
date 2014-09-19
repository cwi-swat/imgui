
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
function callit(site, func, model, args, initViewState) {
    var key = [site, func.name, objectId(model)].toString();
    console.log("Key = " + key);
    if (!memo[key]) {
        memo[key] = clone(initViewState);
        memo[key].__owner = key
    }
    var mval = memo[key];
    var newArgs = [model].concat(args).concat([mval]);
    return func.apply(this, newArgs);
}

function todoView(item, idx, items, vs) {
    label("lab" + idx, item.label); 
    for (var ev of checkBox("chk" + idx, item.done)) {
        if (ev)
            item.done = GUI.checked;
    }
    for (var _ of button("del" + idx, "Delete")) 
        items.splice(idx, 1);

    for (var _ of button("vs" + idx, "Toggle viewstate"))  {
        vs.toggle = !vs.toggle;
    }
    
    label("toggle", vs.toggle);
 
}

function todoApp(todo, vs) {
    for (var ulEvent of ul("todos")) {
        for (var idx in todo.items) {
            for (var liEvent of li())
                callit(__LINE__, todoView, todo.items[idx], [idx, todo.items], {toggle: false});
        }
        for (var _ of li()) {
            for (var _ of button("addit", "Add")) {
                todo.items.push({label: vs.newTodo, done: false});
                vs.newTodo = "";
            }
            for (var newTodo of textbox("new", vs.newTodo)) 
                vs.newTodo = newTodo;
        }
    }

    
    label("json", JSON.stringify(todo));
    

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
