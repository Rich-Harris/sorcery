#!/bin/bash

# This creates helloworld.js and helloworld.js.map
coffee -cm helloworld.coffee

# This creates helloworld.min.js and helloworld.min.js.map
uglifyjs -cm --source-map=helloworld.min.js.map helloworld.js > helloworld.min.js