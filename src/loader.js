const { _init } = require('./Node');
const { SOURCEMAP_COMMENT } = require('./utils/sourceMappingURL');

function loader(input, inputMap) {
  const callback = this.async();
  const loader_options = this.getOptions();
  const { node, nodeCacheByFile, options } = _init( undefined, input, loader_options );
  if (inputMap) {
    node.map = inputMap;
  }
  node.loadSync( nodeCacheByFile, options );
  if ( !node.isOriginalSource ) {
    const chain = new Chain( node, nodeCacheByFile, loader_options );
		const map = chain.apply( loader_options );
    if (map)
      input = input.replace( SOURCEMAP_COMMENT, '' );
      inputMap = map;
  }

  callback(null, input, inputMap);
}

module.exports = loader;
module.exports.raw = false;