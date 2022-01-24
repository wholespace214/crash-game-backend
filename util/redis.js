// Create Redis pub client, which will be used to send out notifications
const redis = require('redis');

const redisClient = redis.createClient({
  url: process.env.REDIS_CONNECTION,
  legacyMode: true
});

redisClient.on('connect', () => console.log('::> Redis Client Connected'));
redisClient.on('error', (err) => console.error('<:: Redis Client Error', err));

module.exports = {
  redisClient
}
