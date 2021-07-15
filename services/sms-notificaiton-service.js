//Import twilio client
const twilio = require('twilio')(process.env.TWILIO_ACC_SID, process.env.TWILIO_AUTH_TOKEN);

exports.notifyPlacedBet = async (user, bet, amount, outcome) => {
    const message = `Your trade "${bet.marketQuestion}" on ${bet.outcomes[outcome].name} was successfully placed with ${(amount.toString())} EVNT`;
    await this.sendSms(user.phone, message);
}

exports.notifyPullOutBet = async (user, bet, amount, outcome) => {
    const message = `Your trade '${bet.marketQuestion}' on ${bet.outcomes[outcome].name} was successfully sold for ${(amount.toString())} EVNT`;
    await this.sendSms(user.phone, message);
}

exports.notifyBetResolve = async (user, betQuestion, betOutcome, winToken) => {
  const message = `The bet ${betQuestion} was resolved. The outcome is ${betOutcome}. You ${winToken > 0 ? "won" : "lost"} ${Math.abs(winToken)}.`;
  await this.sendSms(user.phone, message);
}


exports.sendSms = async function (phoneNumber, message) {
    twilio.messages
        .create({
            body: message,
            messagingServiceSid: 'MG0b7fc2df0fa33330d73a7d6fb9ea8981',
            to: phoneNumber
        })
        .then(message => console.log(message.sid))
        .catch(err => console.err(err))
        .done();
}