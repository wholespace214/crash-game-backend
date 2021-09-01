const dotenv = require('dotenv');
dotenv.config();

const axios = require("axios");

let clientId = process.env.TWITCH_CLIENT_ID;
let clientSecret = process.env.TWITCH_CLIENT_SECRET;

// Import Event model
const { Event } = require("@wallfair.io/wallfair-commons").models;

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

    try {
        let response = await axios.get(url, {
            headers: {
                "Client-Id": clientId,
                "Authorization": `Bearer ${token}`
            }
        })
        return response.data;
    } catch (err) {
        console.log(new Date(), "Failed to make a twitch request", err)
    }
};

const getTwitchUser = async (twitchUsername) => {
    let userData = await twitchRequest(`https://api.twitch.tv/helix/users?login=${twitchUsername}`);

    return userData.data[0];
};

const getTwitchTags = async (broadcaster_id) => {
    let tagsData = await twitchRequest(`https://api.twitch.tv/helix/streams/tags?broadcaster_id=${broadcaster_id}`);

    return tagsData.data.map((i) => {
        return {name: i.localization_names["en-us"]}
    });
};

const getTwitchChannel = async (broadcaster_id) => {
    let channelData = await twitchRequest(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcaster_id}`);
    return channelData.data[0];
};

const getEventFromTwitchUrl = async (streamUrl) => {
    let username = streamUrl.substring(streamUrl.lastIndexOf("/")+1)

    let userData = await getTwitchUser(username);
    let channelData = await getTwitchChannel(userData.id);
    let tags = await getTwitchTags(userData.id);

    const metadata = {
        'twitch_id': userData.id, 
        'twitch_login': userData.login, 
        'twitch_name': userData.display_name, 
        'twitch_game_id': channelData.game_id, 
        'twitch_game_name': channelData.game_name,
        'twitch_channel_title': channelData.title
    };

    // first check if event exists
    let event = await Event.findOne({streamUrl}).exec();
    if (!event) {
        event = new Event({
            name: userData.display_name,
            previewImageUrl: userData.offline_image_url,
            streamUrl,
            tags,
            date: Date.now(),
            type: 'streamed',
            category: channelData.game_name,
            metadata: {
                ...metadata,
                'twitch_last_synced': null, 
                'twitch_subscribed_online': "false",
                'twitch_subscribed_offline': "false"
            }
        });
        await event.save();
    } else {
        event.metadata = event.metadata || {
            'twitch_last_synced': null, 
            'twitch_subscribed_online': "false",
            'twitch_subscribed_offline': "false"
        };
        for (let prop in metadata) {
            event.metadata[prop] = metadata[prop];
        }
        event.tags = tags;
        event.category = channelData.game_name;
        await event.save();
    }

    return event;
}

const subscribeForOnlineNotifications = async (broadcaster_user_id) => {
    if (!process.env.BACKEND_URL || !process.env.TWITCH_CALLBACK_SECRET) {
        console.log("WARNING: Attempted to subscribe to twich events without backend properly configured.");
        return;
    }

    let token = await getAccessToken();

    let data = {
        "type": "stream.online",
        "version": "1",
        "condition": {
            "broadcaster_user_id": broadcaster_user_id
        },
        "transport": {
            "method": "webhook",
            "callback": `${process.env.BACKEND_URL}/webhooks/twitch/`,
            "secret": process.env.TWITCH_CALLBACK_SECRET
        }
    };

    try {
        await axios.post("https://api.twitch.tv/helix/eventsub/subscriptions", data, {
            headers: {
                "Client-Id": clientId,
                "Authorization": `Bearer ${token}`
            }
        });
        return "pending";
    } catch (err) {
        if (err.response.statusText === "Conflict") {
            // already subscribed. Store info and continue;
            return "true";
        } else {
            console.log("Could not subscribe to twitch online events", err.response);
        }
    }
    
    return "false";
};

const subscribeForOfflineNotifications = async (broadcaster_user_id) => {
    if (!process.env.BACKEND_URL || !process.env.TWITCH_CALLBACK_SECRET) {
        console.log("WARNING: Attempted to subscribe to twich events without backend properly configured.");
        return;
    }

    let token = await getAccessToken();

    let data = {
        "type": "stream.offline",
        "version": "1",
        "condition": {
            "broadcaster_user_id": broadcaster_user_id
        },
        "transport": {
            "method": "webhook",
            "callback": `${process.env.BACKEND_URL}/webhooks/twitch/`,
            "secret": process.env.TWITCH_CALLBACK_SECRET
        }
    };

    try {
        await axios.post("https://api.twitch.tv/helix/eventsub/subscriptions", data, {
            headers: {
                "Client-Id": clientId,
                "Authorization": `Bearer ${token}`
            }
        });
        return "pending";
    } catch (err) {
        if (err.response.statusText === "Conflict") {
            // already subscribed. Store info and continue;
            return "true";
        } else {
            console.log("Could not subscribe to twitch offline events", err.response);
        }
    }
    
    return "false";
};

module.exports = {
    getEventFromTwitchUrl,
    subscribeForOnlineNotifications,
    subscribeForOfflineNotifications
}

// for quick cli tests:
const main = async () => {
    console.log(await getEventFromTwitchUrl("https://www.twitch.tv/gmhikaru"))
}

//main();
