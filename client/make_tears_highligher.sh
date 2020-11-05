#!/bin/bash
cp -f js/ace-tears/*.js js/ace/lib/ace/mode/

cd js/ace

# The following was missing in my machine.
 npm install -local  # so we can skip the node_modules in svn...
 npm update -local
 npm install -local architect-build
 npm install -local dryice

 mkdir -P ../brace/build/ace-temp/src-min-noconflict/snippet

node ./Makefile.dryice.js -m -nc
node ./Makefile.dryice.js -nc



cd ../brace/build
node ./update.js -local
