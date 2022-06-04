import buble from 'rollup-plugin-buble';
import commonjs from 'rollup-plugin-commonjs';
import copy from 'rollup-plugin-copy';

export default {
	input: 'src/index.js',
	plugins: [
		commonjs({
			include: 'node_modules/**'
		}),
		buble({
			exclude: 'node_modules/**'
		}),
		copy({
			targets: [
			  { src: 'src/loader.js', dest: 'dist' },
			]
		  })
	],
	external: [ 'path', 'fs-extra', 'buffer-crc32', 'sourcemap-codec', 'through', 'url'],
	output: {
		sourcemap: true
	}
};
