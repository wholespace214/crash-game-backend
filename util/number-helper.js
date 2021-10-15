const _ = require("lodash");

const { Erc20 } = require('@wallfair.io/smart_contract_mock');
const WFAIR = new Erc20('WFAIR');
const BigNumber = require('bignumber.js');

const toScaledBigInt = (input) => {
  return BigInt(new BigNumber(input).times(WFAIR.ONE).decimalPlaces(0));
};

const fromScaledBigInt = (input) => {
  return new BigNumber(input).dividedBy(WFAIR.ONE).toFixed(4);
};

const calculateGain = (investmentAmount, outcomeAmount, precision = 2) => {
  const investment = _.toNumber(investmentAmount);
  const outcome = _.toNumber(outcomeAmount);
  const gain = ((outcome - investment) / investment) * 100;

  const negative = gain < 0;
  const value = isNaN(gain) ? '-' : negative ? `${gain.toFixed(precision)}%` : `+${gain.toFixed(precision)}%`;

  return {
    number: gain,
    value,
    negative,
  };
};

module.exports = {
  toScaledBigInt,
  fromScaledBigInt,
  calculateGain
};
