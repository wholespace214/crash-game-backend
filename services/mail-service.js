const sendGridMail = require('@sendgrid/mail');
sendGridMail.setApiKey(process.env.SENDGRID_API_KEY);

const fs = require('fs');
const { generate } = require('../helper');

const email_confirm = fs.readFileSync('./emails/email-confirm.html', 'utf8');
const email_reset_password = fs.readFileSync('./emails/email-reset-password.html', 'utf8');
const email_buy_with_crypto = fs.readFileSync('./emails/buy-with-crypto.html', 'utf8');

exports.sendConfirmMail = async (user) => {
  const emailCode = generate(6);
  const queryString = `?userId=${user._id}&code=${emailCode}`;
  const generatedTemplate = email_confirm
    .replace('{{username}}', user.username)
    .replace('{{query_string}}', queryString)
    .replace('{{verify_url}}', `${process.env.CLIENT_URL}/verify`);

  await sendMail(user.email, 'Thanks for signing up!', generatedTemplate);

  user.emailCode = emailCode;
  await user.save();
};

exports.sendPasswordResetMail = async (email, resetUrl) => {
  const generatedTemplate = email_reset_password
    .replace('{{resetPwUrl}}', resetUrl);

  await sendMail(email, 'Password reset', generatedTemplate);
}

exports.sendBuyWithCryptoEmail = async (data) => {
  const generatedTemplate = email_buy_with_crypto
    .replace('{{currency}}', data.currency)
    .replace('{{wallet}}', data.wallet)
    .replace('{{amount}}', data.amount)
    .replace('{{estimate}}', data.estimate)
    .replace('{{email}}', data.email)

  await sendMail('deposits@alpacasino.io', 'Buy With Crypto Form', generatedTemplate);
}

/***
 *
 * @param email
 * @param subject
 * @param template
 * @param attachments we can target this in email using 'src="cid:imagecid"'
 * example attachments [{
      filename: "image.png",
      content: base64,
      content_id: "imagecid",
   }]
 * @returns {Promise<void>}
 */
const sendMail = async (email, subject, template, attachments = []) => {
  try {
    const info = {
      to: email,
      from: 'no-reply@wallfair.io',
      subject: subject,
      html: template,
      attachments
    };

    await sendGridMail.send(info);
    console.info('email sent successfully to: %s', email);
  } catch (err) {
    console.log(err);
    console.log('email sent failed to: %s', email);
  }
};
