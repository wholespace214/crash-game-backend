const dotenv = require('dotenv');

dotenv.config();

const axios = require('axios');

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;

// Import Event model
const { Event } = require('@wallfair.io/wallfair-commons').models;

const generateSlug = require('../util/generateSlug');

const credentials = {
  access_token: null,
  expired_in: null,
  expires_at: null,
};

const updateToken = async () => {
  const authURL = `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;
  console.log('Logging in to twitch using url ', authURL);

  const tokenResponse = await axios.post(authURL);

  credentials.access_token = tokenResponse.data.access_token;
  credentials.expired_in = tokenResponse.data.expired_in;
  credentials.expires_at = Date.now() + credentials.expired_in - 200;
};

const isTokenExpired = () => credentials.expires_at == null || Date.now() > credentials.expires_at;

const getAccessToken = async () => {
  if (isTokenExpired()) {
    await updateToken();
  }

  return credentials.access_token;
};

const twitchRequest = async (url) => {
  const token = await getAccessToken();

  try {
    const response = await axios.get(url, {
      headers: {
        'Client-Id': clientId,
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (err) {
    console.log(new Date(), 'Failed to make a twitch request', err);
  }
};

const getTwitchUser = async (twitchUsername) => {
  const userData = await twitchRequest(`https://api.twitch.tv/helix/users?login=${twitchUsername}`);

  return userData.data[0];
};

const getTwitchTags = async (broadcaster_id) => {
  const tagsData = await twitchRequest(
    `https://api.twitch.tv/helix/streams/tags?broadcaster_id=${broadcaster_id}`
  );

  return tagsData.data.map((i) => ({ name: i.localization_names['en-us'] }));
};

const getTwitchChannel = async (broadcaster_id) => {
  const channelData = await twitchRequest(
    `https://api.twitch.tv/helix/channels?broadcaster_id=${broadcaster_id}`
  );
  return channelData.data[0];
};

const getEventFromTwitchUrl = async (streamUrl, category) => {
  const username = streamUrl.substring(streamUrl.lastIndexOf('/') + 1);

  const userData = await getTwitchUser(username);
  const channelData = await getTwitchChannel(userData.id);
  const tags = await getTwitchTags(userData.id);

  const metadata = {
    twitch_id: userData.id,
    twitch_login: userData.login,
    twitch_name: userData.display_name,
    twitch_game_id: channelData.game_id,
    twitch_game_name: channelData.game_name,
    twitch_channel_title: channelData.title,
  };

  // first check if event exists
  let event = await Event.findOne({ streamUrl }).exec();
  if (!event) {
    const slug = generateSlug(userData.display_name);

    event = new Event({
      name: userData.display_name,
      slug,
      previewImageUrl: userData.offline_image_url,
      streamUrl,
      tags,
      date: Date.now(),
      type: 'streamed',
      category: category || channelData.game_name,
      metadata: {
        ...metadata,
        twitch_last_synced: null,
        twitch_subscribed_online: 'false',
        twitch_subscribed_offline: 'false',
      },
    });
    await event.save();
  } else {
    event.metadata = event.metadata || {
      twitch_last_synced: null,
      twitch_subscribed_online: 'false',
      twitch_subscribed_offline: 'false',
    };
    for (const prop in metadata) {
      event.metadata[prop] = metadata[prop];
    }
    event.tags = tags;
    event.category = channelData.game_name;
    await event.save();
  }

  return event;
};

const subscribeForOnlineNotifications = async (broadcaster_user_id) => {
  if (!process.env.BACKEND_URL || !process.env.TWITCH_CALLBACK_SECRET) {
    console.log(
      'WARNING: Attempted to subscribe to twich events without backend properly configured.'
    );
    return;
  }

  const token = await getAccessToken();

  const data = {
    type: 'stream.online',
    version: '1',
    condition: {
      broadcaster_user_id,
    },
    transport: {
      method: 'webhook',
      callback: `${process.env.BACKEND_URL}/webhooks/twitch/`,
      secret: process.env.TWITCH_CALLBACK_SECRET,
    },
  };

  try {
    await axios.post('https://api.twitch.tv/helix/eventsub/subscriptions', data, {
      headers: {
        'Client-Id': clientId,
        Authorization: `Bearer ${token}`,
      },
    });
    return 'pending';
  } catch (err) {
    if (err.response.statusText === 'Conflict') {
      // already subscribed. Store info and continue;
      return 'true';
    }
    console.log('Could not subscribe to twitch online events', err.response);
  }

  return 'false';
};

const subscribeForOfflineNotifications = async (broadcaster_user_id) => {
  if (!process.env.BACKEND_URL || !process.env.TWITCH_CALLBACK_SECRET) {
    console.log(
      'WARNING: Attempted to subscribe to twitch events without backend properly configured.'
    );
    return;
  }

  const token = await getAccessToken();

  const data = {
    type: 'stream.offline',
    version: '1',
    condition: {
      broadcaster_user_id,
    },
    transport: {
      method: 'webhook',
      callback: `${process.env.BACKEND_URL}/webhooks/twitch/`,
      secret: process.env.TWITCH_CALLBACK_SECRET,
    },
  };

  try {
    await axios.post('https://api.twitch.tv/helix/eventsub/subscriptions', data, {
      headers: {
        'Client-Id': clientId,
        Authorization: `Bearer ${token}`,
      },
    });
    return 'pending';
  } catch (err) {
    if (err.response.statusText === 'Conflict') {
      // already subscribed. Store info and continue;
      return 'true';
    }
    console.log('Could not subscribe to twitch offline events', err.response);
  }

  return 'false';
};

const removeSubscription = async (subscription_id) => {
  if (!process.env.BACKEND_URL || !process.env.TWITCH_CALLBACK_SECRET) {
    console.log('WARNING: Attempted to remove twitch event without backend properly configured.');
    return;
  }

  const token = await getAccessToken();

  try {
    const response = await axios.delete(
      `https://api.twitch.tv/helix/eventsub/subscriptions?id=${subscription_id}`,
      {
        headers: {
          'Client-Id': clientId,
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (err) {
    console.log(new Date(), 'Failed to remove a twitch subscription', err.data);
  }
};

const listSubscriptions = async () => {
  if (!process.env.BACKEND_URL || !process.env.TWITCH_CALLBACK_SECRET) {
    console.log(
      'WARNING: Attempted to list twitch subscriptions without backend properly configured.'
    );
    return;
  }

  const subscriptionsList = await twitchRequest(
    'https://api.twitch.tv/helix/eventsub/subscriptions'
  );

  return subscriptionsList.data;
};

const removeAllSubscriptions = async () => {
  const subscriptionsList = await listSubscriptions();

  for (const subscription of subscriptionsList) {
    await removeSubscription(subscription.id);
  }

  const result = await listSubscriptions();

  return result.length === 0;
};

module.exports = {
  getEventFromTwitchUrl,
  subscribeForOnlineNotifications,
  subscribeForOfflineNotifications,
  removeSubscription,
  listSubscriptions,
  removeAllSubscriptions,
};
