const { google } = require('googleapis');
const logger = require('../util/logger').default;

const ytApi = google.youtube({
  version: 'v3',
  auth: process.env.GOOGLE_API_KEY,
});

/**
 * Gets a category based on the YouTube category ID given.
 * @param {String} categoryId
 * @returns {Object}
 */
const getYoutubeCategoryById = async (/** @type string */ categoryId) => {
  try {
    if (!categoryId) throw new Error('No proper "categoryId" given');

    const response = await ytApi.videoCategories.list({
      part: 'snippet',
      id: categoryId,
    });

    return response?.data?.items?.[0] || undefined;
  } catch (err) {
    logger.error(err);
    return undefined;
  }
};


module.exports = {
  getYoutubeCategoryById
};

/*
{
  config: {
    url: 'https://youtube.googleapis.com/youtube/v3/videoCategories?part=snippet&id=17&key=aaaa-aaaaa',
    method: 'GET',
    userAgentDirectives: [ [Object] ],
    paramsSerializer: [Function (anonymous)],
    headers: {
      'x-goog-api-client': 'gdcl/5.0.5 gl-node/14.17.3 auth/7.9.2',
      'Accept-Encoding': 'gzip',
      'User-Agent': 'google-api-nodejs-client/5.0.5 (gzip)',
      Accept: 'application/json'
    },
    params: {
      part: 'snippet',
      id: '17',
      key: 'aaaaa-aaaaa'
    },
    validateStatus: [Function (anonymous)],
    retry: true,
    responseType: 'json'
  },
  data: {
    kind: 'youtube#videoCategoryListResponse',
    etag: 'UXjAvCu4TOQHemMFvhzgu-oQobY',
    items: [ [Object] ]
  },
  headers: {
    'alt-svc': 'h3=":443"; ma=2592000,h3-29=":443"; ma=2592000,h3-T051=":443"; ma=2592000,h3-Q050=":443"; ma=2592000,h3-Q046=":443"; ma=2592000,h3-Q043=":443"; ma=2592000,quic=":443"; ma=2592000; v="46,43"',
    'cache-control': 'private',
    connection: 'close',
    'content-encoding': 'gzip',
    'content-type': 'application/json; charset=UTF-8',
    date: 'Wed, 22 Sep 2021 14:41:23 GMT',
    server: 'scaffolding on HTTPServer2',
    'transfer-encoding': 'chunked',
    vary: 'Origin, X-Origin, Referer',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'SAMEORIGIN',
    'x-xss-protection': '0'
  },
  status: 200,
  statusText: 'OK',
  request: {
    responseURL: 'https://youtube.googleapis.com/youtube/v3/videoCategories?part=snippet&id=17&key=aaaa-aaaa'
  }
}
*/
