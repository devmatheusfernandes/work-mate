import { z } from "zod";
import { pgTable, text, boolean, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";


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
  fileSize: z.number().optional().nullable(),
  isLocked: z.boolean().default(false),
  isVectorized: z.boolean().optional(),
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

// --- Drizzle Table Schemas ---

export const foldersTable = pgTable("folders", {
  userId: text("user_id").notNull(),
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  parentId: text("parent_id"),
  color: text("color"),
  archived: boolean("archived").notNull().default(false),
  trashed: boolean("trashed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isLocked: boolean("is_locked").notNull().default(false),
});

export const tagsTable = pgTable("tags", {
  userId: text("user_id").notNull(),
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const notesTable = pgTable("notes", {
  userId: text("user_id").notNull(),
  id: text("id").primaryKey(),
  title: text("title").notNull().default("Nova Nota"),
  content: text("content"), // TipTap content (HTML or JSON string)
  searchText: text("search_text"),
  tagIds: text("tag_ids").array().notNull().default(sql`'{}'::text[]`),
  folderId: text("folder_id").references(() => foldersTable.id, { onDelete: "cascade" }),
  archived: boolean("archived").notNull().default(false),
  trashed: boolean("trashed").notNull().default(false),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  type: text("type").notNull().default("note"), // 'note' | 'pdf' | 'task'
  fileUrl: text("file_url"),
  fileSize: integer("file_size"),
  isLocked: boolean("is_locked").notNull().default(false),
  taskStatus: text("task_status"), // 'to_start' | 'in_progress' | 'done'
  taskDeadline: text("task_deadline"), // string or timestamp
  taskSubtasks: jsonb("task_subtasks").$type<Subtask[]>().notNull().default([]),
  taskShouldNotify: boolean("task_should_notify").notNull().default(false),
});

