const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

const { OAuth2 } = google.auth;

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-nodejs-quickstart.json
const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];
const TOKEN_DIR = `${process.cwd()}/.credentials/`;
const TOKEN_PATH = `${TOKEN_DIR}youtube-nodejs-quickstart.json`;

// eslint-disable-next-line no-console
const logger = { log(msg, ...args) { console.log(msg, args); } };

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
const storeToken = (token) => {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
    if (err) throw err;
    logger.info(`Token stored to ${TOKEN_PATH}`);
  });
};

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized client.
 */
const getNewToken = (
  /** @type {import('googleapis-common').OAuth2Client} */ oauth2Client,
  callback,
) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  logger.info('Authorize this app by visiting this url: ', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oauth2Client.getToken(code, (err, token) => {
      if (err) {
        logger.info('Error while trying to retrieve access token', err);
        return;
      }
      // eslint-disable-next-line no-param-reassign
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
};

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(
  /** @type {import('google-auth-library').Credentials} */ credentials,
  callback,
) {
  const clientSecret = credentials.installed.client_secret;
  const clientId = credentials.installed.client_id;
  const redirectUrl = credentials.installed.redirect_uris[0];
  const oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
const getChannel = (auth) => {
  const service = google.youtube('v3');
  service.channels.list({
    auth,
    part: 'snippet,contentDetails,statistics',
    forUsername: 'GoogleDevelopers',
  }, (err, response) => {
    if (err) {
      logger.info(`The API returned an error: ${err}`);
      return;
    }
    const channels = response.data.items;
    if (channels.length === 0) {
      logger.info('No channel found.');
    } else {
      logger.info('This channel\'s ID is %s. Its title is \'%s\', and '
                  + 'it has %s views.',
      channels[0].id,
      channels[0].snippet.title,
      channels[0].statistics.viewCount);
    }
  });
};

// Load client secrets from a local file.
fs.readFile('client_secret.json', (err, content) => {
  if (err) {
    logger.info(`Error loading client secret file: ${err}`);
    return;
  }
  // Authorize a client with the loaded credentials, then call the YouTube API.
  authorize(JSON.parse(content), getChannel);
});
