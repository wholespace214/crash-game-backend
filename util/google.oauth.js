const axios = require("axios");

const getGoogleTokenForAuthCode = async (code) => {
  return await axios.post('https://oauth2.googleapis.com/token', {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    grant_type: 'authorization_code',
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
  })
    .then(({ data }) => data)
    .catch(() => {
      throw new Error(`Could not get user's data.`);
    })
}

const getGoogleUserMeta = async (token) => {
  return await axios.get(
    'https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses,birthdays,photos',
    { headers: { 'Authorization': `Bearer ${token}` }, }
  )
    .then(({ data }) => data)
    .catch(() => {
      throw new Error(`Could not get user's data.`);
    });
}

exports.getGoogleUserData = async ({ code }) => {
  const { access_token } = await getGoogleTokenForAuthCode(code);
  const { names, photos, birthdays, emailAddresses } = await getGoogleUserMeta(access_token);

  const primary = ({ metadata }) => metadata.primary;

  const email = emailAddresses?.find(primary)?.value;
  const name = names?.find(primary)?.displayName;
  const profilePicture = photos?.find(primary)?.url;
  const birthday = birthdays?.find(primary)?.date;
  let birthdate = null;

  if (birthday) {
    const { year, month, day } = birthday;
    birthdate = new Date(year, month - 1, day);
  }

  return {
    email,
    username: email.split('@')[0],
    name,
    profilePicture,
    birthdate,
    emailConfirmed: true,
  };
}