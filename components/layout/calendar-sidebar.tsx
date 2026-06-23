"use client";

import { useEffect } from "react";
import { useCalendarStore } from "@/modules/calendar/calendar.store";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MapPin,
  FileText,
  Clock,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDevice } from "@/hooks/ui/use-device";
import { Vault, VaultContent, VaultTitle } from "@/components/ui/vault";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function CalendarSidebar() {
  const router = useRouter();
  const {
    isSidebarOpen,
    setSidebarOpen,
    selectedDate,
    navigateDay,
    setToday,
    calendars,
    events,
    activeCalendarIds,
    fetchCalendars,
    fetchEvents,
    toggleCalendarFilter,
  } = useCalendarStore();

  const { isMobile, isStandalone } = useDevice();
  const isMobileOrPwa = isMobile || isStandalone;

  useEffect(() => {
    fetchCalendars();
    fetchEvents();
  }, [fetchCalendars, fetchEvents]);

  // Format date header (e.g. "Terça, 23 de Junho")
  const dateObj = new Date(selectedDate + "T12:00:00");
  const rawDateStr = dateObj.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const formattedDate = rawDateStr.charAt(0).toUpperCase() + rawDateStr.slice(1);

  // Filter events by selected date and active calendar list
  const filteredEvents = events.filter((evt) => {
    const eventDate = new Date(evt.start.dateTime).toISOString().split("T")[0];
    return eventDate === selectedDate && activeCalendarIds.includes(evt.calendarId);
  }).sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime());

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleGoToSettings = () => {
    setSidebarOpen(false);
    router.push("/hub/settings");
  };

  const renderSidebarContent = () => {
    return (
      <div className="h-full w-full flex flex-col bg-card rounded-xl">
        {/* Date Navigator Header */}
        <div className="p-4 border-b border-border/30 flex items-center justify-start shrink-0">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="size-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Agenda
            </span>
          </div>
          <button
            onClick={handleGoToSettings}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Gerenciar Agendas"
          >
            <Settings className="size-3.5" />
          </button>
        </div>

        {/* Date Switching Controls */}
        <div className="p-3 border-b border-border/20 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateDay("prev")}
              className="size-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs font-bold text-foreground text-center flex-1">
              {formattedDate}
            </span>
            <button
              onClick={() => navigateDay("next")}
              className="size-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="flex justify-center">
            <button
              onClick={setToday}
              className="px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold transition-all cursor-pointer"
            >
              Ir para Hoje
            </button>
          </div>
        </div>

        {/* Calendar Quick Toggle Filters */}
        {calendars.length > 0 && (
          <div className="px-4 py-2 border-b border-border/20 flex gap-2 flex-wrap items-center shrink-0">
            <span className="text-[9px] font-bold text-muted-foreground uppercase mr-1">Agendas:</span>
            {calendars.map((cal) => {
              const active = activeCalendarIds.includes(cal.id);
              return (
                <button
                  key={cal.id}
                  onClick={() => toggleCalendarFilter(cal.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold transition-all cursor-pointer",
                    active
                      ? cn("border-current bg-current/10", cal.backgroundColor.replace("bg-", "text-"))
                      : "border-border/50 text-muted-foreground opacity-50"
                  )}
                >
                  <span className={cn("size-1.5 rounded-full shrink-0", cal.backgroundColor)} />
                  {cal.summary}
                </button>
              );
            })}
          </div>
        )}

        {/* Events Schedule Scroll list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <CalendarIcon className="size-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs font-semibold text-muted-foreground">Sem compromissos</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Não há eventos agendados para este dia nas agendas selecionadas.
              </p>
            </div>
          ) : (
            filteredEvents.map((evt) => {
              const cal = calendars.find((c) => c.id === evt.calendarId);
              
              return (
                <div
                  key={evt.id}
                  className="item p-3 border-l-4 rounded-r-md flex flex-col gap-1.5"
                  style={{ borderLeftColor: cal ? `var(--${cal.backgroundColor.replace("bg-", "")})` : "var(--primary)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-foreground line-clamp-1 leading-tight flex-1">
                      {evt.summary}
                    </h4>
                    {cal && (
                      <span className={cn("text-[8px] font-bold px-1.5 py-0.2 rounded-full", cal.backgroundColor, "text-white")}>
                        {cal.summary}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                    <Clock className="size-3" />
                    <span>
                      {formatTime(evt.start.dateTime)} - {formatTime(evt.end.dateTime)}
                    </span>
                  </div>

                  {evt.location && (
                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/90">
                      <MapPin className="size-3 text-primary/70 shrink-0" />
                      <span className="truncate">{evt.location}</span>
                    </div>
                  )}

                  {evt.description && (
                    <div className="flex items-start gap-1.5 text-[9px] text-muted-foreground/80 mt-0.5 border-t border-border/10 pt-1.5">
                      <FileText className="size-3 text-muted-foreground/50 shrink-0 mt-0.5" />
                      <p className="line-clamp-2 leading-relaxed">{evt.description}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  if (isMobileOrPwa) {
    return (
      <Vault open={isSidebarOpen} onOpenChange={setSidebarOpen}>
        <VaultContent aria-label="Agenda" noPadding className="h-[80vh] max-h-[80vh]">
          <VaultTitle className="sr-only">Agenda</VaultTitle>
          <div className="h-full w-full overflow-hidden">
            {renderSidebarContent()}
          </div>
        </VaultContent>
      </Vault>
    );
  }

  return (
    <>
      {/* Floating Edge Trigger for Desktop (Stacked below ChatSidebar trigger) */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.button
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={() => setSidebarOpen(true)}
            className="fixed right-0 top-[58%] -translate-y-1/2 z-30 flex items-center justify-center w-6 h-16 bg-muted/80 hover:bg-muted border border-r-0 border-border/50 rounded-l-lg transition-all cursor-pointer"
          >
            <CalendarIcon className="size-4 text-primary" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Desktop Sliding Aside Sidebar (pushes layout) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
            className="relative h-full overflow-hidden shrink-0"
          >
            <div className="h-full w-full pl-[2px] py-2 pr-2">
              <div className="h-full w-[310px] bg-card rounded-xl overflow-hidden flex flex-col relative border border-border/20">
                {/* Header Close Arrow */}
                <div className="absolute top-3.5 right-4 z-20">
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center justify-center size-5 rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>

                <div className="flex-1 h-full w-full">
                  {renderSidebarContent()}
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
