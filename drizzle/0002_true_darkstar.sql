ALTER TABLE "siwe_nonces" ALTER COLUMN "nonce" SET DATA TYPE varchar(128);--> statement-breakpoint
ALTER TABLE "siwe_nonces" DROP COLUMN "used";