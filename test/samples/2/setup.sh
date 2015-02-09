#!/bin/bash

# This creates bundle.js
browserify main.js -o bundle.js --debug

# This creates bundle.min.js and bundle.min.js.map
uglifyjs -cm --source-map=bundle.min.js.map bundle.js > bundle.min.js