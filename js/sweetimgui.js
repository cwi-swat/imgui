'use strict';
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
    };
function clearScreen() {
    $('#content').empty();
}
function renderLoop() {
    if (GUI.change) {
        GUI.change = false;
        clearScreen();
        todoApp();
    }
    window.requestAnimationFrame(renderLoop);
}
var FOCUS;
function run() {
    FOCUS = $('#content');
    window.requestAnimationFrame(renderLoop);
}
var tokens = '';
var secret = 'abbaba';
var numOfSlots = 0;
var success = false;
var theText = 'Enter text';
var count = 0;
var todo = {
        items: [{
                label: 'Reviewing',
                done: false
            }]
    };
var newItemLabel = '';
var temperature = 0;
function todoView(idx, item, items) {
    label('lab' + idx, item.label);
    for (var ev of checkBox('chk' + idx, item.done)) {
        if (ev)
            item.done = GUI.checked;
    }
    for (var _ of button('del' + idx, 'Delete'))
        items.splice(idx, 1);
}
function todoApp() {
    tag('ul', ['todos'], function () {
        for (var idx in todo.items) {
            tag('li', [], function () {
                todoView(idx, todo.items[idx], todo.items);
            });
        }
    });
    for (var _ of button('addit', 'Add')) {
        todo.items.push({
            label: newItemLabel,
            done: false
        });
        newItemLabel = '';
    }
    for (var newTodo of textbox('new', newItemLabel))
        newItemLabel = newTodo;
    label('json', JSON.stringify(todo));
    br();
    label('c', 'Celsius');
    for (var c of textbox('cels', Math.round(temperature)))
        temperature = c;
    br();
    label('f', 'Fahrenheit');
    for (var f of textbox('fahr', Math.round(temperature * 9 / 5 + 32)))
        temperature = (parseFloat(f) - 32) * 5 / 9;
}
/*
°C  x  9/5 + 32 = °F

(°F  -  32)  x  5/9 = °C
*/
function* timer(id, delay) {
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
    window.setTimeout(function () {
        GUI.timeActive = null;
        GUI.timerDone = id;
        GUI.change = true;
    }, delay);
}
function br() {
    FOCUS.append('<br/>');
}
function tag(name, cls, block) {
    var elt = $('<' + name + '></' + name + '>');
    //document.createElement(name);
    if (cls.length > 0) {
        elt.addClass(cls[0]);
    }
    var parent = FOCUS;
    parent.append(elt);
    FOCUS = elt;
    block();
    FOCUS = parent;
}
function* button(id, label$2) {
    FOCUS.append('<button id=\'' + id + '\' ' + 'onClick=\'GUI.onClick = "' + id + '"; GUI.change = true;\'' + '>' + label$2 + '</button>');
    if (GUI.onClick === id) {
        GUI.onClick = null;
        yield true;
        GUI.change = true;
    }
}
function* checkBox(id, chk) {
    if (GUI.checkBox === id) {
        if (GUI.checked) {
            FOCUS.append('<input id=\'' + id + '\' type=\'checkbox\' checked=\'true\' onChange=\'GUI.checkBox="' + id + '"; GUI.checked = this.checked; GUI.change = true;\'>');
        } else {
            FOCUS.append('<input id=\'' + id + '\' type=\'checkbox\' onChange=\'GUI.checkBox="' + id + '"; GUI.checked = this.checked; GUI.change = true;\'>');
        }
        GUI.checkBox = null;
        yield true;
        GUI.change = true;
    } else {
        if (chk) {
            FOCUS.append('<input id=\'' + id + '\' type=\'checkbox\' checked=\'' + chk + '\' onChange=\'GUI.checkBox="' + id + '"; GUI.checked = this.checked; GUI.change = true;\'>');
        } else {
            FOCUS.append('<input id=\'' + id + '\' type=\'checkbox\' onChange=\'GUI.checkBox="' + id + '"; GUI.checked = this.checked; GUI.change = true;\'>');
        }
        yield false;
    }
}
function* textbox(id, value) {
    if (GUI.textBox === id) {
        FOCUS.append('<input type=\'text\' id=\'' + id + '\' ' + 'onFocus=\'GUI.hasFocus = "' + id + '";\' ' + 'onInput=\'GUI.textBox = "' + id + '"; GUI.value = this.value; GUI.change = true;\' ' + 'value=\'' + GUI.value + '\'>');
        GUI.textBox = null;
        yield GUI.value;
        GUI.change = true;
    } else {
        FOCUS.append('<input type=\'text\' id=\'' + id + '\' ' + 'onFocus=\'GUI.hasFocus = "' + id + '";\' ' + 'onInput=\'GUI.textBox = "' + id + '"; GUI.value = this.value; GUI.change = true;\'' + ' value=\'' + value + '\'>');
    }
    if (GUI.hasFocus === id) {
        $('#' + id).putCursorAtEnd();
    }
}
function label(id, value) {
    FOCUS.append('<span id=\'' + id + '\'>' + value + '</span>');
}
function* label_(id, value) {
    FOCUS.append('<span id=\'' + id + '\' onClick=\'GUI.onClick="' + id + '"\';>' + value + '</span>');
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
jQuery.fn.putCursorAtEnd = function () {
    return this.each(function () {
        $(this).focus();
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