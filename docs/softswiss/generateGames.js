const SoftswissGames = [
  ...require('./games/bgaming.json')
] ;
const path = require('path') ;
const fs = require('fs');

const crypto = require('crypto')

const gameIdFromString = (gamename) => {
  return crypto.createHash('sha1').update(String(gamename)).digest('hex');
}

const generateGamesInserts = () => {
  const filePath = path.join(__dirname, 'softswissBgamingGames.sql');

  if(fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  const fileStream = fs.createWriteStream(filePath, {
    flags: 'a' // 'a' means appending (old data will be preserved)
  });
  fileStream.write(`BEGIN;`);
  fileStream.write('\n');

  for (let key in SoftswissGames) {
    const gameInfo = SoftswissGames[key];
    const gameProvider = `${gameInfo.provider}/${gameInfo.producer}`;
    const catSubType = gameInfo.category;
    const label = gameInfo.title;
    const name = gameInfo.identifier;
    const gameId = gameIdFromString(name);

    fileStream.write(`INSERT INTO games (id, name, label, provider, enabled, category) VALUES ($$${gameId}$$, $$${name}$$, $$${label}$$, $$${gameProvider}$$, true, $$${catSubType}$$);`)
    fileStream.write('\n')
  }

  fileStream.write(`COMMIT;;`);
  fileStream.write('\n');
}

generateGamesInserts();

// const game1 = objectIdByName('softswiss:WildTexas');
// const game2 = objectIdByName('softswiss:WestTown');
// const game3 = objectIdByName('softswiss:WbcRingOfRiches');

// console.log({
//   game1, game2, game3
// });
//
// // console.log(mongoose.Types.ObjectId('test'));
// // console.log(mongoose.Types.ObjectId('test2'));
//
// console.log(game1 === game2);

