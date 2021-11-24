const axios = require("axios");

const getFacebookTokenForAuthCode = async (code) => {
  return await axios.get('https://graph.facebook.com/v12.0/oauth/access_token', {
    params: {
      client_id: process.env.FACEBOOK_CLIENT_ID,
      redirect_uri: process.env.FACEBOOK_OAUTH_REDIRECT_URI,
      client_secret: process.env.FACEBOOK_CLIENT_SECRET,
      code,
    }
  })
    .then(({ data }) => data)
    .catch(() => {
      throw new Error(`Could not get user's data.`);
    })
}

const getFacebookUserMeta = async (token) => {
  return await axios.get(
    'https://graph.facebook.com/v12.0/me?fields=id,name,email,picture,birthday',
    { headers: { 'Authorization': `Bearer ${token}` }, }
  )
    .then(({ data }) => data)
    .catch((e) => {
      console.log(e.message);
      throw new Error(`Could not get user's data.`);
    });

}

exports.getFacebookUserData = async ({ code }) => {
  const { access_token } = await getFacebookTokenForAuthCode(code);
  const { name, email, picture, birthday } = await getFacebookUserMeta(access_token);


  const profilePicture = picture?.data?.url;
  const [day, month, year] = birthday.split('/');

  if (!birthday) {
    throw new Error(`User's birthday is missing.`);
  }

  const birthdate = new Date(year, month - 1, day);

  return {
    email,
    username: email.split('@')[0],
    name,
    profilePicture,
    birthdate,
    emailConfirmed: true,
  };
}