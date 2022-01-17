const cmcHelper = require('../util/cmc');

const getMarketPrice = async (req, res, next) => {
  try {
    const { convertFrom, convertTo, amount } = req.query;
    const quoteResponse = await cmcHelper.getMarketPrice({ convertFrom, convertTo, amount });

    res.status(200).json(quoteResponse);
  } catch (err) {
    next(err);
  }
};

exports.getMarketPrice = getMarketPrice;
