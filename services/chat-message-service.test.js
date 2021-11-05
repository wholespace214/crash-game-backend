const { expect } = require('chai');
const { profanityFilter, profanityReplacement } = require('./chat-message-service');

describe('profanity filter', () => {
  it('should not remove non-profanities', async () => {
    const message = 'a normal chat message';
    const result = await profanityFilter({ message });
    expect(result.message).to.equal(message);
  });

  it('should remove non-profanities', async () => {
    const message = 'a shit chat message';
    const expected = `a ${profanityReplacement.repeat(4)} chat message`;
    const result = await profanityFilter({ message });
    expect(result.message).to.equal(expected);
  });
});
