const models = require('@wallfair.io/wallfair-commons').models;

const API_TYPE = 'backend';
const DATA_SENSITIVE_ROUTES = [
  '/auth/login'
];

const getRealIp = (req) => {
  return req.headers['x-forwarded-for'] || req.headers['cf-ipcountry'] || req.socket.remoteAddress || req.connection.remoteAddress;
}

const getUsefullHeaders = (req) => {
  const output = {};
  const headers = req.headers;
  const list = [
    'content-type',
    'user-agent',
    'referer'
  ];

  for (const header in headers) {
    if (list.indexOf(header) > -1) {
      output[header] = headers[header];
    }
  }

  return output;
}


/**
 * Get body, excluding some data-sensitive routes
 * @param req
 * @returns {{}}
 */
const getBody = (req) => {
  const path = req.path;
  const list = DATA_SENSITIVE_ROUTES;

  let output = {};

  for (const index in list) {
    if (path.indexOf(list[index]) === -1) {
      output = req.body;
    }
  }

  return output;
}

const requestLogHandler = async (req, res, next) => {
  res.on('finish', async () => {
    try {
      const entry = {
        api_type: API_TYPE,
        userId: req._userId,
        ip: getRealIp(req),
        method: req.method,
        path: req.path,
        query: req.query,
        headers: getUsefullHeaders(req),
        body: getBody(req),
        statusCode: res.statusCode
      }

      await models.ApiLogs.create(entry);
      console.log('entry', entry);

    } catch (error) {
      console.error(`${new Date()} [requestLogHandler] error`, error);
    }
  });

  next();
};


module.exports = {
  requestLogHandler
}
