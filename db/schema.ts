import {
  pgTable,
  uuid,
  varchar,
  numeric,
  integer,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const dcaStatusEnum = pgEnum("dca_status", [
  "active",
  "paused",
  "cancelled",
]);

export const executionStatusEnum = pgEnum("execution_status", [
  "success",
  "failed",
  "pending",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  address: varchar("address", { length: 42 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dcaOrders = pgTable("dca_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  sourceVault: varchar("source_vault", { length: 10 }).notNull(), // yoUSD, yoEUR
  targetVault: varchar("target_vault", { length: 10 }).notNull(), // yoETH, yoBTC
  amount: numeric("amount", { precision: 78, scale: 0 }).notNull(), // raw token amount (wei)
  periodDays: integer("period_days").notNull(),
  slippageBps: integer("slippage_bps").notNull().default(50), // 0.5%
  minPrice: numeric("min_price", { precision: 36, scale: 18 }),
  maxPrice: numeric("max_price", { precision: 36, scale: 18 }),
  status: dcaStatusEnum("status").notNull().default("active"),
  retryCount: integer("retry_count").notNull().default(0),
  nextExecutionAt: timestamp("next_execution_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dcaExecutions = pgTable("dca_executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .references(() => dcaOrders.id)
    .notNull(),
  txHash: varchar("tx_hash", { length: 66 }),
  amountIn: numeric("amount_in", { precision: 78, scale: 0 }).notNull(),
  amountOut: numeric("amount_out", { precision: 78, scale: 0 }),
  price: numeric("price", { precision: 36, scale: 18 }),
  status: executionStatusEnum("status").notNull().default("pending"),
  failureReason: text("failure_reason"),
  executedAt: timestamp("executed_at").defaultNow().notNull(),
});

export const siweNonces = pgTable("siwe_nonces", {
  nonce: varchar("nonce", { length: 128 }).primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type DcaOrder = typeof dcaOrders.$inferSelect;
export type NewDcaOrder = typeof dcaOrders.$inferInsert;
export type DcaExecution = typeof dcaExecutions.$inferSelect;
export type NewDcaExecution = typeof dcaExecutions.$inferInsert;
