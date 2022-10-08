module.exports = async function setup({
  program,
  runCommand,
}) {
  program.command('print')
    .alias('pr')
    .description('build the specification PDF document'
      + '\nie. featurebook pr -o features/dist/pdf features')
    .option('--debug', 'debug', false)
    .option('--dry-run', 'dry-run', false)
    .option('--open', 'open', false)
    .option('--svg', 'use SVG graphics (default is PNG)', false)
    .option(
      '-o, --outputDir [path]',
      'directory where the PDF specification will be generated',
      './features/dist/pdf',
    )
    .argument(
      '<featuresDir>',
      'path to feature files',
    )
    .action(async (argument, options) => runCommand({
      options,
      program,
      command: 'pdf',
      argument,
      args: [
        options.outputDir,
        {
          graphics: options.svg ? 'svg' : undefined,
          open: options.open,
          dryRun: options.dryRun,
        },
      ],
    }));
};
