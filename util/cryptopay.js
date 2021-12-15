const CryptoJS = require('crypto-js');

exports.signRequest = (requestData, method, path) => {
  const payload_MD5 = requestData ? CryptoJS.MD5(requestData).toString() : '';
  const date = new Date(Date.now()).toUTCString();
  const string_to_sign = method + "\n" + payload_MD5 + "\n" + "application/json" + "\n" + date + "\n" + path
  const hmac = CryptoJS.HmacSHA1(string_to_sign, process.env.CRYPTOPAY_SECRET);
  const signature = hmac.toString(CryptoJS.enc.Base64);

  return {
    'Authorization': 'HMAC ' + process.env.CRYPTOPAY_API_KEY + ':' + signature,
    'Content-Type': 'application/json',
    'Date': date,
  };
}
