'use strict';

var path = require('path');
path = ('default' in path ? path['default'] : path);
var sander = require('sander');
sander = ('default' in sander ? sander['default'] : sander);
var vlq = require('vlq');

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
	toString: function () {
		return JSON.stringify(this);
	},

	toUrl: function () {
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

function atob(base64) {
	return new Buffer(base64, "base64").toString("utf8");
}

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

var Node = function (file, content) {
	this.file = path.resolve(file);
	this.content = content;

	this.sourcesContentByPath = {};
};

Node.prototype = {
	_load: function () {
		var self = this;

		function getContent() {
			if (!self.content) {
				return sander.readFile(self.file).then(String);
			}

			return sander.Promise.resolve(self.content);
		}

		return getContent().then(function (content) {
			var url;

			self.content = content;
			self.lines = content.split("\n");

			url = getSourceMappingUrl(content);

			if (!url) {
				self.isOriginalSource = true;
				return self;
			} else {
				return getMapFromUrl(url, self.file).then(function (map) {
					var promises, sourcesContent;

					self.map = map;
					self.mappings = decodeMappings(map.mappings);
					sourcesContent = map.sourcesContent || [];

					self.sources = map.sources.map(function (source, i) {
						return new Node(resolveSourcePath(self, source), sourcesContent[i]);
					});

					promises = self.sources.map(function (node) {
						return node._load();
					});

					return sander.Promise.all(promises);
				}).then(function () {
					getSourcesContent(self);
					return self;
				});
			}
		}).then(function () {
			if (!self.isOriginalSource) {
				return self;
			}

			return null;
		});
	},

	_loadSync: function () {
		var self = this,
		    url,
		    map,
		    sourcesContent;

		if (!this.content) {
			this.content = sander.readFileSync(this.file).toString();
		}

		this.lines = this.content.split("\n");

		url = getSourceMappingUrl(this.content);

		if (!url) {
			self.isOriginalSource = true;
		} else {
			self.map = map = getMapFromUrl(url, this.file, true);
			self.mappings = decodeMappings(map.mappings);
			sourcesContent = map.sourcesContent || [];

			self.sources = map.sources.map(function (source, i) {
				var node = new Node(resolveSourcePath(self, source), sourcesContent[i]);
				node._loadSync();

				return node;
			});

			getSourcesContent(self);
		}

		return !this.isOriginalSource ? this : null;
	},

	apply: function (options) {
		var self = this,
		    resolved,
		    names = [],
		    sources = [],
		    mappings,
		    includeContent;

		options = options || {};
		includeContent = options.includeContent !== false;

		resolved = this.mappings.map(function (line) {
			var result = [];

			line.forEach(function (segment) {
				var source, traced, newSegment, sourceIndex, nameIndex;

				if (segment.length === 1) {
					// TODO not sure what to do here...?
					resolved.push([segment[0]]);
					return;
				}

				source = self.sources[segment[1]];
				traced = source.trace(segment[2] + 1, segment[3], self.map.names[segment[4]]);

				if (!traced) {
					return;
				}

				sourceIndex = sources.indexOf(traced.source);
				if (! ~sourceIndex) {
					sourceIndex = sources.length;
					sources.push(traced.source);
				}

				newSegment = [segment[0], sourceIndex, traced.line - 1, traced.column];

				if (traced.name) {
					nameIndex = names.indexOf(traced.name);
					if (! ~nameIndex) {
						nameIndex = names.length;
						names.push(traced.name);
					}

					newSegment.push(nameIndex);
				}

				result.push(newSegment);
			});

			return result;
		});

		mappings = encodeMappings(resolved);

		return new SourceMap({
			file: this.file.split("/").pop(),
			sources: sources.map(function (source) {
				return getRelativePath(options.base || self.file, source);
			}),
			sourcesContent: sources.map(function (source) {
				return includeContent ? self.sourcesContentByPath[source] : null;
			}),
			names: names,
			mappings: mappings
		});
	},

	trace: function (oneBasedLineIndex, zeroBasedColumnIndex, name) {
		var segments, line, segment, len, i, parent, leadingWhitespace;

		// If this node doesn't have a source map, we treat it as
		// the original source
		if (this.isOriginalSource) {
			return {
				source: this.file,
				line: oneBasedLineIndex,
				column: zeroBasedColumnIndex,
				name: name
			};
		}

		// Otherwise, we need to figure out what this position in
		// the intermediate file corresponds to in *its* source
		segments = this.mappings[oneBasedLineIndex - 1];

		if (!segments) {
			return null;
		}

		if (zeroBasedColumnIndex === undefined) {
			// we only have a line to go on. Use the first non-whitespace character
			line = this.lines[oneBasedLineIndex - 1];
			zeroBasedColumnIndex = leadingWhitespace ? leadingWhitespace[0].length : 0;
		}

		len = segments.length;

		for (i = 0; i < len; i += 1) {
			segment = segments[i];

			if (segment[0] === zeroBasedColumnIndex) {
				parent = this.sources[segment[1]];
				return parent.trace(segment[2] + 1, segment[3], this.map.names[segment[4]] || name);
			}

			if (segment[0] > zeroBasedColumnIndex) {
				return null;
			}
		}
	},

	write: function (dest, options) {
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

		return sander.Promise.all(promises);
	}
};



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

function load(file) {
	return new Node(file)._load();
}function loadSync(file) {
	return new Node(file)._loadSync();
}

exports.load = load;
exports.loadSync = loadSync;