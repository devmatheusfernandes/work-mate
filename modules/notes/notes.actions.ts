"use server";

import { revalidatePath } from "next/cache";
import { protectedAction } from "@/lib/safe-action";
import { notesService } from "./notes.service";
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
        type: z.enum(["note", "pdf", "task"]).optional(),
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
