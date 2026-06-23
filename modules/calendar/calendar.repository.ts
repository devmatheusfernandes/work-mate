import fs from "fs";
import path from "path";
import { Calendar, CalendarEvent } from "./calendar.schema";

const dbPath = path.join(process.cwd(), "modules", "calendar", "mock-db.json");

interface CalendarDbSchema {
  calendars: Calendar[];
  events: CalendarEvent[];
}

function readDb(): CalendarDbSchema {
  try {
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      const initialState: CalendarDbSchema = { calendars: [], events: [] };
      fs.writeFileSync(dbPath, JSON.stringify(initialState, null, 2), "utf-8");
      return initialState;
    }
    const data = fs.readFileSync(dbPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading calendar mock DB:", error);
    return { calendars: [], events: [] };
  }
}

function writeDb(data: CalendarDbSchema) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing calendar mock DB:", error);
  }
}

export const calendarRepository = {
  // --- Calendars CRUD ---
  async getCalendarsByUser(userId: string): Promise<Calendar[]> {
    const db = readDb();
    return db.calendars.filter((c) => c.userId === userId);
  },

  async createCalendar(userId: string, calendar: Calendar): Promise<Calendar> {
    const db = readDb();
    db.calendars.push(calendar);
    writeDb(db);
    return calendar;
  },

  async deleteCalendar(userId: string, id: string): Promise<boolean> {
    const db = readDb();
    const initialLen = db.calendars.length;
    // Deleting calendar removes its events as well (Google Calendar behavior)
    db.calendars = db.calendars.filter((c) => !(c.id === id && c.userId === userId));
    db.events = db.events.filter((e) => !(e.calendarId === id && e.userId === userId));
    writeDb(db);
    return db.calendars.length < initialLen;
  },

  // --- Events CRUD ---
  async getEventsByUser(userId: string): Promise<CalendarEvent[]> {
    const db = readDb();
    return db.events.filter((e) => e.userId === userId);
  },

  async createEvent(userId: string, event: CalendarEvent): Promise<CalendarEvent> {
    const db = readDb();
    db.events.push(event);
    writeDb(db);
    return event;
  },

  async deleteEvent(userId: string, id: string): Promise<boolean> {
    const db = readDb();
    const initialLen = db.events.length;
    db.events = db.events.filter((e) => !(e.id === id && e.userId === userId));
    writeDb(db);
    return db.events.length < initialLen;
  },
};
