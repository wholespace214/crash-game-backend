BEGIN;
CREATE TABLE IF NOT EXISTS ExternalGamesTokens(TokenID uuid UNIQUE, UserId varchar(255) NOT NULL, GameName varchar(255), GameType varchar(255), Provider varchar(255), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
COMMIT;
