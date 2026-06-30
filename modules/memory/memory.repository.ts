import { db } from "@/lib/db";
import { aiMemoriesTable } from "./memory.schema";
import { eq, desc } from "drizzle-orm";

export const memoryRepository = {
  async getByUserId(userId: string) {
    return db
      .select()
      .from(aiMemoriesTable)
      .where(eq(aiMemoriesTable.userId, userId))
      .orderBy(desc(aiMemoriesTable.createdAt));
  },

  async insert(data: { id: string; userId: string; content: string; isAuto: boolean }) {
    await db.insert(aiMemoriesTable).values(data);
  },

  async deleteById(id: string) {
    await db.delete(aiMemoriesTable).where(eq(aiMemoriesTable.id, id));
  },
  
  async findById(id: string) {
    const [result] = await db
      .select()
      .from(aiMemoriesTable)
      .where(eq(aiMemoriesTable.id, id))
      .limit(1);
    return result || null;
  }
};
