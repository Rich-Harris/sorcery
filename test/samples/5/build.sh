#!/bin/sh

set -e

PATH=../../../node_modules/.bin:$PATH

rm -rf tmp
mkdir tmp

cp src/styles.less tmp/styles.less

( cd tmp
	lessc --source-map -x styles.less styles.css
)