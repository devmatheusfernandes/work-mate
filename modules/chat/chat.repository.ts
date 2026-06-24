import { db } from "@/lib/db";
import { chatSessionsTable, chatMessagesTable } from "./chat.schema";
import { eq, and, desc, asc } from "drizzle-orm";

export const chatRepository = {
  // --- Session Queries ---
  
  async createSession(userId: string, id: string, title: string) {
    const now = new Date();
    const [session] = await db
      .insert(chatSessionsTable)
      .values({
        id,
        userId,
        title,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return session;
  },

  async getSessionById(userId: string, id: string) {
    const [session] = await db
      .select()
      .from(chatSessionsTable)
      .where(
        and(
          eq(chatSessionsTable.userId, userId),
          eq(chatSessionsTable.id, id)
        )
      );
    return session;
  },

  async getActiveSessions(userId: string) {
    return db
      .select()
      .from(chatSessionsTable)
      .where(
        and(
          eq(chatSessionsTable.userId, userId),
          eq(chatSessionsTable.isArchived, false)
        )
      )
      .orderBy(desc(chatSessionsTable.updatedAt));
  },

  async getArchivedSessions(userId: string) {
    return db
      .select()
      .from(chatSessionsTable)
      .where(
        and(
          eq(chatSessionsTable.userId, userId),
          eq(chatSessionsTable.isArchived, true)
        )
      )
      .orderBy(desc(chatSessionsTable.updatedAt));
  },

  async updateSessionTitle(userId: string, id: string, title: string) {
    const [session] = await db
      .update(chatSessionsTable)
      .set({
        title,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(chatSessionsTable.userId, userId),
          eq(chatSessionsTable.id, id)
        )
      )
      .returning();
    return session;
  },

  async archiveSession(userId: string, id: string, isArchived: boolean) {
    const [session] = await db
      .update(chatSessionsTable)
      .set({
        isArchived,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(chatSessionsTable.userId, userId),
          eq(chatSessionsTable.id, id)
        )
      )
      .returning();
    return session;
  },

  async deleteSession(userId: string, id: string) {
    const result = await db
      .delete(chatSessionsTable)
      .where(
        and(
          eq(chatSessionsTable.userId, userId),
          eq(chatSessionsTable.id, id)
        )
      );
    return !!result;
  },

  // --- Message Queries ---

  async createMessage(data: {
    id: string;
    sessionId: string;
    role: "user" | "assistant";
    content: string;
    promptTokens?: number | null;
    candidatesTokens?: number | null;
    cost?: string | null;
    precision?: string | null;
    createdAt?: Date;
  }) {
    const [message] = await db
      .insert(chatMessagesTable)
      .values({
        id: data.id,
        sessionId: data.sessionId,
        role: data.role,
        content: data.content,
        promptTokens: data.promptTokens || null,
        candidatesTokens: data.candidatesTokens || null,
        cost: data.cost || null,
        precision: data.precision || null,
        createdAt: data.createdAt || new Date(),
      })
      .returning();
    return message;
  },

  async getMessagesBySession(sessionId: string) {
    return db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.sessionId, sessionId))
      .orderBy(asc(chatMessagesTable.createdAt));
  },
};
