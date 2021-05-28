// Import express
const express = require("express");

//Import http
const http = require("http");

//Import ws
const Websocket = require("ws");

// Import User Service
const userService = require("../services/user-service");

// Import JWT for authentication process
const jwt = require("jsonwebtoken");

const server = http.createServer(express());

const eventRooms = {};

//initialize the WebSocket server instance
const wss = new Websocket.Server({
    verifyClient: async (info, done) => {
        console.log('------verify client------');

        const token = info.req.url.split('/')[1];
        try {
            let decoded = jwt.verify(token, process.env.JWT_KEY);

            info.req.user = await userService.getUserById(decoded.userId);

            done(info.req);
        } catch (err) {
            console.log('------verify client failed ------');
            return false;
        }
    },
    server
});

wss.on('connection', function connection(ws, req) {
    const token = req.url.split('/')[1];
    const user = jwt.verify(token, process.env.JWT_KEY).userId;
    ws.on('message', function incoming(data) {
        try {
            let obj = JSON.parse(data);
            obj.userId = user;
            obj.date = new Date();
            if(obj.event !== undefined && obj.event === "joinRoom") {
                if(eventRooms[obj.eventId] === undefined) {
                    eventRooms[obj.eventId] = [];
                }
                eventRooms[obj.eventId].push(ws);

                eventRooms[obj.eventId].forEach(function each(client) {
                    if (client !== ws && client.readyState === Websocket.OPEN) {
                        client.send(data);
                    }
                });
            }

            if(obj.event !== undefined && obj.event === "chat" &&
                obj.eventId !== undefined) {
                eventRooms[obj.eventId].forEach(function each(client) {
                    if (client.readyState === Websocket.OPEN) {
                        client.send(data);
                    }
                });
            }

        } catch (err) {
            console.error(err);
            console.log('failed to handle message ' + data);
        }

    })
})

exports.sendMessageToEvent = (eventId, message) => {
    eventRooms[eventId].forEach(function each(client) {
        if (client.readyState === Websocket.OPEN) {
            client.send(message);
        }
    });
}

exports.startServer = () => {
    //start our server
    server.listen( 8999, () => {
        console.log(`Socket server started on port ${server.address().port} :)`);
    });
}