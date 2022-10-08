module.exports = async function setup({
  program,
  runCommand,
}) {
  program.command('list')
    .alias('ls')
    .description('print all the features to the console')
    .option('--debug', 'debug', false)
    .option('-t, --tags', 'show tags', undefined)
    .argument(
      '<featuresDir>',
      'path to feature files',
    )
    .action(async (argument, options) => runCommand({
      options,
      program,
      command: 'feature',
      argument,
      args: [options],
    }));
};
