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

const invalidIcon = `data:image/png;base64,${fs.readFileSync(
  path.join(__dirname, 'redcross32.png'), 'base64')}`;

const webImageFormats = ['png', 'gif', 'jpg', 'jpeg', 'avif', 'apng', 'webp', 'svg'];

const getFileExt = (file) => {
  const dotExt = path.extname(file);
  if (!dotExt.length) return undefined;
  return dotExt.substring(1).toLowerCase();
};

const IsWebImage = (file) => webImageFormats.includes(getFileExt(file));

const imagePartRx = /(!\[.+]\([^)]+\))/g;
const imagePartRx2 = /!\[.+]\(([^)]+)\)/;

const getParts = (md) => md.split(imagePartRx).map((e) => e.trim()).filter(Boolean);

const parsePart = ({ part, basedir }) => {
  const relpath = part.replace(imagePartRx2, '$1');
  const IsImageId = relpath.startsWith('!');
  const ImageId = !IsImageId ? undefined
    : relpath.substring(1);
  const filepath = IsImageId ? undefined
    : path.join(basedir, relpath);
  const imageId = IsImageId ? ImageId
    : filepath.replace(/[/\\:]+/g, '-').replace(/[ .]/g, '_');

  return {
    relpath,
    filepath,
    imageId,
    IsImageId,
  };
};

const IsImagePart = ({ part, basedir }) => {
  const { imageId } = parsePart({ part, basedir });
  const IsImage = part.match(imagePartRx);
  if (IsImage) {
    return {
      IsImage,
      imageId,
    };
  }
  return {
    IsImage,
  };
};

/*
  an image part sourcing a file: ![caption](filePath)
  an image part sourcing data referenced by an imageId: ![caption](!imageId)
*/
const getImageData = async ({ part, basedir, outputExt }) => {
  await loadLib();

  const { filepath, imageId, IsImageId } = parsePart({ part, basedir });

  try {
    if (IsImageId) {
      return { imageId };
    }

    if (IsWebImage(filepath)) {
      const image = setCache(filepath, getCache(filepath)
        || AsData(await fsp.readFile(filepath), 'image'));

      if (debug) logDebug(`markdown part: load image\n       ${filepath.gray}`);

      return { image, imageId };
    }

    if (d2i.IsDiagram(filepath)) {
      const image = setCache(filepath, getCache(filepath)
        || AsData(await d2i.convert(filepath, `.${outputExt}`), `image/${outputExt}`));

      if (debug) logDebug(`markdown part: convert diagram to image\n       ${filepath.gray}`);

      return { image, imageId };
    }

    const message = `markdown part: unsupported extension:\n${part}`;
    throw new Error(message);
  } catch (err) {
    logError(`getPartImage failed. ${err.message}
file: ${filepath.gray}
`, err);

    return { image: invalidIcon, imageId };
  }
};

module.exports = {
  getParts,
  IsImagePart,
  getImageData,
  clearCache,
  Debug,
};
