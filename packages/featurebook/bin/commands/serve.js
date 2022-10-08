const os = require('os');
const dns = require('dns');
const opener = require('opener');

module.exports = async function setup({
  program,
  runCommand,
}) {
  program.command('serve')
    .alias('sr')
    .description('serve the specification HTML website'
      + '\nie. featurebook sr features')
    .option('--debug', 'debug', false)
    .option(
      '-p, --port <number>',
      'port on which to listen to',
      3000,
    )
    .argument(
      '<featuresDir>',
      'path to feature files',
    )
    .action(async (argument, options) => runCommand({
      options,
      program,
      command: 'serve',
      argument,
      args: [options.port],
    }).then(async () => {
      let address = 'localhost';
      try {
        address = await dns.promises.resolve4(os.hostname());
      } catch (err) {
        console.log(`DNS ${err.message}`.gray);
      }
      const shareLink = `http://${address}:${options.port}`;
      console.log(`It is available to all computers in the local network at ${shareLink}`.yellow);
      opener(shareLink);
    }));
};
