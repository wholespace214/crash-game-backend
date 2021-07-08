const ChatMessageService = require('./chat-message-service');

const LOG_TAG = '[SOCKET] ';
let io        = null;

const persist = async (data) => {
  const chatMessage = await ChatMessageService.createChatMessage(data)
  await ChatMessageService.saveChatMessage(chatMessage)
}

exports.setIO = (newIo) => io = newIo;

exports.handleChatMessage = async function (socket, data, userId) {
    try {
        const responseData = getCopyWithBaseResponseData(data, userId);
        const eventId      = data.eventId;
        const message      = data.message;

        console.debug(LOG_TAG, 'user ' + userId + ' sends message "' + message + '"');

        await persist(data)

        emitToAllByEventId(eventId, 'chatMessage', responseData);
    } catch (error) {
        console.error(error);
        console.log(LOG_TAG, 'failed to handle message', data);
    }
};

exports.handleJoinRoom = async function (socket, data) {

    try {
        const eventId = data.eventId;

        if (eventId) {
            socket.join(eventId);
        } else {
            console.debug(LOG_TAG, 'no event id in handle join data', data);
        }
    } catch (error) {
        console.error(error);
        console.log(LOG_TAG, 'failed to handle join room', data);
    }
};

exports.handleLeaveRoom = async function (socket, data) {
    console.info('------------------------------------------ leave room')
    try {
        const eventId = data.eventId;

        if (eventId) {
            socket.leave(eventId);

        } else {
            console.debug(LOG_TAG, 'no event id in handle leave data', data);
        }
    } catch (error) {
        console.error(error);
        console.log(LOG_TAG, 'failed to handle leave room', data);
    }
};

exports.emitPlaceBetToAllByEventId = (eventId, userId, betId, amount, outcome) => {
    const betPlacedData = getCopyWithBaseResponseData(
        {
            eventId,
            betId,
            amount,
            outcome,
        },
        userId,
    );

    emitToAllByEventId(eventId, 'betPlaced', betPlacedData);
};

exports.emitPullOutBetToAllByEventId = (eventId, userId, betId, amount, outcome, currentPrice) => {
    const betPulledOutData = getCopyWithBaseResponseData(
        {
            eventId,
            betId,
            amount,
            outcome,
            currentPrice,
        },
        userId,
    );

    emitToAllByEventId(eventId, 'betPulledOut', betPulledOutData);
};

exports.emitBetCreatedByEventId = (eventId, userId, betId, title) => {
    const betCreationData = getCopyWithBaseResponseData(
        {
            eventId,
            betId,
            title,
        },
        userId,
    );

    emitToAllByEventId(eventId, 'betCreated', betCreationData);
};

const emitToAllByEventId = (eventId, emitEventName, data) => {
    console.debug(LOG_TAG, 'emitting event "' + emitEventName + '" to all in event room ' + eventId);
    io.to(eventId).emit(emitEventName, data);
};

exports.emitToAllByEventId = emitToAllByEventId;

function getCopyWithBaseResponseData (targetData, userId, date = new Date()) {
    return {
        ...targetData,
        userId,
        date,
    };
}