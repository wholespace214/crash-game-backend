/* eslint-disable max-len */
const { google } = require('googleapis');
const logger = require('../util/logger').default;

const ytApi = google.youtube({
  version: 'v3',
  auth: process.env.GOOGLE_API_KEY,
});

/**
 * Gets a list of videos based on the Ids given.
 * @param Array.<string> videoId
 * @returns Object
 */
const getVideosById = async (/** @type string[] */videoIds) => {
  try {
    if (!videoIds || !videoIds.length) throw new Error('No or empty array of "videoIds" given');
    /**
        {
          "kind": "youtube#videoListResponse",
          "etag": "c3rXvhNhLAZNxfNxR1qkA4d6wzY",
          "items": [
            {
              "kind": "youtube#video",
              "etag": "vGbDnXod4IwjwPyi4Khc82Zo3j8",
              "id": "BYQ8S5xtY68",
              "snippet": {
                "publishedAt": "2021-06-12T20:08:48Z",
                "channelId": "UCzcRQ3vRNr6fJ1A9rqFn7QA",
                "title": "AVATAR: FRONTIERS OF PANDORA Trailer (2022)",
                "description": "AVATAR: Frontiers of Pandora Trailer (2022) 4K Ultra HD\n© 2021 - Ubisoft",
                "thumbnails": {
                  "default": {
                    "url": "https://i.ytimg.com/vi/BYQ8S5xtY68/default.jpg",
                    "width": 120,
                    "height": 90
                  },
                  "medium": {
                    "url": "https://i.ytimg.com/vi/BYQ8S5xtY68/mqdefault.jpg",
                    "width": 320,
                    "height": 180
                  },
                  "high": {
                    "url": "https://i.ytimg.com/vi/BYQ8S5xtY68/hqdefault.jpg",
                    "width": 480,
                    "height": 360
                  },
                  "standard": {
                    "url": "https://i.ytimg.com/vi/BYQ8S5xtY68/sddefault.jpg",
                    "width": 640,
                    "height": 480
                  },
                  "maxres": {
                    "url": "https://i.ytimg.com/vi/BYQ8S5xtY68/maxresdefault.jpg",
                    "width": 1280,
                    "height": 720
                  }
                },
                "channelTitle": "ONE Media",
                "tags": [
                  "One Media",
                  "One",
                  "Cinema",
                  "Trailer",
                  "Official",
                  "Movie",
                  "Film",
                  "2022",
                  "AVATAR Frontiers of Pandora Trailer",
                  "Avatar",
                  "Video",
                  "Game",
                  "Avatar 2",
                  "Frondiers of Pandora",
                  "Pandora",
                  "4K",
                  "Ultra HD"
                ],
                "categoryId": "1",
                "liveBroadcastContent": "none",
                "defaultLanguage": "en",
                "localized": {
                  "title": "AVATAR: FRONTIERS OF PANDORA Trailer (2022)",
                  "description": "AVATAR: Frontiers of Pandora Trailer (2022) 4K Ultra HD\n© 2021 - Ubisoft"
                },
                "defaultAudioLanguage": "en"
              },
              "contentDetails": {
                "duration": "PT2M46S",
                "dimension": "2d",
                "definition": "hd",
                "caption": "false",
                "licensedContent": true,
                "contentRating": {},
                "projection": "rectangular"
              },
              "status": {
                "uploadStatus": "processed",
                "privacyStatus": "public",
                "license": "youtube",
                "embeddable": true,
                "publicStatsViewable": true,
                "madeForKids": false
              },
              "statistics": {
                "viewCount": "6262045",
                "likeCount": "53579",
                "dislikeCount": "4452",
                "favoriteCount": "0",
                "commentCount": "3130"
              },
              "player": {
                "embedHtml": "\u003ciframe width=\"480\" height=\"270\" src=\"//www.youtube.com/embed/BYQ8S5xtY68\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture\" allowfullscreen\u003e\u003c/iframe\u003e"
              },
              "topicDetails": {
                "topicCategories": [
                  "https://en.wikipedia.org/wiki/Action-adventure_game",
                  "https://en.wikipedia.org/wiki/Action_game",
                  "https://en.wikipedia.org/wiki/Role-playing_video_game",
                  "https://en.wikipedia.org/wiki/Video_game_culture"
                ]
              },
              "recordingDetails": {}
            }
          ],
          "pageInfo": {
            "totalResults": 1,
            "resultsPerPage": 1
          }
        }
       */
    return ytApi.videos.list({
      part: ['snippet,contentDetails,player,recordingDetails,statistics,status,topicDetails'],
      id: videoIds,
    });
  } catch (err) {
    logger.error(err);
    return undefined;
  }
};

module.exports = {
  getVideosById,
};
