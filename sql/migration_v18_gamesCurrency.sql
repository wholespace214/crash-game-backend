BEGIN;

ALTER TABLE casino_trades ADD COLUMN gamesCurrency varchar(10) DEFAULT NULL;

COMMIT;
