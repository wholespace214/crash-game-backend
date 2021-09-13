const bigDecimal = require('js-big-decimal');

const toPrettyBigDecimal = (input) => {
  return new bigDecimal(input.toString()).getPrettyValue(4, '.').replace(/[.](?=.*[.])/g, '');
};

const toCleanBigDecimal = (input) => {
  return new bigDecimal(input.toString().replace('.', ''));
}

module.exports = {
  toPrettyBigDecimal,
  toCleanBigDecimal,
};
