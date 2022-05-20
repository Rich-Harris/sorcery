# sourcery-map.js

This package is a fork of [sorcery](https://github.com/Rich-Harris/sorcery) but with few improvements added:

**We merged pull requests**  
* [Adjust delimiter used to detect the end of source map URLs in JS files](https://github.com/Rich-Harris/sorcery/pull/176)
* [chore(deps-dev): bump eslint from 2.13.1 to 6.6.0](https://github.com/Rich-Harris/sorcery/pull/175)
* [Handle file:// paths to source files](https://github.com/Rich-Harris/sorcery/pull/173)
* [Ignore missing / unavailable files](https://github.com/Rich-Harris/sorcery/pull/165)
* [Single character segment compatibility (needed for traceur)](https://github.com/Rich-Harris/sorcery/pull/14)

**New feature**  
*existingContentOnly* default true  
Apply the transformation chain while the sources content are available. We want to end with a map which refers existing local sources only.

**Build**  
Fix build which was not working on Windows.  

## Next steps
* still have to ensure unit tests can be run on Windows  
* absolutePath ?  
* read remote map  
* expose a Webpack plugin (like source-map-loader)  
* add d.ts

## Usage

### As a node module

Install sourcery-map locally:

```bash
npm install sourcery-map
```

```js
var sourcery_map = require( 'sourcery-map' );

sourcery_map.load( 'some/generated/code.min.js' ).then( function ( chain ) {
  // generate a flattened sourcemap
  var map = chain.apply(); // { version: 3, file: 'code.min.js', ... }

  // get a JSON representation of the sourcemap
  map.toString(); // '{"version":3,"file":"code.min.js",...}'

  // get a data URI representation
  map.toUrl(); // 'data:application/json;charset=utf-8;base64,eyJ2ZXJ...'

  // write to a new file - this will create `output.js` and
  // `output.js.map`, and will preserve relative paths. It
  // returns a Promise
  chain.write( 'output.js' );

  // write to a new file but use an absolute path for the
  // sourceMappingURL
  chain.write( 'output.js', { absolutePath: true });

  // write to a new file, but append the flattened sourcemap as a data URI
  chain.write( 'output.js', { inline: true });

  // overwrite the existing file
  chain.write();
  chain.write({ inline: true });

  // find the origin of line x, column y. Returns an object with
  // `source`, `line`, `column` and (if applicable) `name` properties.
  // Note - for consistency with other tools, line numbers are always
  // one-based, column numbers are always zero-based. It's daft, I know.
  var loc = chain.trace( x, y );
});

// You can also use sourcery-map synchronously:
var chain = sourcery_map.loadSync( 'some/generated/code.min.js' );
var map = chain.apply();
var loc = chain.trace( x, y );
chain.writeSync();
```

#### Advanced options

You can pass an optional second argument to `sourcery_map.load()` and `sourcery_map.loadSync()`, with zero or more of the following properties:

* `content` - a map of `filename: contents` pairs. `filename` will be resolved against the current working directory if needs be
* `sourcemaps` - a map of `filename: sourcemap` pairs, where `filename` is the name of the file the sourcemap is related to. This will override any `sourceMappingURL` comments in the file itself.

For example:

```js
sourcery_map.load( 'some/generated/code.min.js', {
  content: {
    'some/minified/code.min.js': '...',
    'some/transpiled/code.js': '...',
    'some/original/code.js': '...'
  },
  sourcemaps: {
    'some/minified/code.min.js': {...},
    'some/transpiled/code.js': {...}
  },
  existingContentOnly: false
}).then( chain => {
  /* ... */
});
```

Any files not found will be read from the filesystem as normal.

### On the command line

First, install sourcery-map globally:

```bash
npm install -g sourcery-map
```

```
  Usage:
    sourcery-map [options]

  Options:
    -h, --help                      Show help message
    -v, --version                   Show version
    -i, --input <file|folder>       Input file
    -o, --output <file|folder>      Output file (if absent, will overwrite input)
    -d, --datauri                   Append map as a data URI, rather than separate file
    -x, --excludeContent            Don't populate the sourcesContent array
    -e, --existingContentOnly <true|false>
                                    true: stop to the last existing file of the chain (default).
                                    false: reach the original source even if not present
```

Examples:

```bash
# overwrite sourcemap in place (will write map to
# some/generated/code.min.js.map, and update
# sourceMappingURL comment if necessary
sourcery-map -i some/generated/code.min.js

# append flattened sourcemap as an inline data URI
# (will delete existing .map file, if applicable)
sourcery-map -d -i some/generated/code.min.js

# write to a new file (will create newfile.js and
# newfile.js.map)
sourcery-map -i some/generated/code.min.js -o newfile.js
```


## License

MIT
