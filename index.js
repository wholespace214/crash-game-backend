// Import and configure dotenv to enable use of environmental variable
const dotenv = require('dotenv');
dotenv.config();

// Import express
const express = require('express');
const http    = require('http');

//Import admin service
const adminService = require('./services/admin-service');

const { initBetsJobs } = require("./jobs/bets-jobs");

// Import mongoose to connect to Database
const mongoose = require('mongoose');

let mongoURL = process.env.DB_CONNECTION;
if(process.env.ENVIRONMENT === 'STAGING') {
    mongoURL = mongoURL.replace('admin?authSource=admin', 'wallfair?authSource=admin');
    mongoURL += '&replicaSet=wallfair&tls=true&tlsCAFile=/usr/src/app/ssl/staging.crt';
}

// Connection to Database
mongoose
    .connect(mongoURL, {
        useUnifiedTopology: true,
        useNewUrlParser:    true,
    })
    .then(
        async () => console.log('Connection to Mongo-DB successful'),
    )
    .catch(
        (error) => console.log(error),
    ).then(initBetsJobs);

adminService.setMongoose(mongoose);
adminService.initialize();

//Import Socket.io service
const websocketService = require('./services/websocket-service');

//Import cors
const cors = require('cors');

// Import middleware for jwt verification
const passport = require('passport');
require('./util/auth');

// Initialise server using express
const server      = express();
const httpServer  = http.createServer(server);

const socketioJwt = require('socketio-jwt');
const { Server }  = require('socket.io');
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
const io          = new Server(httpServer, {
    cors: {
        origin:         '*',
        methods:        ['GET', 'POST'],
        allowedHeaders: ['*'],
        credentials:    true,
    },
});

const pubClient = createClient(
    {
        url: process.env.REDIS_CONNECTION,
        no_ready_check: true
    });


const subClient = pubClient.duplicate();

pubClient.on_connect = () => console.log('Connection to Redis successful');
pubClient.on_error = (error) => console.log('Error on connection to Redis:', error);

io.adapter(createAdapter(pubClient, subClient));

websocketService.setIO(io);

// Giving server ability to parse json
server.use(express.json());
server.use(passport.initialize());
server.use(passport.session());
adminService.buildRouter();
server.use(adminService.getRootPath(), adminService.getRouter());
server.use(adminService.getLoginPath(), adminService.getRouter());

// Home Route
server.get('/', (req, res) => {
    res.status(200).send({
        message: 'Blockchain meets Prediction Markets made Simple. - Wallfair.',
    });
});

// Import Routes
const userRoute       = require('./routes/users/users-routes');
const eventRoute      = require('./routes/users/events-routes');
const secureUserRoute = require('./routes/users/secure-users-routes');

server.use(cors());

// Using Routes
server.use('/api/user', userRoute);
server.use('/api/event', passport.authenticate('jwt', { session: false }), eventRoute);
server.use('/api/user', passport.authenticate('jwt', { session: false }), secureUserRoute);

io.use(socketioJwt.authorize({
    secret:               process.env.JWT_KEY,
    handshake: true
}));

io.on('connection',  (socket) => {
    const userId = socket.decoded_token.userId;

    socket.on(
        'chatMessage',
        (data) => websocketService.handleChatMessage(socket, data, userId),
    );
    socket.on(
        'joinRoom',
        (data) => websocketService.handleJoinRoom(socket, data, userId),
    );

    socket.on(
        'leaveRoom',
        (data) => websocketService.handleLeaveRoom(socket, data, userId),
    );
});

io.on('error', (err) => {
    console.debug(err);
});

io.of("/").adapter.on("time", (data) => {
    console.log(`message ${data}`);
});
const mainAdapter = io.of("/").adapter;
io.of("/").adapter.on("chatMessage", (data) => {
    console.log(`message ${data}`);
});

io.of("/").adapter.on("create-room", (room) => {
    console.log(`room ${room} was created`);
});

io.of("/").adapter.on("join-room", (room, id) => {
    console.log(`socket ${id} has joined room ${room}`);
});

// Let server run and listen
const appServer = httpServer.listen(process.env.PORT || 8000, function () {
    const port = appServer.address().port;

    console.log(`API runs on port: ${port}`);
});
