// Import and configure dotenv to enable use of environmental variable
const dotenv = require("dotenv");
dotenv.config();

// Import express
const express = require("express");
const http = require('http');

// Import mongoose to connect to Database
const mongoose = require("mongoose");

const websocketService = require("./services/websocket-service");

//Import cors
const cors = require('cors')

// Import middleware for jwt verification
const passport = require("passport");
require("./util/auth");

// Initialise server using express
const server = express();
const httpServer = http.createServer(server)
;
const socketioJwt = require('socketio-jwt');
const { Server } = require("socket.io");
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["*"],
        credentials: true
    }
});

// Giving server ability to parse json
server.use(express.json());
server.use(passport.initialize());
server.use(passport.session());

// Home Route
server.get("/", (req, res) => {
  res.status(200).send({
    message: "Blockchain meets Prediction Markets made Simple. - Wallfair.",
  });
});

// Import Routes
const userRoute = require("./routes/users/users-routes");
const eventRoute = require("./routes/users/events-routes");
const secureUserRoute = require("./routes/users/secure-users-routes");

server.use(cors());

// Using Routes
server.use("/api/user", userRoute);
server.use("/api/event", passport.authenticate('jwt',{session: false}), eventRoute);
server.use("/api/user", passport.authenticate('jwt',{session: false}), secureUserRoute);


// Connection to Database
mongoose
  .connect(process.env.DB_CONNECTION, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
  .then(async () => console.log("Connection to DB successfull"))
  .catch((err) => console.log(err.message));

io.use(socketioJwt.authorize({
    secret: process.env.JWT_KEY,
    handshake: true,
    auth_header_required: true
}));

io.on('connection', (socket) => {
    let user = socket.decoded_token.userId;
    socket.on('message', (msg) => {
        websocketService.handleChatMessage(io, socket, msg, user);
    });
});


// Let server run and listen
var appServer = httpServer.listen(process.env.PORT || 8000, function () {
  var port = appServer.address().port;
  console.log(`API runs on port: ${port}`);
});

