const chatMessageService = require('../services/chat-message-service');

exports.getChatMessagesByRoom = async (req, res) => {
  const skip = req.query.skip ? +req.query.skip : 0;
  const limit = req.query.limit ? +req.query.limit : 20;

  const messages = await chatMessageService.getLatestChatMessagesByRoom(
    req.params.roomId,
    limit,
    skip
  );

  res.status(200).json({
    messages: messages?.data || [],
    total: messages?.total || 0,
  });
};
