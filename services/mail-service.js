const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

const fs = require('fs');

const email_confirm = fs.readFileSync('./emails/email-confirm.html', 'utf8');
const email_evaluate = fs.readFileSync('./emails/email-evaluate.html', 'utf8');

const transporter = nodemailer.createTransport(
  smtpTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    auth: {
      user: process.env.GMAIL_USERNAME,
      pass: process.env.GMAIL_PASSWORD,
    },
  })
);

exports.sendConfirmMail = async (user) => {
  const emailCode = this.generate(6);
  const queryString = `?userId=${user.id}&code=${emailCode}`;
  const generatedTemplate = email_confirm
    .replace('{{query_string}}', queryString)
    .replace('{{verify_url}}', process.env.VERIFY_URL);

  await this.sendMail(user.email, 'Please confirm your email!', generatedTemplate);

  user.emailCode = emailCode;
  await user.save();
};

exports.sendEventEvaluateMail = async (payload) => {
  const ratings = {
    0: 'Excellent',
    1: 'Good',
    2: 'Lame',
    3: 'Unethical',
  };
  const { bet_question } = payload;
  const rating = ratings[payload.rating];
  const { comment } = payload;
  const generatedTemplate = email_evaluate
    .replace('{{bet_question}}', bet_question)
    .replace('{{rating}}', rating)
    .replace('{{comment}}', comment);

  await this.sendMail('feedback@wallfair.io', 'Event Evaluate Feedback', generatedTemplate);
};

exports.generate = (n) => {
  const add = 1;
  let max = 12 - add;

  if (n > max) {
    return generate(max) + generate(n - max);
  }

  max = Math.pow(10, n + add);
  const min = max / 10;
  const number = Math.floor(Math.random() * (max - min + 1)) + min;

  return `${number}`.substring(add);
};

exports.sendMail = async (email, subject, template) => {
  try {
    const info = await transporter.sendMail({
      from: '"WALLFAIR" noreply@wallfair.io',
      to: email,
      subject,
      html: template,
    });

    console.log('email sent: %s', info.messageId);
  } catch (err) {
    console.log(err);
    console.log('email sent failed to: %s', email);
  }
};
