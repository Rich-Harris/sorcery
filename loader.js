"use strict";

const webpack_loader = require("./lib/cjs/webpack/loader.js");

module.exports = webpack_loader.loader;
module.exports.raw = webpack_loader.raw;