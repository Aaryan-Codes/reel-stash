import {
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { ReelBrief } from "@/lib/extractors/brief";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  captureApiKey: text("capture_api_key").notNull(),
  expiryDays: integer("expiry_days").notNull().default(60),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  url: text("url").notNull(),
  source: text("source").notNull().default("web"),
  status: text("status").notNull().default("processing"),
  category: text("category"),
  title: text("title"),
  summary: text("summary"),
  caption: text("caption"),
  transcript: text("transcript"),
  structuredData: jsonb("structured_data"),
  confidence: real("confidence"),
  thumbnailUrl: text("thumbnail_url"),
  visitedAt: timestamp("visited_at", { withTimezone: true }),
  stashedAt: timestamp("stashed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  processingError: text("processing_error"),
  processingStage: text("processing_stage"),
  processingProgress: integer("processing_progress").notNull().default(0),
  retryCount: integer("retry_count").notNull().default(0),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Profile = typeof profiles.$inferSelect;

export type { ItemCategory } from "@/lib/extractors/brief";
export type ItemStatus = "processing" | "inbox" | "active" | "stashed" | "expired";

export type StructuredData = ReelBrief | Record<string, unknown>;
