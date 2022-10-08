require('colors')
const path = require('path')
// eslint-disable-next-line
const globbyPromise = import('globby')
const { loadFeature } = require('jest-cucumber')

const {
  debug,
  log,
  logDebug,
  logWarning,
  logError,
  Debug,
} = require('./log')({
  // DebugValue: true,
  // eslint-disable-next-line no-shadow, no-unused-vars
  DebugSetup: (debug) => { },
});

const printFeature = (feature, options) =>
  printTags(feature.tags, options)
  + `${ "●".magenta.bold } ${ !feature.title ? "[no-name]".green : feature.title.green }
${printScenarios(feature.scenarioOutlines, options)}
${printScenarios(feature.scenarios, options)}`

const printTags = (tags, options) => !options || options.tags != "true" || !tags || !tags.length ? ""
  : tags.map(t => t.cyan + '\n').join('') + "\n"

const printScenarioOutlines = (outlines, options) => !outlines || !outlines.length ? ""
  : outlines.map(outline => printScenarioOutline(outline, options)).map(line => `  ${line}`).join('\n')

const printScenarioOutline = (outline, options) => !outline ? ""
  : `${outline.tags.map(t => '@' + t + '\n').join('')}${"›".magenta} ${outline.title.green}
`

const printScenarios = (scenarios, options) => !scenarios || !scenarios.length ? ""
  : scenarios.map(scenario => printScenario(scenario, options)).map(line => `  ${line}`).join('\n')

const printScenario = (scenario, options) => !scenario ? ""
  : (options && options.tags ? scenario.tags.map(t => '@' + t + '\n').join('') : "")
  + `${"›".magenta.bold} ${scenario.title.green}
${printSteps(scenario.steps, options)}
`

const printSteps = (steps, options) =>
  steps.map(step => printStep(step, options)).map(line => `    ${line}`).join('\n')

const printStep = (step, options) =>
  `${("· " + (step.keyword?.length ? step.keyword.toUpperCase() : "-")).green.bold} ${step.stepText.green}`



function listFeatures(inputDirectory_, options) {

  const inputDirectory = !inputDirectory_ || !inputDirectory_.length
    ? 'features' : inputDirectory_;

  const rootdir = process.cwd()
  const basedir = path.join(rootdir, inputDirectory)

  if (debug) console.log(`
${'debug:'.green} listing features from
       ${basedir.gray}`)

  ; (async () => {
    const globby = (await globbyPromise).globby;

    const files = await globby([`${basedir.replace(/\\/g, '/')}/**/*.feature`]);
    if (!files.length) {
      console.log(`
${'warning:'.yellow} feature file not found.
         ${ basedir.gray }

   hint: try to search in another directory with -i [path]`);
      return;
    }

    files.forEach(f => {
      const feature = loadFeature(f)
      console.log("\n" + '-'.repeat(f.length))
      console.log("\n" + f + "\n\n" + printFeature(feature, {
        tags: options.tags
      }));
      logDebug({ feature });
    })
  })()
}

module.exports = {
  Invoke: listFeatures,
  printFeature,
  Debug
}
