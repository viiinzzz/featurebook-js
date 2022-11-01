// match markdown images
// ie. ![caption](!imageId) builtin image
// ie. ![caption](relpath) relative file path
// ie. ![caption](relpath =widthxheight) for width and height constraints, in mm
// ie. ![caption](relpath =width%xheight%) in page size percent
// ie. ![caption](relpath ~widthxheight) fit in rectangle

require('colors');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

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

let libLoaded = false;
let d2i;
// eslint-disable-next-line import/newline-after-import
const use = require('./use')('../package.json');
const loadLib = async () => {
  if (libLoaded) return;
  d2i = await use('diagram2image');
  libLoaded = true;
};

const cache = {};
const setCache = (filepath, data) => { cache[filepath] = data; return data; };
const clearCache = () => Object.keys(cache).forEach((key) => delete cache[key]);
const getCache = (filepath) => {
  const hit = cache[filepath];
  if (debug && hit) logDebug(`markdown part: cache hit\n       ${filepath.gray}`);
  return hit;
};

const AsData = (data, type) => `data:${type};base64,${data.toString('base64')}`;

const invalidIcon = `data:image/png;base64,${fs.readFileSync(path.join(__dirname, 'redcross32.png'), 'base64')}`;

const webImageFormats = ['png', 'gif', 'jpg', 'jpeg', 'avif', 'apng', 'webp', 'svg'];

const getFileExt = (file) => {
  const dotExt = path.extname(file);
  if (!dotExt.length) return undefined;
  return dotExt.substring(1).toLowerCase();
};

const IsWebImage = (file) => webImageFormats.includes(getFileExt(file));

const displayablePartRx0 = /(!\[.+]\([^)]+\))/g;
const displayablePartRx = /^(!\[.+]\([^)]+\))$/g;
const displayablePartRx2 = /^!\[.+]\(([^)]+)\)$/;
const pathWhRx = /^(.*) ([~=])((\d+)([%]*)x(\d*)([%]*)|(\d*)([%]*)x(\d+)([%]*))?$/gi;

// due to async, regexp can go impredictible, so it is better to clone before to use
const cloneRx = (Rx) => new RegExp(Rx.source, Rx.flags);

const getParts = (md) => md.split(cloneRx(displayablePartRx0))
  .map((e) => e.trim())
  .filter(Boolean);

const parsePart = ({ part, rootdir, basedir }) => {
  const ExclamationMarkStart = part.startsWith('!');
  const SingleLine = !part.includes('\n');
  const IsMarkdownDisplayable = cloneRx(displayablePartRx).test(part);
  const IsDisplayable = ExclamationMarkStart && SingleLine && IsMarkdownDisplayable;

  // logDebug(
  //   (IsDisplayable ? 'parsePart\n'.green : 'parsePart\n'.red),
  //   `'${part.replace(/[\r]/sg, '␍').replace(/[\n]/sg, '⤶\n').gray}'\n`,
  //   // eslint-disable-next-line object-curly-newline
  //   { basedir, IsDisplayable, ExclamationMarkStart, SingleLine, IsMarkdownDisplayable },
  // );

  if (!IsDisplayable) {
    return {
      IsDisplayable: false,
    };
  }
  const relpathWh = part.replace(cloneRx(displayablePartRx2), '$1');
  const pathWhMatch = cloneRx(pathWhRx).exec(relpathWh);
  // eslint-disable-next-line one-var, one-var-declaration-per-line
  let relpath, fit, widthStr, widthPercent, heightStr, heightPercent;
  if (!pathWhMatch) {
    relpath = relpathWh;
  } else {
    relpath = `${pathWhMatch[1] ? pathWhMatch[1] : ''}`;
    fit = pathWhMatch[2] === '~';
    widthStr = `${pathWhMatch[4] ? pathWhMatch[4] : ''}${pathWhMatch[8] ? pathWhMatch[8] : ''}`;
    heightStr = `${pathWhMatch[6] ? pathWhMatch[6] : ''}${pathWhMatch[10] ? pathWhMatch[10] : ''}`;
    widthPercent = `${pathWhMatch[5] ? pathWhMatch[5] : ''}${pathWhMatch[9] ? pathWhMatch[11] : ''}`.length > 0;
    heightPercent = `${pathWhMatch[7] ? pathWhMatch[7] : ''}${pathWhMatch[9] ? pathWhMatch[11] : ''}`.length > 0;
  }
  const width = !widthStr || !widthStr.length ? undefined : Number.parseInt(widthStr, 10);
  const height = !heightStr || !heightStr.length ? undefined : Number.parseInt(heightStr, 10);

  const IsImageId = relpath.startsWith('!');

  const ImageId = !IsImageId ? undefined
    : relpath.substring(0);

  const filepath = IsImageId ? undefined
    : path.join(basedir, relpath);

  const filepathrel = !filepath ? undefined
    : `__${filepath.startsWith(rootdir)
      ? filepath.substring(rootdir.length)
      : filepath}__`;

  const imageId = IsImageId ? ImageId
    : filepathrel.replace(/[/\\:]+/g, '-').replace(/[ .]/gi, '_');

  // logWarning(
  //   'parsePart\n'.blue,
  //   `'${part.replace(/[\r]/sg, '␍').replace(/[\n]/sg, '⤶\n').gray}'\n`,
  //   // eslint-disable-next-line object-curly-newline
  //   {
  //     // eslint-disable-next-line object-property-newline
  //     IsDisplayable, filepath, IsImageId, imageId,
  //     // eslint-disable-next-line object-property-newline
  //     width, height, widthPercent, heightPercent, fit,
  //   },
  // );

  return {
    IsDisplayable: true,
    relpath,
    filepath,
    imageId,
    IsImageId,
    fit,
    width,
    widthPercent,
    height,
    heightPercent,
  };
};

/*
  an image part sourcing a file: ![caption](filePath)
  an image part sourcing a file: ![caption](filePath =widthxheight)
  an image part sourcing data referenced by an imageId: ![caption](!imageId)
*/
const getImageData = async ({
  part, outputExt,
  filepath, IsImageId, imageId,
}) => {
  await loadLib();

  // logWarning("getImageData".blue, {
  //   part, outputExt,
  //   filepath, IsImageId, imageId,
  // });

  if (IsImageId) {
    return { imageId };
  }

  {
    if (!filepath) {
      throw new Error(`getImageData: missing filepath\n${part}`);
    }

    if (!outputExt) {
      throw new Error(`parsePart failed: missing outputExt\n${part}`);
    }

    if (IsWebImage(filepath)) {
      const image = setCache(filepath, getCache(filepath)
        || AsData(await fsp.readFile(filepath), 'image'));

      if (debug) logDebug(`markdown part: load image\n       ${filepath.gray}`);

      // eslint-disable-next-line object-curly-newline
      return { image, imageId };
    }

    if (d2i.IsDiagram(filepath)) {
      const image = setCache(filepath, getCache(filepath)
        || AsData(await d2i.convert(filepath, `.${outputExt}`), `image/${outputExt}`));

      if (debug) logDebug(`markdown part: convert diagram to image\n       ${filepath.gray}`);

      // eslint-disable-next-line object-curly-newline
      return { image, imageId };
    }

    const message = `markdown part: unsupported extension:\n${part}`;
    return { image: invalidIcon, imageId, error: message };
  }
};

module.exports = {
  getParts,
  parsePart,
  getImageData,
  clearCache,
  Debug,
};
