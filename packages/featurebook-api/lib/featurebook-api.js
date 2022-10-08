const fsPromises = require('fs').promises;
const path = require('path');
const ignore = require('ignore');
const gherkin = require('./gherkin');
const helpers = require('./helpers');
const constants = require('./constants');
const { version } = require('../package.json');

const getVersion = () => version;

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

const readMetadata = async (featuresDir) => {
  const metadataFile = path.join(featuresDir, constants.DEFAULT_METADATA_FILE_NAME);

  try {
    await fsPromises.stat(metadataFile);
  } catch (e) {
    return {};
  }

  try {
    const fileContent = await fsPromises.readFile(metadataFile, constants.DEFAULT_FILE_ENCODING);
    return JSON.parse(fileContent.toString());
  } catch (e) {
    logError(e);
    return {};
  }
};

const readFeatures = async (featureFile, options) => {
  try {
    return await gherkin.parse(featureFile, options);
  } catch (e) {
    logError(e);
    return [];
  }
};

const readSummary = async (dir) => {
  const summaryFile = path.join(dir, constants.DEFAULT_SUMMARY_FILE_NAME);

  try {
    await fsPromises.stat(summaryFile);
  } catch (e) {
    return null;
  }

  try {
    return await fsPromises.readFile(summaryFile, constants.DEFAULT_FILE_ENCODING);
  } catch (e) {
    logError(e);
    return null;
  }
};

const getDisplayNameOverwrite = async (featureFile) => {
  const features = await readFeatures(featureFile);
  const displayNameRegex = /#\s*featurebookDisplayName:\s*(.+)/;
  const comments = features.comments
    .filter((comment) => displayNameRegex.test(comment.text))
    .map((comment) => comment.text);

  if (comments.length > 0) {
    return displayNameRegex.exec(comments[0])[1];
  }

  return null;
};

const processSpecTree = async (featuresDir, specTree) => {
  const traverse = async (file) => {
    const node = {
      ...file,
      displayName: helpers.getDisplayName(file.name),
    };

    if (file.type === 'file') {
      try {
        const displayNameOverride = await getDisplayNameOverwrite(path.join(featuresDir, node.path));
        if (displayNameOverride) {
          node.displayName = displayNameOverride;
        }
      } catch (err) {
        // ignore
      }
    } else if (file.type === 'directory') {
      const results = [];
      node.children = [];

      for (const f of file.children) {
        results.push(
          traverse(f)
            .then((ret) => { node.children.push(ret); }),
        );
      }

      await Promise.all(results);

      node.children.sort((a, b) => a.name.localeCompare(b.name));
    }

    return node;
  };

  return traverse({ ...specTree });
};

const readSpecTree = async (featuresDir) => {
  const ig = ignore().add(constants.DEFAULT_IGNORE_PATTERNS);
  const ignoreFile = path.join(featuresDir, constants.DEFAULT_IGNORE_FILE_NAME);

  try {
    await fsPromises.stat(ignoreFile);

    try {
      const fileContent = await fsPromises.readFile(ignoreFile);
      ig.add(fileContent.toString());
    } catch (e) {
      logError(e);
    }
  } catch (e) {
    // ignore
  }

  try {
    const specTree = await helpers.findInDir(featuresDir, ig.createFilter());
    return await processSpecTree(featuresDir, specTree);
  } catch (e) {
    logError(e);
    return {};
  }
};

module.exports = {
  getVersion,
  readSpecTree,
  readMetadata,
  readFeatures,
  readSummary,
  Debug
};
