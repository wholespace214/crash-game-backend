const ChatMessageService = require('./chat-message-service');
const { AWARD_TYPES } = require('../util/constants');

const LOG_TAG = '[SOCKET] ';
let pubClient = null;

const notificationTypes = ChatMessageService.NotificationTypes;

exports.setPubClient = (newpub) => (pubClient = newpub);

exports.handleChatMessage = async function (socket, data, userId) {
  try {
    const responseData = { ...data, userId, date: new Date() };
    const { roomId } = data;
    const { message } = data;

    console.debug(LOG_TAG, `user ${userId} sends message "${message}" to room ${roomId}`);

    if (data) {
      await ChatMessageService.createChatMessage(data);
    }

    emitToAllByEventId(roomId, 'chatMessage', responseData);
  } catch (error) {
    console.error(error);
    console.log(LOG_TAG, 'failed to handle message', data);
  }
};

exports.handleJoinRoom = async function (socket, data) {
  try {
    const { roomId, userId } = data;

    if (roomId) {
      await socket.join(roomId);
    }

    if (userId) {
      socket.join(userId);
    }
  } catch (error) {
    console.error(error);
    console.log(LOG_TAG, 'failed to handle join room', data);
  }
};

exports.handleLeaveRoom = async function (socket, data) {
  try {
    const { roomId, userId } = data;

    if (roomId) {
      await socket.leave(roomId);
    }

    if (userId) {
      socket.leave(userId);
    }
  } catch (error) {
    console.error(error);
    console.log(LOG_TAG, 'failed to handle leave room', data);
  }
};

exports.emitBetStarted = async (bet) => {
  const event = bet.event;

  const payload = {
    roomId: event.id,
    eventId: event.id,
    bet,
    type: 'BET_STARTED',
  };

  emitToAllByEventId(event.id, 'BET_STARTED', payload);
};

exports.emitPlaceBetToAllByEventId = async (eventId, betId, user, amount, outcome) => {
  const message = 'dummy';
  const betPlacedData = {
    roomId: eventId,
    betId,
    type: 'BET_PLACE',
    amount: amount.toString(),
    outcome,
    message,
    user,
    date: new Date(),
  };

  await handleBetMessage(eventId, 'betPlaced', betPlacedData);
};

exports.emitPullOutBetToAllByEventId = async (
  eventId,
  betId,
  user,
  amount,
  outcome,
  currentPrice
) => {
  const message = 'dummy';
  const betPulledOutData = {
    roomId: eventId,
    betId,
    type: 'BET_PULLOUT',
    amount: amount.toString(),
    outcome,
    currentPrice: currentPrice.toString(),
    message,
    user,
    date: new Date(),
  };

  await handleBetMessage(eventId, 'betPulledOut', betPulledOutData);
};

exports.emitBetCreatedByEventId = async (eventId, userId, betId, title) => {
  const message = 'dummy';
  const betCreationData = {
    roomId: eventId,
    betId,
    type: 'BET_CREATE',
    title,
    message,
    userId,
    date: new Date(),
  };

  await handleBetMessage(eventId, 'betCreated', betCreationData);
};

const handleBetMessage = async (eventId, emitEventName, data) => {
  emitToAllByEventId(eventId, emitEventName, data);
};

exports.emitEventStartNotification = (userId, eventId, eventName) => {
  console.log(userId, eventId, eventName);
  // const message = `The event ${eventName} begins in 60s. Place your token.`;
  // emitToAllByUserId(userId, 'notification', { type: notificationTypes.EVENT_START, eventId, message });
};

exports.emitBetResolveNotification = async (userId, event, bet, amountTraded, tokensWon) => {
  const outcome =
    tokensWon > 0 ? `Don't forget to cash out!` : `Unfortunately you haven't won this time.`;
  const message = `Your favourite [event] has finished. ${outcome}`;
  await emitUserMessage(notificationTypes.EVENT_RESOLVE, userId, message, {
    imageUrl: event.previewImageUrl,
    eventId: event.id,
    eventName: event.name,
    eventSlug: event.slug,
    betId: bet.id,
    betQuestion: bet?.marketQuestion,
    amountTraded,
    tokensWon,
  });
};

exports.emitEventResolvedNotification = async (userId, event, bet) => {
  const message = `Your favourite [event] has finished.`;
  await emitUserMessage(notificationTypes.EVENT_RESOLVE, userId, message, {
    imageUrl: event?.previewImageUrl,
    eventId: event?.id,
    eventName: event?.name,
    eventSlug: event?.slug,
    betQuestion: bet?.marketQuestion,
  });
};

exports.emitEventCancelNotification = async (userId, event, bet) => {
  let { reasonOfCancellation, marketQuestion } = bet;
  let message = `Your favourite [event] was cancelled`;
  if (reasonOfCancellation) {
    message = message + ': ' + reasonOfCancellation;
  } else {
    message = message + '.';
  }
  await emitUserMessage(notificationTypes.EVENT_CANCEL, userId, message, {
    imageUrl: event?.previewImageUrl,
    eventId: event?.id,
    eventName: event?.name,
    eventSlug: event?.slug,
    betQuestion: marketQuestion,
  });
};

exports.emitUserAwardNotification = async (userId, awardData) => {
  if (!awardData || !awardData.award) {
    console.error(
      LOG_TAG,
      'websocket-service: emitUserAwardNotification was called without an award, skipping it.'
    );
  }
  let message;
  const tokens = `${awardData?.award} PFAIR tokens`;
  switch (awardData?.type) {
    case AWARD_TYPES.AVATAR_UPLOADED:
      message = `Congratulations! You have received ${tokens} for uploading a picture for the first time. There are many hidden ways to earn tokens, can you find them all?`;
      break;
    case AWARD_TYPES.CREATED_ACCOUNT_BY_INFLUENCER:
    case AWARD_TYPES.CREATED_ACCOUNT_BY_THIS_REF:
      message = `Congratulations! because you signed up via ${awardData.ref} you've been awarded ${tokens}!`;
      break;
    case AWARD_TYPES.EMAIL_CONFIRMED:
      message = `Congratulations! You have received ${tokens} for confirming your email. There are many hidden ways to earn tokens, can you find them all?`;
      break;
    case AWARD_TYPES.SET_USERNAME:
      message = `Congratulations! You have received ${tokens} for changing the username for the first time. There are many hidden ways to earn tokens, can you find them all?`;
      break;
  }

  await emitUserMessage(notificationTypes.USER_AWARD, userId, message, awardData);
};

const emitToAllByEventId = (eventId, emitEventName, data) => {
  console.debug(LOG_TAG, `emitting event "${emitEventName}" to all in event room ${eventId}`);
  pubClient.publish(
    'message',
    JSON.stringify({
      to: eventId.toString(),
      event: emitEventName,
      data: { date: new Date(), ...data },
    })
  );
};

/**
 * Creates and pushes over the websocket a UserMessage.
 */
const emitUserMessage = async (type, userId, message, payload) => {
  const savedMessage = await ChatMessageService.createChatMessage({
    type,
    userId,
    message,
    payload,
  });
  if (!userId) {
    console.error(
      LOG_TAG,
      'websocket-service: emitUserMessage was called without a userId, skipping it.'
    );
    return;
  }
  pubClient.publish(
    'message',
    JSON.stringify({
      to: userId.toString(),
      event: 'notification',
      data: { type, userId, message, payload, messageId: savedMessage._id },
    })
  );
};
