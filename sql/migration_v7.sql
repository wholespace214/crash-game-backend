BEGIN;

ALTER TABLE amm_interactions ALTER COLUMN investmentAmount TYPE numeric;
ALTER TABLE amm_interactions ALTER COLUMN feeAmount TYPE numeric;
ALTER TABLE amm_interactions ALTER COLUMN outcomeTokensBought TYPE numeric;

ALTER TABLE casino_matches ALTER COLUMN amountInvestedSum TYPE numeric;
ALTER TABLE casino_matches ALTER COLUMN amountRewardedSum TYPE numeric;

ALTER TABLE casino_trades ALTER COLUMN stakedAmount TYPE numeric;

-- UPDATE casino_matches SET amountRewardedSum=amountRewardedSum*100000000000000;
-- UPDATE casino_matches SET amountInvestedSum=amountInvestedSum*100000000000000;
-- UPDATE casino_trades SET stakedAmount=stakedAmount*100000000000000;

COMMIT;
