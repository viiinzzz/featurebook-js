/* eslint-disable no-shadow */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
/* eslint-disable no-param-reassign */
/* eslint-disable camelcase */
/* eslint-disable no-underscore-dangle */
require('colors');
const fs = require('fs');
const path = require('path');
// eslint-disable-next-line
const globbyPromise = import('globby');
const YAML = require('yaml');
const { loadFeature } = require('jest-cucumber');
const sort = require('sort-array');
const { table, getBorderCharacters } = require('table');
const { execSync } = require('child_process');

const rootdir = process.cwd();

const {
  packageName,
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

const sprintExt = 'sprint';
const scrumExt = 'scrum';
const featureExt = 'feature';

const parseDateFormat = 'YYYY-MM-DD';
const isComment = /^\s*\/\//;
const CommentMark = '//';
const ImplicitMark = '!';
const TagMark = '@';
const CallToAction = `${CommentMark} not set ${CommentMark}`;
const _by = '_by';
const _date = '_date';
const sprintMark = '› S';
const issueMark = 'I#';
const pullrequestMark = 'PR#';
const _current_ = '(current)';

const _past = '_past';
const _current = '_current';
const _future = '_future';
const _daysLeft = '_daysLeft';

const priorityMark = 'Prio.';
const businessvalueMark = 'val.';
const timecriticalityMark = 'crit.';
const timeestimateMark = 'est.';

// status
const Basic_Status = 'status';
const Status_Proposed = 'proposed'; // implicit if no tag, just Authored
const Status_Issue = 'issue'; // proposition responding to issue
// const Status_Maturing = 'maturing'; // raffinage comments
const Status_Accepted = 'accepted';
const Status_Rejected = 'rejected';
const Status_Sprint = 'sprint';
const Status_Unassigned = 'unassigned';
const Status_AssignedTo = 'assignedto';
const Status_Branch = 'branch'; // implicitly assign to committer
const Status_Coding = 'coding'; // implicit when assigned or branch
const Status_CodedAskedReviewTo = 'askedreviewto';// "coded and assigned a reviewer"
const Status_Coded0 = 'needreview';// "coded and did not assign a reviewer"
const Status_Reviewed = 'reviewed';
const Status_Verified = 'verified';
const Status_PullRequest = 'pullrequest';

// basic
const Basic_FeatureTitle = 'Feature_Title';
const Basic_FeatureFolder = 'Feature_Folder';
const Basic_FeatureFile = 'Feature_File';
const Basic_FeaturePath = 'Feature_Path';
const Basic_FeatureText = 'Feature_Text';
const Basic_FeatureParsedText = 'Feature_Parsed_Text';
const Basic_Authored = 'authored';
const Basic_SprintNumber = 'sprint';
const Basic_Sprint_ = 'sprint_';
const Basic_Sprint_Start = Basic_Sprint_ + 'start';
const Basic_Sprint_End = Basic_Sprint_ + 'end';
// informative
const Info_Plane = 'plane';
const Info_PlaneBackend = 'backend';
const Info_PlaneFrontend = 'frontend';
const Info_PlaneFullstack = 'fullstack';
const Info_Type = 'type';
const Info_Component = 'component';
const Info_Nonfunctionalrequirements = 'nonfunctionalrequirements';

// priority
const Basic_Priority = 'priority';
const Priority_Choice1 = 'low';
const Priority_Choice2 = 'medium';
const Priority_Choice3 = 'high';

const Basic_Businessvalue = 'businessvalue';
const Businessvalue_Choice1 = 'poor';
const Businessvalue_Choice2 = 'valuable';
const Businessvalue_Choice3 = 'precious';

const Basic_Timecriticality = 'timecriticality';
const Timecriticality_Choice1 = 'later';
const Timecriticality_Choice2 = 'soon';
const Timecriticality_Choice3 = 'urgent';

const Basic_Timeestimate = 'timeestimate';
const Timeestimate_Choice1 = '15-man-days';
const Timeestimate_Choice2 = '10-man-days';
const Timeestimate_Choice3 = '5-man-days';
const Timeestimate_Choice4 = '3-man-days';
const Timeestimate_Choice5 = '1-man-day';
const Timeestimate_ChoiceMinwarn = { index: 2, message: 'Split feature in several shorter features.' };

// consolidated
const Conso_Prio = 'Priority';
const Conso_Sprint = 'Sprint';
const Conso_SprintShort = 'Spr.';
const Conso_Authored = 'Authored';
const Conso_Accepted = 'Accepted';
const Conso_Rejected = 'Rejected';
const Conso_Assigned = 'Assigned';
const Conso_Coded = 'Coded/Review';// asked review
const Conso_Reviewed = 'Reviewed';
const Conso_Verified = 'Verified';
const Conso_Arrange = 'Product';
const Conso_Act = 'Dev';
const Conso_Assert = 'QA';
const Conso_Status = 'Status';

const Status_Choices = [
  /* value */Status_Issue, Status_Accepted, Status_Rejected, /* value */Status_Sprint,
  Status_AssignedTo, /**/Status_Branch, Status_CodedAskedReviewTo, // Status_ReviewRequested,
  Status_Reviewed, Status_Verified, /**/Status_PullRequest,
];
const BasicProps = [
  Basic_Priority,
  Basic_Businessvalue,
  Basic_Timecriticality,
  Basic_Timeestimate,
];
const InformativeProps = [
  Info_Plane,
  Info_Type,
  Info_Component,
  Info_Nonfunctionalrequirements,
];
const StatusTags = [
  ...BasicProps,
  ...InformativeProps,
  ...Status_Choices,
].map((choice) => TagMark + choice);

const Priority_Choices = [
  Priority_Choice1,
  Priority_Choice2,
  Priority_Choice3,
];
const Businessvalue_Choices = [
  Businessvalue_Choice1,
  Businessvalue_Choice2,
  Businessvalue_Choice3,
];
const Timecriticality_Choices = [
  Timecriticality_Choice1,
  Timecriticality_Choice2,
  Timecriticality_Choice3,
];
const Timeestimate_Choices = [
  Timeestimate_Choice1,
  Timeestimate_Choice2,
  Timeestimate_Choice3,
  Timeestimate_Choice4,
  Timeestimate_Choice5,
];

const headers_Template_brief = [
  Conso_Sprint, Basic_FeatureTitle,
  Info_Plane, Conso_Status,
];
const options_brief = {
  role: 'brief',
};

// eslint-disable-next-line no-unused-vars
const headers_Template_all = [
  Conso_Sprint, Basic_FeaturePath, Conso_Prio, Info_Plane,
  Conso_Authored, Conso_Accepted, Conso_Rejected, Conso_Assigned,
  Conso_Coded, Conso_Reviewed, Conso_Verified,
];

const headers_Template_productOwner = [
  Conso_Sprint, Basic_FeaturePath, Conso_Prio, Info_Plane,
  Conso_Arrange,
];
const options_productOwner = {
  role: 'Product Owner',
};

const headers_Template_scrumMaster = [
  Conso_Sprint, Basic_FeatureTitle, Conso_Prio, Info_Plane,
  Conso_Arrange, Conso_Act, Conso_Assert,
];
const options_scrumMaster = {
  role: 'Scrum Master',
  verified: true,
  currentSprint: true,
};

const headers_Template_developers = [
  Basic_FeaturePath,
  Conso_Act,
  Conso_Coded,
];
const options_developers = {
  role: 'Developers',
  currentSprint: true,
  featureText: true,
  hideProposed: true,
};

const headers_Template_qualityAssurance = [
  Conso_SprintShort, Basic_FeatureTitle,
  Conso_Assert,
];
const options_qualityAssurance = {
  role: 'Quality Assurance',
  currentSprint: true,
  featureText: true,
  hideProposed: true,
};

const FirstCapitalized = (str) => {
  if (!str || !str.length) return str;
  return str.charAt(0).toUpperCase() + str.substring(1).toLowerCase();
};

const __grayColor = (str) => str.gray;
const __greenColor = (str) => str.green;
const __whiteColor = (str) => str.white;
const __yellowColor = (str) => str.yellow;
const __redColor = (str) => str.red;
const __pastColor = __grayColor;
const __currentColor = __greenColor;
const __futureColor = __whiteColor;
const __choice0Color = __grayColor;
const __choice1Color = __yellowColor;
const __choice2Color = __redColor;
const __choiceColor = (index) => (index <= 0 ? __choice0Color
  : index === 1 ? __choice1Color
    : __choice2Color);

const parseYamlFile = (file) => YAML.parse(fs.readFileSync(file, 'utf8'));

const writeYamlFile = ({ file, data, comments }) => fs.writeFileSync(
  file,
  (!comments || !comments.length ? '' : comments.split('\n').map((line) => `#${line}\n`).join(''))
    + YAML.stringify(data),
);

const formatDate = (date) => {
  try {
    return date.toISOString().substring(0, 10);
  } catch (err) {
    logError(`not a date: ${date}`, err);
    return undefined;
  }
};

const parseDateRx = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/;
const parseDate = (input, file) => {
  try {
    if (!input || !input.length
      || input === parseDateFormat || isComment.test(input)
    ) return undefined;
    const { groups: { year, month, day } } = parseDateRx.exec(input);
    const [yearN, monthN, dayN] = [
      Number.parseInt(year, 10),
      Number.parseInt(month, 10),
      Number.parseInt(day, 10),
    ];
    const ret = new Date(yearN, monthN - 1, dayN + 1, 0, 0, 0);
    return ret;
  } catch (err) {
    logError(`invalid YYYY-MM-DD date: ${input}
       ${file.gray}`, parseDateRx.exec(input));
    return undefined;
  }
};

const checkInteger = (input, file) => {
  try {
    if (!Number.isInteger(input)) throw new Error('not an integer');
    return input;
  } catch (err) {
    logError(`invalid integer: ${input}
       ${file.gray}`);
    return undefined;
  }
};

const parseInteger = (input, file) => {
  try {
    if (!input || !input.length
      || isComment.test(input)
    ) return undefined;
    const n = Number.parseInt(input, 10);
    if (Number.isNaN(n)) return undefined;
    return n;
  } catch (err) {
    logError(`invalid integer: ${input}
       ${file.gray}`);
    return undefined;
  }
};

const parseChoice = (input, choices, file, minwarn, maxwarn) => {
  try {
    if (!input || !input.length
      || input.includes('/') || isComment.test(input)
      || !choices || !choices.length
    ) return undefined;
    const inputLower = input.toLowerCase();
    const index = choices.findIndex((choice) => choice === inputLower) + 1;
    const validChoice = index > 0;
    if (!validChoice) {
      logWarning(`choice is not valid: ${input.red}
         valid choices are: ${choices.reverse().join(' ').green}${!file ? '' : `
        ${file.gray}`}`);
      return undefined;
    }
    if (minwarn && minwarn.index && index <= minwarn.index) {
      logWarning(`choice may be inappropriate: ${input.red}
         ${minwarn.message}${!file ? '' : `
        ${file.gray}`}`);
      return inputLower;
    }
    if (maxwarn && maxwarn.index && index >= maxwarn.index) {
      logWarning(`choice may be inappropriate: ${input.red}
         ${maxwarn.message}${!file ? '' : `
        ${file.gray}`}`);
      return inputLower;
    }
  } catch (err) {
    logError(`invalid choice: ${input}: ${err.message}
Choose amongst the following: ${choices.join('/')}${!file ? '' : `
      ${file.gray}`}`);
    return undefined;
  }
};

const parseString = (input /* file */) => {
  if (!input || !input.length
    || isComment.test(input)
  ) return undefined;
  return `${input}`;
};

const parseStringLower = (input) => (!input ? input : input.toLowerCase());

const now = Date.now();
const isPastPeriod = (startDate, endDate) => +now - endDate > 0;
const isFuturePeriod = (startDate /* endDate */) => +now - startDate < 0;
const isCurrentPeriod = (startDate, endDate) => +now - endDate <= 0 && +now - startDate >= 0;
const isValidPeriod = (startDate, endDate) => +endDate - startDate >= 0;
const getDaysLeft = (startDate, endDate) => (!isCurrentPeriod(startDate, endDate) ? undefined
  : Math.ceil((+endDate - now) / (1000 * 3600 * 24)));

const loadFeatureData = ({
  basedir,
  Scrum_File, Feature_File,
}) => {
  const featureFileRel = Feature_File.substring(!basedir ? 0 : basedir.length + 1).replace(/\\/g, '/');
  const TitleNocolor = path.basename(Scrum_File)
    .replace(/\.[^./]+$/, '').replace(/^[0-9_]+/, '').replace(/_/g, ' ');
  const Title = TitleNocolor.green;
  // logDebug(`file ${featureFileRel.gray}`)
  // logDebug(`feature ${Title.green}`)
  const Folder = path.dirname(Scrum_File).substring(basedir.length + 1);
  const rev = Folder.split('/').reverse();
  const Path = ' '.repeat(rev.length) + Title
    + rev.map((sub, i) => `\n${' '.repeat(rev.length - i - 1)}${(`/${sub}`).gray}`)
      .join('');

  let Text;
  try {
    Text = fs.readFileSync(Feature_File, 'utf8');
  } catch (err) {
    logError(`feature not found
      ${Feature_File.gray}`);
  }

  let Tags;
  let ParsedText;
  try {
    ParsedText = loadFeature(Feature_File);

    // if (parsedFeature.tags.length)
      // logDebug(`feature has tags ${parsedFeature.tags.map(tag => tag.cyan).join(', ')}`);

    Tags = ParsedText.tags
      .map((tagargs) => {
        const [tag, ...args] = tagargs.replace(/(?<!\\):/g, '\n').split('\n');
        return {
          tag,
          args: args.length ? args.join(' ') : undefined,
        };
      })
      .filter((tagargs) => {
        const validTag = StatusTags.includes(tagargs.tag);
        if (!validTag) {
          logError(`invalid tag ${tagargs.tag.red}. Valid tags are:${StatusTags
  .map((tag, i) => (i % 4 === 0 ? '\n' : '') + tag.padEnd(20)).join(' ').cyan}
      ${Feature_File.gray}`);
        }

        return validTag;
      });
  } catch (err) {
    logError(`cannot parse feature: ${err.message}
       ${Feature_File.gray}`);
  }

  return {
    Title,
    TitleNocolor,
    Folder,
    Path,
    featureFileRel,
    Tags,
    Text,
    ParsedText,
  };
};

const loadSprintData = ({ file }) => {
  if (!file) return {};
  if (fs.existsSync(file)) {
    const data = parseYamlFile(file);
    logDebug('sprint data', data);
    return data;
  }
  const data = {
    sprints: [
      {
        [Basic_SprintNumber]: 1,
        [Basic_Sprint_Start + _date]: parseDateFormat,
        [Basic_Sprint_End + _date]: parseDateFormat,
      },
    ],
  };
  const comments = `
 This file logs the sprints.
`;
  try {
    writeYamlFile({ file, data, comments });
    return data;
  } catch (err) {
    logError(`cannot write sprint data.
       ${file.gray}`);
    return {};
  }
};

const validateSprintData = ({ data, fileRel, sprintList }) => {
  if (!fileRel) throw new Error('file must be specified.');
  if (!data.sprints) {
    logWarning(`sprints array not found.
         ${fileRel.gray}`);
    return [];
  }

  const sprints = data.sprints.map((sprint, i) => {
    const num = checkInteger(sprint[Basic_SprintNumber], fileRel);
    const startDate = parseDate(sprint[Basic_Sprint_Start + _date], fileRel);
    const endDate = parseDate(sprint[Basic_Sprint_End + _date], fileRel);
    const validPeriod = isValidPeriod(startDate, endDate);

    if (!num) {
      logWarning(`incorrect value in sprints[${i}].${Basic_SprintNumber}: ${sprint[Basic_SprintNumber]}
         ${fileRel.gray}`);
    }
    if (!startDate) {
      logWarning(`incorrect value in sprints[${i}].${Basic_Sprint_Start + _date}: ${sprint[Basic_Sprint_Start + _date]}
         ${fileRel.gray}`);
    }
    if (!endDate) {
      logWarning(`incorrect value in sprints[${i}].${Basic_Sprint_End + _date}: ${sprint[Basic_Sprint_End + _date]}
         ${fileRel.gray}`);
    }
    if (!validPeriod) {
      logWarning(`incorrect value in sprints[${i}].${Basic_Sprint_End + _date}: ${sprint[Basic_Sprint_End + _date]}
         ${fileRel.gray}`);
    }
    if (!num || !startDate || !endDate || !validPeriod) { return undefined; }
    return {
      [Basic_SprintNumber]: num,
      [Basic_Sprint_Start + _date]: startDate,
      [Basic_Sprint_End + _date]: endDate,
    };
  }).filter((sprint) => !!sprint)
    .sort((a, b) => a[Basic_SprintNumber] - b[Basic_SprintNumber]);

  log(`
${sprints.map((sprint) => ({
    num: sprint[Basic_SprintNumber],
    start: sprint[Basic_Sprint_Start + _date],
    end: sprint[Basic_Sprint_End + _date],
    [_past]: isPastPeriod(sprint[Basic_Sprint_Start + _date], sprint[Basic_Sprint_End + _date]),
    [_current]: isCurrentPeriod(sprint[Basic_Sprint_Start + _date], sprint[Basic_Sprint_End + _date]),
    [_future]: isFuturePeriod(sprint[Basic_Sprint_Start + _date], sprint[Basic_Sprint_End + _date]),
    [_daysLeft]: getDaysLeft(sprint[Basic_Sprint_Start + _date], sprint[Basic_Sprint_End + _date]),
  })).map((sprint, cur) => {
    const prev = cur - 1;
    const prev_end = prev < 0 ? undefined : sprints[prev][Basic_Sprint_End + _date];
    const consecutive = prev < 0 ? true : +sprint.start - prev_end > 0;
    const period = `${formatDate(sprint.start)}..${formatDate(sprint.end)}`;
    const line = `${'  '.magenta + (sprintMark + sprint.num).padEnd(5).magenta}  ${
      sprint[_past] ? period.gray
        : sprint[_current] ? (`${period} ${_current_}`).green
          : period.white}`;
    sprints[cur][_past] = sprint[_past];
    sprints[cur][_current] = sprint[_current];
    sprints[cur][_future] = sprint[_future];
    sprints[cur][_daysLeft] = sprint[_daysLeft];
    return (consecutive ? '' : `
${'warning:'.yellow} sprints are not consecutive. Please fix dates.
        ${fileRel.gray}\n`)
    + ((sprintList || !consecutive) ? `${line}\n` : '');
  }).join('')}`);

  return sprints;
};

const missingSprintReported = [];
const addSprintData = ({ sprints, data, sprintFileRel /* featureFileRel */ }) => {
  if (!data) return;
  const num = data[Basic_SprintNumber];
  if (!num) {
    //     logWarning(`
    // Please specify ${(TagMark + Basic_SprintNumber + " Number").cyan} in feature file.
    //         ${featureFileRel.gray}`)
    return;
  }
  const sprint = sprints.find((sprint) => sprint[Basic_SprintNumber] === num);
  const alreadyReported = missingSprintReported.includes(num);
  if (!sprint) {
    if (!alreadyReported) {
      logWarning(`missing sprint definition.
  - sprint: ${num}
    sprint_start_date: ${parseDateFormat}
    sprint_end_date: ${parseDateFormat}
        ${sprintFileRel.gray}`);
    }
    missingSprintReported.push(num);
    return;
  }
  data[Basic_Sprint_Start + _date] = sprint[Basic_Sprint_Start + _date];
  data[Basic_Sprint_End + _date] = sprint[Basic_Sprint_End + _date];
  data[Basic_Sprint_ + _past] = sprint[_past];
  data[Basic_Sprint_ + _current] = sprint[_current];
  data[Basic_Sprint_ + _future] = sprint[_future];
  data[Basic_Sprint_ + _daysLeft] = sprint[_daysLeft];
  data.__sprintColor = sprint[_past] ? __pastColor : sprint[_current] ? __currentColor : __futureColor;
  data.__daysLeftColor = sprint[_daysLeft] < 3 ? __redColor : sprint[_daysLeft] < 7 ? __yellowColor : __greenColor;
};

const loadScrumData = ({
  file,
  loadScrum
}) => {
  if (!file) return {};

  if (fs.existsSync(file)) return parseYamlFile(file);
  if (!loadScrum) return {};
  const data = {

    [Basic_SprintNumber]: CallToAction,
    [Info_Plane]: CallToAction,
    [Info_Type]: CallToAction,
    [Info_Component]: CallToAction,
    [Info_Nonfunctionalrequirements]: CallToAction,

    [Basic_Priority]: Priority_Choices.join('/'),
    [Basic_Businessvalue]: Businessvalue_Choices.join('/'),
    [Basic_Timecriticality]: Timecriticality_Choices.join('/'),
    [Basic_Timeestimate]: Timeestimate_Choices.join('/'),

    [Basic_Authored + _by]: CallToAction,
    [Basic_Authored + _date]: parseDateFormat,
    [Status_Issue]: CallToAction,

    [Status_Accepted + _by]: CallToAction,
    [Status_Accepted + _date]: parseDateFormat,
    [Status_Rejected + _by]: CallToAction,
    [Status_Rejected + _date]: parseDateFormat,

    [Status_AssignedTo]: CallToAction,
    [Status_AssignedTo + _date]: parseDateFormat,
    [Status_Branch]: CallToAction,

    [Status_CodedAskedReviewTo + _by]: CallToAction,
    [Status_CodedAskedReviewTo + _date]: parseDateFormat,
    [Status_CodedAskedReviewTo]: CallToAction,
    [Status_Reviewed + _by]: CallToAction,
    [Status_Reviewed + _date]: parseDateFormat,

    [Status_Verified + _by]: CallToAction,
    [Status_Verified + _date]: parseDateFormat,
    [Status_PullRequest]: CallToAction,

    comments:
        -CallToAction,
  };
  const comments = `Valid tags are:${StatusTags
    .map((tag, i) => (i % 4 === 0 ? '\n' : '') + tag.padEnd(20)).join(' ').cyan}

The values below are overridden by ${TagMark}tags from .feature file.

Commit tags changes on the shared branches such as development or sprint.
Do not commit on your feature branch, otherwise it won't be shared amongst the team.
`;
  try {
    writeYamlFile({ file, data, comments });
    return data;
  } catch (err) {
    logError(`cannot write scrum template to ${(`${file}`).gray}\n${err}`);
    return {};
  }
};

const gitUser = ({ cwd }) => {
  const command = 'git config user.name';
  try {
    const output = execSync(command, {
      cwd,
      maxBuffer: Infinity,
    }).toString().split('\n');
    if (!output || !output.length || output.length < 1)
      throw new Error('file not found.');
    const [userName] = output;
    return userName.toLowerCase();
  } catch (err) {
    logError(`${err}\n       ${command.blue}`);
    return undefined;
  }
};

const gitAdded = ({ file, cwd }) => {
  const command = `git log --diff-filter=A --reverse --pretty=%an%n%ai%n%cn%n%ci -- "${file}"`;
  try {
    if (/^\//.test(file)) throw new Error('file must not start with /');
    const repo = gitCurrentRepository({ cwd });
    const branch = gitCurrentBranch({ cwd });
    const output = execSync(command, {
      cwd,
      maxBuffer: Infinity,
    }).toString().split('\n');
    if (!output || !output.length || output.length < 2)
      throw new Error(`file not found in repository ${repo.bold}⛌${branch.bold}.`);
    const [
      AuthoredBy, AuthoredDate,
      // CommittedBy, CommittedDate,
    ] = output;
    return {
      [Basic_Authored + _by]: AuthoredBy,
      [Basic_Authored + _date]: new Date(AuthoredDate),
    };
  } catch (err) {
    logError(`${err}\n       ${command.blue}`);
    return {};
  }
};

const gitCurrentRepository = ({ cwd }) => {
  const command = `git config --get remote.origin.url`;
  try {
    const output = execSync(command, {
      cwd,
      maxBuffer: Infinity,
    }).toString().split('\n');
    if (!output || !output.length || output.length < 1)
      throw new Error('unknown url.');
    const [
      url
    ] = output;
    const repo = url
      .replace(/(^https?:\/\/[^/]+\/)/, "")
      .replace(/^.*:/, "")
      .replace(/\.git$/, "");
    return repo;
  } catch (err) {
    logError(`${err}\n       ${command.blue}`);
    return undefined;
  }
};

const gitCurrentBranch = ({ cwd }) => {
  const command = `git branch --show-current`;
  try {
    const output = execSync(command, {
      cwd,
      maxBuffer: Infinity,
    }).toString().split('\n');
    if (!output || !output.length || output.length < 1)
      throw new Error('unknown branch.');
    const [
      branch
    ] = output;
    return branch;
  } catch (err) {
    logError(`${err}\n       ${command.blue}`);
    return undefined;
  }
};

const gitTagged = ({ file, cwd, tag }) => {
  const prop = tag.replace(new RegExp(`^${TagMark}`), '');
  const command = `git log -S ${tag} --pretty=%cn%n%ci -- "${file}"`;

  try {
    const repo = gitCurrentRepository({ cwd });
    const branch = gitCurrentBranch({ cwd });
    const output = execSync(command, {
      cwd,
      maxBuffer: Infinity,
    }).toString().split('\n');
    if (!output || !output.length || output.length < 2) {
      //`file not found in repository ${repo}⛌${branch}.`
      //       logDebug(`tag ${tag.cyan} not found
      //       ${file.gray}
      // ${command.blue}`)
      return {};
    }
    // logDebug(`tag ${tag.cyan} found
    //       ${file.gray}`)
    const [CommittedBy, CommittedDate] = output;
    return {
      [prop + _by]: CommittedBy,
      [prop + _date]: new Date(CommittedDate),
    };
  } catch (err) {
    logError(`${err.message}\n       ${command.blue}`);
    return {};
  }
};

const getFeatureCrossGitData = ({
  basedir,
  featureFileRel,
  Tags,
  Title,
  Feature_File,
}) => {
  const gitOptions = {
    file: featureFileRel,
    cwd: basedir,
  };
  return {
    ...gitAdded(gitOptions),
    ...!Tags ? [] : Tags.map((tagargs) => {
      const { tag } = tagargs;
      try {
        const data = gitTagged({ ...gitOptions, tag });
        const found = Object.keys(data).length > 0;
        if (!found) {
          const gitadd = `git add "${featureFileRel}"`;
          const gitcommit = `git commit -m "tagged feature '${Title}' as ${tagargs.tag}${tagargs.args ? ` ${tagargs.args}` : ''}"`;
          logWarning(`tag ${tagargs.tag.cyan} found in uncommitted file.`
//          ${featureFileRel.gray}
+ `
please   ${gitadd.blue}
and      ${gitcommit.blue}
`);
        }
        const prop = tag.replace(new RegExp(`^${TagMark}`), '');
        const value = tagargs.args;
        return {
          ...data,
          ...!value ? {} : { [prop]: value },
        };
      } catch (err) {
        logError(`git: invalid tag ${tag.cyan}: ${err.message}
      ${Feature_File.gray}`);
        return {};
      }
    }).reduce((x, y) => ({ ...x, ...y }), {}),
  };
};

const cleanInformativeData = ({ data, file }) => {
  InformativeProps.forEach((prop) => { data[prop] = parseString(data[prop], file); });
};

const cleanPriority = ({ data, file }) => {
  data[Basic_Priority] = parseChoice(data[Basic_Priority], Priority_Choices, file);
  data[Basic_Businessvalue] = parseChoice(data[Basic_Businessvalue], Businessvalue_Choices, file);
  data[Basic_Timecriticality] = parseChoice(data[Basic_Timecriticality], Timecriticality_Choices, file);
  data[Basic_Timeestimate] = parseChoice(data[Basic_Timeestimate], Timeestimate_Choices, file, Timeestimate_ChoiceMinwarn);
};

const cleanData = ({ data, file, shouldParseDate }) => {
  cleanInformativeData({ data, file });
  cleanPriority({ data, file });

  data[Basic_SprintNumber] = parseInteger(data[Basic_SprintNumber], file);

  data[Basic_Authored + _by] = parseStringLower(data[Basic_Authored + _by], file);
  data[Status_Issue] = parseString(data[Status_Issue], file);
  data[Status_Accepted + _by] = parseStringLower(data[Status_Accepted + _by], file);
  data[Status_Rejected + _by] = parseStringLower(data[Status_Rejected + _by], file);
  data[Status_AssignedTo] = parseStringLower(data[Status_AssignedTo], file);
  data[Status_Branch] = parseStringLower(data[Status_Branch], file);
  data[Status_CodedAskedReviewTo + _by] = parseStringLower(data[Status_CodedAskedReviewTo + _by], file);
  data[Status_CodedAskedReviewTo] = parseStringLower(data[Status_CodedAskedReviewTo], file);
  data[Status_Reviewed + _by] = parseStringLower(data[Status_Reviewed + _by], file);
  data[Status_Verified + _by] = parseStringLower(data[Status_Verified + _by], file);
  data[Status_PullRequest] = parseString(data[Status_PullRequest], file);
  data[Info_Plane] = parseStringLower(data[Info_Plane], file);

  data.actors = [
    ...!data[Status_AssignedTo] ? [] : [data[Status_AssignedTo]],
    ...!data[Status_CodedAskedReviewTo] ? [] : [data[Status_CodedAskedReviewTo]],
  ];

  if (shouldParseDate) {
    data[Basic_Sprint_Start + _date] = parseDate(data[Basic_Sprint_Start + _date], file);
    data[Basic_Sprint_End + _date] = parseDate(data[Basic_Sprint_End + _date], file);
    data[Basic_Authored + _date] = parseDate(data[Basic_Authored + _date], file);
    data[Status_Accepted + _date] = parseDate(data[Status_Accepted + _date], file);
    data[Status_Rejected + _date] = parseDate(data[Status_Rejected + _date], file);
    data[Status_AssignedTo + _date] = parseDate(data[Status_AssignedTo + _date], file);
    data[Status_CodedAskedReviewTo + _date] = parseDate(data[Status_CodedAskedReviewTo + _date], file);
    data[Status_Reviewed + _date] = parseDate(data[Status_Reviewed + _date], file);
    data[Status_Verified + _date] = parseDate(data[Status_Verified + _date], file);
  }
};

const consolidateCard = (card) => {
  const __sprintColor = card.__sprintColor ? card.__sprintColor : (str) => str;
  const __daysLeftColor = card.__daysLeftColor ? card.__daysLeftColor : (str) => str;
  card[Conso_SprintShort] = (card[Basic_SprintNumber] ? (sprintMark + card[Basic_SprintNumber]).magenta : '')
    + (!card[Basic_Sprint_ + _daysLeft] ? ''
      : `\n${__daysLeftColor(` ${card[Basic_Sprint_ + _daysLeft]}d`)}`);
  card[Conso_Sprint] = (card[Basic_SprintNumber] ? (sprintMark + card[Basic_SprintNumber]).magenta : '')
    + __sprintColor(`\n${card[Basic_Sprint_Start + _date] ? formatDate(card[Basic_Sprint_Start + _date]) : ''}`)
    + __sprintColor(`\n${card[Basic_Sprint_End + _date] ? formatDate(card[Basic_Sprint_End + _date]) : ''}`)
    + (!card[Basic_Sprint_ + _daysLeft] ? ''
      : `\n${__daysLeftColor(`...${card[Basic_Sprint_ + _daysLeft]} day${card[Basic_Sprint_ + _daysLeft] > 1 ? 's' : ''}`)}`);

  const __priorityColor = __choiceColor(Priority_Choices.findIndex((c) => c === card[Basic_Priority]));
  const __businessValueColor = __choiceColor(Businessvalue_Choices.findIndex((c) => c === card[Basic_Businessvalue]));
  const __timeCriticalityColor = __choiceColor(Timecriticality_Choices.findIndex((c) => c === card[Basic_Timecriticality]));
  const __timeEstimateColor = __choiceColor(Timeestimate_Choices.findIndex((c) => c === card[Basic_Timeestimate]));
  card[Conso_Prio] = `${(card[Basic_Priority] ? `${priorityMark.padStart(5)} ${__priorityColor(card[Basic_Priority])}` : '').white
  }\n${(card[Basic_Businessvalue] ? `${businessvalueMark.padStart(5)} ${__businessValueColor(card[Basic_Businessvalue])}` : '').gray
  }\n${(card[Basic_Timecriticality] ? `${timecriticalityMark.padStart(5)} ${__timeCriticalityColor(card[Basic_Timecriticality])}` : '').gray
  }\n${(card[Basic_Timeestimate] ? `${timeestimateMark.padStart(5)} ${__timeEstimateColor(card[Basic_Timeestimate])}` : '').gray}`;

  card[Conso_Authored] = !card[Basic_Authored + _by] ? undefined : `${card[Basic_Authored + _by]
  }\n${card[Basic_Authored + _date] ? formatDate(card[Basic_Authored + _date]) : ''
  }${(`\n${ImplicitMark}${Status_Proposed
  }\n${card[Status_Issue] ? issueMark + card[Status_Issue] : ''}`).blue}`;

  card[Conso_Accepted] = !card[Status_Accepted + _by] ? undefined : `${card[Status_Accepted + _by]
  }\n${card[Status_Accepted + _date] ? formatDate(card[Status_Accepted + _date]) : ''}`;
  card[Conso_Rejected] = !card[Status_Rejected + _by] ? undefined : `${card[Status_Rejected + _by]
  }\n${card[Status_Rejected + _date] ? formatDate(card[Status_Rejected + _date]) : ''}`;

  card[Conso_Assigned] = !card[Status_AssignedTo] ? undefined : `${card[Status_AssignedTo]
  }\n${card[Status_AssignedTo + _date] ? formatDate(card[Status_AssignedTo + _date]) : ''
  }\n${card[Status_Branch] ? `(${card[Status_Branch]})` : ''}`;

  card[Conso_Coded] = `${card[Status_CodedAskedReviewTo + _by] ? card[Status_CodedAskedReviewTo + _by] : ''
  }\n${card[Status_CodedAskedReviewTo + _date] ? formatDate(card[Status_CodedAskedReviewTo + _date]) : ''
  }\n${card[Status_CodedAskedReviewTo] ? (`${TagMark + Status_CodedAskedReviewTo}\n${card[Status_CodedAskedReviewTo]}`).yellow : ''}`;

  card[Conso_Reviewed] = !card[Status_Reviewed + _by] ? undefined : `${card[Status_Reviewed + _by]
  }\n${card[Status_Reviewed + _date] ? formatDate(card[Status_Reviewed + _date]) : ''}`;

  card[Conso_Verified] = !card[Status_Verified + _by] ? undefined : `${card[Status_Verified + _by]
  }\n${card[Status_Verified + _date] ? formatDate(card[Status_Verified + _date]) : ''
  }\n\n${card[Status_PullRequest] ? pullrequestMark + card[Status_PullRequest] : ''}`;

  // Triple A : Arrange, Act, Assert

  // Status_Issue, Status_Accepted, Status_Rejected, Status_Verified
  card[Conso_Arrange] = (card[Status_Rejected + _by] ? `${card[Status_Rejected + _by]
  }\n${card[Status_Rejected + _date] ? formatDate(card[Status_Rejected + _date]) : ''
  }${(`\n${TagMark}${Status_Rejected}`).gray}`
    : card[Status_Accepted + _by] ? `${card[Status_Accepted + _by]
    }\n${card[Status_Accepted + _date] ? formatDate(card[Status_Accepted + _date]) : ''
    }${(`\n${TagMark}${Status_Accepted}`).cyan}`
      : card[Basic_Authored + _by] ? `${card[Basic_Authored + _by]
      }\n${card[Basic_Authored + _date] ? formatDate(card[Basic_Authored + _date]) : ''
      }${(`\n${ImplicitMark}${Status_Proposed
      }\n${card[Status_Issue] ? issueMark + card[Status_Issue] : ''}`).blue}`
        : '') + (
    card[Status_Verified + _by] ? `\n${card[Status_Verified + _by]
    }\n${card[Status_Verified + _date] ? formatDate(card[Status_Verified + _date]) : ''
    }${(`\n${TagMark}${Status_Verified}`).white.bold}` : '');

  card[Status_Proposed] = !card[Status_Rejected + _by] && !card[Status_Accepted + _by];

  // Status_Assigned, Status_Branch, Status_Coded
  card[Conso_Act] = (
    card[Status_Accepted + _by] && !card[Status_CodedAskedReviewTo + _by] && !card[Status_AssignedTo]
      ? (`\n\n${ImplicitMark}${Status_Unassigned}`).yellow
      : card[Status_Accepted + _by] && card[Status_CodedAskedReviewTo + _by] ? `${card[Status_CodedAskedReviewTo + _by]
      }\n${card[Status_CodedAskedReviewTo + _date] ? formatDate(card[Status_CodedAskedReviewTo + _date]) : ''
      }\n${card[Status_CodedAskedReviewTo] ? (`${TagMark + Status_CodedAskedReviewTo}\n${card[Status_CodedAskedReviewTo]}`).yellow
        : (ImplicitMark + Status_Coded0).red}`
        : card[Status_Accepted + _by] && card[Status_AssignedTo + _by] ? `${card[Status_AssignedTo + _by]
        }\n${card[Status_AssignedTo + _date] ? formatDate(card[Status_AssignedTo + _date]) : ''
        }${(`\n${TagMark}${Status_AssignedTo}${card[Status_AssignedTo] ? `\n${card[Status_AssignedTo]}` : ''}`).yellow}`
          : !card[Status_Accepted + _by] && (card[Status_CodedAskedReviewTo + _by] || card[Status_AssignedTo])
            ? (`!not yet ${Status_Accepted}`).red
            : ''
  ) + (card[Status_Branch] ? `\n(${card[Status_Branch]})` : '');

  // Status_Reviewed, Status_Verified
  card[Conso_Assert] = !card[Status_CodedAskedReviewTo + _by]
    ? (!card[Status_Accepted + _by] ? '⛔'
      : card[Status_AssignedTo] ? '☕'
        : card[Basic_Sprint_ + _current] ? (ImplicitMark + Status_Unassigned).yellow
          : card[Basic_Sprint_ + _future] ? '⌛'
            : card[Basic_Sprint_ + _past] ? '☹'
              : '???')
    : card[Status_Verified + _by] ? `${card[Status_Verified + _by]
    }\n${card[Status_Verified + _date] ? formatDate(card[Status_Verified + _date]) : ''
    }${!card[Status_CodedAskedReviewTo] ? '\n' : '\n[✓] '.green}${(TagMark + Status_Verified).white.bold
    }${!card[Status_CodedAskedReviewTo] ? (` ${ImplicitMark}${Status_Coded0} (conflict)`).red : ''
    }${card[Status_PullRequest] ? `\n${pullrequestMark}${card[Status_PullRequest]}` : ''}`
      : card[Status_Reviewed + _by] ? `${card[Status_Reviewed + _by]
      }\n${card[Status_Reviewed + _date] ? formatDate(card[Status_Reviewed + _date]) : ''
      }\n☕☕☕ ${(TagMark + Status_Reviewed).green}`
        : '☕☕';
  if (!card[Conso_Assert].length) card[Conso_Assert] = '❌';

  card[Conso_Status] = `${card[Status_Issue] ? issueMark + card[Status_Issue] : ''
  }\n${card[Status_Branch] ? `(${card[Status_Branch]})` : ''
  }\n${card[Status_Verified + _by] ? (TagMark + Status_Verified).white.bold
    : card[Status_Reviewed + _by] ? (TagMark + Status_Reviewed).green
      : card[Status_CodedAskedReviewTo] ? (TagMark + Status_CodedAskedReviewTo).cyan // in verification
        : card[Status_Branch] ? (ImplicitMark + Status_Coding).yellow // in progress
          : card[Status_AssignedTo] ? (TagMark + Status_AssignedTo).cyan // in progress
            : card[Status_Accepted + _by] ? (ImplicitMark + Status_Unassigned).cyan
              : card[Status_Rejected + _by] ? (TagMark + Status_Rejected).gray
                : (ImplicitMark + Status_Proposed).blue}\n${
    card[Status_PullRequest] ? pullrequestMark + card[Status_PullRequest] : ''}`;

  card[Info_PlaneBackend] = card[Info_Plane] === Info_PlaneBackend;
  card[Info_PlaneFrontend] = card[Info_Plane] === Info_PlaneFrontend;
  card[Info_PlaneFullstack] = card[Info_Plane] === Info_PlaneFullstack;
};

// eslint-disable-next-line consistent-return
function runScrum(inputDirectory_, options) {
  const { allSprints } = options;

  let headers_Template = headers_Template_brief;
  options = { ...options, ...{ role: undefined }, ...options_brief };

  if (options.productOwner) {
    headers_Template = headers_Template_productOwner;
    options = { ...options, ...{ role: undefined }, ...options_productOwner };
  } else if (options.scrumMaster) {
    headers_Template = headers_Template_scrumMaster;
    options = { ...options, ...{ role: undefined }, ...options_scrumMaster };
  } else if (options.developer) {
    headers_Template = headers_Template_developers;
    options = { ...options, ...{ role: undefined }, ...options_developers };
  } else if (options.qualityAssurance) {
    headers_Template = headers_Template_qualityAssurance;
    options = { ...options, ...{ role: undefined }, ...options_qualityAssurance };
  }

  const { currentSprint } = options;
  const filterMe = options.me;

  const showVerified = options.verified;
  const showRejected = options.rejected;
  const { sprintList } = options;
  const showFeatureText = options.featureText;
  const showFileLink = options.fileLink;
  const { hideProposed } = options;

  const filterFrontend = options.frontend;
  const filterBackend = options.backend;
  const filterFullstack = options.backend;

  const { silent } = options;

  const inputDirectory = !inputDirectory_ || !inputDirectory_.length
    ? 'features' : inputDirectory_;
  const outputDirectory = !options.outputDirectory || !options.outputDirectory.length
    ? undefined : options.outputDirectory;

  const basedir = path.join(rootdir, inputDirectory);

  if (!fs.existsSync(basedir)) {
    logError(`inputDirectory does not exist:
${basedir.gray}`);
    return 1;
  }
  logDebug(`checking features from:
${basedir.gray}`);

  const Export_Dir = !outputDirectory ? undefined : path.join(rootdir, outputDirectory);
  const Export_File = !Export_Dir ? undefined : path.join(Export_Dir, 'scrum.json');
  if (debug && Export_File) logError(`\toutput ${Export_File.gray}`);

  const Sprint_File = path.join(basedir, `package.${sprintExt}`);

  if (!Sprint_File.startsWith(basedir))
    throw new Error(`'${Sprint_File}' is outside '${basedir}'`);

  const sprintFileRel = Sprint_File.substring(basedir.length + 1).replace(/\\/g, '/');

  let sprints = [];
  try {
    const data = loadSprintData({ file: Sprint_File });
    sprints = validateSprintData({ data, fileRel: sprintFileRel, sprintList });
  } catch (err) {
    logError(`cannot access sprint date: ${err.message}
      ${Sprint_File.gray}`);
  }

  const me = filterMe ? gitUser({ cwd: rootdir }) : '';

  let cards = [];
  (async () => {
    const globby = (await globbyPromise).globby;

    const files = await globby([`${basedir.replace(/\\/g, '/')}/**/*+(.${featureExt})`]);
    await files.reduce((lastPromise, Feature_File) => lastPromise.then(async () => {
      const Scrum_File = Feature_File.replace(new RegExp(`.${featureExt}$`), `.${scrumExt}`);
      try {
        const {
          Title, TitleNocolor, Folder, Path, featureFileRel,
          Tags, Text, ParsedText,
        } = loadFeatureData({
          basedir,
          Scrum_File,
          Feature_File,
        });
        const featureBaseData = {
          [Basic_FeatureTitle]: Title,
          [Basic_FeatureFolder]: Folder,
          [Basic_FeaturePath]: Path,
          [Basic_FeatureFile]: Feature_File,
          [Basic_FeatureText]: Text,
          [Basic_FeatureParsedText]: ParsedText,
        };

        const featureCrossGitData = getFeatureCrossGitData({
          basedir,
          Feature_File,
          featureFileRel,
          Title: TitleNocolor,
          Tags,
        });

        const scrumData = loadScrumData({ file: Scrum_File, loadScrum: options.loadScrum });

        logDebug(
          `feature '${Title.green}'`,
          '\nand git data\n',
          featureCrossGitData,
          '\nscrumData\n',
          scrumData,
        );

        cleanData({ data: scrumData, file: Scrum_File, shouldParseDate: true });
        cleanData({ data: featureCrossGitData, shouldParseDate: false });
        const card = {
          ...featureBaseData,
          ...scrumData,
          ...featureCrossGitData, // override previous
        };
        addSprintData({
          sprints, data: card, sprintFileRel, featureFileRel,
        });
        consolidateCard(card);

        logDebug(
          `feature '${Title.green}'`,
          '\ncard\n',
          card,
        );

        cards.push(card);
      } catch (err) {
        logError(`processing: ${Feature_File.gray}\n`, err);
      }
    }), Promise.resolve());

    cards = sort(cards, {
      by: [
        FirstCapitalized(Basic_SprintNumber), Basic_FeatureFile,
        Status_Accepted + _by, Status_AssignedTo, Status_Reviewed + _by, Status_Verified + _by],
      order: 'asc',
      customOrders: {
        [FirstCapitalized(Basic_Status)]: Status_Choices,
        [FirstCapitalized(Basic_Priority)]: Priority_Choices,
        [FirstCapitalized(Basic_Businessvalue)]: Businessvalue_Choices,
        [FirstCapitalized(Basic_Timecriticality)]: Timecriticality_Choices,
        [FirstCapitalized(Basic_Timeestimate)]: Timeestimate_Choices,
      },
    });

    // applying filters
    if (currentSprint) { options.viewTitle = `${options.viewTitle ? `${options.viewTitle} - ` : ''}Current Sprint`; }
    cards = cards.filter((card) => {
      // logDebug({filterMe, me, actors: card.actors})
      if (filterMe && !card.actors.includes(me)) return false;
      if (filterFrontend && !(card[Info_PlaneFrontend] || card[Info_PlaneFullstack])) return false;
      if (filterBackend && !(card[Info_PlaneBackend] || card[Info_PlaneFullstack])) return false;
      if (filterFullstack && !(card[Info_PlaneFullstack]
        || (card[Info_PlaneBackend] && card[Info_PlaneFrontend]))) return false;
      if (hideProposed && card[Status_Proposed]) return false;
      if (!allSprints && currentSprint && !card[Basic_Sprint_ + _current]) return false;
      if (card[Status_Verified + _by]) return showVerified;
      if (card[Status_Rejected + _by]) return showRejected;
      return true;
    });

    // display
    if (!silent) {
      const title = `${`${packageName} `.bold}
${'features'.cyan}${!options.role ? '' : `${(' - ' + options.role).cyan}`}${
        currentSprint ? `

Current Sprint
`.magenta : ''}`;
      // + `\n${showVerified ? "" : "@verified hidden (-v to show)".gray}`
      // + `\n${showRejected ? "" : "@rejected hidden (-r to show)".gray}`
      const headers = headers_Template.map((col) => FirstCapitalized(col.replace(/_/g, ' ')));
      let cardRowsCount;
      const rows = [
        ...showFeatureText ? [] : [headers],
        ...cards.flatMap((card) => {
          const cardRows = [
            ...!showFeatureText ? [] : [headers],
            headers_Template.map((col) => (card[col] ? card[col] : '')),
            ...!showFileLink ? [] : [[
              `file://${encodeURI(card[Basic_FeatureFile])}`.gray,
              ...Array(headers_Template.length - 1).fill(''),
            ]],
            ...!showFeatureText ? [] : [[
              `\n${printFeature(card[Basic_FeatureParsedText], { hideTags: true })}`,
              ...Array(headers_Template.length - 1).fill(''),
            ]],
          ];
          cardRowsCount = cardRows.length;
          return cardRows;
        }),
      ];

      const spanIndexes = [
        ...showFeatureText ? [2] : [],
        ...showFileLink ? [showFeatureText ? 3 : 2] : [],
      ];
      const spanningCells = !spanIndexes.length ? undefined
        : [...Array(cards.length).keys()]
          .flatMap((cardIndex) => spanIndexes.map((spanIndex) => ({
            col: 0,
            row: cardIndex * cardRowsCount + spanIndex,
            colSpan: headers_Template.length,
          })));

      if (!rows.length)
        log('no feature.');
      else
        log(table(
          rows,
          { // config
            // columnDefault: {
            //   width: 10,
            // },
            header: { alignment: 'center', content: title },
            border: getBorderCharacters('norc'),
            spanningCells,
            drawVerticalLine: (lineIndex, columnCount) => lineIndex === 0 || lineIndex === columnCount,
          },
        ));
      }

    // cleanup non serializable
    cards.forEach((card) => {
      delete card.__sprintColor;
      delete card.__daysLeftColor;
    });

    // debug
    // logDebug('cards:', cards);

    // export
    if (Export_File) {
      writeYamlFile({
        data: cards,
        file: Export_File,
      });
    }
  })();
}

module.exports = {
  Invoke: runScrum,
  Debug,
  scrumExt,
  featureExt,
  Debug,
};
