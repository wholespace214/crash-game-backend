// Import Event model
const { URL } = require('url');
const _ = require('lodash');
const { Event } = require('@wallfair.io/wallfair-commons').models;
const logger = require('../util/logger');

const { getVideosById } = require('../services/youtube-service');

const checkYoutubeVideos = async () => {
  const session = await Event.startSession();
  try {
    await session.withTransaction(async () => {
      const eventsList = await Event.find(
        // check which query performs better under heavy load
        // {type: "streamed", $or: [{"metadata": {$exists: false}}, {"metadata.twitch_subscribed": {$exists: false}}]}
        {
          type: 'streamed',
          streamUrl: { $regex: 'youtube.com', $options: 'i' },
          $or: [
            { 'metadata.youtube_last_synced': { $exists: false } },
            { 'metadata.youtube_last_synced': { $exists: true } }
          ]
        }, null, {
        sort: { 'metadata.youtube_last_synced': -1 }
      }
      )
        .limit(10)
        .exec();

      const videosIdsToQuery = [];

      _.each(eventsList, (checkEvent) => {
        const { streamUrl } = checkEvent;
        const parsedUrl = new URL(streamUrl);
        const urlParams = parsedUrl.searchParams;
        const videoId = urlParams.get('v');

        videosIdsToQuery.push({
          _id: _.get(checkEvent, '_id'),
          videoId
        })
      });

      if (videosIdsToQuery.length == 0) {
        return;
      }

      const params = videosIdsToQuery.map(a => a.videoId);

      const checkVideosState = await getVideosById(params, true).catch((err) => {
        logger.error(err);
      });

      for (const checkEvent of eventsList) {
        const currentVideoId = _.get(_.find(videosIdsToQuery, { _id: checkEvent._id }), 'videoId');
        const findVideoResponse = _.find(checkVideosState, { id: currentVideoId });
        const channelId = _.get(findVideoResponse, 'snippet.channelId');
        const liveBroadcastingContent = _.get(findVideoResponse, 'snippet.liveBroadcastContent', 'none');

        const isLive = liveBroadcastingContent === "live" ? true : false;

        if (isLive) {
          checkEvent.state = "online";
        } else {
          checkEvent.state = "offline";
        }

        _.set(checkEvent, 'metadata.youtube_last_synced', Date.now())
        _.set(checkEvent, 'metadata.youtube_channel_id', channelId)

        await checkEvent.save();
      }
    });
  } catch (err) {
    console.log(err);
  } finally {
    await session.endSession();
  }
};

const initYoutubeCheckJob = () => {
  // only start the service if the env var is set
  if (process.env.GOOGLE_API_KEY) {
    // setInterval(checkYoutubeVideos, 1000 * 60 * 5); // check every 5 min
  }
};

exports.initYoutubeCheckJob = initYoutubeCheckJob;
