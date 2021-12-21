// Import and configure dotenv to enable use of environmental variable
const dotenv = require('dotenv');

dotenv.config();

// Import express
const express = require('express');
const http = require('http');

// Import mongoose to connect to Database
const mongoose = require('mongoose');

// Import Models from Wallfair Commons
const wallfair = require('@wallfair.io/wallfair-commons');
const { handleError } = require('./util/error-handler');

const { initDb } = require('@wallfair.io/trading-engine');
// const { initDatabase } = require('@wallfair.io/wallfair-casino');

let mongoURL = process.env.DB_CONNECTION;

/**
 * CORS options
 * @type import('cors').CorsOptions
 */
const corsOptions = {
  origin: ["wallfair.io",
    /\.wallfair\.io$/,
    "alpacasino.io",
    "https://alpacasino.io",
    /\.alpacasino\.io$/,
    /\.ngrok\.io$/,
    /\.netlify\.app$/,
    /localhost:?.*$/m,
  ],
  credentials: true,
  allowedMethods: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'X-Access-Token',
    'Authorization',
  ],
  exposedHeaders: ['Content-Length'],
  preflightContinue: false,
};

// Connection to Database
async function connectMongoDB() {
  await mongoose.connect(mongoURL, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true,
    readPreference: 'primary',
    retryWrites: true,
  });
  console.log('Connection to Mongo-DB successful');

  wallfair.initModels(mongoose);
  console.log('Mongoose models initialized');

  return mongoose;
}
async function main() {
  const mongoDBConnection = await connectMongoDB();

  // Initialize the postgres database (trading-engine)
  await initDb();

  const amqp = require('./services/amqp-service');
  amqp.init();

  // Import Admin service
  const adminService = require('./services/admin-service');
  adminService.setMongoose(mongoDBConnection);
  adminService.initialize();

  const { initBetsJobs } = require('./jobs/bets-jobs');
  initBetsJobs();

  const { initTwitchSubscribeJob } = require('./jobs/twitch-subscribe-job');
  initTwitchSubscribeJob();

  const { initYoutubeCheckJob } = require('./jobs/youtube-live-check-job');
  initYoutubeCheckJob();

  // Import cors
  const cors = require('cors');

  // Initialise server using express
  const server = express();
  const httpServer = http.createServer(server);
  server.use(cors(corsOptions));

  const awsS3Service = require('./services/aws-s3-service');
  awsS3Service.init();

  // Jwt verification
  const passport = require('passport');
  const auth = require('./util/auth');
  auth.setPassportStrategies();
  server.use(passport.initialize());
  server.use(passport.session());
  server.use(auth.evaluateIsAdmin);
  adminService.buildRouter();

  server.use(adminService.getRootPath(), adminService.getRouter());
  server.use(adminService.getLoginPath(), adminService.getRouter());
  server.use(express.json({ limit: '5mb' }));
  server.use(express.urlencoded({ limit: '5mb', extended: true }));

  // Home Route
  server.get('/', (req, res) => {
    res.status(200).send({
      message: 'Blockchain meets Prediction Markets made Simple. - Wallfair.',
    });
  });

  // Import Routes
  const userRoute = require('./routes/users/users-routes');
  const secureEventRoutes = require('./routes/users/secure-events-routes');
  const secureRewardsRoutes = require('./routes/users/secure-rewards-routes');
  const eventRoutes = require('./routes/users/events-routes');
  const secureUserRoute = require('./routes/users/secure-users-routes');
  const secureBetTemplateRoute = require('./routes/users/secure-bet-template-routes');
  const twitchWebhook = require('./routes/webhooks/twitch-webhook');
  const chatRoutes = require('./routes/users/chat-routes');
  const notificationEventsRoutes = require('./routes/users/notification-events-routes');
  const authRoutes = require('./routes/auth/auth-routes');
  const userMessagesRoutes = require('./routes/users/user-messages-routes');
  const fractalWebhooks = require('./routes/webhooks/fractal-webhooks');
  const quoteRoutes = require('./routes/users/quote-routes');
  const adminRoutes = require('./routes/users/admin-routes');

  // Using Routes
  server.use('/api/event', eventRoutes);
  server.use('/api/event', passport.authenticate('jwt', { session: false }), secureEventRoutes);
  server.use('/api/user', userRoute);
  server.use('/api/user', passport.authenticate('jwt', { session: false }), secureUserRoute);
  server.use('/api/rewards', passport.authenticate('jwt', { session: false }), secureRewardsRoutes);
  server.use(
    '/api/bet-template',
    passport.authenticate('jwt', { session: false }),
    secureBetTemplateRoute
  );
  server.use('/webhooks/twitch/', twitchWebhook);
  server.use('/api/chat', chatRoutes);
  server.use('/api/notification-events', notificationEventsRoutes);
  server.use('/api/auth', authRoutes);
  server.use(
    '/api/user-messages',
    passport.authenticate('jwt', { session: false }),
    userMessagesRoutes
  );
  server.use('/webhooks/fractal/', fractalWebhooks);

  server.use('/api/quote', passport.authenticate('jwt', { session: false }), quoteRoutes);
  server.use('/api/admin', passport.authenticate('jwt_admin', { session: false }), adminRoutes);

  // Error handler middleware
  // eslint-disable-next-line no-unused-vars
  server.use((err, req, res, next) => {
    handleError(err, res);
  });

  // Let server run and listen
  const appServer = httpServer.listen(process.env.PORT || 8000, () => {
    const { port } = appServer.address();

    console.log(`API runs on port: ${port}`);
  });
}

main();
