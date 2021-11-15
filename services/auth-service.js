const jwt = require('jsonwebtoken');
const { getGoogleUserData } = require('../util/google.oauth');

exports.generateJwt = async (user) => jwt.sign({ userId: user.id, phone: user.phone }, process.env.JWT_KEY, { expiresIn: '48h' });

exports.getUserDataForProvider = async (provider, context) => {
  const dataGetter = {
    google: getGoogleUserData,
  }[provider];

  if (!dataGetter) {
    throw new Error(`Provider '${JSON.stringify(provider)}' not supported.`);
  }

  return {
    ...await dataGetter(context),
    accountSource: provider,
  };
}
