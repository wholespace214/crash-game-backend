const websocketService = require('../services/websocket-service');
const chatMessageService = require('../services/chat-message-service');
const eventService = require('../services/event-service');
const _ = require('lodash');

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
  // console.log('sending a test message');

  // // SEND OASIS EVENT RESOLVED
  // setTimeout(async () => {
  //   const event = await eventService.getEvent('61792b2bc986908179b4e4b5');
  //   event.bookmarks.map(async (u) => {
  //     await websocketService.emitBetResolveNotification(u, event, event.bets[0], 0, 100);
  //   });
  // }, 2000);

  // // SEND ELON EVENT RESOLVED
  // setTimeout(async () => {
  //   const event = await eventService.getEvent('617950d40a97aa8c14679fd0');
  //   event.bookmarks.map(async (u) => {
  //     await websocketService.emitBetResolveNotification(u, event, event.bets[0], 0, 0);
  //   });
  // }, 4500);

  // // SEND UEFA CANCELLED
  // setTimeout(async () => {
  //   const event = await eventService.getEvent('61797d87fce07aa1dfc00b5c');
  //   event.bookmarks.map(async (u) => {
  //     await websocketService.emitEventCancelNotification(u, event, event.bets[0]);
  //   });
  // }, 18000);

  return res.status(200).send({});
};
