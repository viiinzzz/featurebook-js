/* eslint-disable no-continue */
/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
const path = require('path');

const getPackageName = ({
  packageName,
  packageJsonPath,
}) => {
  if (!packageName || !packageName.length) {
    throw new Error('packageName must be specified.');
  }
  if (!packageJsonPath || !packageJsonPath.length) {
    throw new Error('packageJsonPath must be specified.');
  }
  const { name: parentName } = require(packageJsonPath);
  const parentPrefix = parentName.indexOf('/') >= 0 ? parentName.substring(0, parentName.indexOf('/') + 1) : '';
  const packagePrefix = global.packageTest ? '../' : parentPrefix;
  const packagePath = `${packagePrefix}${packageName}`;
  const IsLocal = packagePath.startsWith('.') || packagePath.startsWith('..');
  if (!IsLocal) {
    return {
      packageName: packagePath,
      packageLocal: false,
    };
  }
  return {
    packageName: `file://${path.resolve(packagePath).replace(/\\/g, '/')}/index.js`,
    packageLocal: true,
  };
};

const getCaller = () => {
  const error = new Error();
  if (!error.stack) return undefined;
  const stack = error.stack.split('\n');
  if (!stack || stack.length < 2) return undefined;
  // eslint-disable-next-line no-plusplus
  for (let i = 1; i < stack.length; i++) {
    const line = stack[i];
    const match = /^.*\((file:\/\/})*(.+):(\d+):(\d+)\)$/.exec(line);
    if (!match || match.length < 3) {
      continue;
    }
    const filename = match[2];
    if (filename === __filename) continue;
    return filename;
  }
  return undefined;
};

const importPackage = async ({
  packageName,
  packageJsonPath,
}) => {
  const {
    packageName: pkg,
    packageLocal: local,
  } = getPackageName({ packageName, packageJsonPath });
  const remote = !local;

  if (remote) {
    try {
      if (!require.resolve(pkg)) {
        throw new Error(`cannot resolve '${pkg}'`);
      }
    } catch (err) {
      const message = `${err.message}`.replace(/\n.*$/s, '');
      const curdir = `curdir: ${process.cwd()}`;
      const caller = `caller: ${getCaller()}`;
      const hint = `npm i ${pkg}`;
      console.error(`${'error:'.red} Cannot load module '${pkg}'
       ${message.gray}
${curdir.gray}
${caller.gray}
${'Did you run: '.gray}
${hint.blue}
`);
      process.exit(1);
    }
    const lib = require(pkg);
    return lib;
  }

  const lib = (await import(pkg)).default;
  return lib;
};

const use = (packageJsonPath) =>
  // eslint-disable-next-line implicit-arrow-linebreak
  async (packageName) => importPackage({ packageName, packageJsonPath });

module.exports = use;
