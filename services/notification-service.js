const { UniversalEvent } = require('@wallfair.io/wallfair-commons').models;
const {
  notificationEvents, universalEventTypes
} = require('@wallfair.io/wallfair-commons/constants/eventTypes');

let pubClient;
const DEFAULT_CHANNEL = 'system';

const init = (pub) => {
  pubClient = pub.duplicate();
};

const publishEvent = (event, data) => {
  if (universalEventTypes.includes(event)) {
    save(event, data);
  }

  pubClient.publish(
    DEFAULT_CHANNEL,
    JSON.stringify({
      event: event,
      ...data,
    })
  );
  // console.log('[NOTIFICATION-SERVICE] Published:', event);

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

const save = (event, message) => {
  let uniEvent = new UniversalEvent({
    type: event,
    performedBy: message.producer,
    userId: message.producerId,
    channel: DEFAULT_CHANNEL,
    data: message.data,
  });

  uniEvent.save();
};

module.exports = {
  init,
  publishEvent,
  notificationEvents,
};
