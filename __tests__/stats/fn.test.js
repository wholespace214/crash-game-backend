const { expect } = require('chai');
const mongoose = require("mongoose");
const wallfair = require('@wallfair.io/wallfair-commons');

const dotenv = require('dotenv');
dotenv.config();

let mongoURL = process.env.DB_CONNECTION;

describe.skip('testing some statistics methods', () => {
  before(async () => {
    const connection = await mongoose.connect(mongoURL, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
      useFindAndModify: false,
      useCreateIndex: true,
      readPreference: 'primary',
      retryWrites: true,
    });

    wallfair.initModels(connection);
  })

  after(async () => {
    await mongoose.disconnect();
  });

  it('should get casino play game count per user', async () => {
    const {getCasinoGamePlayCount} = require('../../services/statistics-service')
    const data = await getCasinoGamePlayCount('616405198fca018cd9e233bf');
    console.log("data", data);
    // expect(data).to.be.equal(9)
  })

  it('should get casino cashed-out value per user', async () => {
    const {getCasinoGameCashoutCount} = require('../../services/statistics-service')
    const data = await getCasinoGameCashoutCount('616405198fca018cd9e233bf', '6166ec17b4c87de60914e143');

    console.log("data", data);
    expect(data).to.be.equal(1)
  })

  it('should get casino total amount won per user', async () => {
    const {getCasinoGamesAmountWon} = require('../../services/statistics-service')
    const data = await getCasinoGamesAmountWon('616405198fca018cd9e233bf', '6166ec17b4c87de60914e143');

    console.log("data", data);
    // expect(data).to.deep.equal({ totalReward: 121, totalStaked: 100, totalWon: 21 })
  })

  it('should get casino total lost per user', async () => {
    const {getCasinoGamesAmountLost} = require('../../services/statistics-service')
    const data = await getCasinoGamesAmountLost('61682500817fa7f30fb70ca9', '614381d74f78686665a5bb76');

    console.log("data", data);
    // expect(data).to.deep.equal({ totalReward: 121, totalStaked: 100, totalWon: 21 })
  })

  it('should get total bets per user', async () => {
    const {getUserBetsAmount} = require('../../services/statistics-service')
    const data = await getUserBetsAmount('616708bfc750391a69c974ba');

    console.log("data", data);
    // expect(data).to.deep.equal({
    //   totalBettedAmount: 7090,
    //   totalBets: 37,
    //   totalOutcomeAmount: 13895.8514
    // })
  })


  it('should get total bets cashouts per user', async () => {
    const {getUserBetsCashouts} = require('../../services/statistics-service')
    const data = await getUserBetsCashouts('616708bfc750391a69c974ba');

    console.log("data", data);
    // expect(data).to.deep.equal({
    //   totalBettedAmount: 7090,
    //   totalBets: 37,
    //   totalOutcomeAmount: 13895.8514
    // })
  })

  it('should get total bets rewards per user', async () => {
    const {getUserBetsRewards} = require('../../services/statistics-service')
    const data = await getUserBetsRewards('616708bfc750391a69c974ba');

    console.log("data", data);
    // expect(data).to.deep.equal({
    //   totalBettedAmount: 7090,
    //   totalBets: 37,
    //   totalOutcomeAmount: 13895.8514
    // })
  })


})
