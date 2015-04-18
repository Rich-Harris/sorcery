#!/bin/sh

set -e

PATH=../../../node_modules/.bin:$PATH

rm -rf tmp
mkdir tmp

cp src/* tmp/

( cd tmp
	browserify -e main.js -d -o bundle.js
	uglifyjs -c -m --source-map=bundle.min.js.map -- bundle.js > bundle.min.js
)