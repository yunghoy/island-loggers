/*
TODO:
Issue: https://github.com/winstonjs/winston/issues/862
Date: 08/31/2016

The fix is add below code before https://github.com/winstonjs/winston/blob/master/lib/winston/common.js#L217
  + options.meta = meta;
Need to have options.meta decycled before clone.
 */
const cycle = require('cycle');
const common = require('winston/lib/winston/common');
common.log = function (options) {
  var timestampFn = typeof options.timestamp === 'function'
      ? options.timestamp
      : common.timestamp,
    timestamp   = options.timestamp ? timestampFn() : null,
    showLevel   = options.showLevel === undefined ? true : options.showLevel,
    meta        = options.meta !== null && options.meta !== undefined && !(options.meta instanceof Error)
      ? common.clone(cycle.decycle(options.meta))
      : options.meta || null,
    output;

  options.meta = meta;
  return String(options.formatter(common.clone(options)));
};
