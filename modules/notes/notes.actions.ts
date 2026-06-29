"use server";

import { revalidatePath } from "next/cache";
import { protectedAction } from "@/lib/safe-action";
import { notesService } from "./notes.service";
import { vectorService } from "../vector/vector.service";
import {
  createNoteSchema,
  createFolderSchema,
  createTagSchema,
  taskStatusEnum,
  subtaskSchema,
} from "./notes.schema";
import { z } from "zod";

// --- Note Actions ---
export const createNoteAction = protectedAction
  .schema(createNoteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const note = await notesService.createNote(ctx.user.id, parsedInput);
    revalidatePath("/hub/notes");
    return { success: true, note };
  });

export const updateNoteAction = protectedAction
  .schema(
    z.object({
      id: z.string(),
      updates: z.object({
        title: z.string().optional(),
        content: z.any().optional(),
        searchText: z.string().optional().nullable(),
        tagIds: z.array(z.string()).optional(),
        folderId: z.string().optional().nullable(),
        archived: z.boolean().optional(),
        trashed: z.boolean().optional(),
        pinned: z.boolean().optional(),
        fileUrl: z.string().optional().nullable(),
        isLocked: z.boolean().optional(),
        type: z.enum(["note", "pdf", "task", "excel"]).optional(),
        taskStatus: taskStatusEnum.nullable().optional(),
        taskDeadline: z.string().nullable().optional(),
        taskSubtasks: z.array(subtaskSchema).optional(),
        taskShouldNotify: z.boolean().optional(),
      }),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const note = await notesService.updateNote(ctx.user.id, parsedInput.id, parsedInput.updates);
    revalidatePath("/hub/notes");
    revalidatePath("/hub/tasks");
    return { success: true, note };
  });

export const deleteNoteAction = protectedAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    await notesService.deleteNote(ctx.user.id, parsedInput.id);
    revalidatePath("/hub/notes");
    return { success: true };
  });

export const getNotesAction = protectedAction
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const notes = await notesService.getNotes(ctx.user.id);
    return { success: true, notes };
  });

// --- Folder Actions ---
export const createFolderAction = protectedAction
  .schema(createFolderSchema)
  .action(async ({ parsedInput, ctx }) => {
    const folder = await notesService.createFolder(ctx.user.id, parsedInput);
    revalidatePath("/hub/notes");
    return { success: true, folder };
  });

export const updateFolderAction = protectedAction
  .schema(
    z.object({
      id: z.string(),
      updates: z.object({
        title: z.string().optional(),
        parentId: z.string().optional().nullable(),
        color: z.string().optional(),
        archived: z.boolean().optional(),
        trashed: z.boolean().optional(),
        isLocked: z.boolean().optional(),
      }),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const folder = await notesService.updateFolder(ctx.user.id, parsedInput.id, parsedInput.updates);
    revalidatePath("/hub/notes");
    return { success: true, folder };
  });

export const deleteFolderAction = protectedAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    await notesService.deleteFolder(ctx.user.id, parsedInput.id);
    revalidatePath("/hub/notes");
    return { success: true };
  });

// --- Tag Actions ---
export const createTagAction = protectedAction
  .schema(createTagSchema)
  .action(async ({ parsedInput, ctx }) => {
    const tag = await notesService.createTag(ctx.user.id, parsedInput);
    revalidatePath("/hub/notes");
    return { success: true, tag };
  });

export const updateTagAction = protectedAction
  .schema(
    z.object({
      id: z.string(),
      updates: z.object({
        title: z.string().optional(),
        color: z.string().optional(),
      }),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const tag = await notesService.updateTag(ctx.user.id, parsedInput.id, parsedInput.updates);
    revalidatePath("/hub/notes");
    return { success: true, tag };
  });

export const deleteTagAction = protectedAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    await notesService.deleteTag(ctx.user.id, parsedInput.id);
    revalidatePath("/hub/notes");
    return { success: true };
  });

export const emptyTrashAction = protectedAction
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    await notesService.emptyTrash(ctx.user.id);
    revalidatePath("/hub/notes");
    return { success: true };
  });

export const searchSimilarityAction = protectedAction
  .schema(z.object({ queryText: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    const similarityResults = await vectorService.search(ctx.user.id, parsedInput.queryText, 20);
    if (similarityResults.length === 0) {
      return { success: true, notes: [] };
    }

    const sourceIds = similarityResults.map((r) => r.sourceId);
    const allNotes = await notesService.getNotes(ctx.user.id);
    
    // Filtra apenas as notas correspondentes e ordena pela relevância semântica
    const matchingNotes = allNotes
      .filter((n) => sourceIds.includes(n.id))
      .sort((a, b) => sourceIds.indexOf(a.id) - sourceIds.indexOf(b.id));

    return { success: true, notes: matchingNotes };
  });

export const embedNoteNowAction = protectedAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    try {
      await notesService.embedNoteNow(ctx.user.id, parsedInput.id);
      revalidatePath("/hub/notes");
      return { success: true, error: undefined as string | undefined };
    } catch (e: unknown) {
      console.error("Erro ao vetorizar nota:", e);
      return { success: false, error: e instanceof Error ? e.message : "Erro ao vetorizar nota." };
    }
  });

export const embedMultipleNotesNowAction = protectedAction
  .schema(z.object({ ids: z.array(z.string()) }))
  .action(async ({ parsedInput, ctx }) => {
    try {
      for (const id of parsedInput.ids) {
        await notesService.embedNoteNow(ctx.user.id, id);
      }
      revalidatePath("/hub/notes");
      return { success: true, error: undefined as string | undefined };
    } catch (e: unknown) {
      console.error("Erro ao vetorizar notas em lote:", e);
      return { success: false, error: e instanceof Error ? e.message : "Erro ao vetorizar notas." };
    }
  });
