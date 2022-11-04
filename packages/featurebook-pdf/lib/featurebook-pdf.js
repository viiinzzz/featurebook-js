require('colors');
const fs = require('fs');
const path = require('path');
const opener = require('opener');
const YAML = require('yaml');

const {
  FeaturebookPdfGenerator,
  Debug: FeaturebookPdfGeneratorDebug,
} = require('./featurebook-pdf-generator');

const use = require('./use')('../package.json');

const {
  debug,
  sqbr,
  log,
  logDebug,
  logWarning,
  logError,
  Debug,
} = require('./log')({
  // DebugValue: true,
  // eslint-disable-next-line no-shadow
  DebugSetup: (debug) => FeaturebookPdfGeneratorDebug(debug),
});

let api;
let libLoaded = false;
const loadLib = async () => {
  if (libLoaded) return;
  api = await use('featurebook-api');
  Debug(debug, api);
  libLoaded = true;
};

const fonts = {
  Anaheim: {
    normal: path.join(__dirname, '../resources/fonts/Anaheim-Regular.ttf'),
    bold: path.join(__dirname, '../resources/fonts/Anaheim-Regular.ttf'),
    italics: path.join(__dirname, '../resources/fonts/Anaheim-Regular.ttf'),
    bolditalics: path.join(__dirname, '../resources/fonts/Anaheim-Regular.ttf'),
  },
};

const gen = async (featuresDir, outputDir, options) => {
  await loadLib();

  try {
    const metadata = await api.readMetadata(featuresDir) || {};

    const doc = new FeaturebookPdfGenerator({
      featuresDir,
      fonts,
      outputExt: options ? options.graphics : undefined,
    });
    doc.setDocumentDefinition({});

    doc.setMetadata(metadata);
    doc.printMetadata(metadata);

    const specTree = await api.readSpecTree(featuresDir);

    doc.printIndex(specTree);
    await doc.printNode(specTree);

    return doc;
  } catch (err) {
    logError(`pdf gen failure
`, err);
    return undefined;
  }
};

const saveDryRun = async (featuresDir, outputDir, options) => {
  const doc = await gen(featuresDir, outputDir, options);
  if (!doc) throw new Error('pdf gen failure');

  const outputFile = path.join(outputDir, 'specification.pdf');
  try {
    const { docDefinition } = doc;
    const dryRunOutput = YAML.stringify(JSON.parse(JSON.stringify(
      { docDefinition },
    )));
    console.warn(
      '---dry-run---\n',
      dryRunOutput
        .replace(/(\s+data:[^;]+;base64,).*/g, '$1...'),
      // .replace(/(\s*data: .*)/g, '$1'.green),
    );
  } catch (err) {
    const code = err.code ? ` (${err.code})` : '';
    logError(
      `pdf save failure${code}
${outputFile.gray}
${err.code ? '' : err.message}`,
    );
    return;
  }

  log(`${outputFile.gray}
done.`);
};

const save = async (featuresDir, outputDir, options) => {
  if (options.dryRun) {
    saveDryRun(featuresDir, outputDir, options);
    return;
  }

  const doc = await gen(featuresDir, outputDir, options);
  if (!doc) return;

  const outputFile = path.join(outputDir, 'specification.pdf');
  try {
    fs.mkdirSync(outputDir, { recursive: true });

    await doc.save(outputFile);
  } catch (err) {
    const code = err.code ? ` (${err.code})` : '';
    logError(`pdf save failure${code}
${outputFile.gray}
${err.code ? '' : err.message}`, err);
    return;
  }

  log(`${outputFile.gray}
done.`);
  if (options.open && !global.puppeteerError) {
    opener(outputFile);
  }
};

module.exports = {
  Invoke: save,
  Debug,
};
