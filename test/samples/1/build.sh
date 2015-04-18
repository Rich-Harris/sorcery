#!/bin/sh

set -e

PATH=../../../node_modules/.bin:$PATH

rm -rf tmp
mkdir tmp

cp src/helloworld.coffee tmp/helloworld.coffee

( cd tmp
	coffee -c -m helloworld.coffee
	uglifyjs -c -m --source-map=helloworld.min.js.map -- helloworld.js > helloworld.min.js
)