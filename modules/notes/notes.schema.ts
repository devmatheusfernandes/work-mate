import { z } from "zod";

// --- Task Status Enum ---
export const taskStatusEnum = z.enum(["to_start", "in_progress", "done"]);
export type TaskStatus = z.infer<typeof taskStatusEnum>;

// --- Subtask Schema ---
export const subtaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "A subtask precisa de um título").max(100, "Título muito longo"),
  completed: z.boolean().default(false),
});
export type Subtask = z.infer<typeof subtaskSchema>;

// --- Tag Schema ---
export const tagSchema = z.object({
  userId: z.string(),
  id: z.string(),
  title: z
    .string()
    .min(1, "O título da tag não pode ser vazio")
    .max(15, "O título da tag é muito longo"),
  createdAt: z.string(),
  updatedAt: z.string(),
  color: z.string().optional(),
});

export type Tag = z.infer<typeof tagSchema>;

export const createTagSchema = tagSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateTagDTO = z.infer<typeof createTagSchema>;

// --- Folder Schema ---
export const folderSchema = z.object({
  userId: z.string(),
  id: z.string(),
  title: z
    .string()
    .min(1, "O nome da pasta não pode ser vazio")
    .max(20, "O nome da pasta é muito longo")
    .default("Nova Pasta"),
  parentId: z.string().optional().nullable(),
  color: z.string().optional(),
  archived: z.boolean().default(false),
  trashed: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
  isLocked: z.boolean().default(false),
});

export type Folder = z.infer<typeof folderSchema>;

export const createFolderSchema = folderSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "O nome da pasta não pode ser vazio").max(20, "O nome da pasta é muito longo"),
  parentId: z.string().optional().nullable(),
});

export type CreateFolderDTO = z.infer<typeof createFolderSchema>;

// --- Note Schema ---
export const noteSchema = z.object({
  userId: z.string(),
  id: z.string(),
  title: z
    .string()
    .min(1, "O título não pode ser vazio")
    .max(150, "O título é muito longo")
    .default("Nova Nota"),
  content: z.any().optional().nullable(), // TipTap content (HTML or JSON)
  searchText: z.string().optional().nullable(),
  tagIds: z.array(z.string()).default([]),
  folderId: z.string().optional().nullable(),
  archived: z.boolean().default(false),
  trashed: z.boolean().default(false),
  pinned: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
  type: z.enum(["note", "pdf", "task"]).default("note"),
  fileUrl: z.string().optional().nullable(),
  isLocked: z.boolean().default(false),
  // --- Task-specific fields (only relevant when type === "task") ---
  taskStatus: taskStatusEnum.nullable().optional(),
  taskDeadline: z.string().nullable().optional(),
  taskSubtasks: z.array(subtaskSchema).default([]),
  taskShouldNotify: z.boolean().default(false),
});

export type Note = z.infer<typeof noteSchema>;

export const createNoteSchema = noteSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "O título não pode ser vazio").max(150, "O título é muito longo").optional(),
  folderId: z.string().optional().nullable(),
  type: z.enum(["note", "pdf", "task"]).optional(),
  taskStatus: taskStatusEnum.nullable().optional(),
  taskDeadline: z.string().nullable().optional(),
  taskSubtasks: z.array(subtaskSchema).optional(),
  taskShouldNotify: z.boolean().optional(),
});

export type CreateNoteDTO = z.infer<typeof createNoteSchema>;
