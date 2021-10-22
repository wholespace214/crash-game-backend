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

/**
 * @param {object[]} outcomes 
 */
exports.areCreationOutcomesValid = (outcomes) => (
  (outcomes.length >= 2 || outcomes.length <= 4) && // must between 2 and 4 
  (outcomes.every(({ name, probability, index }) => !!name && !!probability && (!!index || index === 0))) && // each must have probability, name, and index
  (
    outcomes.reduce((total, { probability }) => +(total + probability).toFixed(2), 0) === 1 || // must add up to one
    outcomes.length === 3 && outcomes.every(({ probability }) => +probability === '0.33') // ... or be a three way split via 0.33
  ) &&
  (new Set(outcomes.map(({ name }) => name)).size === outcomes.length) && // must have unique names
  (new Set(outcomes.map(({ index }) => index)).size === outcomes.length) // must have unique indices
);