import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import npm from 'rollup-plugin-npm';

export default {
	entry: 'src/index.js',
	plugins: [
		commonjs({
			include: 'node_modules/**'
		}),
		npm({
			jsnext: true,
			main: true,
			skip: [ 'path', 'sander', 'buffer-crc32' ]
		}),
		babel({
			exclude: 'node_modules/**'
		})
	],
	external: [ 'path', 'sander', 'buffer-crc32' ]
};
