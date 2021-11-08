BEGIN;
ALTER TABLE casino_trades ADD COLUMN gameId varchar(255);
UPDATE casino_trades SET gameId = '614381d74f78686665a5bb76' WHERE gameId IS NULL;
COMMIT;
