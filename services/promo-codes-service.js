const { AccountNamespace } = require("@wallfair.io/trading-engine");
const { CasinoTradeContract } = require("@wallfair.io/wallfair-casino");
const { PROMO_CODE_DEFAULT_REF } = require("../util/constants");

const casinoContract = new CasinoTradeContract();

exports.addUserPromoCode = async (userId, promoCodeName) => {
  try {
    await casinoContract.createUserPromoCode(userId, PROMO_CODE_DEFAULT_REF, promoCodeName);
  } catch (e) {
    console.error('ADD USER PROMO CODE: ', e.message);
  }
};

exports.isClaimedBonus = async (userId, promoCodeName) => {
  const result = await casinoContract.getPromoCodeUser(
    userId,
    promoCodeName,
    PROMO_CODE_DEFAULT_REF,
    ['CLAIMED', 'FINALIZED']
  );
  return result.length > 0;
}

exports.claimPromoCodeBonus = async (userId, promoCodeName, opts = {}) => {
  if (!userId) return;

  try {
    if (!opts.instantTransfer) {
      const promoCodeUser = await casinoContract.getPromoCodeUser(
        userId,
        promoCodeName,
        PROMO_CODE_DEFAULT_REF,
        ['NEW']
      );

      if (!promoCodeUser) {
        console.warn('Promo code is not initialized');
        return;
      }
    }

    await casinoContract.claimPromoCode(
      userId,
      promoCodeName,
      PROMO_CODE_DEFAULT_REF,
      {
        from: process.env.REWARD_WALLET,
        fromNamespace: AccountNamespace.ETH,
        symbol: 'BFAIR',
        minAmount: opts.minAmount,
      }
    );
  } catch (e) {
    console.error('CLAIM PROMO CODE: ', e.message);
    throw e;
  }
}