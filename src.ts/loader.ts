const { webpack_loader } = require('../');

function loader(cur_input: string, cur_inputMap: string) {
  const webpack_context = this as any;
  const loader_options = webpack_context.getOptions();
  const callback = webpack_context.async();
  const { input, inputMap } = webpack_loader(cur_input, cur_inputMap, loader_options)
  callback(null, input, inputMap);
}

module.exports = loader;
module.exports.raw = false;