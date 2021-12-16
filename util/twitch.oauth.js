const axios = require("axios");

const getTwitchTokenForAuthCode = async (code) => {
  return await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TWITCH_OAUTH_REDIRECT_URI,
    },
    headers: {
      'Accept': 'application/json',
    },
  })
    .then(({ data }) => data)
    .catch((err) => {
      console.log(err.response.data);
      throw new Error(`Could not get user's data.`);
    });
}

const getTwitchUserMeta = async (token) => {
  return await axios.get(
    'https://api.twitch.tv/helix/users',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Client-ID': process.env.TWITCH_CLIENT_ID,
      },
    }
  )
    .then(({ data }) => data.data[0])
    .catch((err) => {
      console.log(err.response.data);
      throw new Error(`Could not get user's data.`);
    });

}

exports.getTwitchUserData = async ({ code }) => {
  const { access_token } = await getTwitchTokenForAuthCode(code);
  const userMeta = await getTwitchUserMeta(access_token);
  const { email, profile_image_url, display_name } = userMeta;

  return {
    email,
    username: display_name,
    name: '',
    profilePicture: profile_image_url,
    emailConfirmed: true,
  };
}