BEGIN;
CREATE TABLE IF NOT EXISTS casino_matches (ID SERIAL PRIMARY KEY, gameId varchar(255) NOT NULL, gameHash varchar(255), crashFactor decimal NOT NULL, gameLengthInSeconds INT, amountInvestedSum bigint, amountRewardedSum bigint, numTrades INT, numcashouts INT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);

ALTER TABLE casino_trades ADD COLUMN game_match int;
ALTER TABLE casino_trades ADD CONSTRAINT fk_game_match FOREIGN KEY (game_match) REFERENCES casino_matches(ID);
ALTER TABLE casino_trades RENAME COLUMN gameId to gameHash;

COMMIT;

db.agendaJobs.updateMany({}, {$rename: {"data.gameId": "data.gameHash"}})