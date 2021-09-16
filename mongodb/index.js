const wallfair = require('@wallfair.io/wallfair-commons');
const mongoose = require('mongoose');

const logger = require('../util/logger');

let mongoURL = process.env.DB_CONNECTION;
if (process.env.ENVIRONMENT === 'STAGING') {
  mongoURL = mongoURL.replace('admin?authSource=admin', 'wallfair?authSource=admin');
  mongoURL += '&replicaSet=wallfair&tls=true&tlsCAFile=/usr/src/app/ssl/staging.crt';
} else if (process.env.ENVIRONMENT === 'PRODUCTIVE') {
  mongoURL = mongoURL.replace('admin?authSource=admin', 'wallfair?authSource=admin');
  mongoURL += '&replicaSet=wallfair&tls=true&tlsCAFile=/usr/src/app/ssl/productive.crt';
}

/** Connection to Database */
exports.connectMongoDB = async () => {
  const connection = await mongoose.connect(mongoURL, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  });
  logger.info('Connection to Mongo-DB successful');

  wallfair.initModels(connection);
  logger.info('Mongoose models initialized');

  return connection;
};
