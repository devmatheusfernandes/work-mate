import { db } from "@/lib/db";
import { 
  Calendar, 
  CalendarEvent, 
  calendarsTable, 
  eventsTable 
} from "./calendar.schema";
import { eq, and } from "drizzle-orm";

type CalendarFromDb = typeof calendarsTable.$inferSelect;
type EventFromDb = typeof eventsTable.$inferSelect;

function mapCalendarFromDb(cal: CalendarFromDb): Calendar {
  return {
    ...cal,
    sharedUrl: cal.sharedUrl ?? undefined,
    createdAt: cal.createdAt instanceof Date ? cal.createdAt.toISOString() : (cal.createdAt as string),
    updatedAt: cal.updatedAt instanceof Date ? cal.updatedAt.toISOString() : (cal.updatedAt as string),
  };
}

function mapEventFromDb(evt: EventFromDb): CalendarEvent {
  return {
    userId: evt.userId,
    id: evt.id,
    calendarId: evt.calendarId,
    summary: evt.summary,
    description: evt.description,
    location: evt.location,
    start: {
      dateTime: evt.startDateTime instanceof Date ? evt.startDateTime.toISOString() : (evt.startDateTime as string),
      timeZone: evt.startTimeZone,
    },
    end: {
      dateTime: evt.endDateTime instanceof Date ? evt.endDateTime.toISOString() : (evt.endDateTime as string),
      timeZone: evt.endTimeZone,
    },
    status: evt.status as "confirmed" | "tentative" | "cancelled",
    createdAt: evt.createdAt instanceof Date ? evt.createdAt.toISOString() : (evt.createdAt as string),
    updatedAt: evt.updatedAt instanceof Date ? evt.updatedAt.toISOString() : (evt.updatedAt as string),
  };
}

export const calendarRepository = {
  // --- Calendars CRUD ---
  async getCalendarsByUser(userId: string): Promise<Calendar[]> {
    const results = await db
      .select()
      .from(calendarsTable)
      .where(eq(calendarsTable.userId, userId))
      .orderBy(calendarsTable.createdAt);
    return results.map(mapCalendarFromDb);
  },

  async getCalendarById(userId: string, id: string): Promise<Calendar | null> {
    const [result] = await db
      .select()
      .from(calendarsTable)
      .where(and(eq(calendarsTable.id, id), eq(calendarsTable.userId, userId)))
      .limit(1);
    return result ? mapCalendarFromDb(result) : null;
  },

  async createCalendar(userId: string, calendar: Calendar): Promise<Calendar> {
    const dbValues = {
      ...calendar,
      createdAt: calendar.createdAt ? new Date(calendar.createdAt) : new Date(),
      updatedAt: calendar.updatedAt ? new Date(calendar.updatedAt) : new Date(),
    };
    const [inserted] = await db
      .insert(calendarsTable)
      .values(dbValues)
      .returning();
    return mapCalendarFromDb(inserted);
  },

  async updateCalendar(userId: string, id: string, calendarUpdates: Partial<Calendar>): Promise<Calendar> {
    const { createdAt, ...rest } = calendarUpdates;
    const dbValues = {
      ...rest,
      updatedAt: new Date(),
      ...(createdAt ? { createdAt: new Date(createdAt) } : {}),
    };
    const [updated] = await db
      .update(calendarsTable)
      .set(dbValues)
      .where(and(eq(calendarsTable.id, id), eq(calendarsTable.userId, userId)))
      .returning();
    if (!updated) {
      throw new Error("Calendário não encontrado para atualização");
    }
    return mapCalendarFromDb(updated);
  },

  async deleteCalendar(userId: string, id: string): Promise<boolean> {
    const [deleted] = await db
      .delete(calendarsTable)
      .where(and(eq(calendarsTable.id, id), eq(calendarsTable.userId, userId)))
      .returning();
    return !!deleted;
  },

  // --- Events CRUD ---
  async getEventsByUser(userId: string): Promise<CalendarEvent[]> {
    const results = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.userId, userId))
      .orderBy(eventsTable.startDateTime);
    return results.map(mapEventFromDb);
  },

  async createEvent(userId: string, event: CalendarEvent): Promise<CalendarEvent> {
    const dbValues = {
      userId: event.userId,
      id: event.id,
      calendarId: event.calendarId,
      summary: event.summary,
      description: event.description,
      location: event.location,
      startDateTime: new Date(event.start.dateTime),
      startTimeZone: event.start.timeZone,
      endDateTime: new Date(event.end.dateTime),
      endTimeZone: event.end.timeZone,
      status: event.status,
      createdAt: event.createdAt ? new Date(event.createdAt) : new Date(),
      updatedAt: event.updatedAt ? new Date(event.updatedAt) : new Date(),
    };
    const [inserted] = await db
      .insert(eventsTable)
      .values(dbValues)
      .returning();
    return mapEventFromDb(inserted);
  },

  async createEventsBulk(userId: string, events: CalendarEvent[]): Promise<void> {
    if (events.length === 0) return;
    
    const dbValues = events.map((event) => ({
      userId: event.userId,
      id: event.id,
      calendarId: event.calendarId,
      summary: event.summary,
      description: event.description,
      location: event.location,
      startDateTime: new Date(event.start.dateTime),
      startTimeZone: event.start.timeZone,
      endDateTime: new Date(event.end.dateTime),
      endTimeZone: event.end.timeZone,
      status: event.status,
      createdAt: event.createdAt ? new Date(event.createdAt) : new Date(),
      updatedAt: event.updatedAt ? new Date(event.updatedAt) : new Date(),
    }));

    const chunkSize = 1000;
    for (let i = 0; i < dbValues.length; i += chunkSize) {
      const chunk = dbValues.slice(i, i + chunkSize);
      await db.insert(eventsTable).values(chunk);
    }
  },

  async deleteEvent(userId: string, id: string): Promise<boolean> {
    const [deleted] = await db
      .delete(eventsTable)
      .where(and(eq(eventsTable.id, id), eq(eventsTable.userId, userId)))
      .returning();
    return !!deleted;
  },

  async deleteEventsByCalendar(userId: string, calendarId: string): Promise<boolean> {
    const result = await db
      .delete(eventsTable)
      .where(and(eq(eventsTable.calendarId, calendarId), eq(eventsTable.userId, userId)))
      .returning();
    return result.length > 0;
  },
};
