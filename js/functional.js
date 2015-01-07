
// type: Item -> Maybe[Item]
function todoView(item, idx, items, vs) {
    label("lab" + idx, item.label); 
    item = for (var ev of checkBox("chk" + callStack.toString(), item.done)) {
        item[done=ev];
    }

    item = for (var _ of button("del" + callStack.toString(), "Delete")) {
        none
    }

    for (var _ of button("vs" + callStack.toString(), "Toggle viewstate"))  {
        vs.toggle = !vs.toggle;
    }
    
    label("toggle", vs.toggle);
    return item;
 
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
