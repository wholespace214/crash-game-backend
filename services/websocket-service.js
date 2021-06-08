const eventRooms = {};

exports.handleChatMessage = function (io, socket, data, user) {
    try {
        data.userId = user;
        data.date   = new Date();

        if (
            data.event !== undefined &&
            data.event === 'joinRoom'
        ) {
            if (eventRooms[data.eventId] === undefined) {
                eventRooms[data.eventId] = [];
            }

            eventRooms[data.eventId].push(socket);

            eventRooms[data.eventId].forEach(function each (client) {
                if (client !== socket && io.sockets.sockets[client.id] !== undefined) {
                    data = JSON.stringify(data);

                    client.emit('joinRoom', data);
                }
            });
        }

        if (
            data.event !== undefined &&
            data.event === 'chat' &&
            data.eventId !== undefined
        ) {
            eventRooms[data.eventId].forEach(function each (client) {
                client.emit('chatMessage', data);
            });
        }

    } catch (err) {
        console.error(err);
        console.log('failed to handle message ' + data);
    }
};

exports.sendMessageToEvent = (io, eventId, data) => {
    eventRooms[eventId].forEach(function each (client) {
        if (io.sockets.sockets[client.id] !== undefined) {
            client.emit('message', data);
        }
    });
};