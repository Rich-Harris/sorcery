var path = require( 'path' );
var exec = require( 'child_process' ).exec;
var fse = require( 'fs-extra' );
var promiseMapSeries = require( 'promise-map-series' );

fse.readdir( __dirname ).then( function ( samples ) {
	var filtered = samples.filter( function ( dir ) {
		return fse.statSync( __dirname, dir ).isDirectory();
	});

	return promiseMapSeries( filtered, function ( dir ) {
		process.chdir( path.join( __dirname, dir ) );

		return new Promise( function ( fulfil, reject ) {
			// check it exists
			fse.readFile( 'build.sh' )
				.then( function () {
					exec( 'sh ./build.sh', function ( err, stdout, stderr ) {
						if ( err ) {
							reject( err );
						} else {
							console.log( stdout );
							console.error( stderr );
							console.log( 'ran %s build script', dir );
							fulfil();
						}
					});
				}, function () {
					// file doesn't exist, nothing to build
					fulfil();
				});
		});
	});
});