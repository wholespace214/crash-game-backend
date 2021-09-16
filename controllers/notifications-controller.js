const userService = require("../services/user-service");
const mailService = require("../services/mail-service");
const {notificationTypes} = require("../services/websocket-service");

const notifyNewBet = async (data) => {
  const eventId = data.to
  const users = await userService.getUsersToNotify(eventId, {
    newBetInEvent: true
  })
  console.log(`${data.type}: Send email to multiple users`)
  users.forEach(u => {console.log(u.email)})
}

const notifyEventOnline = async (data) => {
  const eventId = data.to
  const users = await userService.getUsersToNotify(eventId, {
    eventOnline: true
  })
  console.log(`${data.type}: Send email to multiple users`)
  users.forEach(u => {console.log(u.email)})
}

const notifyEventOffline = async (data) => {
  const eventId = data.to
  const users = await userService.getUsersToNotify(eventId, {
    eventOffline: true
  })
  console.log(`${data.type}: Send email to multiple users`)
  users.forEach(u => {console.log(u.email)})
}

const notifyPlaceBet = async (data) => {
  if(!data.to) return;
  const user = userService.getUserById(data.to)

  if(!user) return;
  if(user.notificationSettings.placeBet){
    console.log(`${data.type}: Send email to ${user.email}`)
  }
}

const notifyCashOutBet = async (data) => {
  if(!data.to) return;
  const user = userService.getUserById(data.to)

  if(!user) return;
  if(user.notificationSettings.cashoutBet){
    console.log(`${data.type}: Send email to ${user.email}`)
  }
}

const notifyNewReward = async (data) => {
  if(!data.to) return;
  const user = userService.getUserById(data.to)
  if(!user) return;
  if(user.notificationSettings.newRewardReceived){
    console.log(`${data.type}: Send email to ${user.email}`)
  }
}

const notifyResolve = async (data) => {
  if(!data.to) return;
  const user = userService.getUserById(data.to)
  if(!user) return;
  if(user.notificationSettings.myBetResolved){
    console.log(`${data.type}: Send email to ${user.email}`)
  }
}

const defaultNotification = async (message) => {
  console.log(`This is a notification sent by a fallthrough method`, message)
}

exports[notificationTypes.EVENT_RESOLVE] = notifyResolve;
exports[notificationTypes.EVENT_NEW_BET] = notifyNewBet;
exports[notificationTypes.EVENT_NEW_REWARD] = notifyNewReward;
exports[notificationTypes.EVENT_ONLINE] = notifyEventOnline;
exports[notificationTypes.EVENT_OFFLINE] = notifyEventOffline;
exports[notificationTypes.EVENT_BET_PLACED] = notifyPlaceBet;
exports[notificationTypes.EVENT_BET_CASHED_OUT] = notifyPlaceBet;
exports.defaultNotification = defaultNotification;
