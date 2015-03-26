var sander = require( 'sander' );

// this hack is necessary to ensure that the map filenames are
// as we expect
module.exports = function renameMapFiles ( inputdir, outputdir, options ) {
	return sander.lsr( inputdir ).then( function ( files ) {
		var promises = files.map( function ( file ) {
			return sander.copyFile( inputdir, file ).to( outputdir, file.replace( /\..+\.map/, '.map' ) );
		});

		return sander.Promise.all( promises );
	});
};
