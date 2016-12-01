

all: build

build:
	browserify shop.js --debug --standalone app > bundle.js

publish:
	scp bg.jpg test.css bundle.js shop.js shop.html storm@desktop.cwi.nl:/ufs/storm/public_html/libimgui/shop
