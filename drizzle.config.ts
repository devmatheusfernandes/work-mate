import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "./modules/notes/notes.schema.ts",
    "./modules/vector/vector.schema.ts",
    "./modules/calendar/calendar.schema.ts",
    "./modules/chat/chat.schema.ts",
    "./modules/memory/memory.schema.ts",
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
