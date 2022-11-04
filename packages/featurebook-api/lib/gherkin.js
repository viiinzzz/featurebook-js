require('colors');
const path = require('path');
const {
  Parser, AstBuilder,
  GherkinClassicTokenMatcher,
} = require('@cucumber/gherkin');
const fsp = require('fs/promises');

const {
  debug,
  log,
  logDebug,
  logWarning,
  logError,
  Debug,
} = require('./log')({
  // DebugValue: true,
  // eslint-disable-next-line no-shadow, no-unused-vars
  DebugSetup: (debug) => { },
});

let Id = 0;
const newId = () => {
  const ret = Id;
  Id += 1;
  return ret;
};

const parse = async (featureFile) => {
  logDebug(`parsing...
       ${featureFile.gray}`);

  const ext = path.extname(featureFile);
  const IsFeature = /\.feature/i.test(ext);
  if (!IsFeature) {
    console.warn(`${'warning:'.yellow} gherkin: parse\n       ${featureFile.gray} -- not a feature. skip.`);
    return undefined;
  }
  if (debug) console.debug(`${'debug:'.green} gherkin: parse\n       ${featureFile.gray}`);
  const text = await fsp.readFile(featureFile, 'utf8');

  const builder = new AstBuilder(newId);
  const matcher = new GherkinClassicTokenMatcher();
  const parser = new Parser(builder, matcher);
  // parser.stopAtFirstError = false;

  try {
    return parser.parse(text);
  } catch (err) {
    const parseError = /^Parser errors:/.test(err.message);
    if (parseError) {
      logError(`gherkin syntax error
       ${featureFile.red}

${err.message.replace(/^.*\n/, '').gray}
`);
    } else {
      logError(`parse failure (${err.message})
       ${featureFile.gray}`);
    }
    return { feature: {} };
  }
};

module.exports = {
  parse,
  Debug,
};
