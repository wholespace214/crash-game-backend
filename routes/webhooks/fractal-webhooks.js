// Import the express Router to create routes
const router = require('express').Router();
const { User } = require('@wallfair.io/wallfair-commons').models;
const kycService = require('../../services/kyc-service');
const _ = require('lodash');
const crypto = require('crypto');

const buildFractalResponseHtml = (message) => `
<html><head>
  <style type="text/css">
  body {
  margin-top: 60px;
  text-align: center;
  font-family: sans-serif;
  }</style></head>
  <body>
    <h1>Alpacasino KYC Result</h1>${message}<p>You can close this page now.</p>
</body></html>`;


const handleVerificationUpdate = async (req, secret) => {
  //HEADERS
  //X-Fractal-Signature: sha1=ba213ac630ca4e30446a923fdd1fa78655902880
  const signature = req.headers['x-fractal-signature'];
  if(!signature){
    throw new Error(`request doesn't contain fractal signature, skipped.`);
  }
  const expectedSignature = "sha1=" +
    crypto.createHmac("sha1", secret)
        .update(JSON.stringify(req.body))
        .digest("hex");
  if(signature !== expectedSignature){
    const msg = `request contains an invalid x-fractal-signature, skipped. Expected:${expectedSignature}, Actual: ${signature}`;
    console.log(msg);
    throw new Error(msg);
  }

  //BODY
  //{"type": "verification_approved","data":{"level":"v1","user_id":"d6d782ef-568b-4355-8eb4-2d32ac97b44c"}}
  // verification_approved or verification_rejected
  const uid = _.get(req.body, 'data.user_id');
  if(!uid){
    throw new Error('fractal verification-update callback received without user_id in body.');
  }
  const user = await User.findOne({ 'kyc.uid': uid});
  if(!user){
    throw new Error(`fractal verification-update callback cannot find any user with ${uid} in db.`);
  }

  await kycService.refreshUserKyc(user._id, user.kyc.refreshToken);
}
/**
 * Triggered when an authorized user gets approved according to the requested level
 */
router.post('/approved', async (req, res) => {
  const secret = process.env.FRACTAL_APPROVED_SECRET_TOKEN;
  try {
    await handleVerificationUpdate(req, secret);
  } catch(err) {
    console.log(new Date(), 'fractal-verification-webhook', err.message);
  }
  return res.sendStatus(200);
});

/**
 * Triggered when an authorized user gets rejected according to the requested level
 */
 router.post('/rejected', async (req, res) => {
  const secret = process.env.FRACTAL_REJECTED_SECRET_TOKEN;
  try {
    await handleVerificationUpdate(req, secret);
  } catch(err) {
    console.log(new Date(), 'fractal-verification-webhook', err.message);
  }
  return res.sendStatus(200);
});

/**
 * Authorization callback URL, Your users will get redirected here after authorizing your app.
 * The user gets redirected back to your application (redirect_uri), with a code in its URL parameters (that expires after 10 minutes);
 * your application's backend exchanges the code for an access_token and a refresh_token, using your client credentials;
 * when the access token expires (after 2 hours), you may obtain a new one using the refresh_token and your client credentials;
 */
 router.get('/auth', async (req, res) => {
  const { code, state, error, error_description }= req.query;
  const userId = state;
  let html = null;

  try{
    if(error) {
        // Fractal is currently not including the 'state' in the callback when the user
        // doesn't grant access to our app, so we cannot update the db :(
        // if(userId){await kycService.userFractalAuthorizationError(userId, null, error, error_description);}
      html = `<p>You need to authorize our app before you can continue KYC.</p><p>Please restart the KYC Verification.</p><h4>Error</h4><em>${error}:${error_description}</em>`;
    } else if(userId){
      const data = await kycService.userFractalAuthorized(userId, code);
      html = `<p>You KYC verification is in status: ${data.status}</p>`;
      if(data.error){
        html += `<h4>Error</h4><em>${data.error}</em><br/>`;
      }
      if(data.error_description){
        html += `<em>${data.error_description}</em>`;
      }
    }
    else{
      html = `<p>Something went wrong, please try again.</p>`;
    }
  }
  catch(err){
    console.log(err);
    html = `<p>Something went wrong, please try again.</p>`;
  }
  res.writeHeader(200, {"Content-Type": "text/html"});
  res.write(buildFractalResponseHtml(html));
  res.end();
});

module.exports = router;
