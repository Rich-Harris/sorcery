var path = require( 'path' );
var exec = require( 'child_process' ).exec;
var sander = require( 'sander' );
var promiseMapSeries = require( 'promise-map-series' );

sander.readdir( __dirname ).then( function ( samples ) {
	var filtered = samples.filter( function ( dir ) {
		return sander.statSync( __dirname, dir ).isDirectory();
	});

	return promiseMapSeries( filtered, function ( dir ) {
		process.chdir( path.join( __dirname, dir ) );

		return new Promise( function ( fulfil, reject ) {
			// check it exists
			sander.readFile( 'build.sh' )
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