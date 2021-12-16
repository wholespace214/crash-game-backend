/**
 * @param  {} req
 * returns if the user is an admin and if a userId url param was passed and equal
 * to the logged in user.
 * TODO: replace with utils/auth.isUserAdminOrSelf
 */
exports.isAdmin = (req) => !(req.user.admin === false && req.params.userId !== req.user.id);

exports.generate = (n) => {
  const add = 1;
  let max = 12 - add;

  if (n > max) {
    return this.generate(max) + this.generate(n - max);
  }

  max = Math.pow(10, n + add);
  const min = max / 10;
  const number = Math.floor(Math.random() * (max - min + 1)) + min;

  return `${number}`.substring(add);
};



exports.hasAcceptedLatestConsent = ({ tosConsentedAt }) => {
  const consentThreshold = process.env.CONSENT_THRESHOLD_DATE;
  if (!consentThreshold || isNaN(Date.parse(consentThreshold))) {
    console.warn('Missing CONSENT_THRESHOLD_DATE env var, no consents required');
    return false;
  }

  if (!tosConsentedAt) {
    return true;
  }
  return new Date(tosConsentedAt) < new Date(consentThreshold);
};
