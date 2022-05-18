# sorcery-map.js

This package is a fork of [sorcery](https://github.com/Rich-Harris/sorcery) but we added few improvements:

1) We merged following pull requests:
* [Adjust delimiter used to detect the end of source map URLs in JS files](https://github.com/Rich-Harris/sorcery/pull/176)
* [chore(deps-dev): bump eslint from 2.13.1 to 6.6.0](https://github.com/Rich-Harris/sorcery/pull/175)
* [Handle file:// paths to source files](https://github.com/Rich-Harris/sorcery/pull/173)
* [Ignore missing / unavailable files](https://github.com/Rich-Harris/sorcery/pull/165)
* [Single character segment compatibility (needed for traceur)](https://github.com/Rich-Harris/sorcery/pull/14)

2) New feature
*onlyAvailableSources* default true
manage the transformation chain while the sources are physically present on the machine. We want to end with a map which refers existing sources only.

## Usage

### As a node module

Install sorcery locally:

```bash
npm install sorcery-map
```

```js
var sorcery_map = require( 'sorcery-map' );

sorcery_map.load( 'some/generated/code.min.js' ).then( function ( chain ) {
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

// You can also use sorcery-map synchronously:
var chain = sorcery_map.loadSync( 'some/generated/code.min.js' );
var map = chain.apply();
var loc = chain.trace( x, y );
chain.writeSync();
```

#### Advanced options

You can pass an optional second argument to `sorcery_map.load()` and `sorcery_map.loadSync()`, with zero or more of the following properties:

* `content` - a map of `filename: contents` pairs. `filename` will be resolved against the current working directory if needs be
* `sourcemaps` - a map of `filename: sourcemap` pairs, where `filename` is the name of the file the sourcemap is related to. This will override any `sourceMappingURL` comments in the file itself.

For example:

```js
sorcery_map.load( 'some/generated/code.min.js', {
  content: {
    'some/minified/code.min.js': '...',
    'some/transpiled/code.js': '...',
    'some/original/code.js': '...'
  },
  sourcemaps: {
    'some/minified/code.min.js': {...},
    'some/transpiled/code.js': {...}
  }
}).then( chain => {
  /* ... */
});
```

Any files not found will be read from the filesystem as normal.

### On the command line

First, install sorcery-map globally:

```bash
npm install -g sorcery-map
```

```
Usage:
  sorcery-map [options]

Options:
  -h, --help               Show help message
  -v, --version            Show version
  -i, --input <file>       Input file
  -o, --output <file>      Output file (if absent, will overwrite input)
  -d, --datauri            Append map as a data URI, rather than separate file
  -x, --excludeContent     Don't populate the sourcesContent array
  -e, --existingContent    true|false, false: reach the original source even if not present locally, true: stop to the last existing file of the chain.
```

Examples:

```bash
# overwrite sourcemap in place (will write map to
# some/generated/code.min.js.map, and update
# sourceMappingURL comment if necessary
sorcery-map -i some/generated/code.min.js

# append flattened sourcemap as an inline data URI
# (will delete existing .map file, if applicable)
sorcery-map -d -i some/generated/code.min.js

# write to a new file (will create newfile.js and
# newfile.js.map)
sorcery-map -i some/generated/code.min.js -o newfile.js
```


## License

MIT
