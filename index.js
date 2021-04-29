// Import and configure dotenv to enable use of environmental variable
const dotenv = require("dotenv");
dotenv.config();

// Import express
const express = require("express");

// Import mongoose to connect to Database
const mongoose = require("mongoose");

// Initialise server using express
const server = express();

// Giving server ability to parse json
server.use(express.json());

// Home Route
server.get("/", (req, res) => {
  res
    .status(200)
    .send({
      message: "Blockchain meets Prediction Markets made Simple. - Wallfair.",
    });
});

// Import Routes
const userRoute = require("./routes/users/users-routes");

// Using Routes
server.use("/api/user", userRoute);

// Connection to Database
mongoose
  .connect(process.env.DB_CONNECTION, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
  .then(async () => console.log("Connection to DB successfull"))
  .catch((err) => console.log(err.message));

// Let server run and listen
var app = server.listen(process.env.PORT || 8000, function () {
  var port = app.address().port;
  console.log(`API runs on port: ${port}`);
});
