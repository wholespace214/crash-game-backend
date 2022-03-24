const { fromWei, Wallet, AccountNamespace, BN } = require("@wallfair.io/trading-engine");
const { CasinoTradeContract } = require("@wallfair.io/wallfair-casino");
const { PROMO_CODE_DEFAULT_REF } = require("../util/constants");

const casinoContract = new CasinoTradeContract();

const calculateWagering = async (userId, promoCode) => {
  const staked = (await casinoContract.getCasinoTradesSum(userId, promoCode.claimed_at, 'BFAIR'))[0]?.sum || 0;
  const needed = new BN(promoCode.value).multipliedBy(promoCode.wagering);
  const diff = new BN(staked).dividedBy(needed);
  return diff.isGreaterThan(1) ? 1 : diff.toFixed(2);
};

exports.getUserPromoCodes = async (userId, statuses) => {
  const promoCodes = await casinoContract.getUserPromoCodes(userId, statuses);
  return Promise.all(promoCodes.map(async (p) => {
    return {
      ...p,
      value: fromWei(p.value).toFixed(4),
      wagering_reached: p.status === 'CLAIMED' ? (await calculateWagering(userId, p)) : 0
    }
  }));
};

exports.cancelUserPromoCode = async (userId, promoCodeName, ref) => {
  try {
    const wallet = new Wallet();
    const balance = await wallet.getBalance(userId, AccountNamespace.USR, 'BFAIR');
    await wallet.burn({
      owner: userId,
      namespace: AccountNamespace.USR,
      symbol: 'BFAIR'
    }, balance);
    await casinoContract.finalizeUserPromoCode(
      userId,
      promoCodeName,
      ref || PROMO_CODE_DEFAULT_REF,
      'CANCELLED'
    );
  } catch (e) {
    console.error(e);
    throw e;
  }
}

exports.addUserPromoCode = async (userId, promoCodeName) => {
  try {
    await casinoContract.createUserPromoCode(userId, promoCodeName);
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

exports.claimPromoCodeBonus = async (userId, promoCodeName) => {
  return await casinoContract.claimPromoCode(userId, promoCodeName);
}