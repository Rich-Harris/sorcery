const { webpack_loader } = require('../');

function loader(cur_input: string, cur_inputMap: string) {
  const loader_options = this.getOptions();
  const callback = this.async();
  const { input, inputMap } = webpack_loader(cur_input, cur_inputMap, loader_options)
  callback(null, input, inputMap);
}

module.exports = loader;
module.exports.raw = false;