/* eslint-disable camelcase */
/* eslint-disable quotes */
const {
  given, when, then_wait_at_most, expect,
  node,
  one_minute,
} = require('../test.helpers');

given('I have a folder with .feature files', () => {
  const folder = '../features.simple';
  when('I run command ‘list’', () => {
    then_wait_at_most(one_minute)
      .that('it generates expected output to the console', async () => {
        const str = await node({
          program: 'bin/featurebook',
          options: `list ${folder}`,
        });
        expect(str).toMatchSnapshot();
      });
  });
});
