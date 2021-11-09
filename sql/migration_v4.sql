BEGIN;
ALTER TABLE casino_trades ADD COLUMN riskFactor decimal;
COMMIT;
