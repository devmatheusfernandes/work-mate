import { pgTable, text, timestamp, vector } from "drizzle-orm/pg-core";

export const embeddingsQueueTable = pgTable("embeddings_queue", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  sourceId: text("source_id").notNull(), // ID correspondente no notesTable
  sourceType: text("source_type").notNull(), // 'note' | 'pdf' | 'task'
  contentToEmbed: text("content_to_embed").notNull(), // Texto plano a ser vetorizado
  embedding: vector("embedding", { dimensions: 768 }), // Gemini gemini-embedding-001
  syncStatus: text("sync_status").notNull().default("pending"), // 'pending' | 'synced' | 'error'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
