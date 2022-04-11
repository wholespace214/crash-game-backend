const axios = require('axios');

const RECAPTCHA_URL = 'https://www.google.com/recaptcha/api/siteverify';

exports.verifyRecaptcha = async (token) => {
  try {
    const res = await axios.post(
      `${RECAPTCHA_URL}?secret=${process.env.GOOGLE_RECAPTCHA_CLIENT_SECRET}&response=${token}`
    );

    return res.data.success && res.data.score < 0.5 && res.data.action === 'join';
  } catch (e) {
    console.error('RECAPTCHA FAILED: ', e.message);
    return false;
  }
};