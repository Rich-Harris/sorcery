var pattern = /\/\/#\s*sourceMappingURL=([^\s]+)/;

module.exports = function getSourceMappingUrl ( str ) {
	var match = pattern.exec( str );
	return match ? match[1] : null;
};