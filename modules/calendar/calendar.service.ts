import { calendarRepository } from "./calendar.repository";
import {
  Calendar,
  CalendarEvent,
  CreateCalendarDTO,
  CreateCalendarEventDTO,
} from "./calendar.schema";

export const calendarService = {
  // --- Calendars Services ---
  async getCalendars(userId: string): Promise<Calendar[]> {
    return calendarRepository.getCalendarsByUser(userId);
  },

  async createCalendar(userId: string, data: CreateCalendarDTO): Promise<Calendar> {
    const id = "cal_" + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();

    const newCalendar: Calendar = {
      userId,
      id,
      summary: data.summary,
      backgroundColor: data.backgroundColor || "bg-blue-500",
      foregroundColor: data.foregroundColor || "text-white",
      createdAt: now,
      updatedAt: now,
    };

    return calendarRepository.createCalendar(userId, newCalendar);
  },

  async deleteCalendar(userId: string, id: string): Promise<boolean> {
    return calendarRepository.deleteCalendar(userId, id);
  },

  // --- Events Services ---
  async getEvents(userId: string): Promise<CalendarEvent[]> {
    return calendarRepository.getEventsByUser(userId);
  },

  async createEvent(userId: string, data: CreateCalendarEventDTO): Promise<CalendarEvent> {
    const id = "evt_" + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();

    const newEvent: CalendarEvent = {
      userId,
      id,
      calendarId: data.calendarId,
      summary: data.summary,
      description: data.description || null,
      location: data.location || null,
      start: {
        dateTime: data.start.dateTime,
        timeZone: data.start.timeZone || "America/Sao_Paulo",
      },
      end: {
        dateTime: data.end.dateTime,
        timeZone: data.end.timeZone || "America/Sao_Paulo",
      },
      status: data.status || "confirmed",
      createdAt: now,
      updatedAt: now,
    };

    return calendarRepository.createEvent(userId, newEvent);
  },

  async deleteEvent(userId: string, id: string): Promise<boolean> {
    return calendarRepository.deleteEvent(userId, id);
  },
};
