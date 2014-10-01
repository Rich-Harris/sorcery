#!/bin/bash

# This file isn't used any more, it's just here as a convenient reference (the command
# line interfaces for coffeescript and uglifyjs are much easier than the node APIs...)

# This creates helloworld.js and helloworld.js.map
coffee -cm helloworld.coffee

# This creates helloworld.min.js and helloworld.min.js.map
uglifyjs -cm --source-map=helloworld.min.js.map helloworld.js > helloworld.min.js