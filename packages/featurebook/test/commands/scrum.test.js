/* eslint-disable camelcase */
/* eslint-disable quotes */
const {
  given, when, then_wait_at_most, expect,
  node,
  one_minute,
} = require('../test.helpers');

given('I have a folder with .feature files', () => {
  const folder = '../../test/features';
  when('I run command ‘scrum’', () => {
    then_wait_at_most(one_minute)
      .that('it generates expected output to the console', async () => {
        const str = await node({
          program: 'bin/featurebook',
          options: `scrum ${folder}`,
        });
        expect(str).toMatchSnapshot();
      });
  });
});
