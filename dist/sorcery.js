'use strict';

var path = require('path');
path = ('default' in path ? path['default'] : path);
var sander = require('sander');
sander = ('default' in sander ? sander['default'] : sander);
var vlq = require('vlq');
var buffer_crc32 = require('buffer-crc32');

/**
 * Encodes a string as base64
 * @param {string} str - the string to encode
 * @returns {string}
 */

function btoa(str) {
  return new Buffer(str).toString("base64");
}

var SourceMap = function (properties) {
	this.version = 3;

	this.file = properties.file;
	this.sources = properties.sources;
	this.sourcesContent = properties.sourcesContent;
	this.names = properties.names;
	this.mappings = properties.mappings;
};

SourceMap.prototype = {
	toString: function toString() {
		return JSON.stringify(this);
	},

	toUrl: function toUrl() {
		return "data:application/json;charset=utf-8;base64," + btoa(this.toString());
	}
};

var separator = /[\/\\]/;function getRelativePath(from, to) {
	var fromParts, toParts, i;

	fromParts = from.split(separator);
	toParts = to.split(separator);

	fromParts.pop(); // get dirname

	while (fromParts[0] === toParts[0]) {
		fromParts.shift();
		toParts.shift();
	}

	if (fromParts.length) {
		i = fromParts.length;
		while (i--) fromParts[i] = "..";
	}

	return fromParts.concat(toParts).join("/");
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
		return line.map(encodeSegment).join(",");
	}).join(";");

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

		return vlq.encode(result);
	}
}

var cache = {};

function decodeSegments(encodedSegments) {
	var i = encodedSegments.length;
	var segments = new Array(i);

	while (i--) {
		segments[i] = vlq.decode(encodedSegments[i]);
	}

	return segments;
}function decodeMappings(mappings) {
	var checksum = buffer_crc32(mappings);

	if (!cache[checksum]) {
		var sourceFileIndex = 0; // second field
		var sourceCodeLine = 0; // third field
		var sourceCodeColumn = 0; // fourth field
		var nameIndex = 0; // fifth field

		var lines = mappings.split(";");
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

			segments = decodeSegments(line.split(","));

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

function getSourceMappingUrl(str) {
	var index, substring, url, match;

	// assume we want the last occurence
	index = str.lastIndexOf("sourceMappingURL");

	if (index === -1) {
		return null;
	}

	substring = str.substring(index + 17);
	match = /^\S+/.exec(substring);

	url = match ? match[0] : null;
	return url;
}

/**
 * Decodes a base64 string
 * @param {string} base64 - the string to decode
 * @returns {string}
 */

function atob(base64) {
  return new Buffer(base64, "base64").toString("utf8");
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
	var json, map, match;

	if (/^data/.test(url)) {
		match = /base64,(.+)$/.exec(url);

		if (!match) {
			throw new Error("sourceMappingURL is not base64-encoded");
		}

		json = atob(match[1]);
		map = JSON.parse(json);
		return sync ? map : sander.Promise.resolve(map);
	}

	url = path.resolve(path.dirname(base), url);

	if (sync) {
		return JSON.parse(sander.readFileSync(url).toString());
	} else {
		return sander.readFile(url).then(String).then(JSON.parse);
	}
}

/**
 * Traces a segment back to its origin
 * @param {object} node - an instance of Node
 * @param {number} lineIndex - the zero-based line index of the
   segment as found in `node`
 * @param {number} columnIndex - the zero-based column index of the
   segment as found in `node`
 * @param {string || null} - if specified, the name that should be
   (eventually) returned, as it is closest to the generated code
 * @returns {object}
     @property {string} source - the filepath of the source
     @property {number} line - the one-based line index
     @property {number} column - the zero-based column index
     @property {string || null} name - the name corresponding
     to the segment being traced
 */
var traceMapping = traceMapping__trace;
function traceMapping__trace(node, lineIndex, columnIndex, name) {
	var segments;

	// If this node doesn't have a source map, we have
	// to assume it is the original source
	if (node.isOriginalSource) {
		return {
			source: node.file,
			line: lineIndex + 1,
			column: columnIndex || 0,
			name: name
		};
	}

	// Otherwise, we need to figure out what this position in
	// the intermediate file corresponds to in *its* source
	segments = node.mappings[lineIndex];

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
				var _sourceFileIndex = segments[i][1];
				var _sourceCodeLine = segments[i][2];
				var sourceCodeColumn = segments[i][3];
				var _nameIndex = segments[i][4];

				var _parent = node.sources[_sourceFileIndex];
				return traceMapping__trace(_parent, _sourceCodeLine, sourceCodeColumn, node.map.names[_nameIndex] || name);
			}
		}
	}

	// fall back to a line mapping
	var sourceFileIndex = segments[0][1];
	var sourceCodeLine = segments[0][2];
	var nameIndex = segments[0][4];

	var parent = node.sources[sourceFileIndex];
	return traceMapping__trace(parent, sourceCodeLine, null, node.map.names[nameIndex] || name);
}

var Node__Promise = sander.Promise;

var Node = function (file, content) {
	this.file = path.resolve(file);
	this.content = content || null; // sometimes exists in sourcesContent, sometimes doesn't

	// these get filled in later
	this.map = null;
	this.mappings = null;
	this.sources = null;
	this.isOriginalSource = null;
	this.lines = null;

	this._stats = {
		decodingTime: 0,
		encodingTime: 0,
		tracingTime: 0,

		untraceable: 0
	};

	this.sourcesContentByPath = {};
};

Node.prototype = {
	_load: function _load() {
		var _this = this;
		return getContent(this).then(function (content) {
			var url;

			_this.content = content;
			_this.lines = content.split("\n");

			url = getSourceMappingUrl(content);

			if (!url) {
				_this.isOriginalSource = true;
				return null;
			}

			return getMapFromUrl(url, _this.file).then(function (map) {
				var promises, sourcesContent;

				_this.map = map;

				var decodingStart = process.hrtime();
				_this.mappings = decodeMappings(map.mappings);
				var decodingTime = process.hrtime(decodingStart);
				_this._stats.decodingTime = 1000000000 * decodingTime[0] + decodingTime[1];

				sourcesContent = map.sourcesContent || [];

				_this.sources = map.sources.map(function (source, i) {
					return new Node(resolveSourcePath(_this, source), sourcesContent[i]);
				});

				promises = _this.sources.map(Node__load);

				return Node__Promise.all(promises).then(function () {
					getSourcesContent(_this);
					return _this;
				});
			});
		});
	},

	_loadSync: function _loadSync() {
		var _this = this;
		var url, map, sourcesContent;

		if (!this.content) {
			this.content = sander.readFileSync(this.file).toString();
		}

		this.lines = this.content.split("\n");

		url = getSourceMappingUrl(this.content);

		if (!url) {
			this.isOriginalSource = true;
		} else {
			this.map = map = getMapFromUrl(url, this.file, true);
			this.mappings = decodeMappings(map.mappings);
			sourcesContent = map.sourcesContent || [];

			this.sources = map.sources.map(function (source, i) {
				var node = new Node(resolveSourcePath(_this, source), sourcesContent[i]);
				node._loadSync();

				return node;
			});

			getSourcesContent(this);
		}

		return !this.isOriginalSource ? this : null;
	},

	apply: function apply() {
		var _this = this;
		var options = arguments[0] === undefined ? {} : arguments[0];
		var allNames = [],
		    allSources = [];

		var applySegment = function (segment, result) {
			var traced = traceMapping(_this.sources[segment[1]], // source
			segment[2], // source code line
			segment[3], // source code column
			_this.map.names[segment[4]]);

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

			var nameIndex;

			if (traced.name) {
				nameIndex = allNames.indexOf(traced.name);
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

		var i = this.mappings.length;
		var resolved = new Array(i);

		var j = undefined,
		    line = undefined,
		    result = undefined;

		while (i--) {
			line = this.mappings[i];
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
			file: path.basename(this.file),
			sources: allSources.map(function (source) {
				return getRelativePath(options.base || _this.file, source);
			}),
			sourcesContent: allSources.map(function (source) {
				return includeContent ? _this.sourcesContentByPath[source] : null;
			}),
			names: allNames,
			mappings: mappings
		});
	},

	stat: function stat() {
		return {
			selfDecodingTime: this._stats.decodingTime / 1000000,
			totalDecodingTime: (this._stats.decodingTime + tally(this.sources, "decodingTime")) / 1000000,

			encodingTime: this._stats.encodingTime / 1000000,
			tracingTime: this._stats.tracingTime / 1000000,

			untraceable: this._stats.untraceable
		};
	},

	trace: function Node__trace(oneBasedLineIndex, zeroBasedColumnIndex) {
		return traceMapping(this, oneBasedLineIndex - 1, zeroBasedColumnIndex, null);
	},

	write: function write(dest, options) {
		var map, url, index, content, promises;

		if (typeof dest !== "string") {
			dest = this.file;
			options = dest;
		}

		options = options || {};
		dest = path.resolve(dest);

		map = this.apply({
			includeContent: options.includeContent,
			base: dest
		});

		url = options.inline ? map.toUrl() : (options.absolutePath ? dest : path.basename(dest)) + ".map";

		index = this.content.lastIndexOf("sourceMappingURL=") + 17;
		content = this.content.substr(0, index) + this.content.substring(index).replace(/^\S+/, url) + "\n";

		promises = [sander.writeFile(dest, content)];

		if (!options.inline) {
			promises.push(sander.writeFile(dest + ".map", map.toString()));
		}

		return Node__Promise.all(promises);
	}
};



function Node__load(node) {
	return node._load();
}

function getContent(node) {
	if (!node.content) {
		return sander.readFile(node.file).then(String);
	}

	return Node__Promise.resolve(node.content);
}

function resolveSourcePath(node, source) {
	// TODO handle sourceRoot
	return path.resolve(path.dirname(node.file), source);
}

function getSourcesContent(node) {
	node.sources.forEach(function (source) {
		node.sourcesContentByPath[source.file] = source.content;

		Object.keys(source.sourcesContentByPath).forEach(function (file) {
			node.sourcesContentByPath[file] = source.sourcesContentByPath[file];
		});
	});
}

function tally(nodes, stat) {
	return nodes.reduce(function (total, node) {
		return total + node._stats[stat];
	}, 0);
}

function index__load(file) {
	return new Node(file)._load();
}function loadSync(file) {
	return new Node(file)._loadSync();
}

exports.load = index__load;
exports.loadSync = loadSync;