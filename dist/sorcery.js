'use strict';

var path = require('path');
path = ('default' in path ? path['default'] : path);
var sander = require('sander');
sander = ('default' in sander ? sander['default'] : sander);
var vlq = require('vlq');

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

function getRelativePath(from, to) {
	var fromParts, toParts, i;

	fromParts = from.split("/");
	toParts = to.split("/");

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
	var mappings,
	    sourceFileIndex = 0,
	    // second field
	sourceCodeLine = 0,
	    // third field
	sourceCodeColumn = 0,
	    // fourth field
	nameIndex = 0; // fifth field

	mappings = decoded.map(function (line) {
		var generatedCodeColumn = 0; // first field - reset each time

		return line.map(function (segment) {
			var result;

			if (!segment.length) {
				return segment;
			}

			result = [segment[0] - generatedCodeColumn];
			generatedCodeColumn = segment[0];

			if (segment.length === 1) {
				// only one field!
				return result;
			}

			result[1] = segment[1] - sourceFileIndex;
			result[2] = segment[2] - sourceCodeLine;
			result[3] = segment[3] - sourceCodeColumn;

			sourceFileIndex = segment[1];
			sourceCodeLine = segment[2];
			sourceCodeColumn = segment[3];

			if (segment.length === 5) {
				result[4] = segment[4] - nameIndex;
				nameIndex = segment[4];
			}

			return vlq.encode(result);
		}).join(",");
	}).join(";");

	return mappings;
}

function decodeMappings(mappings) {
	var decoded,
	    sourceFileIndex = 0,
	    // second field
	sourceCodeLine = 0,
	    // third field
	sourceCodeColumn = 0,
	    // fourth field
	nameIndex = 0; // fifth field

	decoded = mappings.split(";").map(function (line) {
		var generatedCodeColumn = 0,
		    // first field - reset each time
		decodedLine = [];

		line.split(",").map(vlq.decode).forEach(function (segment) {
			var result;

			if (!segment.length) {
				return;
			}

			generatedCodeColumn += segment[0];

			result = [generatedCodeColumn];
			decodedLine.push(result);

			if (segment.length === 1) {
				// only one field!
				return;
			}

			sourceFileIndex += segment[1];
			sourceCodeLine += segment[2];
			sourceCodeColumn += segment[3];

			result.push(sourceFileIndex, sourceCodeLine, sourceCodeColumn);

			if (segment.length === 5) {
				nameIndex += segment[4];
				result.push(nameIndex);
			}
		});

		return decodedLine;
	});

	return decoded;
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

var trace___slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else { var _arr = []; for (var _iterator = arr[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) { _arr.push(_step.value); if (i && _arr.length === i) break; } return _arr; } };

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
var trace__default = trace;
function trace(node, lineIndex, columnIndex, name) {
	var _arguments = arguments,
	    _this = this,
	    _shouldContinue,
	    _result;
	do {
		_shouldContinue = false;
		_result = (function (node, lineIndex, columnIndex, name) {
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
					var _segments$i = trace___slicedToArray(segments[i], 5);

					var _generatedCodeColumn = _segments$i[0];
					var _sourceFileIndex = _segments$i[1];
					var _sourceCodeLine = _segments$i[2];
					var _sourceCodeColumn = _segments$i[3];
					var _nameIndex = _segments$i[4];


					if (_generatedCodeColumn === columnIndex) {
						var _parent = node.sources[_sourceFileIndex];
						_arguments = [_parent, _sourceCodeLine, _sourceCodeColumn, node.map.names[_nameIndex] || name];
						_this = undefined;
						return _shouldContinue = true;
					}

					if (_generatedCodeColumn > columnIndex) {
						break;
					}
				}
			}

			// fall back to a line mapping
			var _segments$0 = trace___slicedToArray(segments[0], 5);

			var generatedCodeColumn = _segments$0[0];
			var sourceFileIndex = _segments$0[1];
			var sourceCodeLine = _segments$0[2];
			var sourceCodeColumn = _segments$0[3];
			var nameIndex = _segments$0[4];


			var parent = node.sources[sourceFileIndex];
			_arguments = [parent, sourceCodeLine, null, node.map.names[nameIndex] || name];
			_this = undefined;
			return _shouldContinue = true;
		}).apply(_this, _arguments);
	} while (_shouldContinue);
	return _result;
}

var Node___slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else { var _arr = []; for (var _iterator = arr[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) { _arr.push(_step.value); if (i && _arr.length === i) break; } return _arr; } };

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
				_this.mappings = decodeMappings(map.mappings);
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
		var resolved,
		    allNames = [],
		    allSources = [],
		    includeContent;

		includeContent = options.includeContent !== false;

		resolved = this.mappings.map(function (line) {
			var result = [];

			line.forEach(function (segment) {
				var _segment = Node___slicedToArray(segment, 4);

				var generatedCodeColumn = _segment[0];
				var sourceFileIndex = _segment[1];
				var sourceCodeLine = _segment[2];
				var sourceCodeColumn = _segment[3];
				var source;var traced;var newSegment;var sourceIndex;var nameIndex;

				source = _this.sources[sourceFileIndex];
				traced = trace__default(source, sourceCodeLine, sourceCodeColumn, _this.map.names[segment[4]]);

				if (!traced) {
					return;
				}

				sourceIndex = allSources.indexOf(traced.source);
				if (! ~sourceIndex) {
					sourceIndex = allSources.length;
					allSources.push(traced.source);
				}

				newSegment = [generatedCodeColumn, sourceIndex, traced.line - 1, traced.column];

				if (traced.name) {
					nameIndex = allNames.indexOf(traced.name);
					if (! ~nameIndex) {
						nameIndex = allNames.length;
						allNames.push(traced.name);
					}

					newSegment.push(nameIndex);
				}

				result.push(newSegment);
			});

			return result;
		});

		return new SourceMap({
			file: this.file.split("/").pop(),
			sources: allSources.map(function (source) {
				return getRelativePath(options.base || _this.file, source);
			}),
			sourcesContent: allSources.map(function (source) {
				return includeContent ? _this.sourcesContentByPath[source] : null;
			}),
			names: allNames,
			mappings: encodeMappings(resolved)
		});
	},

	trace: (function (_trace) {
		var _traceWrapper = function trace() {
			return _trace.apply(this, arguments);
		};

		_traceWrapper.toString = function () {
			return _trace.toString();
		};

		return _traceWrapper;
	})(function (oneBasedLineIndex, zeroBasedColumnIndex) {
		return trace__default(this, oneBasedLineIndex - 1, zeroBasedColumnIndex, null);
	}),

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
		content = this.content.substr(0, index) + this.content.substring(index).replace(/^\S+/, url);

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

function index__load(file) {
	return new Node(file)._load();
}function loadSync(file) {
	return new Node(file)._loadSync();
}

exports.load = index__load;
exports.loadSync = loadSync;