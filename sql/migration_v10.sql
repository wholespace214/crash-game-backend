BEGIN;
ALTER TABLE casino_trades ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;
-- SET updated_at as created_at initially
UPDATE casino_trades SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE casino_trades ADD COLUMN amountPaid numeric;

-- create triggers for updated_at column for all records when using UPDATE query
CREATE FUNCTION ct_updated_at_trigger() RETURNS trigger
  LANGUAGE plpgsql AS
$$BEGIN
  NEW.updated_at := current_timestamp;
  RETURN NEW;
END;$$;

CREATE TRIGGER ct_updated_at_trigger
  BEFORE INSERT OR UPDATE ON casino_trades
  FOR EACH ROW
EXECUTE PROCEDURE ct_updated_at_trigger();

COMMIT;
