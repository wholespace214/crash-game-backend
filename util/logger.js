/* eslint-disable no-console */
module.exports = {
  /** logs won't be displayed on NODE_ENV production */
  info(message, ...args) {
    if (process.env.NODE_ENV === 'STAGING') console.log('INFO', message, args);
  },
  /** Method to log errors */
  error(message, ...args) {
    console.error('ERROR', message, args);
  },
  /** These logs will always be logged */
  always(message, ...args) {
    console.log('ALAWYS', message, args);
  },
};
