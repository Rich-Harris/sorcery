import buble from 'rollup-plugin-buble';
import commonjs from 'rollup-plugin-commonjs';

export default {
	input: 'src/index.js',
	plugins: [
		commonjs({
			include: 'node_modules/**'
		}),
		buble({
			exclude: 'node_modules/**'
		})
	],
	external: [ 'path', 'fs-extra', 'buffer-crc32', 'sourcemap-codec'],
	output: {
		sourcemap: true
	}
};
