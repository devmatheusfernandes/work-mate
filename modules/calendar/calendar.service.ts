import { calendarRepository } from "./calendar.repository";
import {
  Calendar,
  CalendarEvent,
  CreateCalendarDTO,
  CreateCalendarEventDTO,
} from "./calendar.schema";

// --- Google Calendar URL Normalizer ---
function normalizeCalendarUrl(url: string): string {
  let cleanUrl = url.trim();
  
  if (cleanUrl.startsWith("webcal://")) {
    cleanUrl = "https://" + cleanUrl.substring(9);
  }

  try {
    const urlObj = new URL(cleanUrl);
    
    if (urlObj.hostname.includes("calendar.google.com")) {
      if (urlObj.pathname.includes("/embed") || urlObj.pathname.includes("/htmlembed")) {
        const src = urlObj.searchParams.get("src");
        if (src) {
          return `https://calendar.google.com/calendar/ical/${encodeURIComponent(src)}/public/basic.ics`;
        }
      }
      
      const cid = urlObj.searchParams.get("cid");
      if (cid) {
        return `https://calendar.google.com/calendar/ical/${encodeURIComponent(cid)}/public/basic.ics`;
      }
    }
  } catch (err) {
    console.error("Error normalizing calendar URL:", err);
  }

  return cleanUrl;
}

// --- iCal (.ics) Helper Parser Functions ---

function unfoldIcs(content: string): string {
  return content.replace(/\r?\n[ \t]/g, "");
}

function parseIcsDate(value: string, keyParts: string[]): Date {
  const isDateOnly = keyParts.some(part => part.toUpperCase() === "VALUE=DATE") || /^\d{8}$/.test(value);
  
  if (isDateOnly) {
    const year = parseInt(value.substring(0, 4), 10);
    const month = parseInt(value.substring(4, 6), 10) - 1;
    const day = parseInt(value.substring(6, 8), 10);
    return new Date(year, month, day);
  }

  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (match) {
    const [, y, m, d, hh, mm, ss, z] = match;
    const year = parseInt(y, 10);
    const month = parseInt(m, 10) - 1;
    const day = parseInt(d, 10);
    const hour = parseInt(hh, 10);
    const minute = parseInt(mm, 10);
    const second = parseInt(ss, 10);

    if (z) {
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    } else {
      return new Date(year, month, day, hour, minute, second);
    }
  }

  return new Date(value);
}

interface IcsEvent {
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  uid: string;
  rrule?: string;
}

function parseIcs(icsText: string): { summary: string; events: IcsEvent[] } {
  const unfolded = unfoldIcs(icsText);
  const lines = unfolded.split(/\r?\n/);
  
  let calSummary = "Calendário Importado";
  const events: IcsEvent[] = [];
  
  let currentEvent: Partial<IcsEvent> = {};
  let inEvent = false;

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;
    
    const colonIndex = cleanLine.indexOf(":");
    if (colonIndex === -1) continue;
    
    const key = cleanLine.substring(0, colonIndex);
    const val = cleanLine.substring(colonIndex + 1);
    
    const keyParts = key.split(";");
    const mainKey = keyParts[0].toUpperCase();

    if (mainKey === "X-WR-CALNAME") {
      calSummary = val;
    } else if (mainKey === "BEGIN" && val.toUpperCase() === "VEVENT") {
      inEvent = true;
      currentEvent = {};
    } else if (mainKey === "END" && val.toUpperCase() === "VEVENT") {
      inEvent = false;
      if (currentEvent.uid && currentEvent.start) {
        const start = currentEvent.start;
        const end = currentEvent.end || new Date(start.getTime() + 60 * 60 * 1000); // 1h default
        events.push({
          uid: currentEvent.uid,
          summary: currentEvent.summary || "Sem título",
          description: currentEvent.description,
          location: currentEvent.location,
          start,
          end,
          rrule: currentEvent.rrule,
        });
      }
    } else if (inEvent) {
      if (mainKey === "UID") {
        currentEvent.uid = val;
      } else if (mainKey === "SUMMARY") {
        currentEvent.summary = val.replace(/\\,/g, ",");
      } else if (mainKey === "DESCRIPTION") {
        currentEvent.description = val.replace(/\\n/g, "\n").replace(/\\,/g, ",");
      } else if (mainKey === "LOCATION") {
        currentEvent.location = val.replace(/\\,/g, ",");
      } else if (mainKey === "DTSTART") {
        currentEvent.start = parseIcsDate(val, keyParts);
      } else if (mainKey === "DTEND") {
        currentEvent.end = parseIcsDate(val, keyParts);
      } else if (mainKey === "RRULE") {
        currentEvent.rrule = val;
      }
    }
  }

  return { summary: calSummary, events };
}

// --- iCal Recurrence Expander ---
const dayMap: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

function expandEventOccurrences(evt: IcsEvent, windowStart: Date, windowEnd: Date): IcsEvent[] {
  if (!evt.rrule) {
    if (evt.start >= windowStart && evt.start <= windowEnd) {
      return [evt];
    }
    return [];
  }

  const occurrences: IcsEvent[] = [];
  
  // Parse RRULE
  const rruleParts = evt.rrule.split(";");
  let freq = "";
  let until: Date | null = null;
  let count = 9999;
  let interval = 1;
  let byDay: string[] = [];

  for (const part of rruleParts) {
    const [k, v] = part.split("=");
    if (!k || !v) continue;
    const key = k.toUpperCase();
    const val = v.toUpperCase();

    if (key === "FREQ") {
      freq = val;
    } else if (key === "UNTIL") {
      const cleanVal = val.replace("Z", "");
      if (cleanVal.length >= 8) {
        const y = parseInt(cleanVal.substring(0, 4), 10);
        const m = parseInt(cleanVal.substring(4, 6), 10) - 1;
        const d = parseInt(cleanVal.substring(6, 8), 10);
        if (cleanVal.includes("T")) {
          const hh = parseInt(cleanVal.substring(9, 11), 10) || 0;
          const mm = parseInt(cleanVal.substring(11, 13), 10) || 0;
          const ss = parseInt(cleanVal.substring(13, 15), 10) || 0;
          until = new Date(Date.UTC(y, m, d, hh, mm, ss));
        } else {
          until = new Date(Date.UTC(y, m, d, 23, 59, 59));
        }
      }
    } else if (key === "COUNT") {
      count = parseInt(val, 10);
    } else if (key === "INTERVAL") {
      interval = parseInt(val, 10);
    } else if (key === "BYDAY") {
      byDay = val.split(",");
    }
  }

  if (!freq) {
    if (evt.start >= windowStart && evt.start <= windowEnd) {
      return [evt];
    }
    return [];
  }

  const currentStart = new Date(evt.start.getTime());
  const currentEnd = new Date(evt.end.getTime());
  const durationMs = currentEnd.getTime() - currentStart.getTime();

  let occurrenceCount = 0;
  const maxLimitDate = until && until < windowEnd ? until : windowEnd;
  let safetyCounter = 0;

  while (currentStart <= maxLimitDate && occurrenceCount < count && safetyCounter < 5000) {
    safetyCounter++;
    
    // If the current date is within the window, check if it should be added
    if (currentStart >= windowStart) {
      let shouldAdd = true;
      if (freq === "WEEKLY" && byDay.length > 0) {
        const dayOfWeek = currentStart.getDay();
        const targetDays = byDay.map(d => dayMap[d.replace(/^-?\d+/, "")]);
        shouldAdd = targetDays.includes(dayOfWeek);
      }

      if (shouldAdd) {
        occurrences.push({
          ...evt,
          start: new Date(currentStart.getTime()),
          end: new Date(currentStart.getTime() + durationMs),
        });
        occurrenceCount++;
      }
    } else {
      let didOccur = true;
      if (freq === "WEEKLY" && byDay.length > 0) {
        const dayOfWeek = currentStart.getDay();
        const targetDays = byDay.map(d => dayMap[d.replace(/^-?\d+/, "")]);
        didOccur = targetDays.includes(dayOfWeek);
      }
      if (didOccur) {
        occurrenceCount++;
      }
    }

    // Increment currentStart based on frequency
    if (freq === "DAILY") {
      currentStart.setDate(currentStart.getDate() + interval);
    } else if (freq === "WEEKLY") {
      if (byDay.length > 0) {
        currentStart.setDate(currentStart.getDate() + 1);
      } else {
        currentStart.setDate(currentStart.getDate() + 7 * interval);
      }
    } else if (freq === "MONTHLY") {
      currentStart.setMonth(currentStart.getMonth() + interval);
    } else if (freq === "YEARLY") {
      currentStart.setFullYear(currentStart.getFullYear() + interval);
    } else {
      break;
    }
  }

  return occurrences;
}

export const calendarService = {
  // --- Calendars Services ---
  async getCalendar(userId: string, id: string): Promise<Calendar | null> {
    return calendarRepository.getCalendarById(userId, id);
  },

  async getCalendars(userId: string): Promise<Calendar[]> {
    const calendars = await calendarRepository.getCalendarsByUser(userId);
    
    // Background sync check for shared calendars
    const now = new Date();
    for (const cal of calendars) {
      if (cal.sharedUrl) {
        const updatedAtDate = new Date(cal.updatedAt);
        const diffMs = now.getTime() - updatedAtDate.getTime();
        const diffMins = diffMs / (1000 * 60);
        if (diffMins > 5) {
          calendarService.syncCalendar(userId, cal.id).catch((err) => {
            console.error(`[Background Sync] Error syncing calendar ${cal.id}:`, err);
          });
        }
      }
    }

    return calendars;
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
      sharedUrl: null,
      createdAt: now,
      updatedAt: now,
    };

    return calendarRepository.createCalendar(userId, newCalendar);
  },

  async deleteCalendar(userId: string, id: string): Promise<boolean> {
    return calendarRepository.deleteCalendar(userId, id);
  },

  // --- Shared Calendars Importing & Syncing ---
  
  async importSharedCalendar(
    userId: string,
    url: string,
    backgroundColor?: string
  ): Promise<Calendar> {
    const normalizedUrl = normalizeCalendarUrl(url);
    const id = "cal_" + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();

    const newCalendar: Calendar = {
      userId,
      id,
      summary: "Calendário Importado",
      backgroundColor: backgroundColor || "bg-blue-500",
      foregroundColor: "text-white",
      sharedUrl: normalizedUrl,
      createdAt: now,
      updatedAt: now,
    };

    const created = await calendarRepository.createCalendar(userId, newCalendar);
    
    // Initial sync
    await this.syncCalendar(userId, created.id);

    return created;
  },

  async syncCalendar(userId: string, calendarId: string): Promise<boolean> {
    const calendar = await calendarRepository.getCalendarById(userId, calendarId);
    if (!calendar || !calendar.sharedUrl) return false;

    try {
      const fetchUrl = normalizeCalendarUrl(calendar.sharedUrl);
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Falha ao buscar calendário compartilhado: ${response.statusText}`);
      }

      const icsText = await response.text();
      const { summary, events } = parseIcs(icsText);

      // Update calendar name/summary if it's currently placeholder
      if (calendar.summary === "Calendário Importado" || calendar.summary.trim() === "") {
        await calendarRepository.updateCalendar(userId, calendarId, {
          summary: summary || "Calendário Importado",
        });
      } else {
        // Touch updatedAt to prevent frequent background calls
        await calendarRepository.updateCalendar(userId, calendarId, {});
      }

      // Clear existing events for this calendar
      await calendarRepository.deleteEventsByCalendar(userId, calendarId);

      // Filter and expand events to keep only those within a reasonable window (1 month ago to 1 year ahead)
      const nowTime = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(nowTime.getMonth() - 1);
      const oneYearAhead = new Date();
      oneYearAhead.setFullYear(nowTime.getFullYear() + 1);

      const expandedEvents: IcsEvent[] = [];
      for (const evt of events) {
        const occurrences = expandEventOccurrences(evt, oneMonthAgo, oneYearAhead);
        expandedEvents.push(...occurrences);
      }

      // Prepare events for bulk insert
      const eventsToInsert = expandedEvents.map((evt) => {
        const eventId = "evt_" + Math.random().toString(36).substring(2, 11);
        return {
          userId,
          id: eventId,
          calendarId,
          summary: evt.summary,
          description: evt.description || null,
          location: evt.location || null,
          start: {
            dateTime: evt.start.toISOString(),
            timeZone: "America/Sao_Paulo",
          },
          end: {
            dateTime: evt.end.toISOString(),
            timeZone: "America/Sao_Paulo",
          },
          status: "confirmed" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      // Insert in bulk
      await calendarRepository.createEventsBulk(userId, eventsToInsert);

      return true;
    } catch (error) {
      console.error(`Erro ao sincronizar calendário ${calendarId}:`, error);
      return false;
    }
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
