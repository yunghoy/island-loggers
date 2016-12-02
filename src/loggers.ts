import * as cls from 'continuation-local-storage';
import * as winston from 'winston';
import * as _ from 'lodash';
const config = require('winston/lib/winston/config');
const sourceMapSupport = require('source-map-support');
require('./loggers-bugfix');

const ns = cls.getNamespace('app') || cls.createNamespace('app');

function stringifyMeta(meta) {
  return meta && (0 < Object.keys(meta).length) && JSON.stringify(meta) || undefined;
}
function getTattoo() {
  return ns.get('RequestTrackId') || '--------';
}
const shortFormatter = (options) => {
  let meta = options.meta;
  const tattoo = getTattoo();
  if (process.env.ISLAND_LOGGER_TRACE === 'true') {
    const trace = getLogTrace();
    meta = meta || {};
    meta.file = trace.file;
    meta.line = trace.line;
  }
  return [
    config.colorize(options.level,`[${tattoo.slice(0, 8)}|${new Date().toTimeString().slice(0, 8)}|${options.level.slice(0, 1)}]`),
    `${options.message || ''}`,
    stringifyMeta(meta)
  ].join(' ');
};
(shortFormatter as any).type = 'short';

const longFormatter = (options) => {
  let meta = options.meta;
  const tattoo = getTattoo();
  if (process.env.ISLAND_LOGGER_TRACE === 'true') {
    const trace = getLogTrace();
    meta = meta || {};
    meta.file = trace.file;
    meta.line = trace.line;
  }
  return [
    config.colorize(options.level, `[${tattoo.slice(0, 8)}] ${new Date().toISOString()} ${options.level}`),
    `${options.message || ''}`,
    stringifyMeta(meta)
  ].join(' ');
};
(longFormatter as any).type = 'long';

const jsonFormatter = (options) => {
  const tattoo = getTattoo();
  const timestamp = Date.now();
  const log: any = {
    tattoo, timestamp,
    msg: options.message, meta: options.meta, level: options.level, category: options.label
  };
  if (process.env.ISLAND_LOGGER_TRACE === 'true') {
    const { file, line } = getLogTrace();
    log.file = file;
    log.line = line;
  }
  return JSON.stringify(log);
};
(jsonFormatter as any).type = 'json';

function getLogTrace() {
  const E = Error as any;
  const oldLimit = E.stackTraceLimit;
  const oldPrepare = E.prepareStackTrace;
  E.stackTraceLimit = 11;
  const returnObject: any = {};
  E.prepareStackTrace = function (o, stack) {
    const caller = sourceMapSupport.wrapCallSite(stack[10]);
    returnObject.file = caller.getFileName();
    returnObject.line = caller.getLineNumber();
  };
  E.captureStackTrace(returnObject);
  returnObject.stack;
  E.stackTraceLimit = oldLimit;
  E.prepareStackTrace = oldPrepare;
  return returnObject;
}

const allTransports = [];

let currentType: 'short' | 'long' | 'json' = process.env.ISLAND_LOGGER_TYPE || 'short';

function createLogger(id) {
  function makeTransport(formatter) {
    return new winston.transports.Console({
      name: formatter.type,
      label: id,
      formatter: formatter,
      silent: currentType !== formatter.type
    });
  }
  const transports = [
    makeTransport(shortFormatter),
    makeTransport(longFormatter),
    makeTransport(jsonFormatter)
  ];
  transports.forEach(t => allTransports.push(t));
  const logger = winston.loggers.add(id, {transports});
  logger.level = 'debug';
  logger.setLevels(winston.config.syslog.levels);
  return logger;
}

winston.addColors(winston.config.syslog.colors);

// 타입은 전체적으로 같이 이동
// 레벨은 카테고리마다 따로 이동
export namespace Loggers {
  export function switchLevel(id, level: 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'crit') {
    if (!winston.loggers.has(id)) return false;
    winston.loggers.get(id).level = level;
    return true;
  }

  export function switchType(type: 'short' | 'long' | 'json') {
    currentType = type;
    allTransports.forEach(t => {
      if (t.name !== type) {
        t.silent = true;
      } else {
        t.silent = false;
      }
    });
    return true;
  }

  export function get(id) {
    // TODO: Container로 바꾸자. 옵션 상속이 된다.
    return winston.loggers.has(id) && winston.loggers.get(id) || createLogger(id);
  }
}
