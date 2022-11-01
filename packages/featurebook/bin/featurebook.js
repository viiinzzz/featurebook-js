#!/usr/bin/env node

require('colors');
const { Command } = require('commander');
const fsp = require('fs/promises');
const path = require('path');

global.packageTest = process.env.LOCAL_ENVIRONMENT === 'test';
if (global.packageTest) {
  console.warn(`${'packageTest: on'.gray}
${'cwd: '.gray}${process.cwd().gray}`);
}
// else console.warn('packageTest: off'.gray);

const use = require('./use')('../package.json');
const { version } = require('../package.json');

const runCommand = async ({
  program,
  argument,
  options,
  command,
  args,
}) => {
  if (!options.quiet) {
    console.log(`${program.name()} v${program.version()} ${command}:`);
  }
  const cmd = await use(`featurebook-${command}`);
  const inputDir = argument || './features';
  if (!cmd.Invoke) {
    console.error(`featurebook-${command} has not Invoke method.`);
    return;
  }
  if (cmd.Debug) cmd.Debug(options.debug);
  await cmd.Invoke(inputDir, ...args);
};

const runProgram = async () => {
  const program = new Command();
  program.name('featurebook')
    .description('CLI for cucumber features utilities')
    .version(version);

  const commandDir = path.join(__dirname, 'commands');
  const commandFiles = await fsp.readdir(commandDir);
  await Promise.all(commandFiles.map(async (commandFile) => {
    const commandPath = path.join(commandDir, commandFile);
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const setup = await require(commandPath);
    await setup({ program, runCommand, use });
  }));

  program.parse(process.argv);
};

(async () => {
  try {
    await runProgram();
  } catch (err) {
    console.error(`${'error:'.red} ${err.message}`);
    process.exit(1);
  }
})();
