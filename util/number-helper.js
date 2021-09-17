const bigDecimal = require('js-big-decimal');
const { Erc20 } = require('@wallfair.io/smart_contract_mock');
const WFAIR = new Erc20('WFAIR');

const toPrettyBigDecimal = (input) => {
  let inputString = input.toString();
  if (inputString.length === 4) {
    inputString = (parseFloat(input) / parseFloat(WFAIR.ONE)).toString();
  }
  return new bigDecimal(inputString).getPrettyValue(4, '.').replace(/[.](?=.*[.])/g, '');
};

const toCleanBigDecimal = (input) => new bigDecimal(input.toString().replace('.', ''));

module.exports = {
  toPrettyBigDecimal,
  toCleanBigDecimal,
};
