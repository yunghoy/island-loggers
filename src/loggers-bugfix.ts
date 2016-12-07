/*
TODO:
Issue: https://github.com/winstonjs/winston/issues/862
Date: 08/31/2016

The fix is add below code before https://github.com/winstonjs/winston/blob/master/lib/winston/common.js#L217
  + options.meta = meta;
Need to have options.meta decycled before clone.
 */
const cycle = require('cycle');
const util = require('util');
const config = require('winston/lib/winston/config');
const common = require('winston/lib/winston/common');
common.log = function (options) {
  var timestampFn = typeof options.timestamp === 'function'
        ? options.timestamp
        : common.timestamp, timestamp = options.timestamp ? timestampFn() : null, showLevel = options.showLevel === undefined ? true : options.showLevel, meta = options.meta !== null && options.meta !== undefined && !(options.meta instanceof Error)
        ? common.clone(cycle.decycle(options.meta))
        : options.meta || null, output;
    //
    // raw mode is intended for outputing winston as streaming JSON to STDOUT
    //
  if (options.raw) {
      if (typeof meta !== 'object' && meta != null) {
          meta = { meta: meta };
      }
      output = common.clone(meta) || {};
      output.level = options.level;
      //
      // Remark (jcrugzz): This used to be output.message = options.message.stripColors.
      // I do not know why this is, it does not make sense but im handling that
      // case here as well as handling the case that does make sense which is to
      // make the `output.message = options.message`
      //
      output.message = options.message.stripColors
          ? options.message.stripColors
          : options.message;
      return JSON.stringify(output);
  }
    //
    // json mode is intended for pretty printing multi-line json to the terminal
    //
  if (options.json || true === options.logstash) {
    if (typeof meta !== 'object' && meta != null) {
      meta = { meta: meta };
    }

    output         = common.clone(meta) || {};
    output.level   = options.level;
    output.message = output.message || '';

    if (options.label) { output.label = options.label; }
    if (options.message) { output.message = options.message; }
    if (timestamp) { output.timestamp = timestamp; }

    if (options.logstash === true) {
      // use logstash format
      var logstashOutput = {};
      if (output.message !== undefined) {
        logstashOutput['@message'] = output.message;
        delete output.message;
      }

      if (output.timestamp !== undefined) {
        logstashOutput['@timestamp'] = output.timestamp;
        delete output.timestamp;
      }

      logstashOutput['@fields'] = common.clone(output);
      output = logstashOutput;
    }

    if (typeof options.stringify === 'function') {
      return options.stringify(output);
    }
    return JSON.stringify(output, function (key, value) {
      return value instanceof Buffer
        ? value.toString('base64')
        : value;
    });
  }
  if (typeof options.formatter == 'function') {
    options.meta = meta;
    return String(options.formatter(common.clone(options)));
  }
  output = timestamp ? timestamp + ' - ' : '';
  if (showLevel) {
    output += options.colorize === 'all' || options.colorize === 'level' || options.colorize === true
      ? config.colorize(options.level)
      : options.level;
  }

  output += (options.align) ? '\t' : '';
  output += (timestamp || showLevel) ? ': ' : '';
  output += options.label ? ('[' + options.label + '] ') : '';
  output += options.colorize === 'all' || options.colorize === 'message'
    ? config.colorize(options.level, options.message)
    : options.message;

  if (meta !== null && meta !== undefined) {
      if (meta && meta instanceof Error && meta.stack) {
        meta = meta.stack;
      }

      if (typeof meta !== 'object') {
        output += ' ' + meta;
      }
      else if (Object.keys(meta).length > 0) {
        if (typeof options.prettyPrint === 'function') {
          output += ' ' + options.prettyPrint(meta);
        } else if (options.prettyPrint) {
          output += ' ' + '\n' + util.inspect(meta, false, options.depth || null, options.colorize);
        } else if (
          options.humanReadableUnhandledException
            && Object.keys(meta).length === 5
            && meta.hasOwnProperty('date')
            && meta.hasOwnProperty('process')
            && meta.hasOwnProperty('os')
            && meta.hasOwnProperty('trace')
            && meta.hasOwnProperty('stack')) {

          //
          // If meta carries unhandled exception data serialize the stack nicely
          //
          var stack = meta.stack;
          delete meta.stack;
          delete meta.trace;
          output += ' ' + common.serialize(meta);

          if (stack) {
            output += '\n' + stack.join('\n');
          }
        } else {
          output += ' ' + common.serialize(meta);
        }
      }
  }
  return output;
};
