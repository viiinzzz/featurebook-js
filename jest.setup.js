process.env.LOCAL_ENVIRONMENT = 'test';
const JEST_START = `\x1Bc\u001b[2J\u001b[0;0H
🐾🐛🐛🐛🐾🐛🐛🐛🐾🐛🐛🐛🐾🐛🐛🐛🐾
🐾🐾🐛🐾🐾🐛🐾🐾🐾🐛🐾🐾🐾🐾🐛🐾🐾
🐾🐾🐛🐾🐾🐛🐛🐾🐾🐛🐛🐛🐾🐾🐛🐾🐾
🐾🐾🐛🐾🐾🐛🐾🐾🐾🐾🐾🐛🐾🐾🐛🐾🐾
🐾🐛🐛🐾🐾🐛🐛🐛🐾🐛🐛🐛🐾🐾🐛🐾🐾

[jest.setup.js]
LOCAL_ENVIRONMENT=${process.env.LOCAL_ENVIRONMENT}
`;

//
//
console.warn(JEST_START);
//
//

// require('jest-chain');
// expect.extend(require('jest-extended'));
