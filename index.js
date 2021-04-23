// Import and configure dotenv to enable use of environmental variable
const dotenv = require("dotenv");
dotenv.config();

// Import express
const express = require("express");

// Initialise server using express
const server = express();

// Giving server ability to parse json
server.use(express.json());

// Home Route
server.get("/", (req, res) => {
  res
    .status(200)
    .send({ message: "Blockchain meets Betting made Simple. - Wallfair." });
});

// Let server run and listen
var app = server.listen(process.env.PORT || 8000, function () {
  var port = app.address().port;
  console.log(`API runs on port: ${port}`);
});
