CREATE TABLE "siwe_nonces" (
	"nonce" varchar(64) PRIMARY KEY NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_fid_unique";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "fid";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_address_unique" UNIQUE("address");