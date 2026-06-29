import { notesRepository } from "./notes.repository";
import { notesStorageService } from "./notes-storage.service";
import { Note, Folder, Tag, CreateNoteDTO, CreateFolderDTO, CreateTagDTO } from "./notes.schema";
import { vectorService } from "../vector/vector.service";
import https from "https";

type NoteSourceType = "note" | "pdf" | "task" | "excel";

function getContentToEmbed(note: Note): string {
  const bodyText = note.searchText || "";
  let text = `Título: ${note.title}\nConteúdo: ${bodyText}`;
  
  if (note.type === "task") {
    const statusLabel = 
      note.taskStatus === "done" ? "Concluída" : 
      note.taskStatus === "in_progress" ? "Em Progresso" : "A Fazer";
      
    text += `\nTipo: Tarefa\nStatus: ${statusLabel}`;
    
    if (note.taskSubtasks && note.taskSubtasks.length > 0) {
      const subtaskDetails = note.taskSubtasks
        .map(s => `- [${s.completed ? "x" : " "}] ${s.title}`)
        .join("\n");
      text += `\nSubtarefas:\n${subtaskDetails}`;
    }
    
    if (note.taskDeadline) {
      text += `\nPrazo: ${note.taskDeadline}`;
    }
  } else if (note.type === "pdf") {
    text += `\nTipo: Documento PDF`;
  } else if (note.type === "excel") {
    text += `\nTipo: Planilha Excel`;
  } else {
    text += `\nTipo: Nota de Texto`;
  }
  
  return text.trim();
}

function extractSubtasksFromHtml(content: unknown): { id: string; title: string; completed: boolean }[] {
  if (!content || typeof content !== "string") return [];

  const subtasks: { id: string; title: string; completed: boolean }[] = [];
  const seenTitles = new Set<string>();

  // 1. Try to extract Tiptap HTML task items
  const liRegex = /<li\s+([^>]*data-type="taskItem"[^>]*|[^>]*data-checked=[^>]*?)>([\s\S]*?)<\/li>/gi;
  let match;
  while ((match = liRegex.exec(content)) !== null) {
    const openingTag = match[1];
    const innerHtml = match[2];
    
    const completed = /data-checked="true"/i.test(openingTag);
    const cleanHtml = innerHtml.replace(/<label>[\s\S]*?<\/label>/gi, "");
    const title = cleanHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    
    if (title && !seenTitles.has(title)) {
      seenTitles.add(title);
      subtasks.push({
        id: "sub_" + Math.random().toString(36).substring(2, 9),
        title,
        completed,
      });
    }
  }

  // 2. If no Tiptap task list items were found, look for plain text [ ] or [x] formats
  if (subtasks.length === 0) {
    const textLines = content
      .replace(/<\/p>|<\/li>|<\/div>|<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .split("\n");

    for (let line of textLines) {
      line = line.trim();
      const textTaskRegex = /^\[([ xX]?)\]\s*(.+)$/;
      const textMatch = line.match(textTaskRegex);
      if (textMatch) {
        const completed = textMatch[1].toLowerCase() === "x";
        const title = textMatch[2].trim();
        if (title && !seenTitles.has(title)) {
          seenTitles.add(title);
          subtasks.push({
            id: "sub_" + Math.random().toString(36).substring(2, 9),
            title,
            completed,
          });
        }
      }
    }
  }

  return subtasks;
}

function syncHtmlWithSubtasks(content: string | null | undefined, subtasks: { title: string; completed: boolean }[]): string {
  const currentContent = content || "";
  if (!subtasks || subtasks.length === 0) return currentContent;

  const foundTitles = new Set<string>();
  const liRegex = /<li\s+([^>]*data-type="taskItem"[^>]*|[^>]*data-checked=[^>]*?)>([\s\S]*?)<\/li>/gi;
  
  let syncedContent = currentContent.replace(liRegex, (match, openingTag, innerHtml) => {
    const cleanHtml = innerHtml.replace(/<label>[\s\S]*?<\/label>/gi, "");
    const title = cleanHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    
    if (!title) return match;
    
    const matchingSubtask = subtasks.find(
      (s) => s.title.trim().toLowerCase() === title.toLowerCase()
    );
    
    if (matchingSubtask) {
      foundTitles.add(matchingSubtask.title.trim().toLowerCase());
      let newOpeningTag = openingTag;
      if (/data-checked="(true|false)"/i.test(openingTag)) {
        newOpeningTag = openingTag.replace(
          /data-checked="(true|false)"/i,
          `data-checked="${matchingSubtask.completed}"`
        );
      } else {
        newOpeningTag = `${openingTag} data-checked="${matchingSubtask.completed}"`;
      }
      return `<li ${newOpeningTag}>${innerHtml}</li>`;
    }
    
    return match;
  });

  const newSubtasks = subtasks.filter(
    (s) => !foundTitles.has(s.title.trim().toLowerCase())
  );

  if (newSubtasks.length > 0) {
    const newLisHtml = newSubtasks
      .map((s) => {
        return `<li data-checked="${s.completed}" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>${s.title}</p></div></li>`;
      })
      .join("");

    const ulRegex = /<ul\s+[^>]*data-type="taskList"[^>]*>([\s\S]*?)<\/ul>/i;
    if (ulRegex.test(syncedContent)) {
      syncedContent = syncedContent.replace(
        /(<ul\s+[^>]*data-type="taskList"[^>]*>)([\s\S]*?)(<\/ul>)/i,
        `$1$2${newLisHtml}$3`
      );
    } else {
      syncedContent = syncedContent.trim();
      syncedContent += `<ul data-type="taskList">${newLisHtml}</ul>`;
    }
  }

  return syncedContent;
}

/** Extract all image src URLs from HTML content */
function extractImageUrls(html: string): string[] {
  const urls: string[] = [];
  const regex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

export const notesService = {
  // --- Notes Services ---
  async getNotes(userId: string): Promise<Note[]> {
    const notes = await notesRepository.getNotesByUser(userId);
    const vectorizedIds = await vectorService.getVectorizedNoteIds(userId);
    return notes.map((note) => ({
      ...note,
      isVectorized: vectorizedIds.has(note.id),
    }));
  },
  
  async getNote(userId: string, id: string): Promise<Note> {
    const note = await notesRepository.getNoteById(userId, id);
    if (!note) {
      throw new Error("Nota não encontrada");
    }
    const isVectorized = await vectorService.isNoteVectorized(id);
    return {
      ...note,
      isVectorized,
    };
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
      fileSize: data.fileSize || null,
      isLocked: data.isLocked || false,
      taskStatus: data.taskStatus || null,
      taskDeadline: data.taskDeadline || null,
      taskSubtasks: data.taskSubtasks && data.taskSubtasks.length > 0
        ? data.taskSubtasks
        : (data.type === "task" ? extractSubtasksFromHtml(data.content) : []),
      taskShouldNotify: data.taskShouldNotify || false,
    };
    
    const note = await notesRepository.createNote(userId, newNote);

    let isVectorized = false;
    // Vetoriza de forma imediata (síncrona) para manter RAG atualizado
    if (!note.trashed) {
      try {
        await vectorService.embedNow(userId, note.id, note.type as NoteSourceType, getContentToEmbed(note));
        isVectorized = true;
      } catch (e) {
        console.error("Erro ao vetorizar nota síncronamente na criação:", e);
        // Fallback: garante que fica na fila pendente
        await vectorService.enqueue(userId, note.id, note.type as NoteSourceType, getContentToEmbed(note));
      }
    }

    return { ...note, isVectorized };
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

    // Auto-extract subtasks when converting a note to a task
    if (data.type === "task" && note.type !== "task") {
      const contentToParse = data.content !== undefined ? data.content : note.content;
      const extractedSubtasks = extractSubtasksFromHtml(contentToParse);
      if (extractedSubtasks.length > 0) {
        data.taskSubtasks = extractedSubtasks;
      }
    }

    // Sincronizar subtasks de volta para o texto (TipTap) ao converter Tarefa ➔ Nota (evita perda de subtasks criadas no painel)
    if (data.type === "note" && note.type === "task") {
      const contentToSync = data.content !== undefined ? data.content : note.content;
      data.content = syncHtmlWithSubtasks(contentToSync, note.taskSubtasks || []);
      if (typeof data.content === "string") {
        data.searchText = data.content.replace(/<[^>]*>/g, " ").trim();
      }
    }

    // Sincronizar automaticamente o estado das subtasks no conteúdo HTML (TipTap) ao salvar a tarefa
    const isCurrentlyTask = data.type === "task" || (note.type === "task" && data.type === undefined);
    if (isCurrentlyTask) {
      if (data.taskSubtasks !== undefined) {
        const contentToSync = data.content !== undefined ? data.content : note.content;
        data.content = syncHtmlWithSubtasks(contentToSync, data.taskSubtasks);
        if (typeof data.content === "string") {
          data.searchText = data.content.replace(/<[^>]*>/g, " ").trim();
        }
      } else if (data.content !== undefined && typeof data.content === "string") {
        data.taskSubtasks = extractSubtasksFromHtml(data.content);
      }
    }

    const hasEmbeddingFieldsChanged = 
      (data.title !== undefined && data.title !== note.title) ||
      (data.content !== undefined && JSON.stringify(data.content) !== JSON.stringify(note.content)) ||
      (data.searchText !== undefined && data.searchText !== note.searchText) ||
      (data.type !== undefined && data.type !== note.type) ||
      (data.taskStatus !== undefined && data.taskStatus !== note.taskStatus) ||
      (data.taskDeadline !== undefined && data.taskDeadline !== note.taskDeadline) ||
      (data.taskSubtasks !== undefined && JSON.stringify(data.taskSubtasks) !== JSON.stringify(note.taskSubtasks));

    const updatedNote = await notesRepository.updateNote(userId, id, data);

    // Sync images: soft-delete any images no longer present in the content
    if (data.content !== undefined && typeof data.content === "string") {
      await notesService.syncNoteImages(id, data.content);
    }

    let isVectorized = false;
    // Se a nota foi para a lixeira, removemos da fila de embeddings
    if (updatedNote.trashed) {
      await vectorService.dequeue(updatedNote.id, updatedNote.type as NoteSourceType);
    } else if (hasEmbeddingFieldsChanged) {
      try {
        await vectorService.embedNow(userId, updatedNote.id, updatedNote.type as NoteSourceType, getContentToEmbed(updatedNote));
        isVectorized = true;
      } catch (e) {
        console.error("Erro ao vetorizar nota síncronamente na atualização:", e);
        // Fallback: garante que fica na fila
        await vectorService.enqueue(userId, updatedNote.id, updatedNote.type as NoteSourceType, getContentToEmbed(updatedNote));
      }
    } else {
      isVectorized = await vectorService.isNoteVectorized(id);
    }

    return { ...updatedNote, isVectorized };
  },

  async deleteNote(userId: string, id: string): Promise<boolean> {
    const note = await notesRepository.getNoteById(userId, id);
    if (!note) {
      throw new Error("Nota não encontrada");
    }
    
    const result = await notesRepository.deleteNote(userId, id);
    if (result) {
      await vectorService.dequeue(id, note.type as NoteSourceType);
    }
    
    return result;
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
      await vectorService.dequeue(note.id, note.type as NoteSourceType);
    }
    for (const folder of trashedFolders) {
      await notesRepository.deleteFolder(userId, folder.id);
    }
    
    return true;
  },

  async embedNoteNow(userId: string, id: string): Promise<void> {
    const note = await this.getNote(userId, id);
    let updatedNote = note;

    if ((note.type === "pdf" || note.type === "excel") && note.fileUrl) {
      try {
        const buffer = await new Promise<Buffer>((resolve, reject) => {
          https.get(note.fileUrl!, (res) => {
            if (res.statusCode !== 200) {
              reject(new Error(`Status ${res.statusCode}`));
              return;
            }
            const chunks: Buffer[] = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => resolve(Buffer.concat(chunks)));
            res.on("error", reject);
          }).on("error", reject);
        });

        let extractedText = "";

        if (note.type === "pdf") {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { PDFParse } = require("pdf-parse");
          const pdfParser = new PDFParse(new Uint8Array(buffer));
          await pdfParser.load();
          const parsed = await pdfParser.getText();
          extractedText = (parsed?.text || "").trim().slice(0, 50_000);
          pdfParser.destroy();
        } else if (note.type === "excel") {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const XLSX = require("xlsx");
          const workbook = XLSX.read(buffer, { type: "buffer" });
          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const csvText = XLSX.utils.sheet_to_csv(sheet);
            if (csvText.trim()) {
              extractedText += `Planilha/Aba: ${sheetName}\n${csvText}\n\n`;
            }
          }
          extractedText = extractedText.trim().slice(0, 50_000);
        }

        updatedNote = await notesRepository.updateNote(userId, id, {
          searchText: extractedText,
        });
      } catch (err) {
        console.error(`Erro ao extrair texto do arquivo ${note.type} durante vetorização manual:`, err);
      }
    }

    const contentToEmbed = getContentToEmbed(updatedNote);
    await vectorService.embedNow(userId, updatedNote.id, updatedNote.type as NoteSourceType, contentToEmbed);
  },

  getFormattedContent(note: Note): string {
    return getContentToEmbed(note);
  },

  /** Upload an image to Supabase Storage and register in editor_images */
  async uploadEditorImage(
    userId: string,
    noteId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    fileSize: number
  ): Promise<{ imageId: string; fileUrl: string }> {
    const { fileUrl, filePath } = await notesStorageService.uploadImage(
      userId,
      noteId,
      fileBuffer,
      fileName,
      mimeType
    );

    const imageId = "img_" + Math.random().toString(36).substring(2, 11);
    await notesRepository.createEditorImage(userId, {
      id: imageId,
      noteId,
      fileUrl,
      filePath,
      fileSize,
    });

    return { imageId, fileUrl };
  },

  /**
   * Compares current DB images for a note against the URLs present in the
   * updated HTML content. Images no longer referenced are soft-deleted;
   * images that have come back (undo) are restored.
   */
  async syncNoteImages(noteId: string, newContent: string): Promise<void> {
    const existingImages = await notesRepository.getEditorImagesByNoteId(noteId);
    if (existingImages.length === 0) return;

    const activeUrls = new Set(extractImageUrls(newContent));

    const toSoftDelete = existingImages
      .filter((img) => !activeUrls.has(img.fileUrl) && !img.deletedAt)
      .map((img) => img.id);

    const toRestore = existingImages
      .filter((img) => activeUrls.has(img.fileUrl) && img.deletedAt)
      .map((img) => img.id);

    if (toSoftDelete.length > 0) {
      await notesRepository.softDeleteEditorImages(toSoftDelete);
    }
    if (toRestore.length > 0) {
      await notesRepository.markEditorImagesAsActive(toRestore);
    }
  },
};
