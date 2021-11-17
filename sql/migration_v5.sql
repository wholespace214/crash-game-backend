BEGIN;
ALTER TABLE casino_matches ADD COLUMN currentHashLine int;
COMMIT;
