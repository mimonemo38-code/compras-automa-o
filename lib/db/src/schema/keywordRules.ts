import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const keywordRulesTable = pgTable("keyword_rules", {
  id: serial("id").primaryKey(),
  keyword: text("keyword").notNull(),
  compradora: text("compradora").notNull(),
  grupo: text("grupo").notNull().default(""),
  matchType: text("match_type").notNull().default("contains"),
  priority: integer("priority").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertKeywordRuleSchema = createInsertSchema(keywordRulesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertKeywordRule = z.infer<typeof insertKeywordRuleSchema>;
export type KeywordRule = typeof keywordRulesTable.$inferSelect;
