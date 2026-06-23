import { z } from "zod";

// --- Google CalendarList Resource ---
export const calendarSchema = z.object({
  userId: z.string(),
  id: z.string(),
  summary: z.string().min(1, "O nome do calendário não pode ser vazio").max(50, "O nome é muito longo"),
  backgroundColor: z.string().default("bg-blue-500"),
  foregroundColor: z.string().default("text-white"),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Calendar = z.infer<typeof calendarSchema>;

export const createCalendarSchema = calendarSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCalendarDTO = z.infer<typeof createCalendarSchema>;

// --- Google Event Resource (DateTime structure) ---
export const eventDateTimeSchema = z.object({
  dateTime: z.string(), // ISO String
  timeZone: z.string().default("America/Sao_Paulo"),
});

// --- Google Event Resource ---
export const calendarEventSchema = z.object({
  userId: z.string(),
  id: z.string(),
  calendarId: z.string(),
  summary: z.string().min(1, "O título do evento não pode ser vazio").max(150, "O título é muito longo"),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  start: eventDateTimeSchema,
  end: eventDateTimeSchema,
  status: z.enum(["confirmed", "tentative", "cancelled"]).default("confirmed"),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;

export const createCalendarEventSchema = calendarEventSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCalendarEventDTO = z.infer<typeof createCalendarEventSchema>;
