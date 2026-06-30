import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";

export const aiMemoriesTable = pgTable("ai_memories", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  content: text("content").notNull(),
  isAuto: boolean("is_auto").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMemorySchema = z.object({
  id: z.string(),
  userId: z.string(),
  content: z.string().min(1, "O conteúdo não pode estar vazio"),
  isAuto: z.boolean().default(true).optional(),
});

export const selectMemorySchema = insertMemorySchema.extend({
  createdAt: z.date(),
});

export type AiMemory = z.infer<typeof selectMemorySchema>;
