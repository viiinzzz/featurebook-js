/* eslint-disable camelcase */
/* eslint-disable quotes */
const {
  Iwant, when, then,
  node_error,
} = require('../test.helpers');

when(`I run command ‘that_command_does_not_exist’`, () => {
  then('it fails and returns the message ‘unknown command’', async () => {
    const error = await node_error({
      program: 'bin/featurebook',
      options: 'that_command_does_not_exist',
    });
    Iwant(error).to.have.property('message');
    Iwant(error.message).to.match(/unknown command/);
  });
});
