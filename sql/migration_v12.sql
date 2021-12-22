BEGIN;

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

COMMIT;