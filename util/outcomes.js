exports.getProbabilityMap = (outcomes) =>
  outcomes.reduce(
    (acc, { probability }, index) => ({ ...acc, [index]: probability }),
    {}
  );

/**
 * 
 * @param {number} probability 
 * @param {bigint} liquidity 
 * @param {number} numberOfOutcomes 
 */
exports.calculateBalanceByProbability = (probability, liquidity, numberOfOutcomes) => {
  const pooledBalance = BigInt(numberOfOutcomes) * liquidity;
  return pooledBalance * BigInt(Math.round((1 - probability) * 100)) / 100n;
};

/**
 * @param {bigint} liquidity 
 * @param {{ [key: number]: string }} probabilities 
 * @returns { bigint[] }
 */
exports.getOutcomeBalancesByProbability = (liquidity, probabilities) => {
  const balances = Object.keys(probabilities)
    .sort()
    .map(
      (outcomeKey, _, { length }) =>
        this.calculateBalanceByProbability(
          +probabilities[outcomeKey],
          liquidity,
          length,
        )
    );

  if (
    balances.reduce((sum, balance) => sum + balance, 0n) !== BigInt(balances.length) * liquidity
  ) {
    return Array.from(balances.length).fill(liquidity);
  }

  return balances;
};
