const router = require('express').Router();
const { check } = require('express-validator');
const chatsController = require('../../controllers/chats-controller');

router.get(
  '/chat-messages/:roomId',
  [check('roomId').notEmpty()],
  chatsController.getChatMessagesByRoom,
);

module.exports = router;
