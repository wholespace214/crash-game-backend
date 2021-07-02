const ChatMessageService = require('./chat-message-service');

const LOG_TAG = '[SOCKET] ';
let io        = null;

//const memoryDB = {};

const persist = async (data) => {
  //memoryDB[data.eventId] = memoryDB[data.eventId] || [];
  //memoryDB[data.eventId].push(data);

  const chatMessage = await ChatMessageService.createChatMessage(data)
  await ChatMessageService.saveChatMessage(chatMessage)
}

const sendAllMessagesFor = async (eventId, userId) => {
  //const array = memoryDB[eventId]
  const array = await ChatMessageService.getChatMessagesByEvent(eventId)
  for(const message of array || []) {
    io.emit('chatMessageUser' + userId, message)
  }
};

exports.setIO = (newIo) => io = newIo;

exports.handleChatMessage = async function (socket, data, userId) {
    try {
        const responseData = getCopyWithBaseResponseData(data, userId);
        const eventId      = data.eventId;
        const message      = data.message;

        console.debug(LOG_TAG, 'user ' + userId + ' sends message "' + message + '"');

        await persist(data)

        emitToAllByEventId(eventId, 'chatMessageEvent' + eventId, responseData);
    } catch (error) {
        console.error(error);
        console.log(LOG_TAG, 'failed to handle message', data);
    }
};

exports.handleJoinRoom = async function (socket, data, userId) {
    try {
        const eventId = data.eventId;
        const userId = data.userId;

        if (eventId && userId) {
            socket.join(eventId);
            socket.join(userId);

            await sendAllMessagesFor(eventId, userId);
        } else {
            console.debug(LOG_TAG, 'no event or user id in handle join data', data);
        }
    } catch (error) {
        console.error(error);
        console.log(LOG_TAG, 'failed to handle join room', data);
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
    io.emit(emitEventName, data);
};

exports.emitToAllByEventId = emitToAllByEventId;

function getCopyWithBaseResponseData (targetData, userId, date = new Date()) {
    return {
        ...targetData,
        userId,
        date,
    };
}