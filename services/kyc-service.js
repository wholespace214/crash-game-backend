const { User } = require('@wallfair.io/wallfair-commons').models;
const { notificationEvents } = require('@wallfair.io/wallfair-commons/constants/eventTypes');
const amqp = require('./amqp-service');
const axios = require('axios');
const { FRACTAL_RESOURCE_DOMAIN, FRACTAL_AUTH_DOMAIN, FRACTAL_CLIENT_ID, FRACTAL_CLIENT_SECRET, FRACTAL_AUTH_CALLBACK_URL } = process.env;
const AccessTokenUrlBaseUrl = `https://${FRACTAL_AUTH_DOMAIN}/oauth/token?client_id=${FRACTAL_CLIENT_ID}&client_secret=${FRACTAL_CLIENT_SECRET}`;

const updateUserKycStatusAndNotify = async (userId, {uid, status, refreshToken}, extraData) => {
  let user = await User.findById(userId);
  const date = new Date();
  const hasStatusChanged = !user.kyc || user.kyc.status !== status;
  const newKyc = {
    ...user.kyc,
    refreshToken,
    uid,
    status,
    date
  };

  user.kyc.status = newKyc.status;
  user.kyc.refreshToken = newKyc.refreshToken;
  user.kyc.uid = newKyc.uid;
  user.kyc.date = newKyc.date;

  await user.save();

  if(hasStatusChanged){
    amqp.send('universal_events', 'event.user_kyc_update', JSON.stringify({
      event: notificationEvents.EVENT_USER_KYC_UPDATE,
      roomId: userId,
      data: { userId, status, date, ...extraData},
      producer: 'system',
      producerId: 'notification-service',
      date
    }));
  }

  return {
    userId,
    uid,
    date,
    status,
    ...extraData
  };
}

const getUserInfoFromFractal = async (token) => {
  let getUserKycStatusUrl = `https://${FRACTAL_RESOURCE_DOMAIN}/users/me`;
  const userKycStatus = await axios.get(getUserKycStatusUrl, {
    headers: {
      ContentType: 'application/json',
      Authorization: 'Bearer ' + token
    }
  });

  //console.log('userKycStatus', userKycStatus.data);
  const cases = userKycStatus.data?.verification_cases;
  const fractalUid = userKycStatus.data?.uid;
  const phones = userKycStatus.data?.phones;
  let status = 'error';
  if(cases) {
    if(cases.every(v => v.credential === 'approved')){
      status = 'approved';
    }
    else if(cases.find(v => v.credential === 'rejected')){
      status = 'rejected';
    }
    else if(cases.find(v => v.credential === 'pending')){
      status = 'pending';
    }
  }

  const {
    date_of_birth,
    full_name,
    identification_document_country,
    identification_document_number,
    identification_document_type,
    place_of_birth,
    residential_address,
    residential_address_country,
  } = userKycStatus.data?.person;

  return {
    status,
    uid: fractalUid,
    userInfo: {
      phones,
      date_of_birth,
      full_name,
      identification_document_country,
      identification_document_number,
      identification_document_type,
      place_of_birth,
      residential_address,
      residential_address_country,
    }
  };
}

/**
 * User has refused consent to our app to access their info submitted to Fractal
 */
const userFractalAuthorizationError = async (userId, error, error_description) => {

  return await updateUserKycStatusAndNotify(userId, {status: 'error'}, {error, error_description});
};

const getNewAccessToken = async(refreshToken)=>{
  const grantType = 'refresh_token';
  let getAccessTokenUrl = `${AccessTokenUrlBaseUrl}&refresh_token=${refreshToken}&grant_type=${grantType}`;
  const fractalAccessToken = await axios.post(getAccessTokenUrl);
  if (!fractalAccessToken?.data) {
     throw new Error('failed to get a fractal access token using the refreshToken');
  }
  return fractalAccessToken.data.access_token;
}

/**
 * Requests user info from Fractal and updates the KYC status on mongo
 */
const refreshUserKyc = async (userId, refreshToken) => {
  const accessToken = await getNewAccessToken(refreshToken);
  const { status, uid } = await getUserInfoFromFractal(accessToken);
  return await updateUserKycStatusAndNotify(userId, {uid, status, refreshToken});
}

/**
 * User has given consent to our app to access their info submitted to Fractal.
 * We will get an access token and get users info from fractal.
 */
const userFractalAuthorized = async (userId, code) => {
  const grantType = 'authorization_code';
  let getAccessTokenUrl = `${AccessTokenUrlBaseUrl}&code=${code}&grant_type=${grantType}&redirect_uri=${FRACTAL_AUTH_CALLBACK_URL}`;
  const fractalAccessToken = await axios.post(getAccessTokenUrl);
  console.log(fractalAccessToken.data);

  if (!fractalAccessToken?.data) {
    return await updateUserKycStatusAndNotify(userId, {status: 'error'}, {error: 'failed to get a fractal access token'});
  }
  const refreshToken = fractalAccessToken.data.refresh_token;
  const {status, uid } = await getUserInfoFromFractal(fractalAccessToken.data.access_token);
  return await updateUserKycStatusAndNotify(userId, {uid, status, refreshToken});
};

module.exports = {
  userFractalAuthorizationError,
  userFractalAuthorized,
  refreshUserKyc,
  getUserInfoFromFractal,
  getNewAccessToken,
};
