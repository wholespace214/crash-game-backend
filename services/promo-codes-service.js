const { fromWei } = require("@wallfair.io/trading-engine");
const { CasinoTradeContract } = require("@wallfair.io/wallfair-casino");
const { PROMO_CODE_DEFAULT_REF } = require("../util/constants");

const casinoContract = new CasinoTradeContract();

exports.addUserPromoCode = async (userId, promoCodeName, ref = PROMO_CODE_DEFAULT_REF) => {
  try {
    await casinoContract.createUserPromoCode(userId, ref, promoCodeName);
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

exports.getOpenPromoCodes = async (userId) => {
  const promoCodes = await casinoContract.getOpenPromoCodes(userId);
  return promoCodes.map(p => {
    return {
      ...p,
      value: fromWei(p.value).toFixed(4),
    }
  })
}

exports.claimPromoCodeBonus = async (userId, promoCodeName, opts = {}, refId = PROMO_CODE_DEFAULT_REF) => {
  if (!userId) return;

  try {
    if (!opts.instantTransfer) {
      const promoCodeUser = await casinoContract.getPromoCodeUser(
        userId,
        promoCodeName,
        refId,
        ['NEW']
      );

      if (!promoCodeUser.length) {
        console.warn(`Promo code ${promoCodeName} is not active for user ${userId}`);
        return;
      }
    }

    await casinoContract.claimPromoCode(
      userId,
      promoCodeName,
      refId,
      {
        minAmount: opts.minAmount,
      }
    );
  } catch (e) {
    console.error('CLAIM PROMO CODE: ', e.message);
    throw e;
  }
}