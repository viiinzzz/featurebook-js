module.exports = async function setup({
  program,
  runCommand,
  use,
}) {
  const {
    scrumExt,
    featureExt,
  } = await use('featurebook-scrum');

  program.command('scrum')
    .alias('sc')
    .description(`track features (@tags in .${featureExt}, data in .${scrumExt} files)`)
    .option('--debug', 'debug', false)
    .option('-m, --me', 'track features where my attention is needed')
    .option('-p, --productOwner', 'track features where product owner attention is needed')
    .option('-s, --scrumMaster', 'track features where scrum master attention is needed')
    .option('-d, --developer', 'track features where developers attention is needed')
    .option('-q, --qualityAssurance', 'track features where QA attention is needed')
    .option('-v, --verified', 'show verified features')
    .option('-r, --rejected', 'show rejected features')
    .option('-c, --currentSprint', 'show current sprint only')
    .option('-a, --allSprints', 'show all sprints')
    .option('-l, --sprintList', 'show sprint list')
    .option('-t, --featureText', 'show feature details')
    .option('-f, --fileLink', 'show file links')
    .option('--loadScrum', `generate .${scrumExt} files if none`)
    .option('--silent', 'suppress features print')
    .option('--debug', 'show debug logs')
    .option('--front, --frontend', 'show only frontend or fullstack tagged features')
    .option('--back, --backend', 'show only backend or fullstack tagged features')
    .option('--full, --fullstack', 'show only frontend and backend or fullstack tagged features')
    .option(
      '-o, --outputDirectory [path]',
      'the directory in which the result is written',
      undefined,
    )
    .argument(
      '<featuresDir>',
      'path to feature files',
    )
    .action(async (argument, options) => runCommand({
      options,
      program,
      command: 'scrum',
      argument,
      args: [options],
    }));
};
