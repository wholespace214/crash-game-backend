const Agenda = require("agenda");
const agenda = new Agenda({ db: { address: process.env.DB_CONNECTION, collection: `INFO_CHANNEL_jobs` } });

module.exports = {
  agenda
}
