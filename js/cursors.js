

function Cursor(obj, path) {
    return Proxy.create({
        get: function (proxy, name) {
            return Cursor(obj[name], path.concat([name]));
        },
        __path: function() {
            return path;
        }
    });
}

var x = Cursor({a: [1, 2]}, []);

console.log(x.a);
