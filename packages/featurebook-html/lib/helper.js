const getImageRenderer = (pathPrefix, markdown) => (attrs) => {
  let { src } = attrs;

  if (src.startsWith(markdown.ASSET_URL_SCHEMA)) {
    src = pathPrefix + src.substring(markdown.ASSET_URL_SCHEMA.length);
  }

  return {
    ...attrs,
    src,
  };
};

const getLinkRenderer = (pathPrefix, markdown) => (attrs) => {
  let { href } = attrs;

  if (href.startsWith(markdown.FEATURE_URL_SCHEMA)) {
    href = `${pathPrefix + href.substring(markdown.FEATURE_URL_SCHEMA.length)}.html`;
  }

  return {
    ...attrs,
    href,
  };
};

module.exports = {
  getImageRenderer,
  getLinkRenderer,
};
