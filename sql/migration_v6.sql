BEGIN;
ALTER TABLE casino_matches ADD COLUMN game_payload json;
COMMIT;
