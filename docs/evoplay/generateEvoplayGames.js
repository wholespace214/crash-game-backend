const evoplayGames = require('./evoplayCfg') ;
const path = require('path') ;
const fs = require('fs')

const objectIdByName = (gamename) => {
  const encoded = new Buffer(gamename).toString('hex').substring(0,23)
  const fill = 24 - encoded.length
  return encoded + ' '.repeat(fill).replace(/./g, (v, i) =>
    ((parseInt(encoded[(i*2)%encoded.length], 16) + parseInt(i*2, 16))%16).toString(16)
  )
}

const generateGamesInserts = () => {
  const filePath = path.join(__dirname, 'evoplayGames.sql');
  const gameProvider  = 'Evoplay';

  if(fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  const fileStream = fs.createWriteStream(filePath, {
    flags: 'a' // 'a' means appending (old data will be preserved)
  });
  fileStream.write(`BEGIN;`);
  fileStream.write('\n');

  for (let key in evoplayGames) {
    const gameInfo = evoplayGames[key];
    const catSubType = gameInfo.game_sub_type;
    const gameId = objectIdByName(key);
    const name = gameInfo.name;

    fileStream.write(`INSERT INTO games (id, name, label, provider, enabled, category) VALUES ($$${gameId}$$, $$${name}$$, $$${name}$$, $$${gameProvider}$$, true, $$${catSubType}$$);`)
    fileStream.write('\n')
  }

  fileStream.write(`COMMIT;;`);
  fileStream.write('\n');
}

generateGamesInserts();
