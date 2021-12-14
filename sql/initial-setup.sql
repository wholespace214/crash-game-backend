BEGIN;
CREATE TABLE IF NOT EXISTS token_transactions (ID SERIAL PRIMARY KEY, sender varchar(255) not null, receiver varchar(255) not null, amount bigint not null, symbol varchar(255) not null, trx_timestamp timestamp not null);
CREATE TABLE IF NOT EXISTS token_balances (owner varchar(255) not null, balance bigint not null, symbol varchar(255) not null, last_update timestamp not null, PRIMARY KEY(owner, symbol));
CREATE TABLE IF NOT EXISTS bet_reports (bet_id varchar(255) not null PRIMARY KEY, reporter varchar(255) not null, outcome smallint not null, report_timestamp timestamp not null);
CREATE TABLE IF NOT EXISTS amm_interactions (ID SERIAL PRIMARY KEY, buyer varchar(255) NOT NULL, bet varchar(255) NOT NULL, outcome smallint NOT NULL, direction varchar(10) NOT NULL, investmentAmount numeric NOT NULL, feeAmount numeric NOT NULL, outcomeTokensBought numeric NOT NULL, trx_timestamp timestamp NOT NULL);
CREATE TABLE IF NOT EXISTS casino_matches (ID SERIAL PRIMARY KEY, gameId varchar(255) NOT NULL, gameHash varchar(255), currentHashLine INT, crashFactor decimal NOT NULL, gameLengthInSeconds INT, amountInvestedSum numeric, amountRewardedSum numeric, numTrades INT, numcashouts INT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, game_payload json);
CREATE TABLE IF NOT EXISTS casino_trades (ID SERIAL PRIMARY KEY, userId varchar(255) NOT NULL, crashFactor decimal NOT NULL, riskFactor decimal, stakedAmount numeric NOT NULL, state smallint NOT NULL, gameHash varchar(255), gameId varchar(255), fairnessId int, fairnessNonce int, amountPaid numeric, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE, game_match int, CONSTRAINT fk_game_match FOREIGN KEY (game_match) REFERENCES casino_matches(ID));
CREATE TABLE IF NOT EXISTS casino_fairness (ID SERIAL PRIMARY KEY, userId varchar(255) NOT NULL, gameId varchar(255), serverSeed varchar(255), nextServerSeed varchar(255), clientSeed varchar(255), nonce INT, currentHashLine INT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX buyer_idx ON amm_interactions (buyer);
CREATE INDEX bet_idx ON amm_interactions (bet);
CREATE INDEX owner_idx ON token_balances (owner);
CREATE INDEX bet_rep_idx ON bet_reports (bet_id);
CREATE INDEX sende_receiver_idx ON token_transactions (sender, receiver);
CREATE TABLE IF NOT EXISTS amm_price_action (betid varchar(255), trx_timestamp timestamp, outcomeIndex integer, quote decimal, PRIMARY KEY(betid, outcomeIndex, trx_timestamp));
CREATE TABLE IF NOT EXISTS ExternalGamesTokens(TokenID uuid UNIQUE, UserId varchar(255) NOT NULL, GameName varchar(255), GameType varchar(255), Provider varchar(255), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);

-- TRIGGERS
-- create triggers for updated_at column for all records when using UPDATE query
CREATE FUNCTION ct_updated_at_trigger() RETURNS trigger
  LANGUAGE plpgsql AS
$$BEGIN
  NEW.updated_at := current_timestamp;
  RETURN NEW;
END;$$;

CREATE TRIGGER ct_updated_at_trigger
  BEFORE INSERT OR UPDATE ON casino_trades
  FOR EACH ROW
EXECUTE PROCEDURE ct_updated_at_trigger();

COMMIT;
