//process rabbitMQ games queue
const wallfair = require("@wallfair.io/wallfair-commons");
const {BN} = require("@wallfair.io/trading-engine");
const { notificationEvents } = require('@wallfair.io/wallfair-commons/constants/eventTypes');
const {sendMail} = require("../services/mail-service");

const processUniversalEvents = async (event, data) => {
  console.log('processUniversalEvents', {event, data});

  if(event === 'event.deposit_created') {
    console.log('onDeposit', data);
    await sendMail('test@fx1.eu', 'Buy With Crypto Form', 'email template test');
  }
}

module.exports = { processUniversalEvents };
