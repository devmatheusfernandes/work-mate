import { pgTable, text, boolean, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { z } from "zod";

// Zod message schema extending to include IA metrics metadata
export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.date(),
  promptTokens: z.number().optional().nullable(),
  candidatesTokens: z.number().optional().nullable(),
  cost: z.string().optional().nullable(),
  precision: z.string().optional().nullable(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  isArchived: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ChatSession = z.infer<typeof chatSessionSchema>;

// Drizzle tables
export const chatSessionsTable = pgTable("chat_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const chatMessagesTable = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => chatSessionsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  promptTokens: integer("prompt_tokens"),
  candidatesTokens: integer("candidates_tokens"),
  cost: numeric("cost", { precision: 10, scale: 6 }), // Cost in USD (e.g. 0.000045)
  precision: numeric("precision", { precision: 5, scale: 2 }), // Cosine similarity percentage (e.g. 91.50)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
