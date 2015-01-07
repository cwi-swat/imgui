
var sweet = require('sweet.js');

var readtable = sweet.currentReadtable().extend({
    '@': function(ch, reader) {
        reader.readPunctuator();
        return reader.makeNumericLiteral(reader.line);
    }
});






