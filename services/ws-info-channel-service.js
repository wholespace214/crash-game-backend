const userService = require("./user-service");
const cmcUtil = require('../util/cmc');
const amqp = require('../services/amqp-service');
const {redisClient} = require('../util/redis');

const INFO_CHANNEL_NAME = 'INFO_CHANNEL';
const INFO_KEY_PREFIX = `${INFO_CHANNEL_NAME}/`;

const init = async () => {
  try {
    console.log('INIT INFO CHANNEL JOBS');
    await schedulePriceUpdate();
  } catch(e) {
    throw new Error(e);
  }

}

const schedulePriceUpdate = async () => {
  const PRICE_UPDATED_KEY = `${INFO_KEY_PREFIX}PRICE_UPDATED`;

  // const res = await cmcUtil.getMarketPrice({
  //   convertFrom: ['USD', 'EUR', 'BTC', 'LTC', 'ETH'],
  //   convertTo: 'WFAIR',
  //   amount: 1,
  // });

  const test = {
    "BTC": {
      "price": 4.546456316270219e-7
    },
    "ETH": {
      "price": 0.000006137037292895983
    },
    "EUR": {
      "price": 0.016903690310012855
    },
    "LTC": {
      "price": 0.00014041518015643387
    },
    "USD": {
      "price": 0.01917550870368156
    }
  }

  const quote = test || res?.WFAIR?.quote || {};
  const output = {
    'EUR': quote.EUR.price,
    'USD': quote.USD.price,
    'BTC': quote.BTC.price,
    'ETH': quote.ETH.price,
    'LTC': quote.LTC.price
  }

  await redisClient.HSET(PRICE_UPDATED_KEY, output);

  // const msg = await redisClient.HGETALL(PRICE_UPDATED_KEY);

  amqp.send('api_info_events', 'event.price_updated', JSON.stringify({
    to: 'API_INFO_CHANNEL',
    event: INFO_CHANNEL_NAME,
    producer: 'backend',
    data: {
      type: PRICE_UPDATED_KEY,
      data: output
    }
  }));
}

module.exports.init = init;
