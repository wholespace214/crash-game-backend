// Create Redis pub client, which will be used to send out notifications
const redis = require('redis');

const redisClient = redis.createClient({
  url: process.env.REDIS_CONNECTION,
  legacyMode: false
});

module.exports = {
  redisClient
}
