/* eslint-disable camelcase */
/* eslint-disable quotes */
const path = require('path');
const {
  Iwant, given, when, then_wait_at_most, expect, before, after,
  rootdir, node, cleanupFile,
  content_is_valid_pdf, length_at_least,
  one_minute,
} = require('../test.helpers');

const getOutputFile = (outputDir) => {
  const outputPath = outputDir.startsWith('.') ? path.join(rootdir, outputDir) : outputDir;
  return path.join(outputPath, 'specification.pdf');
};

given('I have a folder with .feature files', () => {
  const folder = '../features';
  const outputDir = `${folder}/dist/pdf`;
  const outputFile = getOutputFile(outputDir);
  when('I run command ‘print’', () => {
    then_wait_at_most(one_minute)
      .that('it generates a valid pdf file', async () => {
        const output = await node({
          program: 'bin/featurebook',
          options: `print -o ${outputDir} ${folder}`,
          outputFile,
        });

        Iwant(output)
          .and.to.satisfy(length_at_least(100000))
          .and.to.satisfy(content_is_valid_pdf);
      });

    const cleanup = async () => cleanupFile(outputFile);
    before(cleanup);
    after(cleanup);
  });
});

given('I have a folder with .feature files', () => {
  const folder = '../features.simple';
  const outputDir = `${folder}/dist/pdf`;
  const outputFile = getOutputFile(outputDir);
  when('I dry-run command ‘print’', () => {
    then_wait_at_most(one_minute).that('it generates expected output to the console', async () => {
      const str = await node({
        program: 'bin/featurebook',
        options: `print --dry-run -o ${outputDir} ${folder}`,
      });

      expect(str).toMatchSnapshot();
    });

    const cleanup = async () => cleanupFile(outputFile);
    before(cleanup);
    after(cleanup);
  });
});
