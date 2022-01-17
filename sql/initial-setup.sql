BEGIN;
CREATE TABLE IF NOT EXISTS token_transactions (ID SERIAL PRIMARY KEY, sender varchar(255) not null, receiver varchar(255) not null, amount bigint not null, symbol varchar(255) not null, trx_timestamp timestamp not null);
CREATE TABLE IF NOT EXISTS token_balances (owner varchar(255) not null, balance bigint not null, symbol varchar(255) not null, last_update timestamp not null, PRIMARY KEY(owner, symbol));
CREATE TABLE IF NOT EXISTS bet_reports (bet_id varchar(255) not null PRIMARY KEY, reporter varchar(255) not null, outcome smallint not null, report_timestamp timestamp not null);
CREATE TABLE IF NOT EXISTS amm_interactions (ID SERIAL PRIMARY KEY, buyer varchar(255) NOT NULL, bet varchar(255) NOT NULL, outcome smallint NOT NULL, direction varchar(10) NOT NULL, investmentAmount numeric NOT NULL, feeAmount numeric NOT NULL, outcomeTokensBought numeric NOT NULL, trx_timestamp timestamp NOT NULL);
CREATE TABLE IF NOT EXISTS casino_matches (ID SERIAL PRIMARY KEY, gameId varchar(255) NOT NULL, gameHash varchar(255), currentHashLine INT, crashFactor decimal NOT NULL, gameLengthInSeconds INT, amountInvestedSum numeric, amountRewardedSum numeric, numTrades INT, numcashouts INT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, game_payload json);
CREATE TABLE IF NOT EXISTS casino_trades (ID SERIAL PRIMARY KEY, userId varchar(255) NOT NULL, crashFactor decimal NOT NULL, riskFactor decimal, stakedAmount numeric NOT NULL, state smallint NOT NULL, gameHash varchar(255), gameId varchar(255), fairnessId int, fairnessNonce int, amountPaid numeric, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE, game_match int, CONSTRAINT fk_game_match FOREIGN KEY (game_match) REFERENCES casino_matches(ID), currency VARCHAR(255));
CREATE TABLE IF NOT EXISTS casino_fairness (ID SERIAL PRIMARY KEY, userId varchar(255) NOT NULL, gameId varchar(255), serverSeed varchar(255), nextServerSeed varchar(255), clientSeed varchar(255), nonce INT, currentHashLine INT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX buyer_idx ON amm_interactions (buyer);
CREATE INDEX bet_idx ON amm_interactions (bet);
CREATE INDEX owner_idx ON token_balances (owner);
CREATE INDEX bet_rep_idx ON bet_reports (bet_id);
CREATE INDEX sende_receiver_idx ON token_transactions (sender, receiver);
CREATE TABLE IF NOT EXISTS amm_price_action (betid varchar(255), trx_timestamp timestamp, outcomeIndex integer, quote decimal, PRIMARY KEY(betid, outcomeIndex, trx_timestamp));
CREATE TABLE IF NOT EXISTS ExternalGamesTokens(TokenID uuid UNIQUE, UserId varchar(255) NOT NULL, GameName varchar(255), GameType varchar(255), Provider varchar(255), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS casino_rewards (ID SERIAL PRIMARY KEY, userId varchar(255) NOT NULL, refId varchar(255), tradeId int, gameId varchar(255), type varchar(255), amount NUMERIC, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, UNIQUE (tradeId, type));

CREATE TABLE IF NOT EXISTS casino_external_trades (
	ID SERIAL PRIMARY KEY,
	TransactionId varchar(255) DEFAULT NULL,
	CurrentTransactionId varchar(255) DEFAULT NULL,
	TransactionType varchar(255) DEFAULT NULL,
	UserId varchar(255) DEFAULT NULL,
	Amount numeric DEFAULT NULL,
	CurrencyCode varchar(255) DEFAULT NULL,
	TradeState varchar(255) DEFAULT NULL,
	TransactionInfo JSON DEFAULT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE,
  processed BOOLEAN DEFAULT TRUE,
  roundId varchar(255) DEFAULT NULL);

CREATE TABLE IF NOT EXISTS casino_evoplay_trades (
	ID SERIAL PRIMARY KEY,
	token varchar(255) DEFAULT NULL,
	callback_id varchar(255) DEFAULT NULL,
	refund_callback_id varchar(255) DEFAULT NULL,
	UserId varchar(255) DEFAULT NULL,
	name varchar(255) DEFAULT NULL,
	data JSON DEFAULT NULL,
	processed BOOLEAN DEFAULT TRUE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE,
  roundId varchar(255) DEFAULT NULL);

CREATE TABLE IF NOT EXISTS games (
  id VARCHAR(24) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  label VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  enabled BOOLEAN,
  category VARCHAR(255)
);

INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('618a81ded90fd22298859bc4', 'GAME_ALPACA_WHEEL', 'Alpaca Wheel', 'Alpacasino', true, 'House Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('618a821bd90fd22298859bc5', 'GAME_PLINKO', 'Alpaca Plinko', 'Alpacasino', true, 'House Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('619cc432121e61d6f06338c9', 'GAME_MINES', 'Alpaca Mines', 'Alpacasino', true, 'House Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('61a09b35121e61d6f06338ca', 'GAME_ALPACANNON', 'Alpacannon', 'Alpacasino', true, 'House Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('614381d74f78686665a5bb76', 'CASINO_ROSI', 'Elon Game', 'Alpacasino', true, 'House Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('61817de6a9695acd029ffef3', 'PUMP_DUMP', 'Pump and Dump', 'Alpacasino', true, 'House Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('4a65745848bbc699ae778cf5', 'JetX', 'JetX', 'Smartsoft', true, 'Casino Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('4361707061646f63696148bd', 'Cappadocia', 'Cappadocia', 'Smartsoft', true, 'Casino Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('42616c6c6f6f6e48ace688ce', 'Balloon', 'Balloon', 'Smartsoft', true, 'Casino Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('5370696e5859acd59acd59ac', 'SpinX', 'SpinX', 'Smartsoft', true, 'Casino Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('4a6574583348bbb48bbb48bb', 'JetX3', 'JetX3', 'Smartsoft', true, 'Casino Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('56696b696e6758ace67ace68', 'Viking', 'Viking', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('417a74656349bce49bce49bc', 'Aztec', 'Aztec', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('426972647348bcf48bcf48bc', 'Birds', 'Birds', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('436173696e6f48bce66ade68', 'Casino', 'Casino', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('47616c61787948acf76ace79', 'Galaxy', 'Galaxy', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('43697479536c6f7448bdd68b', 'CitySlot', 'CitySlot', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('436f77626f7948bce76ade69', 'Cowboy', 'Cowboy', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('426f6f6b4f6657696e48acc6', 'BookOfWin', 'BookOfWin', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('4368726973746d617348bcf7', 'Christmas', 'Christmas', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('53706f727459adf59adf59ad', 'Sport', 'Sport', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('446f746148bcc69aae788cf6', 'Dota', 'Dota', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('46756e467275697449aaf78b', 'FunFruit', 'FunFruit', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('50686172616f6858ade689ce', 'Pharaoh', 'Pharaoh', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('446f6e75744369747948adf4', 'DonutCity', 'DonutCity', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('53616d7572616958adf689ce', 'Samurai', 'Samurai', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('466f6f7462616c6c48ade68a', 'Football', 'Football', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('4172676f49acc78aaf688de6', 'Argo', 'Argo', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('5377656574437562657359ac', 'SweetCubes', 'SweetCubes', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('42616e6b48acc68aae688ce6', 'Bank', 'Bank', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('4d6f6f6e53746f6e6548acd7', 'MoonStone', 'MoonStone', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('41706f6c6c6f49ace66bce68', 'Apollo', 'Apollo', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('45766f6c7574696f6e49acf7', 'Evolution', 'Evolution', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('46727569743549bcf36bde75', 'Fruit5', 'Fruit5', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('4672756974313049bcf358df', 'Fruit10', 'Fruit10', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('426c617a696e67486f743434', 'BlazingHot40', 'BlazingHot40', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('4672756974343049bcf358df', 'Fruit40', 'Fruit40', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('4461726b48bcc69aae788cf6', 'Dark', 'Dark', 'Smartsoft', true, 'Slot Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('5669727475616c526f756c65', 'VirtualRoulette', 'VirtualRoulette', 'Smartsoft', true, 'Casino Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('5669727475616c4275726e65', 'VirtualBurningRoulette', 'VirtualBurningRoulette', 'Smartsoft', true, 'Casino Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('426f6e7573526f756c657474', 'BonusRoulette', 'BonusRoulette', 'Smartsoft', true, 'Casino Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('536963426f58aae58aae58aa', 'SicBo', 'SicBo', 'Smartsoft', true, 'Casino Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('5669727475616c436c617375', 'VirtualClassicRoulette', 'VirtualClassicRoulette', 'Smartsoft', true, 'Casino Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('426c61636b6a61636b48ace6', 'Blackjack', 'Blackjack', 'Smartsoft', true, 'Board Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('436c61737369634b656e6f48', 'ClassicKeno', 'ClassicKeno', 'Smartsoft', true, 'Keno Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('5275737369616e4b656e6f59', 'RussianKeno', 'RussianKeno', 'Smartsoft', true, 'Keno Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('5669704b656e6f58bae689cf', 'VipKeno', 'VipKeno', 'Smartsoft', true, 'Keno Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('4c75636b79536576656e49ac', 'LuckySeven', 'LuckySeven', 'Smartsoft', true, 'Casino Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('547269706c65536576656e59', 'TripleSeven', 'TripleSeven', 'Smartsoft', true, 'Casino Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('576865656c4f664c69676875', 'WheelOfLightDeluxe', 'WheelOfLightDeluxe', 'Smartsoft', true, 'Casino Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('53706163654c6f74746f59ac', 'SpaceLotto', 'SpaceLotto', 'Smartsoft', true, 'Casino Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('5a6f64696163536372617465', 'ZodiacScratch', 'ZodiacScratch', 'Smartsoft', true, 'Casino Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('47656d53746f6e657348abf6', 'GemStones', 'GemStones', 'Smartsoft', true, 'Casino Games');
INSERT INTO games (id, name, label, provider, enabled, category) VALUES ('537765657443616e647959ac', 'SweetCandy', 'SweetCandy', 'Smartsoft', true, 'Casino Games');

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
