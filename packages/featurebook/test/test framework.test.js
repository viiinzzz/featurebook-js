require('./test.helpers');

describe('chai', () => {
  it('has chai work', () => {
    'chai'.length.should.be.greaterThan(0);
  });

  it('has chai work async', async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
    'chai'.length.should.be.greaterThan(0);
  });
});
