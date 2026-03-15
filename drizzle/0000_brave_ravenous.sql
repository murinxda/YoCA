CREATE TYPE "public"."dca_status" AS ENUM('active', 'paused', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."execution_status" AS ENUM('success', 'failed', 'pending');--> statement-breakpoint
CREATE TABLE "dca_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"tx_hash" varchar(66),
	"amount_in" numeric(78, 0) NOT NULL,
	"amount_out" numeric(78, 0),
	"price" numeric(36, 18),
	"status" "execution_status" DEFAULT 'pending' NOT NULL,
	"executed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dca_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"source_vault" varchar(10) NOT NULL,
	"target_vault" varchar(10) NOT NULL,
	"amount" numeric(78, 0) NOT NULL,
	"period_days" integer NOT NULL,
	"slippage_bps" integer DEFAULT 100 NOT NULL,
	"min_price" numeric(36, 18),
	"max_price" numeric(36, 18),
	"status" "dca_status" DEFAULT 'active' NOT NULL,
	"next_execution_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fid" integer NOT NULL,
	"address" varchar(42) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_fid_unique" UNIQUE("fid")
);
--> statement-breakpoint
ALTER TABLE "dca_executions" ADD CONSTRAINT "dca_executions_order_id_dca_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."dca_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dca_orders" ADD CONSTRAINT "dca_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;