# sorcery.js

Sourcemaps are great - if you have a JavaScript file, and you minify it, your minifier can generate a mapping back that lets you debug as though you were looking at the original uncompressed code.

But if you have more than one transformation - say you want to transpile your JavaScript, concatenate several files into one, and minify the result - it gets a little trickier. Each intermediate step needs to be able to both *ingest* a sourcemap and *generate* one, all the time pointing back to the original source.

Most compilers don't do that. ([UglifyJS](https://github.com/mishoo/UglifyJS2) is an honourable exception.) So when you fire up devtools, instead of looking at the original source you find yourself looking at the final intermediate step in the chain of transformations.

**Sorcery aims to fix that.** Given an file at the end of a transformation chain (e.g., your minified JavaScript), it will follow the entire chain back to the original source, and generate a new sourcemap that describes the whole process. How? Magic.

This is a work-in-progress - suitable for playing around with, but don't rely on it to debug air traffic control software or medical equipment. Other than that, it can't do much harm.


## Installation

```bash
npm install sorcery
```


## Usage

API still in flux, lots of work to do... instructions coming soon! Try cloning this repo and looking inside the `test` folder to get started.


## License

MIT

