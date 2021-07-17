ALTER TABLE token_transactions ALTER COLUMN amount TYPE bigint;
ALTER TABLE token_balances ALTER COLUMN balance TYPE bigint;
ALTER TABLE bet_reports ALTER COLUMN outcome TYPE smallint;

ALTER TABLE amm_interactions ALTER COLUMN outcome TYPE smallint;
ALTER TABLE amm_interactions ALTER COLUMN investmentAmount TYPE bigint;
ALTER TABLE amm_interactions ALTER COLUMN feeAmount TYPE bigint;
ALTER TABLE amm_interactions ALTER COLUMN outcomeTokensBought TYPE bigint;