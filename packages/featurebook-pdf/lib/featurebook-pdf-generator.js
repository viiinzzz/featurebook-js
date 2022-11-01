require('colors');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

const PdfPrinter = require('pdfmake');

const {
  getParts,
  parsePart,
  getImageData,
  clearCache,
  Debug: mdPartImageDebug,
} = require('./mdPartImage');

const mm2pt = (mm) => mm * 2.835;
const cm2pt = (cm) => cm * 28.35;
const pageWidth = cm2pt(21);
const pageHeight = cm2pt(29.7);
const maxImageWidth = cm2pt(17.8);
const maxImageHeight = cm2pt(25.1);

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
const cucumberIcon = `data:image/png;base64,${fs.readFileSync(path.join(__dirname, cucumberIconName), 'base64')}`;

const buildinImages = {
  [`!${cucumberIconId}`]: cucumberIcon,
};

const element2Block = (element) => ({
  table: {
    headerRows: 0,
    widths: ['*'],
    // body: [...body],
    body: [[element]],
  },
  layout: {
    defaultBorder: false,
    // fillColor: '#ddd',
  },
});

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
      pageSize: { width: pageWidth, height: pageHeight },
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
      this.docDefinition.info.Author = metadata.authors.map(
        (person) => `${person.lastName}, ${person.firstName}`,
      ).join(', ');
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
   *
   * refer to https://pdfmake.github.io/docs/0.1/document-definition-object/styling/
   */

  printMetadata(metadata) {
    this.printTitle(metadata);

    const metadataAuthorsDefined = Object.prototype.hasOwnProperty.call(metadata, 'authors');
    if (metadataAuthorsDefined) {
      this.docDefinition.content.push({
        italics: true,
        text: `\nAuthor${metadata.authors.length > 1 ? 's' : ''}:`,
      });
      this.docDefinition.content.push({
        fontSize: 18,
        // eslint-disable-next-line prefer-template
        text: metadata.authors.map(
          (person) => `${person.firstName} ${person.lastName}`,
        ).join(', ') + '\n',
      });
    }

    const metadataContributorsDefined = Object.prototype.hasOwnProperty.call(metadata, 'contributors');
    if (metadataContributorsDefined) {
      this.docDefinition.content.push({
        italics: true,
        text: `Contributor${metadata.authors.length > 1 ? 's' : ''}:`,
      });
      this.docDefinition.content.push({
        fontSize: 14,
        // eslint-disable-next-line prefer-template
        text: metadata.contributors.filter(
          (person) => !metadataAuthorsDefined || !metadata.authors.includes(person),
        ).map(
          (person) => `${person.firstName} ${person.lastName}`,
        ).join(', ') + '\n\n\n',
      });
    }
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
        this.docDefinition.content.push({ text: '', margin: [0, 10, 0, 5] });
        await this.printMarkdown(`![feature](!${cucumberIconId} =10x10)`);

        const featureKeyword = { text: `${feature.feature.keyword.trim()}:`, color: 'red', fontSize: 16 };
        const featureName = { text: ` ${feature.feature.name}`, fontSize: 16 };
        const text = [featureKeyword, featureName];
        this.docDefinition.content.push({ text, margin: [0, 0, 0, 5] });
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
path: ${node.path.gray}`, '\n', err);
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

  async printMarkdown1({
    last, part,
    markdown2pdfmake, rootdir, basedir, options,
  }) {
    const {
      IsDisplayable,
      filepath, IsImageId, imageId, width, widthPercent, height, heightPercent, fit,
    } = parsePart({ part, rootdir, basedir });

    const { elements, images } = last;

    if (IsDisplayable) {
      return this.printMarkdown1Displayable({
        elements, images, part, filepath, IsImageId, imageId, width, widthPercent, height, heightPercent, fit,
      });
    }
    return this.printMarkdown1NotDisplayable({
      elements,
      images,
      part,
      markdown2pdfmake,
      options,
    });
  }

  async printMarkdown1Displayable({
    elements, images, part, filepath, IsImageId, imageId,
    width, widthPercent, height, heightPercent, fit,
  }) {
    // put image in cache
    if (!images[imageId]) {
      const { image } = await getImageData(
        // eslint-disable-next-line function-paren-newline, object-curly-newline
        { outputExt: this.outputExt, part, filepath, IsImageId, imageId });
      if (image) {
        // eslint-disable-next-line no-param-reassign
        images[imageId] = image;
      }
    }

    const width2 = !width ? height : width;
    const height2 = !height ? width : height;
    const widthPoint = !width2 ? undefined : widthPercent ? maxImageWidth * width2 * 0.01 : mm2pt(width2);
    const heightPoint = !height2 ? undefined : heightPercent ? maxImageHeight * height2 * 0.01 : mm2pt(height2);

    const size = {
      ...fit ? {
        fit: [
          widthPoint,
          heightPoint,
        ],
      } : {
        width: widthPoint,
        height: heightPoint,
      },
    };

    // logWarning({ width, widthPercent, height, heightPercent, part, size });

    elements.push(element2Block({
      image: imageId,
      ...size,
      maxWidth: maxImageWidth,
    }));

    if (debug) logDebug(`pdf: include\n       ${part.gray}`);

    return { elements, images };
  }

  // eslint-disable-next-line class-methods-use-this
  printMarkdown1NotDisplayable({
    elements, images, part,
    markdown2pdfmake, options,
  }) {
    const element = markdown2pdfmake(part).map(
      (paragraph) => [{ ...paragraph, ...options }],
    );

    elements.push(element2Block(element));

    return { elements, images };
  }

  async printMarkdown(markdown, options = {}, basedir = undefined, returnPrint = false) {
    // console.warn('printMarkdown...............\n'.yellow, markdown.replace(/[\n]/gm, '⤶\n').gray);
    const parts = await getParts(markdown.replace(/[\n]/gm, '\n\n'));
    // console.warn('printMarkdown...............parts\n'.yellow, parts);

    const markdown2pdfmake = await use('markdown2pdfmake');
    const basedir2 = basedir || path.join(process.cwd(), this.featuresDir, '/');
    const { elements, images } = await parts
      .reduce(// sequentially asynchronous
        (last, part) => last
          .then(async () => this.printMarkdown1({
            markdown2pdfmake,
            part,
            options,
            last: await last,
            rootdir: path.join((!basedir ? '' : basedir), '/'),
            basedir: path.join(basedir2, '/'),
          })),
        Promise.resolve({ elements: [], images: {} }),
      );

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
