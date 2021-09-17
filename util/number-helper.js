const bigDecimal = require('js-big-decimal');

const toPrettyBigDecimal = (input) =>
  new bigDecimal(input.toString()).getPrettyValue(4, '.').replace(/[.](?=.*[.])/g, '');

const toCleanBigDecimal = (input) => new bigDecimal(input.toString().replace('.', ''));

module.exports = {
  toPrettyBigDecimal,
  toCleanBigDecimal,
};
