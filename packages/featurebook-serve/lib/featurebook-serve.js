const path = require('path');
const express = require('express');

const { imageRenderer, linkRenderer } = require('./helper');
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
  // eslint-disable-next-line no-shadow, no-unused-vars
  DebugSetup: (debug) => { },
});

// --- REST API ---
// http://localhost:3000/api/rest/raw/assets/images/hello_world.png
// http://localhost:3000/api/rest/metadata
// http://localhost:3000/api/rest/summary
// http://localhost:3000/api/rest/spec/tree
// http://localhost:3000/api/rest/feature/hello_world.feature
// http://localhost:3000/api/rest/feature/non_technical%2Fload_testing.feature
// ----------------

const serve = async (featuresDir, port) => {
  const api = await use('featurebook-api');
  const markdown = await use('featurebook-markdown');

  const app = express();

  const markdownOptions = {
    imageRenderer,
    linkRenderer,
  };

  // serve static files from the `public` folder
  app.use('/', express.static(path.join(__dirname, '..', 'public')));

  // serve static raw files from the specification source dir directory
  app.use('/api/rest/raw/', express.static(featuresDir, {
    index: false,
  }));

  app.get('/api/rest/metadata', async (req, res, next) => {
    try {
      const metadata = await api.readMetadata(featuresDir);

      return res.send(metadata);
    } catch (error) {
      return next(error);
    }
  });

  // returns parsed summary or 404 if SUMMARY.md is not present
  app.get('/api/rest/summary/:path?', async (req, res, next) => {
    const summaryDir = req.params.path ? path.join(featuresDir, req.params.path) : featuresDir;
    try {
      const summary = await api.readSummary(summaryDir);

      if (summary === null) {
        return res.status(404).end();
      }

      return res.send(markdown.render(summary, markdownOptions));
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/rest/spec/tree', async (req, res, next) => {
    try {
      const specTree = await api.readSpecTree(featuresDir);
      return res.send(specTree);
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/rest/feature/:path', async (req, res) => {
    const responseBody = {};

    try {
      const features = await api.readFeatures(path.join(featuresDir, req.params.path));

      responseBody.status = 'success';
      responseBody.data = await markdown.descriptionMarkdownToHTML(features, markdownOptions);
    } catch (e) {
      responseBody.status = 'error';
      responseBody.message = `Unable to parse the feature file: ${e}`;
    } finally {
      res.send(responseBody);
    }
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    logError(err.stack);
    res.status(500).send({ error: err.message });
  });

  try {
    await app.listen(port);

    return app;
  } catch (err) {
    logError(err.message);
  }
};

module.exports = {
  Invoke: serve,
  Debug
};
serve.$imageRenderer = imageRenderer;
serve.$linkRenderer = linkRenderer;
