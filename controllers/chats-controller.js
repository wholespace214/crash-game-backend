const dotenv = require('dotenv');
dotenv.config();

const { validationResult } = require('express-validator');
const chatMessageService = require('../services/chat-message-service');
const { ErrorHandler } = require('../util/error-handler');

exports.getChatMessagesByRoom = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(422, 'Invalid input passed, please check it'));
  }

  res.status(200).json(await chatMessageService.getLatestChatMessagesByRoom(req.params.roomId));
};
