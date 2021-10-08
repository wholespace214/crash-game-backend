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

  const skip = req.query.skip ? +req.query.skip : 0;
  const limit = req.query.limit ? +req.query.limit : 20;

  const messages = await chatMessageService.getLatestChatMessagesByRoom(
    req.params.roomId,
    limit,
    skip
  );

  res.status(200)
    .json({
      messages: messages?.data || [],
      total: messages?.total || 0,
    });
};
