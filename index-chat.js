//Import websocket service
const websocketService = require("./services/websocket-service");

// Import mongoose to connect to Database
const mongoose = require("mongoose");

// Connection to Database
mongoose
    .connect(process.env.DB_CONNECTION, {
        useUnifiedTopology: true,
        useNewUrlParser: true,
    })
    .then(async () => console.log("Connection to DB successfull"))
    .catch((err) => console.log(err.message));

websocketService.startServer();