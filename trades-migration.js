#!/usr/bin/env node

// execute only once, otherwise will create duplicate trades
require('dotenv').config();
const { Client } = require('pg');
const mongoose = require('mongoose');
const wallfair = require('@wallfair.io/wallfair-commons');
const bigDecimal = require('js-big-decimal');
const fs = require("fs")

const pgClient = new Client({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  port: process.env.POSTGRES_PORT,
  ssl:
        process.env.POSTGRES_DISABLE_SSL === 'true'
          ? false
          : {
            rejectUnauthorized: false,
            ca: fs.readFileSync(process.env.POSTGRES_CA).toString(),
          },
});

async function selectInteractions() {
  const query = 'SELECT * FROM amm_interactions';

  try {
    await pgClient.connect();
    const res = await pgClient.query(query);
    return res.rows;
  } catch (e) {
    console.error(e);
  } finally {
    pgClient.end();
  }
}

async function selectUsers() {
  const mongoClient = await mongoose
    .connect(process.env.DB_CONNECTION, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    })
    .catch((e) => console.log(e));

  wallfair.initModels(mongoClient);

  const users = await wallfair.models.User.find({});
  return users;
}

async function run() {
  const amm = await selectInteractions();
  const users = await selectUsers();
  const trades = [];

  users.forEach((user) => {
    user.openBets.forEach((bet) => {
      const interactions = amm.filter((am) => am.bet === bet && am.buyer === user._id.toString());

      interactions.forEach((interaction) => {
        if (interaction.direction !== 'BUY') return;
        const bigInvestment = new bigDecimal(+interaction.investmentamount);
        const investment = parseFloat(bigInvestment.getPrettyValue(4, '.'));

        const bigOutcome = new bigDecimal(+interaction.outcometokensbought);
        const outcomeTokens = parseFloat(bigOutcome.getPrettyValue(4, '.'));

        const tmp = new wallfair.models.Trade({
          userId: mongoose.Types.ObjectId(interaction.buyer),
          betId: mongoose.Types.ObjectId(interaction.bet),
          outcomeIndex: interaction.outcome,
          investmentAmount: investment,
          outcomeTokens,
          status: 'active',
        });

        trades.push(tmp);
      });
    });

    user.closedBets
      .filter(
        (v, i, a) => a.findIndex((t) => t.betId === v.betId && t.outcome === v.outcome) === i,
      )
      .forEach((bet) => {
        const interactions = amm.filter((am) => am.bet === bet.betId.toString() && am.buyer === user._id.toString());

        interactions.forEach((interaction) => {
          if (interaction.direction === 'PAYOUT') return;
          const bigInvestment = new bigDecimal(+interaction.investmentamount);
          const investment = parseFloat(bigInvestment.getPrettyValue(4, '.'));

          const bigOutcome = new bigDecimal(+interaction.outcometokensbought);
          const outcomeTokens = parseFloat(bigOutcome.getPrettyValue(4, '.'));

          const tmp = new wallfair.models.Trade({
            userId: mongoose.Types.ObjectId(interaction.buyer),
            betId: mongoose.Types.ObjectId(interaction.bet),
            outcomeIndex: interaction.outcome,
            investmentAmount: investment,
            outcomeTokens,
            status:
                            interaction.direction === 'SELL'
                              ? 'sold'
                              : bet.earnedTokens > 0
                                ? 'rewarded'
                                : 'closed',
          });

          trades.push(tmp);
        });
      });
  });

  wallfair.models.Trade.insertMany(trades)
    .catch((e) => {
      console.log(e);
    })
    .finally(() => {
      console.log(`${trades.length} trades imported succesfully!`);
      mongoose.connection.close();
    });
}

run();
