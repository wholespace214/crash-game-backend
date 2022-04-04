const { fromWei, Wallet, AccountNamespace, Transactions, ExternalTransactionOriginator, BN, toWei } = require("@wallfair.io/trading-engine");
const { CasinoTradeContract } = require("@wallfair.io/wallfair-casino");
const { PROMO_CODE_DEFAULT_REF } = require("../util/constants");

const casinoContract = new CasinoTradeContract();

const MIN_DEPOSIT = process.env.MIN_PROMO_CODE_DEPOSIT || 500;

exports.getUserPromoCodes = async (userId, statuses) => {
  const promoCodes = await casinoContract.getUserPromoCodes(userId, statuses);
  return Promise.all(promoCodes.map(async (p) => {
    return {
      ...p,
      value: fromWei(p.value).toFixed(4),
      wagering_reached: p.status === 'CLAIMED' ?
        (await casinoContract.calculateWagering(userId, p)) :
        0
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
      ref,
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
    ['CLAIMED', 'FINALIZED', 'EXPIRED', 'CANCELLED']
  );
  return result.length > 0;
}

exports.claimPromoCodeBonus = async (userId, promoCodeName) => {
  const depositSum = await new Transactions()
    .getSumAmountByOriginator(ExternalTransactionOriginator.DEPOSIT, userId);

  if (new BN(depositSum).isLessThan(toWei(MIN_DEPOSIT))) {
    throw new Error(`Minimum deposit of ${MIN_DEPOSIT} WFAIR is required in order to claim the bonus`);
  }

  const res = await casinoContract.claimPromoCode(userId, promoCodeName);
  return {
    ...res,
    value: fromWei(res.value).toFixed(4),
  }
}

exports.withdraw = async (userId, promoCodeName, ref = PROMO_CODE_DEFAULT_REF) => {
  await casinoContract.withdrawBonusMoney(userId, promoCodeName, ref, process.env.REWARD_WALLET);
};