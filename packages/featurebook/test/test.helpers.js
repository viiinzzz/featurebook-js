/* eslint-disable camelcase */
/* eslint-disable object-property-newline */
require('colors');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const { execSync } = require('child_process');

const rootdir = path.dirname(__dirname);

const run = ({ cwd, command }) => {
  try {
    const p = execSync(command, {
      cwd,
      maxBuffer: Infinity,
      env: process.env,
    });
    return p.toString();
  } catch (err) {
    const codeStr = `${err.status}`;
    err.message = `${'error:'.red} exit code ${codeStr.bold} ${command.gray}
cwd: ${cwd}
${err.message}`;
    throw err;
  }
};

const node = async ({
  program,
  options,
  outputFile,
}) => {
  const optionsStr = !options || !options.length ? '' : ` ${options}`;
  const command = `node ${program}${optionsStr}`;
  const stringOutput = run({
    cwd: rootdir,
    command,
  });
  if (!outputFile || !outputFile.length) {
    return stringOutput;
  }
  if (!fs.existsSync(outputFile)) {
    console.error(`${'error:'.red} outputFile not generated
${outputFile.gray}`);
    return stringOutput;
  }
  const buffer = await fsp.readFile(outputFile);
  return buffer;
};

const node_error = async ({
  program,
  options,
}) => {
  try {
    await node({
      program,
      options,
    });
    return undefined;
  } catch (err) {
    return err;
  }
};

const content_is_valid_pdf = (buffer) =>
  // eslint-disable-next-line implicit-arrow-linebreak
  Buffer.isBuffer(buffer)
  && buffer.lastIndexOf('%PDF-') === 0
  && buffer.lastIndexOf('%%EOF') > -1;

const cleanupFile = async (filePath) => {
  if (fs.existsSync(filePath)) {
    await fsp.unlink(filePath);
    // console.info(`cleanup: file deleted: ${filePath}`);
  } else {
    // console.info(`cleanup: file does not exist: ${filePath}`);
  }
};

const buffer_length_at_least = (minLength) => (buffer) =>
  // eslint-disable-next-line implicit-arrow-linebreak
  buffer && Buffer.isBuffer(buffer)
  && buffer.length >= minLength;

const buffer_length_between = (minLength, maxLength) => (buffer) =>
  // eslint-disable-next-line implicit-arrow-linebreak
  buffer && Buffer.isBuffer(buffer)
  && buffer.length >= minLength
  && (!maxLength || buffer.length <= maxLength);

// eslint-disable-next-line import/no-extraneous-dependencies
const chai = require('chai');

const { expect: chai_expect } = chai;
const should = chai.should();

const {
  expect: jest_expect,
  describe,
  it,
  beforeAll,
  afterAll,
// eslint-disable-next-line import/no-extraneous-dependencies
} = require('@jest/globals');

const given = describe;
const when = describe;
const then = it;
const then_wait_at_most = (timeout) => ({
  that: (testName, fn) => it(testName, fn, timeout),
});
const before = beforeAll;
const after = afterAll;

module.exports = {
  expect: jest_expect,
  Iwant: chai_expect, should,
  given, when, then, then_wait_at_most, before, after,
  rootdir, node, node_error, cleanupFile,
  content_is_valid_pdf, buffer_length_at_least, buffer_length_between,
  ten_seconds: 10000,
  thirty_seconds: 30000,
  one_minute: 60000,
  two_minutes: 120000,
};
