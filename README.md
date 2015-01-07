# libimgui

 “The GUI as stdout”

 “Structure of the code == structure of the GUI”

 

libimgui is a simple, tiny library for programming immediate mode GUIs in the browser. A libimgui app is a straight-line program that (conceptually) just “writes” out the GUI to the screen. Ordinary functions can be used to build reusable component abstractions. Components may have local (view) state which is automatically restored upon re-rendering. 

## Example

Here’s a simple Celsius to Fahrenheit converter in libimgui:

```
var g = require('../libimgui');

var m = {t: 0}; // the model

function toF(c) {…}
function toC(f) {…}

function c2f(m) {
    g.text("C:")
    for (var c of g.textbox(m.t)) 
        m.t = c

    g.text("F:")
    for (var f of g.textbox(toF(m.t))) 
        m.t = toC(f)
}
```

The convenience function `textbox` yields the text contained in the text box when a `blur` event occurs. If this happens the body of the for-of loop is executed and the model (`m`) is updated. Libimgui re-renders the GUI whenever an event occurs.

## Core exported functions

### function setup(app, model)

This function registers a rendering function `app` together with the model `model`. Models are ordinary Javascript objects. 

### function* on(element, events, attributes)

All event handling functions of libimgui eventually end up as invocations of this function. It is a generator that constructs a virtual DOM node of the specified type (`element`) with the provided `attributes`. The second argument (`events`) specifies which events this element should listen to. If one of those events occurs, the actual event object is yielded. If the function is called without such an event occurrence, this function yields `undefined`. As a result, if this function is called in a for-of loop, the body is always executed. A typical use of this function is to define a reusable `button` widget.

```
function button(label) {
  var clicked = false;
  for (var ev of on(“button”, [“click”], {})) {
     if (ev) clicked = true;
     text(label);
  }
  return clicked;
}
```

Since we only request a single event (“click”), there’s no need to check for the type of `ev`: the click event happened whenever `ev` is defined.

### component(viewState, renderFunction)



## Notes

- Don’t `break` or `return` out of for-of loops on libimgui functions, since it will prevent the virtual DOM from being constructed correctly. This seems to be a consequence of ES6 generators: non-local exits from a for-of loop don’t go through `finally` blocks set up in the generator. 

- Since the `app` function may be called many times in a row, it should have no side-effects except in event handling code. The only exception is perhaps when you want to count and display the number of performed renderings. TODO: Deterministic

-	For components with view state, the first argument of the function should always be a model object.
