const { AccountNamespace, BN } = require("@wallfair.io/trading-engine");
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

exports.claimPromoCodeBonus = async (userId, promoCodeName, opts = {}) => {
  if (!userId) return;

  try {
    const promoCodeUser = await casinoContract.getPromoCodeUser(
      userId,
      promoCodeName,
      PROMO_CODE_DEFAULT_REF,
      ['NEW']
    );

    if (!promoCodeUser?.length) {
      return;
    }

    await casinoContract.claimPromoCode(
      userId,
      promoCodeName,
      PROMO_CODE_DEFAULT_REF,
      {
        from: process.env.REWARD_WALLET,
        fromNamespace: AccountNamespace.ETH,
        symbol: 'BFAIR',
        amount: opts.useMinAmount && opts.amount ?
          BN.min(opts.amount, new BN(promoCodeUser[0].value)).toString() :
          opts.amount || promoCodeUser[0].value,
      }
    );
  } catch (e) {
    console.error('CLAIM PROMO CODE: ', e.message);
    throw e;
  }
}