import fs from "fs";
import path from "path";
import { Note, Folder, Tag } from "./notes.schema";

const dbPath = path.join(process.cwd(), "modules", "notes", "mock-db.json");

function readDb(): { notes: Note[]; folders: Folder[]; tags: Tag[] } {
  try {
    if (!fs.existsSync(dbPath)) {
      // Ensure folder structure exists
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      const initialState = { notes: [], folders: [], tags: [] };
      fs.writeFileSync(dbPath, JSON.stringify(initialState, null, 2), "utf-8");
      return initialState;
    }
    const data = fs.readFileSync(dbPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading mock DB file, returning empty state:", error);
    return { notes: [], folders: [], tags: [] };
  }
}

function writeDb(data: { notes: Note[]; folders: Folder[]; tags: Tag[] }) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing mock DB file:", error);
  }
}

export const notesRepository = {
  // --- Notes CRUD ---
  async getNotesByUser(userId: string): Promise<Note[]> {
    const db = readDb();
    return db.notes.filter((n) => n.userId === userId);
  },

  async getNoteById(userId: string, id: string): Promise<Note | null> {
    const db = readDb();
    return db.notes.find((n) => n.id === id && n.userId === userId) ?? null;
  },

  async createNote(userId: string, note: Note): Promise<Note> {
    const db = readDb();
    db.notes.unshift(note);
    writeDb(db);
    return note;
  },

  async updateNote(userId: string, id: string, noteUpdates: Partial<Note>): Promise<Note> {
    const db = readDb();
    const index = db.notes.findIndex((n) => n.id === id && n.userId === userId);
    if (index === -1) {
      throw new Error("Nota não encontrada");
    }
    const updated = {
      ...db.notes[index],
      ...noteUpdates,
      updatedAt: new Date().toISOString(),
    };
    db.notes[index] = updated;
    writeDb(db);
    return updated;
  },

  async deleteNote(userId: string, id: string): Promise<boolean> {
    const db = readDb();
    const initialLen = db.notes.length;
    db.notes = db.notes.filter((n) => !(n.id === id && n.userId === userId));
    writeDb(db);
    return db.notes.length < initialLen;
  },

  // --- Folders CRUD ---
  async getFoldersByUser(userId: string): Promise<Folder[]> {
    const db = readDb();
    return db.folders.filter((f) => f.userId === userId);
  },

  async getFolderById(userId: string, id: string): Promise<Folder | null> {
    const db = readDb();
    return db.folders.find((f) => f.id === id && f.userId === userId) ?? null;
  },

  async createFolder(userId: string, folder: Folder): Promise<Folder> {
    const db = readDb();
    db.folders.push(folder);
    writeDb(db);
    return folder;
  },

  async updateFolder(userId: string, id: string, folderUpdates: Partial<Folder>): Promise<Folder> {
    const db = readDb();
    const index = db.folders.findIndex((f) => f.id === id && f.userId === userId);
    if (index === -1) {
      throw new Error("Pasta não encontrada");
    }
    const updated = {
      ...db.folders[index],
      ...folderUpdates,
      updatedAt: new Date().toISOString(),
    };
    db.folders[index] = updated;
    writeDb(db);
    return updated;
  },

  async deleteFolder(userId: string, id: string): Promise<boolean> {
    const db = readDb();
    const initialLen = db.folders.length;
    db.folders = db.folders.filter((f) => !(f.id === id && f.userId === userId));
    
    // Also remove folder reference from sub-notes/sub-folders
    db.notes = db.notes.map((n) => (n.folderId === id && n.userId === userId ? { ...n, folderId: null } : n));
    db.folders = db.folders.map((f) => (f.parentId === id && f.userId === userId ? { ...f, parentId: null } : f));
    
    writeDb(db);
    return db.folders.length < initialLen;
  },

  // --- Tags CRUD ---
  async getTagsByUser(userId: string): Promise<Tag[]> {
    const db = readDb();
    return db.tags.filter((t) => t.userId === userId);
  },

  async createTag(userId: string, tag: Tag): Promise<Tag> {
    const db = readDb();
    db.tags.push(tag);
    writeDb(db);
    return tag;
  },

  async updateTag(userId: string, id: string, tagUpdates: Partial<Tag>): Promise<Tag> {
    const db = readDb();
    const index = db.tags.findIndex((t) => t.id === id && t.userId === userId);
    if (index === -1) {
      throw new Error("Tag não encontrada");
    }
    const updated = {
      ...db.tags[index],
      ...tagUpdates,
      updatedAt: new Date().toISOString(),
    };
    db.tags[index] = updated;
    writeDb(db);
    return updated;
  },

  async deleteTag(userId: string, id: string): Promise<boolean> {
    const db = readDb();
    const initialLen = db.tags.length;
    db.tags = db.tags.filter((t) => !(t.id === id && t.userId === userId));
    
    // Remove this tagId from all notes
    db.notes = db.notes.map((n) => {
      if (n.userId === userId && n.tagIds.includes(id)) {
        return { ...n, tagIds: n.tagIds.filter((tid) => tid !== id) };
      }
      return n;
    });

    writeDb(db);
    return db.tags.length < initialLen;
  },
};
