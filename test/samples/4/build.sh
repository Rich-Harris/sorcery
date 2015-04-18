#!/bin/sh

set -e

PATH=../../../node_modules/.bin:$PATH

rm -rf tmp
mkdir tmp

cp src/* tmp/

( cd tmp
	babel 'file with spaces.js' -o 'file with spaces.babel.js' --source-maps -b es6.modules,useStrict
	esperanto -i 'file with spaces.babel.js' -o 'file with spaces.esperanto.js' -m -t cjs
)