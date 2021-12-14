// Import the express Router to create routes
const router = require('express').Router();

// Import controllers
const cmcController = require('../../controllers/cmc-controller');

router.get('/', [], cmcController.getMarketPrice);

module.exports = router;
