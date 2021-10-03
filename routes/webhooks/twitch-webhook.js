// Import the express Router to create routes
const router = require('express').Router();
const { publishEvent, notificationEvents } = require('../../services/notification-service');
const { removeSubscription } = require('../../services/twitch-service');

// Import Event model
const { Event } = require('@wallfair.io/wallfair-commons').models;

router.post('/', async (req, res) => {
  console.log(new Date(), 'TWITCH_MESSAGE', JSON.stringify(req.body));

  // handle twitch challenges
  if (req.header('Twitch-Eventsub-Message-Type') === 'webhook_callback_verification') {
    const type = req.header('Twitch-Eventsub-Subscription-Type');
    const { broadcaster_user_id } = req.body.subscription.condition;

    const session = await Event.startSession();
    try {
      await session.withTransaction(async () => {
        const event = await Event.findOne({ 'metadata.twitch_id': broadcaster_user_id }).exec();

        if (!event) {
          removeSubscription(req.body.subscription.id);
          throw Error(`Event with broadcaster_user_id:${broadcaster_user_id} does not exist`);
        }

        if (type == 'stream.online') {
          event.metadata.twitch_subscribed_online = 'true';
          await event.save();
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
    console.log('TWITCH_NOTIFICATION', JSON.stringify(req.body));

    const type = req.header('Twitch-Eventsub-Subscription-Type');
    const { broadcaster_user_id } = req.body.subscription.condition;

    const session = await Event.startSession();
    try {
      await session.withTransaction(async () => {
        const event = await Event.findOne({ 'metadata.twitch_id': broadcaster_user_id }).exec();

        if (!event) {
          removeSubscription(req.body.subscription.id);
          throw Error(`Event with broadcaster_user_id:${broadcaster_user_id} does not exist`);
        }

        event.state = type === 'stream.online' ? 'online' : event.state === 'offline' ? 'offline' : null;
        await event.save();

        publishEvent(type === 'stream.online' ? notificationEvents.EVENT_ONLINE : notificationEvents.EVENT_OFFLINE, {
          producer: 'system',
          producerId: 'notification-service',
          data: { event },
          broadcast: true
        });
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
