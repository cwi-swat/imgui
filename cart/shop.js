
'use strict';


/**
 * Data model
 */

var autoNumber = 0;

class Article {
    constructor (name, price) {
	this.id = ++autoNumber; // UUID for this article
	this.name = name;
	this.price = price;
    }
}

class Entry {
    constructor (article) {
	this.id = ++autoNumber; // UUID for this entry
	this.article = article;
	this.amount = 1;
    }

    get price() {
        return this.article ? this.article.price * this.amount : 0;
    }
}

class ShoppingCart {
    constructor () {
	this.entries = [];
    }

    get total() {
        return this.entries.reduce(function(sum, entry) {
            return sum + entry.price;
        }, 0);
    }
}

// Some available articles
var articles = [
    ['Funny Bunnies', 17.63],
    ['Awesome React', 23.95],
    ['Second hand Netbook', 50.00]
].map(function(e) {
    return new Article(e[0], e[1]);
});

// Our shopping cart
var cart = new ShoppingCart();

// With a demo item inside
cart.entries.push(new Entry(articles[0]));


var model = {
    articles: articles,
    cart: cart
}


/*
 * GUI
 */ 

var TrimGUI = require('../libimgui');

var ig = new TrimGUI(app, model, 'root');


function app(model) {
    shopDemoView(model.articles, model.cart);
}

function shopDemoView(articles, cart) {
    ig.table(() => {
	ig.tr(() => {
	    ig.td({colspan: 2}, () => {
		if (ig.button('update some items')) {
		    update(articles);
		}
		if (ig.button('create a lot of items')) {
		    generate(articles, cart);
		}
	    });
	});
	ig.tr(() => {
	    ig.td(() => {
		ig.h2('Available items');
		articlesView(cart, articles);
	    });
	    ig.td(() => {
		ig.h2('Your shopping cart');
		cartView(cart);
	    });
	});
    });
}

function generate(articles, cart) {
    var amount = parseInt(prompt('How many articles and entries should be created?', 1000));
    for(var i = 0; i < amount; i++) {
        var art = new Article('Generated item ' + articles.length, articles.length);
        articles.push(art);
        cart.entries.push(new Entry(art));
    }
}



function update(articles) {
    for(var i = 0; i < 10; i++) {
        var article = articles[Math.floor(Math.random() * articles.length)];
        article.name += 'x';
        article.price += 1;
    }
}

function articlesView(cart, articles) {
    ig.div(() => {
	if (ig.button('new article')) {
	    articles.push(new Article(prompt('Article name'),
				      prompt('Price (please fill in a number)')));
	}
	ig.ul(() => {
	    for (var i = 0; i < articles.length; i++) {
		articleView(cart, articles, articles[i], i);
	    }
	});
    });
}

function articleView(cart, articles, article, i) {
    ig.li(() => {
	ig.span(article.name);
	if (ig.button('>>')) {
	    var existingEntry = cart.entries.find(entry => entry.article === article);
            if (existingEntry) {
		existingEntry.amount += 1;
            }
	    else {
		cart.entries.unshift(new Entry(article))
	    }
	    
	}
	if (ig.button('edit')) {
            article.name = prompt('New name', article.name);
            article.price = parseInt(prompt('New price', article.price), 10);
	}
	ig.klass('price').span('€ ' + article.price);
    });
}


function cartView(cart) {
    ig.div(() => {
	ig.ul(() => {
	    for (var i = 0; i < cart.entries.length; i++) {
		var entry = cart.entries[i];
		ig.li(() => {
		    if (ig.button('<<')) {
			if (--entry.amount < 1) {
			    cart.entries.splice(cart.entries.indexOf(entry), 1);
			}
		    }
		    ig.span(entry.article.name);
		    ig.klass('price').span(entry.amount + 'x'); 
		});
	    }
	});
	ig.span(('Total: € ' + cart.total).replace(/(\.\d\d)\d*/,'$1'));
    });
}


module.exports = ig;
