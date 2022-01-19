const axios = require("axios");

const getConversionData = async ({ convertFrom, convertTo }) => {
  let convertFromString = typeof convertFrom === 'string' ? convertFrom : convertFrom.join(',');

  const APIKEY = process.env.CMC_API_KEY || "";

  const apiPath =
    `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?convert=${convertFromString}&symbol=${convertTo}&CMC_PRO_API_KEY=${APIKEY}`;

  return await axios.get(apiPath)
    .then(response => {
      const { data } = response.data;
      return data;
    })
    .catch((e) => {
      console.log(e.message);
      throw new Error(`Could not get CMC data.`);
    });
}

exports.getMarketPrice = async ({ convertFrom, convertTo, amount }) => {
  const data = await getConversionData({ convertFrom, convertTo });
  const symbol = convertTo;
  const price = data?.[symbol]?.quote?.[convertFrom]?.price;

  const convertedAmount = price ? (1 / price) * amount : 0;

  return {
    [symbol]: data[symbol],
    convertedAmount
  };
}
