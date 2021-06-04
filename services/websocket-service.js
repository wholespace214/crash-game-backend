const eventRooms = {};

exports.handleChatMessage = function (socket, data, user) {
    try {
        let obj = data;
        obj.userId = user;
        obj.date = new Date();

        if (
            obj.event !== undefined &&
            obj.event === 'joinRoom'
        ) {
            if (eventRooms[obj.eventId] === undefined) {
                eventRooms[obj.eventId] = [];
            }

            eventRooms[obj.eventId].push(socket);

            eventRooms[obj.eventId].forEach(function each(client) {
                if (client !== socket && io.sockets.sockets[client.id] !== undefined) {
                    //data = JSON.stringify(obj);

                    client.emit('message', data);
                }
            });
        }

        if (
            obj.event !== undefined &&
            obj.event === 'chat' &&
            obj.eventId !== undefined
        ) {
            eventRooms[obj.eventId].forEach(function each(client) {
                if (client.readyState === Websocket.OPEN) {
                    //data = JSON.stringify(obj);

                    client.emit('message', data);
                }
            });
        }

    } catch (err) {
        console.error(err);
        console.log('failed to handle message ' + data);
    }
}

exports.sendMessageToEvent = (io, eventId, data) => {
    eventRooms[eventId].forEach(function each (client) {
        if (io.sockets.sockets[client.id] !== undefined) {
            client.emit('message', data);
        }
    });
};