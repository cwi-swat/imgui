
all:
	browserify examples.js --debug --standalone app > bundle.js


publish:
	scp bundle.js index.html storm@marseilles.sen.cwi.nl:/ufs/storm/public_html/libimgui
