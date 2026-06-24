"use server";

import { z } from "zod";
import { protectedAction } from "@/lib/safe-action";
import { chatService } from "./chat.service";
import { revalidatePath } from "next/cache";

// --- Zod schemas for input validation ---
const getChatMessagesSchema = z.object({
  sessionId: z.string(),
});

const createChatSessionSchema = z.object({
  title: z.string().min(1, "O título não pode ser vazio").max(100),
});

const sendChatMessageSchema = z.object({
  sessionId: z.string().nullable().optional(),
  content: z.string().min(1, "A mensagem não pode ser vazia"),
});

const archiveChatSessionSchema = z.object({
  sessionId: z.string(),
  isArchived: z.boolean(),
});

const deleteChatSessionSchema = z.object({
  sessionId: z.string(),
});

// --- Server Actions ---

export const getChatSessionsAction = protectedAction
  .schema(z.object({ type: z.enum(["active", "archived"]).default("active") }))
  .action(async ({ parsedInput, ctx }) => {
    try {
      const sessions = await chatService.getSessions(ctx.user.id, parsedInput.type);
      return { success: true, sessions };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : "Erro ao carregar conversas." };
    }
  });

export const getChatMessagesAction = protectedAction
  .schema(getChatMessagesSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const messages = await chatService.getMessages(ctx.user.id, parsedInput.sessionId);
      return { success: true, messages };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : "Erro ao carregar histórico de mensagens." };
    }
  });

export const createChatSessionAction = protectedAction
  .schema(createChatSessionSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const session = await chatService.createSession(ctx.user.id, parsedInput.title);
      revalidatePath("/hub/chat");
      return { success: true, session };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : "Erro ao criar conversa." };
    }
  });

export const sendChatMessageAction = protectedAction
  .schema(sendChatMessageSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const result = await chatService.sendMessage(
        ctx.user.id,
        parsedInput.sessionId || "",
        parsedInput.content
      );
      revalidatePath("/hub/chat");
      return { 
        success: true, 
        message: result.message, 
        sessionId: result.sessionId 
      };
    } catch (e: unknown) {
      console.error("Erro no chat Server Action:", e);
      return { success: false, error: e instanceof Error ? e.message : "Erro ao enviar mensagem." };
    }
  });

export const archiveChatSessionAction = protectedAction
  .schema(archiveChatSessionSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      await chatService.archiveSession(ctx.user.id, parsedInput.sessionId, parsedInput.isArchived);
      revalidatePath("/hub/chat");
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : "Erro ao arquivar conversa." };
    }
  });

export const deleteChatSessionAction = protectedAction
  .schema(deleteChatSessionSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      await chatService.deleteSession(ctx.user.id, parsedInput.sessionId);
      revalidatePath("/hub/chat");
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : "Erro ao deletar conversa." };
    }
  });
