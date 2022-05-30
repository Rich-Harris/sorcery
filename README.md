# sourcery-map.js

This package is a fork of [sorcery](https://github.com/Rich-Harris/sorcery) with few improvements added:

**We merged pull requests**  
* [Adjust delimiter used to detect the end of source map URLs in JS files](https://github.com/Rich-Harris/sorcery/pull/176)
* [chore(deps-dev): bump eslint from 2.13.1 to 6.6.0](https://github.com/Rich-Harris/sorcery/pull/175)
* [Handle file:// paths to source files](https://github.com/Rich-Harris/sorcery/pull/173)
* [Ignore missing / unavailable files](https://github.com/Rich-Harris/sorcery/pull/165)
* [Single character segment compatibility (needed for traceur)](https://github.com/Rich-Harris/sorcery/pull/14)

**New features**
* Flatten is optional and can manage existing files only (ease the debugging)
* source path can be customized, relative or absolute.
* Provide a source root resolution fallback when map has been generated from another path (browserify)
* [exorcist](https://www.npmjs.com/package/exorcist) like [experimental]
* sourceMappingURL can be inline content, absolute, relative...
* recursive, rewrite all the chain of maps [experimental]

## Next steps
* expose a Webpack plugin (like source-map-loader)  
* add d.ts or migrate to TypeScript

## Usage

### Options

#### parsing map
| API | Command line | Value | Description |
| ----------- | ----------- | ----------- | ----------- |
| --- | -i, --input | `<file>`<br/>`<folder>` | Input file<br/>Input folder |
| content | --- | a map of `filename: contents` pairs. | `filename` will be resolved against the current working directory if needs be |
| sourcemaps | --- | a map of `filename: sourcemap` pairs | where `filename` is the name of the file the sourcemap is related to. This will override any `sourceMappingURL` comments in the file itself |
| sourceRootResolution | --- | <folder> | base path of the relative sources path in the map |

#### generating map
| API | Command line | Value | Description |
| ----------- | ----------- | ----------- | ----------- |
| output | -o, --output | `<file>` | Output file (if absent, will overwrite input) |
| --- | -d, --datauri | | *deprecated* use `sourceMappingURL` 'inline' |
| excludeContent | -x, --excludeContent | | Don't populate the sourcesContent array |
| flatten | -f, --flatten | `full` (default) <br/>`existing` | flatten source map until the original file is reached<br/>flatten source map until the file (content) exists |
| sourceMappingURL | --sourceMappingURL | `inline`<br/>`[absolute-path]`<br/>`[base-path]`<br/>`[relative-path]`| Append map as a data URI rather than separate file<br/>TBD<br/>[not supported yet]<br/>TBD |
| sourcePathTemplate | --sourcePathTemplate | `[relative-path]` (default)<br/>`[absolute-path]`<br/>`string`| Source paths are relative to the file location <br/>Source paths are absolute<br/>Customize the relative path and can contain `[relative-path]` or `[absolute-path]`<br/>for instance ```webpack://[relative-path]``` |

#### misc
| Command line | Description |
| ----------- |----------- |
| -h, --help | Show help message |
| -v, --version | Show version |


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

#### Command line usage

First, install sourcery-map globally:

```bash
npm install -g sourcery-map
```

```
  Usage:
    sourcery-map [options]
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

### Exorcist-like [experimental]
Can replace exorcist 
```
  stream.pipe(exorcist(mapFile, undefined, undefined, path.dirname(inputFile)))
```
by such code
```
  stream.pipe(sourcery_map.transform({ output: bundleFile, flatten: false, sourceRootResolution: '' }))]
```

you can flatten the map at the same time
```
  stream.pipe(sourcery_map.transform({ output: bundleFile, flatten: 'realistic', sourceRootResolution: '' }))]
```

## License

MIT
