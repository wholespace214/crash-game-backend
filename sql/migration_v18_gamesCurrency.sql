BEGIN;

ALTER TABLE casino_trades ADD COLUMN games_currency varchar(10) DEFAULT NULL;

COMMIT;
