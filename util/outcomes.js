exports.getProbabilityMap = (outcomes) =>
  outcomes.reduce(
    (acc, { probability }, index) => ({ ...acc, [index]: probability }),
    {}
  );

/**
 * @param {bigint} liquidity 
 * @param {{ [key: number]: string }} probabilities 
 * @returns { bigint[] }
 */
exports.getOutcomeDistributionHints = (probabilities) => {
  const hints = Object.keys(probabilities)
    .sort()
    .map(
      (outcomeKey) => BigInt(Math.round(+probabilities[outcomeKey] * 100))
    );

  const pooledHints = hints.reduce((sum, hint) => sum + hint, 0n);
  const targetPool = 100n;

  if (pooledHints !== targetPool) {

    let lowestValueIndex = 0;
    for (const hintIndex in hints) {
      if (hints[hintIndex] < hints[lowestValueIndex]) {
        lowestValueIndex = hintIndex;
      }
    }

    const unclaimedDistribution = targetPool - pooledHints;
    hints[lowestValueIndex] += unclaimedDistribution;
  }

  return hints;
};

/**
 * @param {object[]} outcomes 
 */
exports.areCreationOutcomesValid = (outcomes) => (
  (outcomes.length >= 2 || outcomes.length <= 4) && // must between 2 and 4 
  (outcomes.every(({ name, probability, index }) => !!name && !!probability && (!!index || index === 0))) && // each must have probability, name, and index
  (
    outcomes.reduce((total, { probability }) => +(total + (+probability)).toFixed(2), 0) === 1 || // must add up to one
    outcomes.length === 3 && outcomes.every(({ probability }) => +probability === 0.33) // ... or be a three way split via 0.33
  ) &&
  (new Set(outcomes.map(({ name }) => name)).size === outcomes.length) && // must have unique names
  (new Set(outcomes.map(({ index }) => index)).size === outcomes.length) // must have unique indices
);