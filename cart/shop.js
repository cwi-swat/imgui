
"use strict";


var imgui = require('../libimgui');
imgui.install(window);


var autoNumber = 0;

/**
 * Data model
 */

function Article(name, price) {
    this.id = ++autoNumber; // UUID for this article
    this.name = name;
    this.price = price;
}

function ShoppingCartEntry(article) {
    this.id = ++autoNumber; // UUID for this entry
    this.article = article;
    this.amount = 1;
    this.price = function() {
        return this.article ? this.article.price * this.amount : 0;
    };
}

function ShoppingCart() {
    this.entries = [];
    this.total = function() {
        return this.entries.reduce(function(sum, entry) {
            return sum + entry.price();
        }, 0);
    };
}

// Some available articles
var articles = [
    ["Funny Bunnies", 17.63],
    ["Awesome React", 23.95],
    ["Second hand Netbook", 50.00]
].map(function(e) {
    return new Article(e[0], e[1]);
});

// Our shopping cart
var cart = new ShoppingCart();

// With a demo item inside
cart.entries.push(new ShoppingCartEntry(articles[0]));


var model = {
    articles: articles,
    cart: cart
}

function app(model) {
    shopDemoView(model.articles, model.cart);
}

function shopDemoView(articles, cart) {
    table(function() {
	tr(function () {
	    td({colspan: 2}, function () {
		if (button("update some items")) {
		    update(articles);
		}
		if (button("create a lot of items")) {
		    generate(articles, cart);
		}
	    });
	});
	tr(function () {
	    td(function() {
		h2("Available items");
		articlesView(cart, articles);
	    });
	    td(function() {
		h2("Your shopping cart");
		cartView(cart);
	    });
	});
    });
}

function generate(articles, cart) {
    var amount = parseInt(prompt("How many articles and entries should be created?", 1000));
    for(var i = 0; i < amount; i++) {
        var art = new Article("Generated item " + articles.length, articles.length);
        articles.push(art);
        cart.entries.push(new ShoppingCartEntry(art));
    }
}



function update(articles) {
    for(var i = 0; i < 10; i++) {
        var article = articles[Math.floor(Math.random() * articles.length)];
        article.name += "x";
        article.price += 1;
    }
}

function articlesView(cart, articles) {
    div(function () {
	if (button("new article")) {
	    articles.push(new Article(prompt("Article name"), prompt("Price (please fill in a number)")));
	}
	ul(function () {
	    for (var i = 0; i < articles.length; i++) {
		articleView(cart, articles, articles[i], i);
	    }
	});
    });
}

function articleView(cart, articles, article, i) {
    li(function() {
	span(article.name);
	if (button(">>")) {
	    var existingEntry = cart.entries.find(function(entry) {
		return entry.article === article;
            });
            if (existingEntry) {
		existingEntry.amount += 1;
            }
	    else {
		cart.entries.unshift(new ShoppingCartEntry(article))
	    }
	    
	}
	if (button("edit")) {
            article.name = prompt("New name", this.props.article.name);
            article.price = parseInt(prompt("New price", this.props.article.price), 10);
	}
	// {class: "price"}, 
	span("€ " + article.price);
    });
}


function cartView(cart) {
    div(function () {
	ul(function() {
	    for (var i = 0; i < cart.entries.length; i++) {
		var entry = cart.entries[i];
		li(function () {
		    if (button("<<")) {
			if (--entry.amount < 1) {
			    cart.entries.splice(cart.entries.indexOf(entry), 1);
			}
		    }
		    span(entry.article.name);
		    // {class: "price"}
		    span(entry.amount + "x"); 
		});
	    }
	});
	span("Total: € " + cart.total()); //.replace(/(\.\d\d)\d*/,"$1"));
    });
}



function run() {
    setup(app, model, 'root');
}


module.exports = run;
