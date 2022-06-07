const sourcery_map = require( '../' );

const DEFAULT_INCLUDE = /\.js$/;
const DEFAULT_EXCLUDE = /vendor/;

function Plugin(options = {}) {
  this.include = options.include || DEFAULT_INCLUDE;
  this.exclude = options.exclude || DEFAULT_EXCLUDE;
}

Plugin.prototype = {
  apply(compiler) {
    compiler.plugin('after-emit', (compilation, cb) => {
      const files = this.getFiles(compilation);
      this.sorceryFiles(files)
        .then(() => cb());
    });
  },

  getFiles(compilation) {
    return Object.keys(compilation.assets)
      .map((name) => {
        if (this.isIncludeOrExclude(name)) {
          return {
            name,
            path: compilation.assets[name].existsAt
          };
        }
        return null;
      })
      .filter(i => i);
  },

  isIncludeOrExclude(filename) {
    const isIncluded = this.include ? this.include.test(filename) : true;
    const isExcluded = this.exclude ? this.exclude.test(filename) : false;
    return isIncluded && !isExcluded;
  },

  sorceryFiles(files) {
    return Promise.all(files.map(({
      path,
      name
    }) => sourcery_map.load(path).then((chain) => chain.write())));
  },
}