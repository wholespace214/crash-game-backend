const { expect } = require('chai');
const { profanityFilter, profanityReplacement } = require('./chat-message-service');

describe('profanity filter', () => {
  it('should not remove non-profanities', async () => {
    const message = 'a normal chat message';
    const result = await profanityFilter({ message });
    expect(result.message).to.equal(message);
  });

  it('should remove english profanities', async () => {
    const message = 'a shit chat message';
    const expected = `a ${profanityReplacement.repeat(4)} chat message`;
    const result = await profanityFilter({ message });
    expect(result.message).to.equal(expected);
  });

  it('should remove german profanities', async () => {
    const message = 'a Scheisse chat message';
    const expected = `a ${profanityReplacement.repeat(8)} chat message`;
    const result = await profanityFilter({ message });
    expect(result.message).to.equal(expected);
  });

  it('should remove russian profanities', async () => {
    const message = 'a дерьмо chat message';
    const expected = `************* chat message`;
    const result = await profanityFilter({ message });
    expect(result.message).to.equal(expected);
  });
});
