// Import the express Router to create routes
const router = require('express').Router();

// Import controllers
const betTemplateController = require('../../controllers/bet-template-controller');

router.get(
  '/',
  [],
  betTemplateController.getBetTemplates,
);

module.exports = router;
