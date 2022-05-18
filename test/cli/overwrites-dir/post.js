var fse = require( 'fs-extra' );

module.exports = function () {
	fse.rmSync(path.join( __dirname, 'actual', 'foo.coffee'), { recursive: true, force: true } ); );
	fse.rmSync(path.join( __dirname, 'actual', 'bar.coffee'), { recursive: true, force: true } ); );

	fse.rmSync(path.join( __dirname, 'actual', 'foo.js'), { recursive: true, force: true } ); );
	fse.rmSync(path.join( __dirname, 'actual', 'bar.js'), { recursive: true, force: true } ); );

	fse.rmSync(path.join( __dirname, 'actual', 'foo.js.map'), { recursive: true, force: true } ); );
	fse.rmSync(path.join( __dirname, 'actual', 'bar.js.map'), { recursive: true, force: true } ); );
};
