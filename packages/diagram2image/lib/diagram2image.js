require('colors');
const fs = require('fs');
const fsp = require('fs/promises');
const { pipeline } = require('stream/promises');
const path = require('path');
const streamBuffers = require('stream-buffers');
// const { temporaryFile: tempPromise } = import('tempy');
const tempyPromise = import('tempy');
const mermaidPromise = import('@mermaid-js/mermaid-cli');
const plantuml = require('node-plantuml-latest');
const puppeteer = require('puppeteer');

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

let libLoaded = false;
let temp;
let mermaid;
const loadLib = async () => {
  if (libLoaded) return;
  const { temporaryFile } = await tempyPromise;
  temp = temporaryFile;
  mermaid = await mermaidPromise;
  libLoaded = true;
};


const minDate = new Date(-8640000000000000);
const convertDiagramsInputFormats = ['puml', 'mmd'];
const convertDiagramsOutputFormats = ['png', 'gif', 'jpg', 'svg'];
const puppeteerConfig = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--single-process',
  ],
};

const dotExtRx = /^\.([^.]+)$/;
const getFileExt = (file) => {
  const name = path.basename(file);
  if (dotExtRx.test(name))
    return name.replace(dotExtRx, '$1');
  const dotExt = path.extname(file);
  if (!dotExt.length)
    return undefined;
  else
    return dotExt.substring(1).toLowerCase();
}

const IsDiagram = (file) => convertDiagramsInputFormats.includes(getFileExt(file));
const IsSupportedOutput = (file) => convertDiagramsOutputFormats.includes(getFileExt(file));

const checkPrerequisites = async () => {
  await loadLib();

  const testPuppeteer = async () => {
    const browser = await puppeteer.launch(puppeteerConfig);
    const page = await browser.newPage();
    // await page.goto('https://www.google.com', { waitUntil: 'networkidle2' })
    await page.close();
    await browser.close();
  }

  let testPuppeteerSuccess = false;
  let testPuppeteerRetry = false;
  let testPuppeteerErr = undefined;
  let testPuppeteerErrInstall = () => testPuppeteerErr && /Run `npm install`/.test(testPuppeteerErr.message);
  try {
    await testPuppeteer();
    testPuppeteerSuccess = true;
  } catch (err) {
    testPuppeteerErr = err
    if (testPuppeteerErrInstall()) testPuppeteerRetry = true;
  }
  if (testPuppeteerRetry) try {
    console.log("Installing chrome...");
    require("puppeteer/install.js")
    await testPuppeteer();
    testPuppeteerSuccess = true;
  } catch (err) {
    testPuppeteerErr = err
  }
  if (!testPuppeteerSuccess) {
    if (!testPuppeteerErrInstall())
      console.error(`${'error:'.red} puppeteer failure.\n${testPuppeteerErr}`);
    else
      console.error(`${'error:'.red} puppeteer failure.`);
    return false;
  }
  return true;
};

let prerequisites = undefined;
async function convert(input, output) {

  if (!input || !input.length)
    throw new Error("invalid parameter: input");
  if (!output || !output.length)
    throw new Error("invalid parameter: output");

  if (prerequisites === undefined)
    prerequisites = await checkPrerequisites();

  const abort = prerequisites !== true;
  if (abort)
    throw new Error(`puppeteer not available.`);

  const inputExt = getFileExt(input);
  const outputExt = getFileExt(output);

  let generateAgain = true;

  //just a dotExt provided as output? then a stream will be returned
  //instead to write to output
  let outputStream = null;
  let wantOutputStream = false;
  if (path.basename(output).length === output.length) {
    outputStream = new streamBuffers.WritableStreamBuffer({
      initialSize: (128 * 1024),
      incrementAmount: (16 * 1024)
    });
    wantOutputStream = true;
  }

  if (!convertDiagramsInputFormats.includes(inputExt))
    throw new Error(`invalid input extension ${inputExt}
\n\taccepted values are: ${convertDiagramsInputFormats.join(' ')}`);

  if (!convertDiagramsOutputFormats.includes(outputExt))
    throw new Error(`invalid output extension ${outputExt}
\n\taccepted values are: ${convertDiagramsOutputFormats.join(' ')}`);

  const inputTime = fs.statSync(input).mtime;
  const isPlantuml = inputExt === 'puml';
  const isMermaid = inputExt === 'mmd';

  if (!outputStream) {
    const outputDir = path.dirname(output);
    fs.mkdirSync(outputDir, { recursive: true });

    let outputTime = minDate;
    if (!wantOutputStream && fs.existsSync(output))
      outputTime = fs.statSync(output).mtime;

    if (inputTime <= outputTime)
      generateAgain = false;
    else
      outputStream = fs.createWriteStream(output);
  }

  if (!generateAgain) {
    if (debug) logDebug(`do not generate again.
${input.gray}`)
    return;
  }

  if (isPlantuml) {
    await pipeline(
      plantuml.generate(input, {format: outputExt}).out,
      outputStream
    );
    if (wantOutputStream) {
      if (debug) logDebug(`puml ==> ${outputExt} [Buffer]
${input.gray}`)
      const buffer = outputStream.getContents();
      return buffer;
    } else {
      if (debug) logDebug(`puml ==> ${outputExt} [File]
${input.gray}
${'==>'.gray} ${output.gray}`)
      const buffer = outputStream.getContents();
      return;
    }
  }

  if (isMermaid) {
    const tempOutput = temp({ extension: outputExt });
    await mermaid.run(input, tempOutput, {
      puppeteerConfig,
      quiet: true,
    });
    const buffer = await fsp.readFile(tempOutput);
    await fsp.unlink(tempOutput);
    if (wantOutputStream) {
      if (debug) logDebug(`mmd ==> ${outputExt} [Buffer]
${input.gray}`)
      return buffer;
    } else {
      if (debug) logDebug(`mmd ==> ${outputExt} [File]
${input.gray}
${'==>'.gray} ${output.gray}`)
      return;
    }
  }

  throw new Error("unsupported diagram type.");
}

module.exports = {
  IsDiagram,
  convert,
  convertDiagramsInputFormats,
  convertDiagramsOutputFormats,
  Debug,
};
