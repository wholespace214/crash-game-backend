BEGIN;
ALTER TABLE promo_code
ADD COLUMN description character varying;
COMMIT;