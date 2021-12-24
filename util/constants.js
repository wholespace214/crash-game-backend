const AWARD_TYPES = {
  EMAIL_CONFIRMED: 'EMAIL_CONFIRMED',
  AVATAR_UPLOADED: 'AVATAR_UPLOADED',
  SET_USERNAME: 'SET_USERNAME',
  CREATED_ACCOUNT_BY_INFLUENCER: 'CREATED_ACCOUNT_BY_INFLUENCER',
  CREATED_ACCOUNT_BY_THIS_REF: 'CREATED_ACCOUNT_BY_THIS_REF',
};

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
    150: 1000,
  },
};

const INFLUENCERS = ['heet', 'nikoletta', 'earlygame'];

const DEFAULT = {
  betLiquidity: 50_0000n,
};

const BONUS_STATES = {
  Active: 0,
  Used: 1,
  Expired: 2
}

const BONUS_TYPES = {
  LAUNCH_1k_500: {
    type: 'LAUNCH_1k_500',
    amount: 500,
    endDate: '12/31/2021 23:59:59'
  },
  LAUNCH_2k_400: {
    type: 'LAUNCH_2k_400',
    amount: 100
  },
  EMAIL_CONFIRM_50: {
    type: 'EMAIL_CONFIRM_50',
    amount: 50
  },
  FIRST_DEPOSIT_450: {
    type: 'FIRST_DEPOSIT_450',
    amount: 450
  }
}

module.exports = {
  AWARD_TYPES,
  WFAIR_REWARDS,
  INFLUENCERS,
  DEFAULT,
  BONUS_TYPES,
  BONUS_STATES
};
