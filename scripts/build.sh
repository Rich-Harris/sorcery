#!/bin/sh

rm -rf .tmp
mkdir .tmp

set -e

npm test

rm dist/*
cp .tmp/* dist
