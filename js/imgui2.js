

"use strict";

var GUI = {
    change: true,
    onClick: null,
    hasFocus: null,
    textBox: null,
    checkBox: null,
    value: null,
    timerDone: null,
    timeActive: null
}


function renderLoop(f) {
    if (GUI.change) {
        GUI.change = false;
        f();
    }
    window.requestAnimationFrame(function() { renderLoop(f); });
}

function run(f) {
    window.requestAnimationFrame(function() { renderLoop(f); });
}


var menu = {
    title: "Menu",
    kids: [
        "Home",
        "Contact",
        {title: "Links", kids: [
            "Amazon"
        ]}
    ]
};

function recurseApp() {
    recursive(menu);
}

function recursive(obj) {
    for (var i of loop("item", obj.kids)) {
        if (typeof obj.kids[i] === 'object') {
            recur("menu", "recur");
            recursive(obj.kids[i]);
        }
        else {
            label("label", obj.kids[i]);
        }
    }
}


var tokens = "";
var secret = "abbaba";


function abbaba() {
    for (var _ of button("a")) 
        tokens += "a";
    for (var _ of button("b"))
        tokens += "b";


    label("tokens", tokens);

    if (tokens.length >= 6 && tokens.slice(tokens.length - 6, tokens.length) === secret)  {
        tokens = "";
        label("card", "YES");
    }
    else {
        for (var _ of timer("timer", 5000)) {
            tokens = "";
            label("card", "Too slow!");
        }
    }
}



var model = [
    {label: "Reviewing", done: false},
    {label: "Paper writing", done: true}
];

var newItemLabel = "";

function todoApp() {
    for (var idx of loop("todoItem", model)) 
        todoView(idx, model[idx],  model);

    for (var _ of button("add")) {
        model.push({label: newItemLabel, done: false});
        newItemLabel = "";
    }

    for (var newTodo of textbox("newTodo", newItemLabel)) 
        newItemLabel = newTodo;
    
    label("model", JSON.stringify(model));
}

function todoView(idx, item, items) {
    label("todoText", item.label); 
    for (var ev of checkBox("todoDone", item.done)) 
        item.done = ev;

    if (cond("doneValue", item.done))
        label("doneValue", "Yes");

    for (var _ of button("delete")) 
        items.splice(idx, 1);
}


var stack = [];
function adjust(id) {
    if (stack.length == 0) {
        return id;
    }
    return stack.toString().replace(/,/g, "_")  + "_" + id;
}

function adjustChildIds(elt) {
    elt.attr("id", adjust(""));
    elt.find("[id]").each(function (idx, elt) {
        $(elt).attr("id", adjust($(elt).attr("id")));
    });
    return elt;
}

function label(id, value) {
    var theId = adjust(id);
    var x = $("#" + theId);
    x.html(value);
}

function cond(id, bool) {
    var theId = adjust(id);
    var elt = $("#" + theId);
    if (bool) {
        elt.show();
    }
    else {
        elt.hide();
    }
    return bool;
}

function recur(id, rec) {
    //var theId = adjust(id);
    var elt = $("#" + id);
    var recElt = $("#" + adjust(rec));

    var x = adjustChildIds(elt.clone());
    recElt.replaceWith(x);    
}

function* loop(id, arr) {
    var theId = adjust(id);
    var elt = $("#" + theId);
    var parent = elt.parent();
    elt.hide(); // don't show the template.

    stack.push(id); // NB: not theId
    for (var idx = 0; idx < arr.length; idx++) {
        stack.push(idx);
        if (parent.children().length <= idx + 1) {
            var x = adjustChildIds(elt.clone());
            parent.append(x);
            x.show();
        }
        yield idx;
        stack.pop();
    }
    for (var i = idx; i < parent.children().length - 1; i++) {
        parent.children().last().remove();
    }
    stack.pop();
}


function* button(id, label) {
    var theId = adjust(id);
    $("#" + theId).click(function () {
        GUI.onClick = theId;
        GUI.change = true;
    });
    
    $("#" + theId).html(label);
    
    if (GUI.onClick === theId) {
        GUI.onClick = null;
        yield true;
        GUI.change = true;
    }
}

function* checkBox(id, flag) {
    var theId = adjust(id);
    var chk = $("#" + theId);
    chk.change(function () {
        GUI.checkBox = theId;
        GUI.change = true;
    });
    
    if (GUI.checkBox === theId) {
        GUI.checkBox = null;
        yield chk.prop("checked");
        GUI.change = true;
    }
    else {
        chk.attr("checked", flag);
    }
}



function* textbox(id, value) {
    var theId = adjust(id);
    $("#" + id).blur(function() {
        GUI.textBox = theId;
        GUI.value = $(this).val();
        GUI.change = true;
    });
    if (GUI.textBox === id) {
        GUI.textBox = null;
        yield GUI.value;
        GUI.change = true;
    }
    else {
        $("#" + id).val(value);
    }
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





