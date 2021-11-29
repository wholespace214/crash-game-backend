BEGIN;
CREATE TABLE IF NOT EXISTS casino_fairness (ID SERIAL PRIMARY KEY, userId varchar(255) NOT NULL, gameId varchar(255), serverSeed varchar(255), nextServerSeed varchar(255), clientSeed varchar(255), nonce INT, currentHashLine INT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
ALTER TABLE casino_trades ADD COLUMN fairnessId int;
COMMIT;
