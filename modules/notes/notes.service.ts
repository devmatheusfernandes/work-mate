import { notesRepository } from "./notes.repository";
import { Note, Folder, Tag, CreateNoteDTO, CreateFolderDTO, CreateTagDTO } from "./notes.schema";

export const notesService = {
  // --- Notes Services ---
  async getNotes(userId: string): Promise<Note[]> {
    return notesRepository.getNotesByUser(userId);
  },
  
  async getNote(userId: string, id: string): Promise<Note> {
    const note = await notesRepository.getNoteById(userId, id);
    if (!note) {
      throw new Error("Nota não encontrada");
    }
    return note;
  },

  async createNote(userId: string, data: CreateNoteDTO): Promise<Note> {
    const id = "note_" + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();
    
    // Extract plain text for search indexing if content is HTML-like string
    let searchText = "";
    if (data.content && typeof data.content === "string") {
      searchText = data.content.replace(/<[^>]*>/g, " ").trim();
    }
    
    const newNote: Note = {
      userId,
      id,
      title: data.title || "Nova Nota",
      content: data.content || null,
      searchText: data.searchText || searchText || null,
      tagIds: data.tagIds || [],
      folderId: data.folderId || null,
      archived: data.archived || false,
      trashed: data.trashed || false,
      pinned: data.pinned || false,
      createdAt: now,
      updatedAt: now,
      type: data.type || "note",
      fileUrl: data.fileUrl || null,
      isLocked: data.isLocked || false,
      taskStatus: data.taskStatus || null,
      taskDeadline: data.taskDeadline || null,
      taskSubtasks: data.taskSubtasks || [],
      taskShouldNotify: data.taskShouldNotify || false,
    };
    
    return notesRepository.createNote(userId, newNote);
  },

  async updateNote(userId: string, id: string, data: Partial<Note>): Promise<Note> {
    const note = await notesRepository.getNoteById(userId, id);
    if (!note) {
      throw new Error("Nota não encontrada");
    }
    
    // Auto-update plain text search if content is updated
    if (data.content !== undefined && typeof data.content === "string") {
      data.searchText = data.content.replace(/<[^>]*>/g, " ").trim();
    }
    
    return notesRepository.updateNote(userId, id, data);
  },

  async deleteNote(userId: string, id: string): Promise<boolean> {
    const note = await notesRepository.getNoteById(userId, id);
    if (!note) {
      throw new Error("Nota não encontrada");
    }
    return notesRepository.deleteNote(userId, id);
  },

  // --- Folders Services ---
  async getFolders(userId: string): Promise<Folder[]> {
    return notesRepository.getFoldersByUser(userId);
  },

  async getFolder(userId: string, id: string): Promise<Folder> {
    const folder = await notesRepository.getFolderById(userId, id);
    if (!folder) {
      throw new Error("Pasta não encontrada");
    }
    return folder;
  },

  async createFolder(userId: string, data: CreateFolderDTO): Promise<Folder> {
    const id = "folder_" + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();
    
    // Check if duplicate title inside same parent
    const folders = await notesRepository.getFoldersByUser(userId);
    const duplicate = folders.find(
      (f) =>
        f.title.toLowerCase() === data.title.toLowerCase() &&
        f.parentId === (data.parentId || null) &&
        !f.trashed
    );
    if (duplicate) {
      throw new Error("Já existe uma pasta com este nome aqui");
    }

    const newFolder: Folder = {
      userId,
      id,
      title: data.title,
      parentId: data.parentId || null,
      color: data.color || "bg-blue-500",
      archived: data.archived || false,
      trashed: data.trashed || false,
      createdAt: now,
      updatedAt: now,
      isLocked: data.isLocked || false,
    };
    
    return notesRepository.createFolder(userId, newFolder);
  },

  async updateFolder(userId: string, id: string, data: Partial<Folder>): Promise<Folder> {
    const folder = await notesRepository.getFolderById(userId, id);
    if (!folder) {
      throw new Error("Pasta não encontrada");
    }
    return notesRepository.updateFolder(userId, id, data);
  },

  async deleteFolder(userId: string, id: string): Promise<boolean> {
    const folder = await notesRepository.getFolderById(userId, id);
    if (!folder) {
      throw new Error("Pasta não encontrada");
    }
    return notesRepository.deleteFolder(userId, id);
  },

  // --- Tags Services ---
  async getTags(userId: string): Promise<Tag[]> {
    return notesRepository.getTagsByUser(userId);
  },

  async createTag(userId: string, data: CreateTagDTO): Promise<Tag> {
    const id = "tag_" + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();
    
    const tags = await notesRepository.getTagsByUser(userId);
    const duplicate = tags.find((t) => t.title.toLowerCase() === data.title.toLowerCase());
    if (duplicate) {
      throw new Error("Já existe uma tag com este nome");
    }

    const newTag: Tag = {
      userId,
      id,
      title: data.title,
      color: data.color || "bg-blue-500",
      createdAt: now,
      updatedAt: now,
    };
    
    return notesRepository.createTag(userId, newTag);
  },

  async updateTag(userId: string, id: string, data: Partial<Tag>): Promise<Tag> {
    return notesRepository.updateTag(userId, id, data);
  },

  async deleteTag(userId: string, id: string): Promise<boolean> {
    return notesRepository.deleteTag(userId, id);
  },

  async emptyTrash(userId: string): Promise<boolean> {
    const notes = await notesRepository.getNotesByUser(userId);
    const folders = await notesRepository.getFoldersByUser(userId);
    
    const trashedNotes = notes.filter((n) => n.trashed);
    const trashedFolders = folders.filter((f) => f.trashed);
    
    for (const note of trashedNotes) {
      await notesRepository.deleteNote(userId, note.id);
    }
    for (const folder of trashedFolders) {
      await notesRepository.deleteFolder(userId, folder.id);
    }
    
    return true;
  },
};
