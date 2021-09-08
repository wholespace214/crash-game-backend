CREATE INDEX buyer_idx ON amm_interactions (buyer);
CREATE INDEX bet_idx ON amm_interactions (bet);
CREATE INDEX owner_idx ON token_balances (owner);
CREATE INDEX bet_rep_idx ON bet_reports (bet_id);
CREATE INDEX sende_receiver_idx ON token_transactions (sender, receiver);