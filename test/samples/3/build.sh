#!/bin/sh

set -e

PATH=../../../node_modules/.bin:$PATH

rm -rf tmp
mkdir tmp

cp src/* tmp/

( cd tmp
	babel app.js -o app.babel.js --source-maps inline -b es6.modules,useStrict
	esperanto -i app.babel.js -o app.esperanto.js -m inline -t cjs
)