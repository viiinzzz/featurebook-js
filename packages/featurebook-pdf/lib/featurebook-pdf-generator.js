require('colors');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

const PdfPrinter = require('pdfmake');

const {
  getParts,
  IsImagePart,
  getImageData,
  clearCache,
  Debug: mdPartImageDebug,
} = require('./mdPartImage');

const maxImageWidth = 505;

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
  DebugSetup: (debug) => mdPartImageDebug(debug),
});

let libLoaded = false;
let api;
// eslint-disable-next-line import/newline-after-import
const use = require('./use')('../package.json');
const loadLib = async () => {
  if (libLoaded) return;
  api = await use('featurebook-api');
  libLoaded = true;
};

const cucumberIconName = 'cucumber128.png';
const cucumberIconId = 'cucumber';
const cucumberIcon = `data:image/png;base64,${fs.readFileSync(
  path.join(__dirname, cucumberIconName), 'base64')}`;

const buildinImages = {
  [cucumberIconId]: cucumberIcon,
};

class FeaturebookPdfGenerator {
  constructor({ featuresDir, fonts, outputExt }) {
    this.featuresDir = featuresDir;
    this.printer = new PdfPrinter(fonts);
    this.outputExt = outputExt || 'png';
  }

  setDocumentDefinition(styles = {}) {
    this.docDefinition = {
      defaultStyle: {
        font: 'Anaheim',
        fontSize: 12,
      },
      pageSize: 'A4',
      info: {},
      styles: {
        header1: { fontSize: 24, bold: true, marginBottom: 5 },
        header2: { fontSize: 20, bold: true, marginBottom: 5 },
        header3: { fontSize: 18, bold: true, marginBottom: 5 },
        ...styles,
      },
      content: [],
      footer: [
        {
          table: {
            widths: [500],
            headerRows: 1,
            body: [[{ text: '', border: [false, true, false, false] }]],
          },
          layout: {
            hLineWidth: () => 1,
          },
          margin: [40, 10, 0, 0],
        },
        {
          text: (new Date()).toLocaleDateString(),
          margin: [40, 0, 40, 0],
          style: 'smallText',
        },
        {
          text: '',
          margin: [0, 5, 40, 0],
          alignment: 'right',
          style: 'smallText',
          bold: true,
        },
      ],

      images: buildinImages,
    };
  }

  setMetadata(metadata) {
    this.docDefinition.info.Title = metadata.title ? metadata.title : 'Untitled';
    this.docDefinition.footer[2].text = metadata.title ? metadata.title : 'Untitled';

    if (Object.prototype.hasOwnProperty.call(metadata, 'authors')) {
      this.docDefinition.info.Author = metadata.authors.map(this.formatName).join(', ');
    }

    this.printTitle(metadata);

    if (Object.prototype.hasOwnProperty.call(metadata, 'authors')) {
      this.printHumans(metadata.authors);
    }

    if (Object.prototype.hasOwnProperty.call(metadata, 'contributors')) {
      this.printHumans(metadata.contributors);
    }
  }

  async save(file) {
    const pdfDoc = this.printer.createPdfKitDocument(this.docDefinition);
    const stream = fs.createWriteStream(file);
    pdfDoc.end();
    await pipeline(
      pdfDoc,
      stream,
    );
  }

  /*
   * print methods
   */

  // eslint-disable-next-line class-methods-use-this
  formatName(person) { return `${person.lastName}, ${person.firstName}`; }

  async printFeatureIcon(options = {}, returnPrint = false) {
    return this.printMarkdown(`![feature](!${cucumberIconId})`, options, null, returnPrint);
  }

  printIndex() {
    this.docDefinition.content.push({
      toc: {
        title: { text: 'Table of content', style: 'header2' },
        numberStyle: { bold: true },
      },
    });
  }

  async printNode(node) {
    if (node.type === 'file') {
      await this.printFeature(node);
    }

    if (node.type === 'directory') {
      await this.printDirectory(node);
      for (const child of node.children) {
        // eslint-disable-next-line no-await-in-loop
        await this.printNode(child);
      }
    }
  }

  async printFeature(node) {
    await loadLib();

    try {
      const features = await api.readFeatures(path.join(this.featuresDir, node.path));

      logDebug('features', [features]);

      await Promise.all([features].map(async (feature) => {
        // display cucumber icon
        // TODO display as a bullet
        await this.printFeatureIcon(null);

        const featureKeyword = { text: `${feature.feature.keyword.trim()}:`, color: 'red', fontSize: 16 };
        const featureName = { text: ` ${feature.feature.name}`, fontSize: 16 };
        const text = [featureKeyword, featureName];
        const margin = [0, 10, 0, 5];
        this.docDefinition.content.push({ text, margin });
        if (feature.feature.description) {
          this.printMarkdown(feature.feature.description);
        }

        await Promise.all(feature.feature.children.map(async (children) => {
          if (children.background) {
            this.printBackground(children.background);
          } else if (children.scenario) {
            // eslint-disable-next-line no-await-in-loop
            await this.printScenarioDefinition(children.scenario);
          }
        }));
      }));
    } catch (err) {
      logError(`printing feature. ${err.message}
path: ${node.path.gray}`);
    }
  }

  async printScenarioDefinition(scenario) {
    this.docDefinition.content.push({
      text: [
        { text: `${scenario.keyword.trim()}:`, color: 'red', fontSize: 14 },
        { text: ` ${scenario.name}`, fontSize: 14 },
      ],
      margin: [0, 10, 0, 5],
    });

    if (scenario.description) {
      this.printMarkdown(scenario.description);
    }

    for (const step of scenario.steps) {
      // eslint-disable-next-line no-await-in-loop
      await this.printStep(step);
    }
    for (const example of scenario.examples) {
      // eslint-disable-next-line no-await-in-loop
      await this.printExample(example);
    }
  }

  printTable(tableHeader, tableBody) {
    const body = [
      tableHeader.cells.map((cell) => cell.value),
      ...tableBody.map((bodyRow) => (
        bodyRow.cells.map((cell) => cell.value)
      )),
    ].filter(Boolean);

    this.docDefinition.content.push(
      {
        margin: [0, 10],
        table: {
          dontBreakRows: false,
          keepWithHeaderRows: 1,
          headerRows: 1,
          widths: Array(tableHeader.cells.length).fill('auto'),
          body,
        },
      },
    );
  }

  printStep(step) {
    this.docDefinition.content.push({
      text: [
        { text: `${step.keyword.trim()}:`, color: 'red' },
        { text: ` ${step.text}` },
      ],
    });

    if (step.docString) {
      this.docDefinition.content.push({
        text: step.docString.content, color: 'green',
      });
    }

    if (step.dataTable) {
      const tableHeader = step.dataTable.rows.shift();
      const tableBody = step.dataTable.rows;

      this.printTable(tableHeader, tableBody);
    }
  }

  printTitle(metadata) {
    this.docDefinition.content.push({
      text: `${metadata.title} ${metadata.version || ''}`,
      style: 'header1',
    });
  }

  printHumans(humans) {
    this.docDefinition.content.push({
      text: humans.map((name) => `${name.firstName} ${name.lastName}`).join(', '),
    });
  }

  async printMarkdown(markdown, options = {}, basedir = undefined, returnPrint = false) {
    const markdown2pdfmake = await use('markdown2pdfmake');
    const basedir2 = basedir || path.join(process.cwd(), this.featuresDir, '/');

    const images = {};
    const elements = await getParts(markdown)
      // sequentially asynchronous
      .reduce((last, part) => last.then(async () => {
        // eslint-disable-next-line no-shadow
        const basedir = basedir2;
        let element = {};
        const { IsImage, imageId } = IsImagePart({ part, basedir });
        if (IsImage) {
          if (!images[imageId]) {
            const { image } = await getImageData({ part, basedir, outputExt: this.outputExt });
            if (image) images[imageId] = image;
          }
          element = {
            maxWidth: maxImageWidth,
            image: imageId,
          };
          if (debug) logDebug(`pdf: include\n       ${part.gray}`);
        } else {
          element = markdown2pdfmake(part)
            .map((paragraph) => [{ ...paragraph, ...options }]);
        }

        const ret = {
          table: {
            headerRows: 0,
            widths: ['*'],
            // body: [...body],
            body: [[element]],
          },
          layout: {
            defaultBorder: false,
            fillColor: '#ddd',
          },
        };
        return [...await last, ret];
      }), Promise.resolve([]));

    let ret = null;
    if (returnPrint) ret = elements;
    else this.docDefinition.content.push(...elements);
    // console.warn({ images });
    this.docDefinition.images = {
      ...this.docDefinition.images ? this.docDefinition.images : {},
      ...images,
    };

    // if (debug) logDebug(`elements`, elements.map((e) => e.table.body[0][0]));
    if (debug) {
      logDebug('images', Object.entries(this.docDefinition.images)
        .map(([id, data]) => ({
          id,
          data: data && data.substring ? data.substring(0, 50) : data,
        })));
    }

    clearCache();
    return ret;
  }

  async printDirectory(node) {
    await loadLib();

    const nodePath = node.path.split('/');
    const headerLevel = nodePath.length;

    this.docDefinition.content.push({
      text: node.displayName,
      style: `header${headerLevel}`,
      margin: [0, 20, 0, 10],
      pageBreak: 'before',
      tocItem: true,
      tocStyle: headerLevel === 1 ? { fontSize: 14 } : { fontSize: 12 },
      tocMargin: headerLevel === 1 ? [0, 10, 0, 0] : 0,
    });

    const basedir = path.join(process.cwd(), this.featuresDir, node.path);
    const summary = await api.readSummary(basedir);
    if (summary) {
      await this.printMarkdown(summary, {}, basedir);
    }
  }

  async printBackground(background) {
    this.docDefinition.content.push({
      text: [
        { text: `${background.keyword.trim()}:`, color: 'red', fontSize: 14 },
        { text: ` ${background.name}`, fontSize: 14 },
      ],
      margin: [0, 10, 0, 5],
    });

    if (background.description) {
      await this.printMarkdown(background.description);
    }

    for (const step of background.steps) {
      this.printStep(step);
    }
  }

  async printExample(example) {
    this.docDefinition.content.push({
      text: [
        { text: `${example.keyword.trim()}:`, color: 'red', fontSize: 14 },
        { text: ` ${example.name}`, fontSize: 14 },
      ],
      margin: [0, 10, 0, 5],
    });

    if (example.description) {
      await this.printMarkdown(example.description);
    }

    this.printTable(example.tableHeader, example.tableBody);
  }
}

module.exports = {
  FeaturebookPdfGenerator,
  Debug,
};
