const { UniversalEvent } = require('@wallfair.io/wallfair-commons').models;
const {
  notificationEvents,
  universalEventTypes,
} = require('@wallfair.io/wallfair-commons/constants/eventTypes');

let pubClient, subClient;
const DEFAULT_CHANNEL = 'system';

const init = (client) => {
  pubClient = client.duplicate();
  subClient = client.duplicate();

  subClient.subscribe(DEFAULT_CHANNEL, (error, channel) => {
    console.log(error || 'NotificationService subscribed to channel:', channel);
  });

  subClient.on('message', (_, message) => {
    try {
      const messageObj = JSON.parse(message);
      // console.log('[NOTIFICATION-SERVICE] Received:', message);

      if (universalEventTypes.includes(messageObj.event)) {
        save(messageObj);
      }
    } catch (err) {
      console.error(err);
    }
  });
};

const publishEvent = (event, data) => {
  pubClient.publish(
    DEFAULT_CHANNEL,
    JSON.stringify({
      event: event,
      ...data,
    })
  );
  //console.log('[NOTIFICATION-SERVICE] Published:', event);

  if (data.broadcast) {
    pubClient.publish(
      'message',
      JSON.stringify({
        to: '*',
        event,
        date: new Date(),
        ...data,
      })
    );
  }
};

const save = (message) => {
  let event = new UniversalEvent({
    type: message.event,
    performedBy: message.producer,
    userId: message.producerId,
    channel: DEFAULT_CHANNEL,
    data: message.data,
  });

  event.save();
};

module.exports = {
  init,
  publishEvent,
  notificationEvents,
};
