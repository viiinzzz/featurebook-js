require('colors');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const pug = require('pug');

const helper = require('./helper');
const use = require('./use')('../package.json');

const TEMPLATES_DIR = path.join(__dirname, '..', 'resources');

const NO_SUMMARY_MESSAGE_MD = 'You can put some content here by creating the `SUMMARY.md` Markdown file.';

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

let api;
let markdown;
let libLoaded = false;
const loadLib = async () => {
  if (libLoaded) return;
  api = await use('featurebook-api');
  Debug(debug, api);
  markdown = await use('featurebook-markdown');
  Debug(debug, markdown);
  libLoaded = true;
};

const html = async (featuresDir, outputDir) => {
  await loadLib();

  const getMarkdownOptions = (pathPrefix) => ({
    imageRenderer: helper.getImageRenderer(pathPrefix, markdown),
    linkRenderer: helper.getLinkRenderer(pathPrefix, markdown),
  });

  const metadata = await api.readMetadata(featuresDir) || {};
  const specTree = await api.readSpecTree(featuresDir);

  const assetsDir = path.join(featuresDir, 'assets');
  const localTemplatesDir = path.join(featuresDir, 'templates');

  const indexTemplate = fs.existsSync(path.join(localTemplatesDir, 'index.pug'))
    ? path.join(localTemplatesDir, 'index.pug')
    : path.join(TEMPLATES_DIR, 'index.pug');

  const featureTemplate = fs.existsSync(path.join(localTemplatesDir, 'feature.pug'))
    ? path.join(localTemplatesDir, 'feature.pug')
    : path.join(TEMPLATES_DIR, 'feature.pug');

  fs.mkdirSync(outputDir, { recursive: true });

  try {
    const stats = await fs.promises.stat(assetsDir);
    if (stats.isDirectory()) {
      await fse.copy(assetsDir, path.join(outputDir, 'assets'))
        .catch((e) => { console.error(e); });
    }
  } catch (err) {
    // ignore
  }

  const indexTemplateCompiled = pug.compileFile(indexTemplate, { debug: false, pretty: true });
  const featureTemplateCompiled = pug.compileFile(featureTemplate, { debug: false, pretty: true });

  const print = async (node, pathPrefix) => {
    if (node.type === 'file') {
      const featurePath = path.join(featuresDir, node.path);
      const nextPathPrefix = pathPrefix || './';
      try {
        const feature = await api.readFeatures(featurePath);
        const results = [];
        const renderedFeatures = [];
        results.push(
          markdown.descriptionMarkdownToHTML(
            feature.feature,
            getMarkdownOptions(nextPathPrefix),
          ).then((renderedFeature) => {
            renderedFeatures.push({
              ...feature,
              feature: renderedFeature,
            });
          }),
        );

        await Promise.all(results);

        const renderedTemplate = featureTemplateCompiled({
          pathPrefix: nextPathPrefix,
          path: node.path,
          metadata,
          specTree,
          features: renderedFeatures,
        });

        await fs.promises.writeFile(path.join(outputDir, `${node.path}.html`), renderedTemplate)
          .catch((e) => { console.log(e); });
      } catch (err) {
        console.warn(`${'error:'.red} printing feature ${featurePath}`, err);
      }
    } else if (node.type === 'directory') {
      fs.mkdirSync(path.join(outputDir, node.path), { recursive: true });

      const summary = await api.readSummary(
        path.join(featuresDir, node.path),
      ) || NO_SUMMARY_MESSAGE_MD;

      const summaryOutputPath = path.join(outputDir, node.path, 'index.html');
      const nextPathPrefix = pathPrefix ? `${pathPrefix}../` : './';

      const renderedMarkdown = markdown.render(summary, getMarkdownOptions(nextPathPrefix));

      const renderedTemplate = indexTemplateCompiled({
        pathPrefix: nextPathPrefix,
        metadata,
        specTree,
        summary: renderedMarkdown,
      });

      await fs.promises.writeFile(summaryOutputPath, renderedTemplate)
        .catch((e) => { console.log(e); });

      node.children.forEach((child) => {
        print(child, nextPathPrefix);
      });
    }
  };
  try {
    await print(specTree);
    console.log(`${outputDir}
done.`);
  } catch (err) {
    console.error(`${'error:'.red} `, err);
  }
};

module.exports = {
  Invoke: html,
  Debug,
};

html.$imageRenderer = helper.getImageRenderer('');
html.$linkRenderer = helper.getLinkRenderer('');
