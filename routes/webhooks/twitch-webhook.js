// Import the express Router to create routes
const router = require('express').Router();
const { check } = require('express-validator');
const websocketService = require("../../services/websocket-service");

// Import Event model
const { Event } = require('@wallfair.io/wallfair-commons').models;

router.post('/', async (req, res, chain) => {
  console.log(new Date(), 'TWITCH_MESSAGE', JSON.stringify(req.body));

  // handle twitch challenges
  if (req.header('Twitch-Eventsub-Message-Type') === 'webhook_callback_verification') {
    const type = req.header('Twitch-Eventsub-Subscription-Type');
    const { broadcaster_user_id } = req.body.subscription.condition;

    const session = await Event.startSession();
    try {
      await session.withTransaction(async () => {
        const event = await Event.findOne({ 'metadata.twitch_id': broadcaster_user_id }).exec();

        if (type == 'stream.online') {
          event.metadata.twitch_subscribed_online = 'true';
          const ev = await event.save();
          websocketService.emitEventOnline(ev)
        } else if (type == 'stream.offline') {
          event.metadata.twitch_subscribed_offline = 'true';
          await event.save();
        }
      });
    } catch (err) {
      console.log('Twitch webhook challenge error', err);
    } finally {
      await session.endSession();
    }

    res.send(req.body.challenge);
  }

  // handle twitch events
  if (req.header('Twitch-Eventsub-Message-Type') === 'notification') {
    const type = req.header('Twitch-Eventsub-Subscription-Type');
    const { broadcaster_user_id } = req.body.subscription.condition;

    const session = await Event.startSession();
    try {
      await session.withTransaction(async () => {
        const event = await Event.findOne({ 'metadata.twitch_id': broadcaster_user_id }).exec();

        if (type == 'stream.online') {
          event.state = 'online';
          await event.save();
        } else if (type == 'stream.offline') {
          event.state = 'offline';
          await event.save();
        }
      });
    } catch (err) {
      console.log('Twitch webhook event error', err);
    } finally {
      await session.endSession();
    }

    res.sendStatus(200);
  }
});

module.exports = router;
