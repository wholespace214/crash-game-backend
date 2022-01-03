BEGIN;

ALTER TABLE casino_external_trades ADD COLUMN processed BOOLEAN DEFAULT TRUE;
ALTER TABLE casino_external_trades ADD COLUMN roundId varchar(255) DEFAULT NULL;
ALTER TABLE casino_evoplay_trades ADD COLUMN roundId varchar(255) DEFAULT NULL;

COMMIT;
