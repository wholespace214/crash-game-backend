const WFAIR_REWARDS = {
  referral: 1000,
  setAvatar: 500,
  setUsername: 500,
  confirmEmail: 100,
  registeredByInfluencer: 2500,
  totalBets: {
    5: 100,
    20: 200,
    50: 300,
    100: 500,
    150: 1000
  }
};

const INFLUENCERS = [
  "heet",
  "nikoletta",
  "earlygame"
];

const DEFAULT = {
  betLiquidity: 50_0000n,
};

module.exports = {
  WFAIR_REWARDS,
  INFLUENCERS,
  DEFAULT,
};
