const router = require('express').Router();
const { check } = require('express-validator');
const chatsController = require('../../controllers/chats-controller');
const { validateRequest } = require('../../util/request-validator');

router.get(
  '/chat-messages/:roomId',
  [check('roomId').notEmpty(), check('roomId').isMongoId()],
  validateRequest(chatsController.getChatMessagesByRoom)
);

module.exports = router;
