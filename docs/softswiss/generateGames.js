const SoftswissGames = [
  ...require('./games/bgaming.json')
] ;
const path = require('path') ;
const fs = require('fs')
const mongoose = require('mongoose')

const objectIdByName = (gamename) => {
  const encoded = new Buffer(String(gamename)).toString('hex').substring(0,23)
  const fill = 24 - encoded.length
  return encoded + ' '.repeat(fill).replace(/./g, (v, i) =>
    ((parseInt(encoded[(i*2)%encoded.length], 16) + parseInt(i*2, 16))%16).toString(16)
  )
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
    const gameProvider  = `${gameInfo.provider}/${gameInfo.producer}`;
    const catSubType = gameInfo.category;
    const name = gameInfo.identifier;
    const gameId = objectIdByName(name);

    fileStream.write(`INSERT INTO games (id, name, label, provider, enabled, category) VALUES ($$${gameId}$$, $$${name}$$, $$${name}$$, $$${gameProvider}$$, true, $$${catSubType}$$);`)
    fileStream.write('\n')
  }

  fileStream.write(`COMMIT;;`);
  fileStream.write('\n');
}

// generateGamesInserts();

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

