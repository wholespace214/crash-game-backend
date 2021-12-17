const jwt = require('jsonwebtoken');
const { getDiscordUserData } = require('../util/discord.oauth');
const { getFacebookUserData } = require('../util/facebook.oauth');
const { getGoogleUserData } = require('../util/google.oauth');
const { getTwitchUserData } = require('../util/twitch.oauth');

exports.generateJwt = async (user) => jwt.sign({ userId: user.id, phone: user.phone, isAdmin: Boolean(user.admin) }, process.env.JWT_KEY, { expiresIn: '48h' });

exports.getUserDataForProvider = async (provider, context) => {
  const dataGetter = {
    google: getGoogleUserData,
    facebook: getFacebookUserData,
    twitch: getTwitchUserData,
    discord: getDiscordUserData,
  }[provider];

  if (!dataGetter) {
    throw new Error(`Provider '${JSON.stringify(provider)}' not supported.`);
  }

  return {
    ...await dataGetter(context),
    accountSource: provider,
  };
}
