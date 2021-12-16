BEGIN;

CREATE TABLE IF NOT EXISTS casino_external_trades (
	ID SERIAL PRIMARY KEY,
	TransactionId varchar(255) DEFAULT NULL,
	CurrentTransactionId varchar(255) DEFAULT NULL,
	TransactionType varchar(255) DEFAULT NULL,
	UserId varchar(255) DEFAULT NULL,
	Amount numeric DEFAULT NULL,
	CurrencyCode varchar(255) DEFAULT NULL,
	TradeState varchar(255) DEFAULT NULL,
	TransactionInfo JSON DEFAULT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE);

CREATE TABLE IF NOT EXISTS casino_evoplay_trades (
	ID SERIAL PRIMARY KEY,
	token varchar(255) DEFAULT NULL,
	callback_id varchar(255) DEFAULT NULL,
	refund_callback_id varchar(255) DEFAULT NULL,
	UserId varchar(255) DEFAULT NULL,
	name varchar(255) DEFAULT NULL,
	data JSON DEFAULT NULL,
	processed BOOLEAN DEFAULT TRUE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE);

COMMIT;