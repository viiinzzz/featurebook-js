module.exports = async function setup({
  program,
  runCommand,
}) {
  program.command('publish')
    .alias('pu')
    .description('build the specification HTML website'
      + '\nie. featurebook pu -o features/dist features')
    .option('--debug', 'debug', false)
    .option(
      '-o, --outputDir [path]',
      'directory where the HTML specification will be generated',
      './features/dist',
    )
    .argument(
      '<featuresDir>',
      'path to feature files',
    )
    .action(async (argument, options) => runCommand({
      options,
      program,
      command: 'html',
      argument,
      args: [options.outputDir],
    }));
};
