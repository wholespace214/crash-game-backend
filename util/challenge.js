const { randomBytes, createHmac, timingSafeEqual } = require('crypto');
const { ethers } = require('ethers');

const HMAC_SECRET_KEY = process.env.HMAC_SECRET_KEY || randomBytes(32).toString('hex');

const generateMac = (msg) => createHmac('sha384', HMAC_SECRET_KEY)
  .update(msg)
  .digest('hex');

exports.generateChallenge = (
  address,
  ttl = 60
) => {
  address = address.slice(2);
  const date = new Date();
  const expiration = date.setSeconds(date.getSeconds() + ttl);
  const data = JSON.stringify({
    address,
    expiration: +expiration,
  });

  const msg = Buffer.from(data).toString('base64');

  return msg + '.' + generateMac(msg);
};

exports.verifyChallengeResponse = (
  address,
  challenge,
  response,
) => {
  const data = challenge.split('.');
  const decoded = JSON.parse(Buffer.from(data[0], 'base64').toString());

  if (
    address.slice(2) !== decoded.address ||
    new Date(decoded.expiration) < new Date() ||
    !timingSafeEqual(Buffer.from(generateMac(data[0])), Buffer.from(data[1]))
  ) {
    return false;
  }

  const signatureAddress = ethers.utils.verifyMessage(challenge, response);
  return address.toLowerCase() === signatureAddress.toLowerCase();
};

exports.isAddressValid = (address) => {
  try {
    return ethers.utils.getAddress(address);
  } catch (e) {
    return false;
  }
};