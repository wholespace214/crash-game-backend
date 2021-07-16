const ChatMessageService = require('./chat-message-service');

const LOG_TAG = '[SOCKET] ';
let io        = null;
let pubClient        = null;

const persist = async (data) => {
  if(data && data.message) {
      const chatMessage = await ChatMessageService.createChatMessage(data);
      await ChatMessageService.saveChatMessage(chatMessage);
    }
};

exports.setIO = (newIo) => io = newIo;
exports.setPubClient = (newpub) => pubClient = newpub;

exports.handleChatMessage = async function (socket, data, userId) {
    try {
        const responseData = getCopyWithBaseResponseData(data, userId);
        const eventId      = data.eventId;
        const message      = data.message;

        console.debug(LOG_TAG, 'user ' + userId + ' sends message "' + message + '"');

        await persist(data);

        emitToAllByEventId(eventId, 'chatMessage', responseData);
    } catch (error) {
        console.error(error);
        console.log(LOG_TAG, 'failed to handle message', data);
    }
};

exports.handleJoinRoom = async function (socket, data) {

    try {
        const {eventId, userId} = data;

        if (eventId) {
            await socket.join(eventId);
        } else {
            console.debug(LOG_TAG, 'no event id in handle join data', data);
        }

        if (userId) {
            socket.join(userId);
        } else {
            console.debug(LOG_TAG, 'no user id in handle join data', data);
        }

    } catch (error) {
        console.error(error);
        console.log(LOG_TAG, 'failed to handle join room', data);
    }
};

exports.handleLeaveRoom = async function (socket, data) {
    console.info('------------------------------------------ leave room');
    try {
        const {eventId, userId} = data;

        if (eventId) {
            await socket.leave(eventId);
        } else {
            console.debug(LOG_TAG, 'no event id in handle leave data', data);
        }

        if (userId) {
            socket.leave(userId);
        } else {
            console.debug(LOG_TAG, 'no user id in handle leave data', data);
        }
    } catch (error) {
        console.error(error);
        console.log(LOG_TAG, 'failed to handle leave room', data);
    }
};

exports.emitPlaceBetToAllByEventId = async (eventId, userId, betId, amount, outcome) => {
    const betPlacedData = getCopyWithBaseResponseData(
        {
            eventId,
            betId,
            amount: amount.toString(),
            outcome,
        },
        userId,
    );

    await handleBetMessage(eventId, 'betPlaced', betPlacedData);
};

exports.emitPullOutBetToAllByEventId = async (eventId, userId, betId, amount, outcome, currentPrice) => {
    const betPulledOutData = getCopyWithBaseResponseData(
        {
            eventId,
            betId,
            amount:       amount.toString(),
            outcome,
            currentPrice: currentPrice.toString(),
        },
        userId,
    );

    await handleBetMessage(eventId, 'betPulledOut', betPulledOutData);
};

exports.emitBetCreatedByEventId = async (eventId, userId, betId, title) => {
    const betCreationData = getCopyWithBaseResponseData(
        {
            eventId,
            betId,
            title,
        },
        userId,
    );

    await handleBetMessage(eventId, 'betCreated', betCreationData);
};

const handleBetMessage = async (eventId, emitEventName, data) => {
  await persist(data);
  emitToAllByEventId(eventId, emitEventName, data);
};

const emitToAllByEventId = (eventId, emitEventName, data) => {
    console.debug(LOG_TAG, 'emitting event "' + emitEventName + '" to all in event room ' + eventId);
    //io.of('/').to(eventId.toString()).emit(emitEventName, data);
    pubClient.publish('message', JSON.stringify({to: eventId.toString(), event: emitEventName, data: {date: new Date(), ...data}}));
};

exports.emitToAllByEventId = emitToAllByEventId;

const notificationTypes = {
  EVENT_START: 'Notification/EVENT_START',
  EVENT_RESOLVE: 'Notification/EVENT_RESOLVE',
  EVENT_CANCEL: 'Notification/EVENT_CANCEL',
}

const emitEventStartNotification = (userId, eventId, eventName) => {
  const message = `The event ${eventName} begins in 60s. Place your token.`;
  emitToAllByUserId(userId, 'notification', { type: notificationTypes.EVENT_START, eventId, message });
}
exports.emitEventStartNotification = emitEventStartNotification;

const emitBetResolveNotification = (userId, betId, betQuestion, betOutcome, winToken) => {
  const message = `The bet ${betQuestion} was resolved. The outcome is ${betOutcome}. You ${winToken > 0 ? "won" : "lost"} ${Math.abs(winToken)}.`;
  emitToAllByUserId(userId, 'notification', { type: notificationTypes.EVENT_RESOLVE, betId, message });
}
exports.emitBetResolveNotification = emitBetResolveNotification;

const emitEventCancelNotification = (userId, eventId, eventName, cancellationDescription) => {
  const message = `The event ${eventName} was cancelled due to ${cancellationDescription}.`;
  emitToAllByUserId(userId, 'notification', { type: notificationTypes.EVENT_CANCEL, eventId, message });
}
exports.emitEventCancelNotification = emitEventCancelNotification;

const emitToAllByUserId = (userId, emitEventName, data) => {
  console.debug(LOG_TAG, 'emitting event "' + emitEventName + '" to all in user room ' + userId);
    io.of('/').to(userId.toString()).emit(emitEventName, {date: new Date(), ...data});
    pubClient.publish('message', JSON.stringify({to: userId.toString(), event: emitEventName, data: {date: new Date(), ...data}}));
};

function getCopyWithBaseResponseData (targetData, userId, date = new Date()) {
    return {
        ...targetData,
        userId,
        date,
    };
}