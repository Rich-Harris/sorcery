var Node = require( './Node' );

module.exports = {
	load: function ( file ) {
		return new Node( file )._load();
	},

	loadSync: function ( file ) {
		return new Node( file )._loadSync();
	}
};