BEGIN;

CREATE TABLE IF NOT EXISTS promo_code(
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	name character varying NOT NULL UNIQUE,
	type character varying NOT NULL,
	value numeric NOT NULL,
	count int,
	expires_at timestamp with time zone NOT NULL,
	created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
	CONSTRAINT "PK_61de9e33d3100daed3518b1a" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS promo_code_user(
	user_id character varying NOT NULL,
	promo_code_id uuid REFERENCES promo_code(id),
	ref_id character varying NOT NULL,
	status character varying NOT NULL,
	count int,
	usage int DEFAULT 1,
	created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
	CONSTRAINT "PK_61de9fbc5a2ac4d93b5fb1cd" PRIMARY KEY (user_id, promo_code_id, ref_id)
);

COMMIT;