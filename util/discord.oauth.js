const axios = require("axios");

const getDiscordTokenForAuthCode = async (code) => {
  const data = new URLSearchParams();
  data.append('client_id', process.env.DISCORD_CLIENT_ID);
  data.append('code', code);
  data.append('redirect_uri', process.env.DISCORD_OAUTH_REDIRECT_URI);
  data.append('grant_type', 'authorization_code');
  data.append('client_secret', process.env.DISCORD_CLIENT_SECRET,);

  return await axios.post('https://discord.com/api/v8/oauth2/token', data, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
    .then(({ data }) => data)
    .catch((err) => {
      console.log(err.response.data);
      throw new Error(`Could not get user's data.`);
    })
}

const getDiscordUserMeta = async (token) => {
  return await axios.get(
    'https://discord.com/api/v8/users/@me',
    { headers: { 'Authorization': `Bearer ${token}` }, }
  )
    .then(({ data }) => data)
    .catch((err) => {
      console.log(err.response.data);
      throw new Error(`Could not get user's data.`);
    });
}

exports.getDiscordUserData = async ({ code }) => {
  const { access_token } = await getDiscordTokenForAuthCode(code);
  const data = await getDiscordUserMeta(access_token);

  const { username, email, verified } = data;

  return {
    email,
    username,
    name: '',
    emailConfirmed: verified,
  };
}