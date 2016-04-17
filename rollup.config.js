import buble from 'rollup-plugin-buble';
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
		buble({
			exclude: 'node_modules/**'
		})
	],
	external: [ 'path', 'sander', 'buffer-crc32' ],
	sourceMap: true
};
