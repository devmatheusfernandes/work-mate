import { create } from "zustand";
import { Calendar, CalendarEvent } from "./calendar.schema";
import {
  getCalendarsAction,
  getEventsAction,
  createCalendarAction,
  deleteCalendarAction,
} from "./calendar.actions";
import { toast } from "sonner";

interface CalendarState {
  isSidebarOpen: boolean;
  selectedDate: string; // "YYYY-MM-DD"
  activeCalendarIds: string[];
  calendars: Calendar[];
  events: CalendarEvent[];
  isLoading: boolean;
  
  // Sidebar actions
  setSidebarOpen: (isOpen: boolean) => void;
  setSelectedDate: (date: string) => void;
  navigateDay: (direction: "prev" | "next") => void;
  setToday: () => void;
  
  // Data actions
  fetchCalendars: () => Promise<void>;
  fetchEvents: () => Promise<void>;
  toggleCalendarFilter: (calendarId: string) => void;
  
  // Mutations
  addCalendar: (summary: string, backgroundColor: string) => Promise<boolean>;
  removeCalendar: (id: string) => Promise<boolean>;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  isSidebarOpen: false,
  selectedDate: new Date().toISOString().split("T")[0],
  activeCalendarIds: [],
  calendars: [],
  events: [],
  isLoading: false,

  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  
  setSelectedDate: (date) => set({ selectedDate: date }),
  
  navigateDay: (direction) => {
    const current = new Date(get().selectedDate + "T12:00:00"); // Add timezone offset safety
    if (direction === "prev") {
      current.setDate(current.getDate() - 1);
    } else {
      current.setDate(current.getDate() + 1);
    }
    set({ selectedDate: current.toISOString().split("T")[0] });
  },

  setToday: () => {
    set({ selectedDate: new Date().toISOString().split("T")[0] });
  },

  fetchCalendars: async () => {
    set({ isLoading: true });
    try {
      const result = await getCalendarsAction({});
      if (result?.data?.success && result.data.calendars) {
        const calendars = result.data.calendars;
        // Default all calendar IDs as active if filter is empty
        const activeIds = get().activeCalendarIds.length === 0
          ? calendars.map((c) => c.id)
          : get().activeCalendarIds.filter((id) => calendars.some((c) => c.id === id));
        set({ calendars, activeCalendarIds: activeIds });
      }
    } catch (err) {
      console.error("Error fetching calendars:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchEvents: async () => {
    try {
      const result = await getEventsAction({});
      if (result?.data?.success && result.data.events) {
        set({ events: result.data.events });
      }
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  },

  toggleCalendarFilter: (calendarId) => {
    const active = get().activeCalendarIds;
    if (active.includes(calendarId)) {
      set({ activeCalendarIds: active.filter((id) => id !== calendarId) });
    } else {
      set({ activeCalendarIds: [...active, calendarId] });
    }
  },

  addCalendar: async (summary, backgroundColor) => {
    const toastId = toast.loading("Adicionando agenda...");
    try {
      const result = await createCalendarAction({
        summary,
        backgroundColor,
        foregroundColor: "text-white",
      });
      if (result?.data?.success && result.data.calendar) {
        toast.success("Agenda adicionada com sucesso!", { id: toastId });
        await get().fetchCalendars();
        return true;
      } else {
        toast.error("Erro ao adicionar agenda.", { id: toastId });
        return false;
      }
    } catch {
      toast.error("Erro ao adicionar agenda.", { id: toastId });
      return false;
    }
  },

  removeCalendar: async (id) => {
    const toastId = toast.loading("Removendo agenda...");
    try {
      const result = await deleteCalendarAction({ id });
      if (result?.data?.success) {
        toast.success("Agenda removida com sucesso!", { id: toastId });
        // Clean up from active filter
        set({
          activeCalendarIds: get().activeCalendarIds.filter((cid) => cid !== id),
        });
        await get().fetchCalendars();
        await get().fetchEvents();
        return true;
      } else {
        toast.error("Erro ao remover agenda.", { id: toastId });
        return false;
      }
    } catch {
      toast.error("Erro ao remover agenda.", { id: toastId });
      return false;
    }
  },
}));
