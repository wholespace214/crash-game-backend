const axios = require('axios');
const { signRequest } = require('../util/cryptopay');

const { CRYPTOPAY_URL, CRYPTOPAY_RECEIVER_CURRENCY } = process.env;

exports.getChannel = async (userId, currency) => {
  try {
    const path = `/api/channels/custom_id/${currency}_${userId}`;
    const headers = signRequest('', 'GET', path);

    return await axios.get(`${CRYPTOPAY_URL}${path}`,
      {
        headers,
      }
    );
  } catch (e) {
    if (['unauthenticated', 'unauthorized'].includes(e.response.data?.error?.code)) {
      console.error('Fetching channel failed', e.response.data);
      throw Error(`Failed to fetch channel with user id ${userId} and currency ${currency}`);
    } else {
      return undefined;
    }
  }
};

exports.createChannel = async (userId, currency) => {
  const requestData = {
    pay_currency: currency,
    receiver_currency: CRYPTOPAY_RECEIVER_CURRENCY,
    name: `${currency}-${CRYPTOPAY_RECEIVER_CURRENCY}`,
    custom_id: `${currency}_${userId}`,
  };

  try {
    const path = '/api/channels';
    const headers = signRequest(JSON.stringify(requestData), 'POST', path);

    return await axios.post(`${CRYPTOPAY_URL}${path}`,
      requestData,
      {
        headers,
      }
    );
  } catch (e) {
    console.error('Creating channel failed', e.response.data);
    throw new Error(`Failed to create a channel with user id ${userId} and currency ${currency}`);
  }
}
