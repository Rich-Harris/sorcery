'use strict';

var sander = require('sander');
var path = require('path');
var crc32 = require('buffer-crc32');
crc32 = 'default' in crc32 ? crc32['default'] : crc32;

var SOURCEMAPPING_URL = 'sourceMa';
SOURCEMAPPING_URL += 'ppingURL';

function sourcemapComment(url, dest) {
	var ext = path.extname(dest);
	url = encodeURI(url);

	if (ext === '.css') {
		return '\n/*# ' + SOURCEMAPPING_URL + '=' + url + ' */\n';
	}

	return '\n//# ' + SOURCEMAPPING_URL + '=' + url + '\n';
}

var SOURCEMAP_COMMENT = new RegExp('\n*(?:' + ('\\/\\/[@#]\\s*' + SOURCEMAPPING_URL + '=([^\'"]+)|') + ( // js
'\\/\\*#?\\s*' + SOURCEMAPPING_URL + '=([^\'"]+)\\s\\*\\/)') + // css
'\\s*$', 'g');

function processWriteOptions(dest, chain, options) {
	var resolved = path.resolve(dest);

	var map = chain.apply({
		includeContent: options.includeContent,
		base: options.base ? path.resolve(options.base) : path.dirname(resolved)
	});

	var url = options.inline ? map.toUrl() : (options.absolutePath ? resolved : path.basename(resolved)) + '.map';

	// TODO shouldn't url be relative?
	var content = chain.node.content.replace(SOURCEMAP_COMMENT, '') + sourcemapComment(url, resolved);

	return { resolved: resolved, content: content, map: map };
}

function slash(path) {
  if (typeof path === 'string') return path.replace(/\\/g, '/');
  return path;
}


/**
 * Encodes a string as base64
 * @param {string} str - the string to encode
 * @returns {string}
 */
function btoa(str) {
  return new Buffer(str).toString('base64');
}

function __classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var SourceMap = (function () {
	function SourceMap(properties) {
		__classCallCheck(this, SourceMap);

		this.version = 3;

		this.file = properties.file;
		this.sources = properties.sources;
		this.sourcesContent = properties.sourcesContent;
		this.names = properties.names;
		this.mappings = properties.mappings;
	}

	SourceMap.prototype.toString = function toString() {
		return JSON.stringify(this);
	};

	SourceMap.prototype.toUrl = function toUrl() {
		return 'data:application/json;charset=utf-8;base64,' + btoa(this.toString());
	};

	return SourceMap;
})();

var integerToChar = {};

var charToInteger = {};

'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split( '' ).forEach( function ( char, i ) {
	charToInteger[ char ] = i;
	integerToChar[ i ] = char;
});

function encodeInteger ( num ) {
	var result = '', clamped;

	if ( num < 0 ) {
		num = ( -num << 1 ) | 1;
	} else {
		num <<= 1;
	}

	do {
		clamped = num & 31;
		num >>= 5;

		if ( num > 0 ) {
			clamped |= 32;
		}

		result += integerToChar[ clamped ];
	} while ( num > 0 );

	return result;
}

function encode ( value ) {
	var result, i;

	if ( typeof value === 'number' ) {
		result = encodeInteger( value );
	} else {
		result = '';
		for ( i = 0; i < value.length; i += 1 ) {
			result += encodeInteger( value[i] );
		}
	}

	return result;
}

function encodeMappings(decoded) {
	var offsets = {
		generatedCodeColumn: 0,
		sourceFileIndex: 0, // second field
		sourceCodeLine: 0, // third field
		sourceCodeColumn: 0, // fourth field
		nameIndex: 0 // fifth field
	};

	return decoded.map(function (line) {
		offsets.generatedCodeColumn = 0; // first field - reset each time
		return line.map(encodeSegment).join(',');
	}).join(';');

	function encodeSegment(segment) {
		if (!segment.length) {
			return segment;
		}

		var result = new Array(segment.length);

		result[0] = segment[0] - offsets.generatedCodeColumn;
		offsets.generatedCodeColumn = segment[0];

		if (segment.length === 1) {
			// only one field!
			return result;
		}

		result[1] = segment[1] - offsets.sourceFileIndex;
		result[2] = segment[2] - offsets.sourceCodeLine;
		result[3] = segment[3] - offsets.sourceCodeColumn;

		offsets.sourceFileIndex = segment[1];
		offsets.sourceCodeLine = segment[2];
		offsets.sourceCodeColumn = segment[3];

		if (segment.length === 5) {
			result[4] = segment[4] - offsets.nameIndex;
			offsets.nameIndex = segment[4];
		}

		return encode(result);
	}
}

function tally(nodes, stat) {
	return nodes.reduce(function (total, node) {
		return total + node._stats[stat];
	}, 0);
}

function ___classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var Chain = (function () {
	function Chain(node, sourcesContentByPath) {
		___classCallCheck(this, Chain);

		this.node = node;
		this.sourcesContentByPath = sourcesContentByPath;

		this._stats = {};
	}

	Chain.prototype.stat = function stat() {
		return {
			selfDecodingTime: this._stats.decodingTime / 1000000,
			totalDecodingTime: (this._stats.decodingTime + tally(this.node.sources, 'decodingTime')) / 1000000,

			encodingTime: this._stats.encodingTime / 1000000,
			tracingTime: this._stats.tracingTime / 1000000,

			untraceable: this._stats.untraceable
		};
	};

	Chain.prototype.apply = function apply() {
		var _this = this;

		var options = arguments[0] === undefined ? {} : arguments[0];

		var allNames = [];
		var allSources = [];

		var applySegment = function (segment, result) {
			if (segment.length < 4) return;

			var traced = _this.node.sources[segment[1]].trace( // source
			segment[2], // source code line
			segment[3], // source code column
			_this.node.map.names[segment[4]]);

			if (!traced) {
				_this._stats.untraceable += 1;
				return;
			}

			var sourceIndex = allSources.indexOf(traced.source);
			if (! ~sourceIndex) {
				sourceIndex = allSources.length;
				allSources.push(traced.source);
			}

			var newSegment = [segment[0], // generated code column
			sourceIndex, traced.line - 1, traced.column];

			if (traced.name) {
				var nameIndex = allNames.indexOf(traced.name);
				if (! ~nameIndex) {
					nameIndex = allNames.length;
					allNames.push(traced.name);
				}

				newSegment[4] = nameIndex;
			}

			result[result.length] = newSegment;
		};

		// Trace mappings
		var tracingStart = process.hrtime();

		var i = this.node.mappings.length;
		var resolved = new Array(i);

		var j = undefined,
		    line = undefined,
		    result = undefined;

		while (i--) {
			line = this.node.mappings[i];
			resolved[i] = result = [];

			for (j = 0; j < line.length; j += 1) {
				applySegment(line[j], result);
			}
		}

		var tracingTime = process.hrtime(tracingStart);
		this._stats.tracingTime = 1000000000 * tracingTime[0] + tracingTime[1];

		// Encode mappings
		var encodingStart = process.hrtime();
		var mappings = encodeMappings(resolved);
		var encodingTime = process.hrtime(encodingStart);
		this._stats.encodingTime = 1000000000 * encodingTime[0] + encodingTime[1];

		var includeContent = options.includeContent !== false;

		return new SourceMap({
			file: path.basename(this.node.file),
			sources: allSources.map(function (source) {
				return slash(path.relative(options.base || path.dirname(_this.node.file), source));
			}),
			sourcesContent: allSources.map(function (source) {
				return includeContent ? _this.sourcesContentByPath[source] : null;
			}),
			names: allNames,
			mappings: mappings
		});
	};

	Chain.prototype.trace = function trace(oneBasedLineIndex, zeroBasedColumnIndex) {
		return this.node.trace(oneBasedLineIndex - 1, zeroBasedColumnIndex, null);
	};

	Chain.prototype.write = function write(dest, options) {
		if (typeof dest !== 'string') {
			options = dest;
			dest = this.node.file;
		}

		options = options || {};

		var _processWriteOptions = processWriteOptions(dest, this, options);

		var resolved = _processWriteOptions.resolved;
		var content = _processWriteOptions.content;
		var map = _processWriteOptions.map;

		var promises = [sander.writeFile(resolved, content)];

		if (!options.inline) {
			promises.push(sander.writeFile(resolved + '.map', map.toString()));
		}

		return Promise.all(promises);
	};

	Chain.prototype.writeSync = function writeSync(dest, options) {
		if (typeof dest !== 'string') {
			options = dest;
			dest = this.node.file;
		}

		options = options || {};

		var _processWriteOptions2 = processWriteOptions(dest, this, options);

		var resolved = _processWriteOptions2.resolved;
		var content = _processWriteOptions2.content;
		var map = _processWriteOptions2.map;

		sander.writeFileSync(resolved, content);

		if (!options.inline) {
			sander.writeFileSync(resolved + '.map', map.toString());
		}
	};

	return Chain;
})();

function resolveSourcePath(node, sourceRoot, source) {
	return path.resolve(path.dirname(node.file), sourceRoot || '', source);
}

var cache = {};

function decode ( string ) {
	var result = [],
		len = string.length,
		i,
		hasContinuationBit,
		shift = 0,
		value = 0,
		integer,
		shouldNegate;

	for ( i = 0; i < len; i += 1 ) {
		integer = charToInteger[ string[i] ];

		if ( integer === undefined ) {
			throw new Error( 'Invalid character (' + string[i] + ')' );
		}

		hasContinuationBit = integer & 32;

		integer &= 31;
		value += integer << shift;

		if ( hasContinuationBit ) {
			shift += 5;
		} else {
			shouldNegate = value & 1;
			value >>= 1;

			result.push( shouldNegate ? -value : value );

			// reset
			value = shift = 0;
		}
	}

	return result;
}

function decodeSegments(encodedSegments) {
	var i = encodedSegments.length;
	var segments = new Array(i);

	while (i--) {
		segments[i] = decode(encodedSegments[i]);
	}

	return segments;
}
function decodeMappings(mappings) {
	var checksum = crc32(mappings);

	if (!cache[checksum]) {
		var sourceFileIndex = 0; // second field
		var sourceCodeLine = 0; // third field
		var sourceCodeColumn = 0; // fourth field
		var nameIndex = 0; // fifth field

		var lines = mappings.split(';');
		var numLines = lines.length;
		var decoded = new Array(numLines);

		var i = undefined,
		    j = undefined,
		    line = undefined,
		    generatedCodeColumn = undefined,
		    decodedLine = undefined,
		    segments = undefined,
		    segment = undefined,
		    result = undefined;

		for (i = 0; i < numLines; i += 1) {
			line = lines[i];

			generatedCodeColumn = 0; // first field - reset each time
			decodedLine = [];

			segments = decodeSegments(line.split(','));

			for (j = 0; j < segments.length; j += 1) {
				segment = segments[j];

				if (!segment.length) {
					break;
				}

				generatedCodeColumn += segment[0];

				result = [generatedCodeColumn];
				decodedLine.push(result);

				if (segment.length === 1) {
					// only one field!
					break;
				}

				sourceFileIndex += segment[1];
				sourceCodeLine += segment[2];
				sourceCodeColumn += segment[3];

				result.push(sourceFileIndex, sourceCodeLine, sourceCodeColumn);

				if (segment.length === 5) {
					nameIndex += segment[4];
					result.push(nameIndex);
				}
			}

			decoded[i] = decodedLine;
		}

		cache[checksum] = decoded;
	}

	return cache[checksum];
}


/**
 * Decodes a base64 string
 * @param {string} base64 - the string to decode
 * @returns {string}
 */
function atob(base64) {
  return new Buffer(base64, 'base64').toString('utf8');
}


/**
 * Turns a sourceMappingURL into a sourcemap
 * @param {string} url - the URL (i.e. sourceMappingURL=url). Can
   be a base64-encoded data URI
 * @param {string} base - the URL against which relative URLS
   should be resolved
 * @param {boolean} sync - if `true`, return a promise, otherwise
   return the sourcemap
 * @returns {object} - a version 3 sourcemap
 */
function getMapFromUrl(url, base, sync) {
	if (/^data:/.test(url)) {
		// TODO beef this up
		var match = /base64,(.+)$/.exec(url);

		if (!match) {
			throw new Error('sourceMappingURL is not base64-encoded');
		}

		var json = atob(match[1]);
		var map = JSON.parse(json);
		return sync ? map : sander.Promise.resolve(map);
	}

	url = path.resolve(path.dirname(base), decodeURI(url));

	if (sync) {
		return JSON.parse(sander.readFileSync(url).toString());
	} else {
		return sander.readFile(url).then(String).then(JSON.parse);
	}
}

function getSourceMappingUrl(str) {
	var index, substring, url, match;

	// assume we want the last occurence
	index = str.lastIndexOf('sourceMappingURL=');

	if (index === -1) {
		return null;
	}

	substring = str.substring(index + 17);
	match = /^[^\r\n]+/.exec(substring);

	url = match ? match[0] : null;

	// possibly a better way to do this, but we don't want to exclude whitespace
	// from the sourceMappingURL because it might not have been correctly encoded
	if (url && url.slice(-2) === '*/') {
		url = url.slice(0, -2).trim();
	}

	return url;
}

function getMap(node, sourceMapByPath, sync) {
	if (node.file in sourceMapByPath) {
		var map = sourceMapByPath[node.file];
		return sync ? map : sander.Promise.resolve(map);
	} else {
		var url = getSourceMappingUrl(node.content);

		if (!url) {
			node.isOriginalSource = true;
			return sync ? null : sander.Promise.resolve(null);
		}

		return getMapFromUrl(url, node.file, sync);
	}
}

function getContent(node, sourcesContentByPath) {
	if (node.file in sourcesContentByPath) {
		node.content = sourcesContentByPath[node.file];
	}

	if (!node.content) {
		return sander.readFile(node.file).then(String);
	}

	return sander.Promise.resolve(node.content);
}

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var Node = (function () {
	function Node(_ref) {
		var file = _ref.file;
		var content = _ref.content;

		_classCallCheck(this, Node);

		this.file = file ? path.resolve(file) : null;
		this.content = content || null; // sometimes exists in sourcesContent, sometimes doesn't

		if (!this.file && this.content === null) {
			throw new Error('A source must specify either file or content');
		}

		// these get filled in later
		this.map = null;
		this.mappings = null;
		this.sources = null;
		this.isOriginalSource = null;

		this._stats = {
			decodingTime: 0,
			encodingTime: 0,
			tracingTime: 0,

			untraceable: 0
		};
	}

	Node.prototype.load = function load(sourcesContentByPath, sourceMapByPath) {
		var _this = this;

		return getContent(this, sourcesContentByPath).then(function (content) {
			_this.content = sourcesContentByPath[_this.file] = content;

			return getMap(_this, sourceMapByPath).then(function (map) {
				if (!map) return null;

				_this.map = map;

				var decodingStart = process.hrtime();
				_this.mappings = decodeMappings(map.mappings);
				var decodingTime = process.hrtime(decodingStart);
				_this._stats.decodingTime = 1000000000 * decodingTime[0] + decodingTime[1];

				var sourcesContent = map.sourcesContent || [];

				_this.sources = map.sources.map(function (source, i) {
					return new Node({
						file: source ? resolveSourcePath(_this, map.sourceRoot, source) : null,
						content: sourcesContent[i]
					});
				});

				var promises = _this.sources.map(function (node) {
					return node.load(sourcesContentByPath, sourceMapByPath);
				});
				return sander.Promise.all(promises);
			});
		});
	};

	Node.prototype.loadSync = function loadSync(sourcesContentByPath, sourceMapByPath) {
		var _this2 = this;

		if (!this.content) {
			if (!sourcesContentByPath[this.file]) {
				sourcesContentByPath[this.file] = sander.readFileSync(this.file).toString();
			}

			this.content = sourcesContentByPath[this.file];
		}

		var map = getMap(this, sourceMapByPath, true);
		var sourcesContent = undefined;

		if (!map) {
			this.isOriginalSource = true;
		} else {
			this.map = map;
			this.mappings = decodeMappings(map.mappings);

			sourcesContent = map.sourcesContent || [];

			this.sources = map.sources.map(function (source, i) {
				var node = new Node({
					file: resolveSourcePath(_this2, map.sourceRoot, source),
					content: sourcesContent[i]
				});

				node.loadSync(sourcesContentByPath, sourceMapByPath);
				return node;
			});
		}
	};

	/**
  * Traces a segment back to its origin
  * @param {number} lineIndex - the zero-based line index of the
    segment as found in `this`
  * @param {number} columnIndex - the zero-based column index of the
    segment as found in `this`
  * @param {string || null} - if specified, the name that should be
    (eventually) returned, as it is closest to the generated code
  * @returns {object}
      @property {string} source - the filepath of the source
      @property {number} line - the one-based line index
      @property {number} column - the zero-based column index
      @property {string || null} name - the name corresponding
      to the segment being traced
  */

	Node.prototype.trace = function trace(lineIndex, columnIndex, name) {
		// If this node doesn't have a source map, we have
		// to assume it is the original source
		if (this.isOriginalSource) {
			return {
				source: this.file,
				line: lineIndex + 1,
				column: columnIndex || 0,
				name: name
			};
		}

		// Otherwise, we need to figure out what this position in
		// the intermediate file corresponds to in *its* source
		var segments = this.mappings[lineIndex];

		if (!segments || segments.length === 0) {
			return null;
		}

		if (columnIndex != null) {
			var len = segments.length;
			var i = undefined;

			for (i = 0; i < len; i += 1) {
				var generatedCodeColumn = segments[i][0];

				if (generatedCodeColumn > columnIndex) {
					break;
				}

				if (generatedCodeColumn === columnIndex) {
					if (segments[i].length < 4) return null;

					var _sourceFileIndex = segments[i][1];
					var _sourceCodeLine = segments[i][2];
					var sourceCodeColumn = segments[i][3];
					var _nameIndex = segments[i][4];

					var _parent = this.sources[_sourceFileIndex];
					return _parent.trace(_sourceCodeLine, sourceCodeColumn, this.map.names[_nameIndex] || name);
				}
			}
		}

		// fall back to a line mapping
		var sourceFileIndex = segments[0][1];
		var sourceCodeLine = segments[0][2];
		var nameIndex = segments[0][4];

		var parent = this.sources[sourceFileIndex];
		return parent.trace(sourceCodeLine, null, this.map.names[nameIndex] || name);
	};

	return Node;
})();

function load(file, options) {
	var _init = init(file, options);

	var node = _init.node;
	var sourcesContentByPath = _init.sourcesContentByPath;
	var sourceMapByPath = _init.sourceMapByPath;

	return node.load(sourcesContentByPath, sourceMapByPath).then(function () {
		return node.isOriginalSource ? null : new Chain(node, sourcesContentByPath);
	});
}

function loadSync(file) {
	var options = arguments[1] === undefined ? {} : arguments[1];

	var _init2 = init(file, options);

	var node = _init2.node;
	var sourcesContentByPath = _init2.sourcesContentByPath;
	var sourceMapByPath = _init2.sourceMapByPath;

	node.loadSync(sourcesContentByPath, sourceMapByPath);
	return node.isOriginalSource ? null : new Chain(node, sourcesContentByPath);
}

function init(file) {
	var options = arguments[1] === undefined ? {} : arguments[1];

	var node = new Node({ file: file });

	var sourcesContentByPath = {};
	var sourceMapByPath = {};

	if (options.content) {
		Object.keys(options.content).forEach(function (key) {
			sourcesContentByPath[path.resolve(key)] = options.content[key];
		});
	}

	if (options.sourcemaps) {
		Object.keys(options.sourcemaps).forEach(function (key) {
			sourceMapByPath[path.resolve(key)] = options.sourcemaps[key];
		});
	}

	return { node: node, sourcesContentByPath: sourcesContentByPath, sourceMapByPath: sourceMapByPath };
}

exports.load = load;
exports.loadSync = loadSync;