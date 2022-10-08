/* eslint-disable no-continue */
require('colors');
const path = require('path');

let debug = false;
const setDebug = (value) => { debug = value; };

const sqbr = (str) => `[${str}]`;

const getCaller = () => {
  const error = new Error();
  if (!error.stack) return undefined;
  const stack = error.stack.split('\n');
  if (!stack || stack.length < 4) return undefined;
  // eslint-disable-next-line no-plusplus
  for (let i = 1; i < stack.length; i++) {
    const line = stack[i];
    const match = /^.*\((file:\/\/})*(.+):(\d+):(\d+)\)$/.exec(line);
    if (!match || match.length < 3) {
      continue;
    }
    const filename = match[2];
    if (filename === __filename) continue;
    return filename;
  }
  return undefined;
};

const logDebug = (...args) => {
  if (debug) {
    const callername = getCaller();
    const label = sqbr(path.basename(!callername ? __dirname : callername));
    console.debug(`${label.gray}
${'debug:'.green}`, ...args);
  }
};

const logError = (...args) => {
  const callername = getCaller();
  const label = sqbr(path.basename(!callername ? __dirname : callername));
  console.error(`${debug === undefined || debug === true ? label.gray : ''}
${'error:'.red}`, ...args);
};

const logWarning = (...args) => {
  const callername = getCaller();
  const label = sqbr(path.basename(!callername ? __dirname : callername));
  console.warn(`${debug === undefined || debug === true ? label.gray : ''}
${'warning:'.yellow}`, ...args);
};

const log = (...args) => {
  const callername = getCaller();
  const label = sqbr(path.basename(!callername ? __dirname : callername));
  if (debug === undefined || debug === true) console.log(label.gray);
  console.log(...args);
};

const Debug = (set, target, DebugSetup) => {
  if (target) {
    if (target && target.Debug) target.Debug(set);
  } else {
    debug = set === undefined || set === true;
    logDebug(`Debug(${debug ? 'true'.green : 'false'.gray})`);

    if (DebugSetup) {
      DebugSetup(debug);
    }
  }
};

const setup = ({
  DebugValue,
  DebugSetup,
}) => {
  if (DebugValue !== undefined) {
    debug = DebugValue;
  }
  return {
    debug,
    setDebug,
    sqbr,
    log,
    logDebug,
    logWarning,
    logError,
    // eslint-disable-next-line no-shadow
    Debug: (set, target) => Debug(set, target, DebugSetup),
  };
};

module.exports = setup;
