const crypto = require('crypto')

const { MOONPAY_BASE_URL, MOONPAY_API_KEY, MOONPAY_API_SECRET, MOONPAY_CURRENCY_CODE, ONRAMP_WEBHOOK_WALLET } = process.env;

exports.generateUrl = (userId, email, amount, currency) => {
  const baseUrl = `${MOONPAY_BASE_URL}?apiKey=${MOONPAY_API_KEY}&externalCustomerId=${userId}&email=${email}&baseCurrencyCode=${currency.toLowerCase()}&currencyCode=${MOONPAY_CURRENCY_CODE}&baseCurrencyAmount=${amount}&walletAddress=${ONRAMP_WEBHOOK_WALLET}&colorCode=%23ffd401`;

  const signature = crypto
    .createHmac('sha256', MOONPAY_API_SECRET)
    .update(new URL(baseUrl).search)
    .digest('base64');

  return `${baseUrl}&signature=${encodeURIComponent(signature)}`;
};
