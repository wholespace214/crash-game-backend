const models = require('@wallfair.io/wallfair-commons').models;

const API_TYPE = 'backend';
const DATA_SENSITIVE_ROUTES = [
  '/auth/login'
];

const getRealIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];

  if(forwardedFor) {
    const isSplittable = forwardedFor.indexOf(',') > -1;
    if(isSplittable) {
      return forwardedFor.split(',')?.[0]?.replace(/\s+/g, '');
    }
    return forwardedFor;
  }

  return req.connection.remoteAddress || req.socket.remoteAddress;
}

const getPath = (req) => {
  return req.baseUrl + req.path;
}

const getUsefullHeaders = (req) => {
  const output = {};
  const headers = req.headers;
  const exlusionList = [
    'authorization'
  ];

  for (const header in headers) {
    if (exlusionList.indexOf(header) === -1) {
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
  const path = getPath(req);
  const list = DATA_SENSITIVE_ROUTES;

  let output = {};
  let skipBody = false;

  if (list.length) {
    for (const index in list) {
      if (path.indexOf(list[index]) > -1) {
        skipBody = true;
      }
    }
  }

  if(!skipBody) {
    output = req.body;
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
        path: getPath(req),
        query: req.query,
        headers: getUsefullHeaders(req),
        body: getBody(req),
        statusCode: res.statusCode
      }

      await models.ApiLogs.create(entry);

    } catch (error) {
      console.error(`${new Date()} [requestLogHandler] error`, error);
    }
  });

  next();
};


module.exports = {
  requestLogHandler
}
