ALTER TABLE "dca_orders" ALTER COLUMN "slippage_bps" SET DEFAULT 50;--> statement-breakpoint
ALTER TABLE "dca_orders" ADD COLUMN "retry_count" integer DEFAULT 0 NOT NULL;