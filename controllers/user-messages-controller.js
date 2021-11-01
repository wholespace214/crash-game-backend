const chatMessageService = require('../services/chat-message-service');

exports.getMessagesByUser = async (req, res) => {
  const skip = req.query.skip ? +req.query.skip : 0;
  const limit = req.query.limit ? +req.query.limit : 20;

  const messages = await chatMessageService.getLatestChatMessagesByUserId(
    req.user._id,
    limit,
    skip
  );

  res.status(200).json({
    messages: messages?.data || [],
    total: messages?.total || 0,
  });
};

exports.setMessageRead = async (req, res) => {
  const { id } = req.params;
  const requestingUser = req.user;
  await chatMessageService.setMessageRead(id, requestingUser);
  return res.status(200).send();
};

exports.sendMessage = async (req, res) => {
  return res.status(200).send({});
};
