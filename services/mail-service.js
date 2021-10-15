const sendGridMail = require('@sendgrid/mail');
sendGridMail.setApiKey(process.env.SENDGRID_API_KEY);

const fs = require('fs');
const { generate } = require('../helper');

const email_confirm = fs.readFileSync('./emails/email-confirm.html', 'utf8');
const email_reset_password = fs.readFileSync('./emails/email-reset-password.html', 'utf8');

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

const sendMail = async (email, subject, template) => {
  try {
    const info = {
      to: email,
      from: 'no-reply@wallfair.io',
      subject: subject,
      html: template,
    };

    await sendGridMail.send(info);
    console.info('email sent successfully to: %s', email);
  } catch (err) {
    console.log(err);
    console.log('email sent failed to: %s', email);
  }
};