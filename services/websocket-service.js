const LOG_TAG = '[SOCKET] ';
let io        = null;

exports.setIO = (newIo) => io = newIo;

exports.handleChatMessage = function (socket, data, userId) {
    try {
        const responseData = getCopyWithBaseResponseData(data, userId);
        const eventId      = data.eventId;
        const message      = data.message;

        console.debug(LOG_TAG, 'user ' + userId + ' sends message "' + message + '"');

        emitToAllByEventId(eventId, 'chatMessage', responseData);
    } catch (error) {
        console.error(error);
        console.log(LOG_TAG, 'failed to handle message', data);
    }
};

exports.handleJoinRoom = function (socket, data, userId) {
    try {
        const eventId      = data.eventId;

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

exports.emitPlaceBetToAllByEventId = (eventId, userId, betId, investmentAmount, outcome) => {
    const betPlacedData = getCopyWithBaseResponseData(
        {
            eventId,
            betId,
            investmentAmount,
            outcome,
        },
        userId,
    );

    emitToAllByEventId(eventId, 'betPlaced', betPlacedData);
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