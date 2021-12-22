const { NetworkCode } = require("@wallfair.io/trading-engine");

exports.WALLETS = {
  'ETH': {
    network: NetworkCode.ETH,
    wallet: process.env.DEPOSIT_WALLET_ETHEREUM,
  },
  'USDT': {
    network: NetworkCode.ETH,
    wallet: process.env.DEPOSIT_WALLET_ETHEREUM,
  },
  'BTC': {
    network: NetworkCode.BTC,
    wallet: process.env.DEPOSIT_WALLET_BITCOIN,
  },
  'LTC': {
    network: NetworkCode.LTC,
    wallet: process.env.DEPOSIT_WALLET_LITECOIN,
  }
}