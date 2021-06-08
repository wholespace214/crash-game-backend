const LOG_TAG    = '[SOCKET] ';
const eventRooms = {};
let io           = null;

exports.setIO = (newIo) => io = newIo;

exports.handleChatMessage = function (socket, data, userId) {
    try {
        const responseData = getCopyWithBaseResponseData(data, userId);
        const eventId      = data.eventId;
        const message      = data.message;

        console.debug(LOG_TAG, 'user ' + userId + ' sends message "' + message + '"');

        eventRooms[eventId].forEach(
            (client) => client.emit('chatMessage', responseData),
        );
    } catch (error) {
        console.error(error);
        console.log(LOG_TAG, 'failed to handle message', data);
    }
};

exports.handleJoinRoom = function (socket, data, userId) {
    try {
        const responseData = getCopyWithBaseResponseData(data, userId);
        const eventId      = data.eventId;

        if (eventId) {
            if (eventRooms[eventId] === undefined) {
                eventRooms[eventId] = [];
            }

            eventRooms[eventId].push(socket);

            eventRooms[eventId].forEach(
                (client) => {
                    if (
                        client !== socket &&
                        io.sockets.sockets[client.id] !== undefined
                    ) {
                        client.emit('joinRoom', responseData);
                    }
                },
            );
        } else {
            console.debug(LOG_TAG, 'no event id in handle join data', data);
        }
    } catch (error) {
        console.error(error);
        console.log(LOG_TAG, 'failed to handle join room', data);
    }
};

exports.emitPlaceBetToAllByEventId = (eventId, bet) => {
    emitToAllByEventId(eventId, 'betPlaced', bet);
};

const emitToAllByEventId = (eventId, emitEventName, data) => {
    console.debug(LOG_TAG, 'emitting event "' + emitEventName + '" to all in event #' + eventId);

    eventRooms[eventId].forEach(
        (client) => {
            try {
                client.emit(emitEventName, data);
            } catch (error) {
                console.error(error);
                console.log(LOG_TAG, 'failed to emit event "' + emitEventName + '" to client #' + client.id);
            }
        },
    );
};

exports.emitToAllByEventId = emitToAllByEventId;

function getCopyWithBaseResponseData (targetData, userId, date = new Date()) {
    return {
        ...targetData,
        userId,
        date,
    };
}