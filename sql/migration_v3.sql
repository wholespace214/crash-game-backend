BEGIN;
CREATE TABLE IF NOT EXISTS casino_trades (ID SERIAL PRIMARY KEY, userId varchar(255) NOT NULL, crashFactor decimal NOT NULL, stakedAmount bigint NOT NULL, state smallint NOT NULL, gameHash varchar(255), gameId varchar(255), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, game_match int, CONSTRAINT fk_game_match FOREIGN KEY (game_match) REFERENCES casino_matches(ID));
ALTER TABLE casino_trades ADD COLUMN gameId varchar(255);

COMMIT;
