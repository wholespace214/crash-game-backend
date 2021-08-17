const dotenv = require('dotenv');
dotenv.config();

const axios = require("axios");

let clientId = process.env.TWITCH_CLIENT_ID;
let clientSecret = process.env.TWITCH_CLIENT_SECRET;

let INPUT_URL = `https://www.twitch.tv/blinkx_`;

let credentials = {
    access_token: null,
    expired_in: null,
    expires_at: null
};

const updateToken = async () => {
    let authURL = `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;
    console.log("Logging in to twitch using url ", authURL);

    let tokenResponse = await axios.post(authURL);

    credentials.access_token = tokenResponse.data.access_token;
    credentials.expired_in = tokenResponse.data.expired_in;
    credentials.expires_at = Date.now() + credentials.expired_in - 200;
};

const isTokenExpired = () => {
    return credentials.expires_at == null || Date.now() > credentials.expires_at;
};

const getAccessToken = async () => {
    if (isTokenExpired()) {
        await updateToken();
    }

    return credentials.access_token;
};

const twitchRequest = async (url) => {
    let token = await getAccessToken();

    let response = await axios.get(url, {
        headers: {
            "Client-Id": clientId,
            "Authorization": `Bearer ${token}`
        }
    })
    return response.data;
};

const getTwitchUser = async (twitchUsername) => {
    let userData = await twitchRequest(`https://api.twitch.tv/helix/users?login=${twitchUsername}`);

    return userData.data[0];
};

const getTwitchTags = async (broadcaster_id) => {
    let tagsData = await twitchRequest(`https://api.twitch.tv/helix/streams/tags?broadcaster_id=${broadcaster_id}`);
    console.log("TAGS", JSON.stringify(tagsData));

    return tagsData.data.map(t => {name: t.localization_names["en-us"]});
};

const getTwitchChannel = async (broadcaster_id) => {
    let channelData = await twitchRequest(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcaster_id}`);
    return channelData.data[0];
};

const getEventFromTwitchUrl = async (streamUrl) => {
    let username = streamUrl.substring(streamUrl.lastIndexOf("/")+1)

    let userData = await getTwitchUser(login);
    let channelData = await getTwitchChannel(userData.id);
    let tags = await getTwitchTags(userData.id);

    let event = {
        name: userData.displayName,
        previewImageUrl: userData.offline_image_url,
        streamUrl,
        tags,
        date: Date.now(),
        type: 'streamed',

    }
}

const main = async (login) => {
    let userData = await getTwitchUser(login);
    let channelData = await getTwitchChannel(userData.id);
    let tags = await getTwitchTags(userData.id);

    console.log(tags);
}

//main("chess");
//main("blinx_");
