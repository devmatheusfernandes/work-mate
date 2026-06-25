import { db } from "@/lib/db";
import { embeddingsQueueTable } from "./vector.schema";
import { eq, and, sql } from "drizzle-orm";

export const vectorRepository = {
  // Retorna itens pendentes para vetorização no Cron
  async getPendingItems(limit = 100) {
    return db
      .select()
      .from(embeddingsQueueTable)
      .where(eq(embeddingsQueueTable.syncStatus, "pending"))
      .limit(limit);
  },

  // Salva o vetor gerado na tabela e marca como sincronizado
  async updateEmbedding(id: string, embedding: number[]) {
    const vectorString = `[${embedding.join(",")}]`;
    await db
      .update(embeddingsQueueTable)
      .set({
        embedding: sql`${vectorString}::vector`,
        syncStatus: "synced",
        updatedAt: new Date(),
      })
      .where(eq(embeddingsQueueTable.id, id));
  },

  // Marca um item com erro de vetorização (para retentativas futuras)
  async markAsError(id: string) {
    await db
      .update(embeddingsQueueTable)
      .set({
        syncStatus: "error",
        updatedAt: new Date(),
      })
      .where(eq(embeddingsQueueTable.id, id));
  },

  // Enfileira um novo texto para vetorização (upsert determinístico)
  async enqueue(userId: string, sourceId: string, sourceType: string, contentToEmbed: string) {
    const queueId = `${sourceType}_${sourceId}`;
    await db
      .insert(embeddingsQueueTable)
      .values({
        id: queueId,
        userId,
        sourceId,
        sourceType,
        contentToEmbed,
        syncStatus: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: embeddingsQueueTable.id,
        set: {
          contentToEmbed,
          syncStatus: "pending",
          updatedAt: new Date(),
        },
      });
  },

  // Deleta um item da fila (ex: quando uma nota é apagada definitivamente)
  async deleteQueueItem(sourceId: string, sourceType: string) {
    await db
      .delete(embeddingsQueueTable)
      .where(
        and(
          eq(embeddingsQueueTable.sourceId, sourceId),
          eq(embeddingsQueueTable.sourceType, sourceType)
        )
      );
  },

  // Deleta itens da fila com o mesmo sourceId mas tipos diferentes (ex: quando muda de note para task)
  async deleteQueueItemsForOtherTypes(sourceId: string, currentType: string) {
    await db
      .delete(embeddingsQueueTable)
      .where(
        and(
          eq(embeddingsQueueTable.sourceId, sourceId),
          sql`${embeddingsQueueTable.sourceType} != ${currentType}`
        )
      );
  },

  // Retorna itens pendentes para vetorização de um usuário específico
  async getPendingItemsByUser(userId: string, limit = 100) {
    return db
      .select()
      .from(embeddingsQueueTable)
      .where(
        and(
          eq(embeddingsQueueTable.userId, userId),
          eq(embeddingsQueueTable.syncStatus, "pending")
        )
      )
      .limit(limit);
  },

  // Retorna todos os IDs de origem cujo status é synced para o usuário
  async getVectorizedIdsByUser(userId: string) {
    return db
      .select({ sourceId: embeddingsQueueTable.sourceId })
      .from(embeddingsQueueTable)
      .where(
        and(
          eq(embeddingsQueueTable.userId, userId),
          eq(embeddingsQueueTable.syncStatus, "synced")
        )
      );
  },

  // Retorna o status de sincronização de um item específico
  async getSyncStatus(sourceId: string) {
    const [result] = await db
      .select({ syncStatus: embeddingsQueueTable.syncStatus })
      .from(embeddingsQueueTable)
      .where(eq(embeddingsQueueTable.sourceId, sourceId))
      .limit(1);
    return result;
  },

  // Busca semântica por similaridade de cosseno (<=> em pgvector)
  async searchSimilarity(userId: string, queryVector: number[], limit = 10) {
    const vectorString = `[${queryVector.join(",")}]`;
    
    // pgvector '<=>' representa a distância de cosseno.
    // Ordenamos por ASC (menor distância = mais próximo/similar).
    return db
      .select({
        id: embeddingsQueueTable.id,
        sourceId: embeddingsQueueTable.sourceId,
        sourceType: embeddingsQueueTable.sourceType,
        content: embeddingsQueueTable.contentToEmbed,
        distance: sql<number>`${embeddingsQueueTable.embedding} <=> ${vectorString}::vector`,
      })
      .from(embeddingsQueueTable)
      .where(
        and(
          eq(embeddingsQueueTable.userId, userId),
          eq(embeddingsQueueTable.syncStatus, "synced")
        )
      )
      .orderBy(sql`${embeddingsQueueTable.embedding} <=> ${vectorString}::vector`)
      .limit(limit);
  }
};
