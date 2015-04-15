#!/bin/sh

rm -rf .tmp
mkdir .tmp

set -e

npm test

rm -rf dist
mv .tmp dist
