import { db } from "@/lib/db";
import { 
  Note, 
  Folder, 
  Tag, 
  notesTable, 
  foldersTable, 
  tagsTable,
  editorImagesTable
} from "./notes.schema";
import { eq, and, sql, inArray } from "drizzle-orm";

type NoteFromDb = typeof notesTable.$inferSelect;
type FolderFromDb = typeof foldersTable.$inferSelect;
type TagFromDb = typeof tagsTable.$inferSelect;

// Mapeadores para converter datas (Date) do PostgreSQL de volta para strings ISO (como esperado pelos Zod Schemas e UI)
function mapNoteFromDb(note: NoteFromDb): Note {
  return {
    ...note,
    type: note.type as "note" | "pdf" | "task",
    taskStatus: note.taskStatus as "to_start" | "in_progress" | "done" | null | undefined,
    createdAt: note.createdAt instanceof Date ? note.createdAt.toISOString() : (note.createdAt as string),
    updatedAt: note.updatedAt instanceof Date ? note.updatedAt.toISOString() : (note.updatedAt as string),
  };
}

function mapFolderFromDb(folder: FolderFromDb): Folder {
  return {
    ...folder,
    color: folder.color ?? undefined,
    createdAt: folder.createdAt instanceof Date ? folder.createdAt.toISOString() : (folder.createdAt as string),
    updatedAt: folder.updatedAt instanceof Date ? folder.updatedAt.toISOString() : (folder.updatedAt as string),
  };
}

function mapTagFromDb(tag: TagFromDb): Tag {
  return {
    ...tag,
    color: tag.color ?? undefined,
    createdAt: tag.createdAt instanceof Date ? tag.createdAt.toISOString() : (tag.createdAt as string),
    updatedAt: tag.updatedAt instanceof Date ? tag.updatedAt.toISOString() : (tag.updatedAt as string),
  };
}

export const notesRepository = {
  // --- Notes CRUD ---
  async getNotesByUser(userId: string): Promise<Note[]> {
    const results = await db
      .select()
      .from(notesTable)
      .where(eq(notesTable.userId, userId))
      .orderBy(sql`${notesTable.pinned} DESC, ${notesTable.createdAt} DESC`);

    return results.map(mapNoteFromDb);
  },

  async getNoteById(userId: string, id: string): Promise<Note | null> {
    const [result] = await db
      .select()
      .from(notesTable)
      .where(
        and(
          eq(notesTable.id, id),
          eq(notesTable.userId, userId)
        )
      )
      .limit(1);

    return result ? mapNoteFromDb(result) : null;
  },

  async createNote(userId: string, note: Note): Promise<Note> {
    // Tratamento para garantir datas corretas do Drizzle
    const dbValues = {
      ...note,
      createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
      updatedAt: note.updatedAt ? new Date(note.updatedAt) : new Date(),
    };

    const [inserted] = await db
      .insert(notesTable)
      .values(dbValues)
      .returning();

    return mapNoteFromDb(inserted);
  },

  async updateNote(userId: string, id: string, noteUpdates: Partial<Note>): Promise<Note> {
    const { createdAt, ...rest } = noteUpdates;
    const dbValues = {
      ...rest,
      updatedAt: new Date(),
      ...(createdAt ? { createdAt: new Date(createdAt) } : {}),
    };

    const [updated] = await db
      .update(notesTable)
      .set(dbValues)
      .where(
        and(
          eq(notesTable.id, id),
          eq(notesTable.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Nota não encontrada para atualização");
    }

    return mapNoteFromDb(updated);
  },

  async deleteNote(userId: string, id: string): Promise<boolean> {
    const [deleted] = await db
      .delete(notesTable)
      .where(
        and(
          eq(notesTable.id, id),
          eq(notesTable.userId, userId)
        )
      )
      .returning();

    return !!deleted;
  },

  // --- Folders CRUD ---
  async getFoldersByUser(userId: string): Promise<Folder[]> {
    const results = await db
      .select()
      .from(foldersTable)
      .where(eq(foldersTable.userId, userId))
      .orderBy(foldersTable.title);

    return results.map(mapFolderFromDb);
  },

  async getFolderById(userId: string, id: string): Promise<Folder | null> {
    const [result] = await db
      .select()
      .from(foldersTable)
      .where(
        and(
          eq(foldersTable.id, id),
          eq(foldersTable.userId, userId)
        )
      )
      .limit(1);

    return result ? mapFolderFromDb(result) : null;
  },

  async createFolder(userId: string, folder: Folder): Promise<Folder> {
    const dbValues = {
      ...folder,
      createdAt: folder.createdAt ? new Date(folder.createdAt) : new Date(),
      updatedAt: folder.updatedAt ? new Date(folder.updatedAt) : new Date(),
    };

    const [inserted] = await db
      .insert(foldersTable)
      .values(dbValues)
      .returning();

    return mapFolderFromDb(inserted);
  },

  async updateFolder(userId: string, id: string, folderUpdates: Partial<Folder>): Promise<Folder> {
    const { createdAt, ...rest } = folderUpdates;
    const dbValues = {
      ...rest,
      updatedAt: new Date(),
      ...(createdAt ? { createdAt: new Date(createdAt) } : {}),
    };

    const [updated] = await db
      .update(foldersTable)
      .set(dbValues)
      .where(
        and(
          eq(foldersTable.id, id),
          eq(foldersTable.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Pasta não encontrada para atualização");
    }

    return mapFolderFromDb(updated);
  },

  async deleteFolder(userId: string, id: string): Promise<boolean> {
    // Transação para garantir consistência ao deletar pasta e limpar referências
    return await db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(foldersTable)
        .where(
          and(
            eq(foldersTable.id, id),
            eq(foldersTable.userId, userId)
          )
        )
        .returning();

      if (!deleted) return false;

      // Limpa a pasta das subnotas e subpastas
      await tx
        .update(notesTable)
        .set({ folderId: null })
        .where(
          and(
            eq(notesTable.folderId, id),
            eq(notesTable.userId, userId)
          )
        );

      await tx
        .update(foldersTable)
        .set({ parentId: null })
        .where(
          and(
            eq(foldersTable.parentId, id),
            eq(foldersTable.userId, userId)
          )
        );

      return true;
    });
  },

  // --- Tags CRUD ---
  async getTagsByUser(userId: string): Promise<Tag[]> {
    const results = await db
      .select()
      .from(tagsTable)
      .where(eq(tagsTable.userId, userId))
      .orderBy(tagsTable.title);

    return results.map(mapTagFromDb);
  },

  async createTag(userId: string, tag: Tag): Promise<Tag> {
    const dbValues = {
      ...tag,
      createdAt: tag.createdAt ? new Date(tag.createdAt) : new Date(),
      updatedAt: tag.updatedAt ? new Date(tag.updatedAt) : new Date(),
    };

    const [inserted] = await db
      .insert(tagsTable)
      .values(dbValues)
      .returning();

    return mapTagFromDb(inserted);
  },

  async updateTag(userId: string, id: string, tagUpdates: Partial<Tag>): Promise<Tag> {
    const { createdAt, ...rest } = tagUpdates;
    const dbValues = {
      ...rest,
      updatedAt: new Date(),
      ...(createdAt ? { createdAt: new Date(createdAt) } : {}),
    };

    const [updated] = await db
      .update(tagsTable)
      .set(dbValues)
      .where(
        and(
          eq(tagsTable.id, id),
          eq(tagsTable.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Tag não encontrada para atualização");
    }

    return mapTagFromDb(updated);
  },

  async deleteTag(userId: string, id: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(tagsTable)
        .where(
          and(
            eq(tagsTable.id, id),
            eq(tagsTable.userId, userId)
          )
        )
        .returning();

      if (!deleted) return false;

      // Remove a tag de todas as notas do usuário
      // No PostgreSQL, usamos a função array_remove para retirar a tag do array tagIds
      await tx
        .update(notesTable)
        .set({
          tagIds: sql`array_remove(${notesTable.tagIds}, ${id})`
        })
        .where(
          and(
            eq(notesTable.userId, userId),
            sql`${id} = ANY(${notesTable.tagIds})`
          )
        );

      return true;
    });
  },

  // --- Editor Images ---
  async createEditorImage(userId: string, image: { id: string; noteId: string; fileUrl: string; filePath: string; fileSize?: number }) {
    const dbValues = {
      ...image,
      userId,
      createdAt: new Date(),
      deletedAt: null,
    };

    const [inserted] = await db
      .insert(editorImagesTable)
      .values(dbValues)
      .returning();

    return inserted;
  },

  async getEditorImagesByNoteId(noteId: string) {
    return db
      .select()
      .from(editorImagesTable)
      .where(eq(editorImagesTable.noteId, noteId));
  },

  async softDeleteEditorImages(ids: string[]) {
    if (ids.length === 0) return;
    await db
      .update(editorImagesTable)
      .set({ deletedAt: new Date() })
      .where(inArray(editorImagesTable.id, ids));
  },

  async markEditorImagesAsActive(ids: string[]) {
    if (ids.length === 0) return;
    await db
      .update(editorImagesTable)
      .set({ deletedAt: null })
      .where(inArray(editorImagesTable.id, ids));
  },

  async getExpiredDeletedEditorImages(olderThan: Date) {
    return db
      .select()
      .from(editorImagesTable)
      .where(sql`${editorImagesTable.deletedAt} <= ${olderThan}`);
  },

  async hardDeleteEditorImage(id: string) {
    await db
      .delete(editorImagesTable)
      .where(eq(editorImagesTable.id, id));
  }
};

