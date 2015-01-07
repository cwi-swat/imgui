

function getLine(offset) {
  var stack = new Error().stack.split('\n'),
      line = stack[(offset || 1) + 1].split(':');
  return parseInt(line[line.length - 2], 10);
}
 
global.__defineGetter__('__LINE__', function () {
  return getLine(2);
});
 
console.log(__LINE__);
 
console.log(getLine());

