// const sourcery_map = require( '../' );
import type { Compiler } from 'webpack';

// const DEFAULT_INCLUDE = /\.js$/;

export class Plugin {
  static pluginName: string = 'SourceryMapper';

  constructor(options = {}) {
  }

  apply(compiler: Compiler) {
    compiler.hooks.assetEmitted.tapAsync(
     Plugin.pluginName,
     (file, { content, source, outputPath, compilation, targetPath }) => {
      console.log(content); // <Buffer 66 6f 6f 62 61 72>
    });
  }
  
  // getFiles(compilation: webpack.Compilation) {
  //   return Object.keys(compilation.assets)
  //     .map((name) => {
  //       if (this.isIncludeOrExclude(name)) {
  //         return {
  //           name,
  //           path: compilation.assets[name].existsAt
  //         };
  //       }
  //       return null;
  //     })
  //     .filter(i => i);
  // }

  // isIncludeOrExclude(filename: string) {
  //   const isIncluded = DEFAULT_INCLUDE.test(filename);
  //   return isIncluded;
  // }

  // sorceryFiles(files: string[]) {
  //   return Promise.all(files.map(({
  //     path,
  //     name
  //   }) => sourcery_map.load(path).then((chain) => chain.write())));
  // }
}