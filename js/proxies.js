
var todos = {
    items:   [
        { 
            label: "Reviewing",
            done: false
        }
    ]
};


function makeModel(obj) {
    
    function arrayHandler(obj, path) {
	return {
	    get: function (recv, index) {
		console.log("array index = " + index);
		//console.log("type of index = " + typeof index);
		if (index === "__path") {
		    return path;
		}
		var intIndex = parseInt(index);
		if (!isNaN(intIndex)) {
		    //console.log("isnumber: " + intIndex);
		    var val = obj[intIndex];
		    var newPath = path + "[" + intIndex + "]";
		    //console.log("Type of val in array  = " + typeof val);
		    if (val.constructor === Array) {
			return Proxy.create(arrayHandler(val, newPath));
		    }
		    else if (val !== null && val !== undefined && typeof val === 'object') {
			console.log("We hav eobject");
			return Proxy.create(handler(val, newPath));
		    }
		}
		console.log(obj);
		console.log("Return obj[" + index + "] = " + obj[index]);
		return obj[index];
	    },
	    keys: function () {
		console.log("KEYS");
		return Object.keys(obj);
	    },
	    getOwnPropertyDescriptor: function(target, name) {
		console.log("ownPropDesc: " + target + " (name = " + name + ")"); 
		if (target !== null && target !== undefined && typeof target === 'object') {
		    return Object.getOwnPropertyDescriptor(target, name);
		}
		console.log("Returning undefined");
		return undefined;
	    }
	};
    }

    
    function handler(obj, path) {
	return {
	    get: function (recv, index) {
		//console.log("obj index = " + index);
		if (index === "__path") {
		    return path;
		}
		if (obj.hasOwnProperty(index)) {
		    var val = obj[index];
		    //console.log("val = " + val);
		    //console.log("Type of val = " + typeof val);

		    var newPath = path + "/" + index;
		    if (val.constructor === Array) {
			//console.log("Array");
			return Proxy.create(arrayHandler(val, newPath));
		    }
		    else if (val !== null && val !== undefined && typeof val === 'object') {
			return Proxy.create(handler(val, newPath));
		    }
		}
		return obj[index];
	    },
	    keys: function() {
		return Object.keys(obj);
	    },
	    getOwnPropertyDescriptor: function(target, name) {
		//console.log(target);
		if (target !== null && target !== undefined && typeof target === 'object') {
		    return Object.getOwnPropertyDescriptor(target, name);
		}
		return undefined;
	    }
	};
    }

    return Proxy.create(handler(obj, ""));
    
}

var m = makeModel(todos);

var items = m.items;
console.log(items);
console.log(items.__path);
console.log(items[0]);
console.log(items[0].__path);
console.log(items[0].done);
console.log(items[0].label);

var p = items.push
console.log("PUSH = " + p);

items.push({done: false, label: "BLa"});

console.log("ITEMS = " + items);


// for (var i = 0; i < items.length; i++) {
//     console.log(items[i].__path);
// }
