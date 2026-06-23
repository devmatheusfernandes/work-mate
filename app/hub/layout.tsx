import { Sidebar } from "@/components/layout/sidebar";
import { ChatSidebar } from "@/components/layout/chat-sidebar";
import { CalendarSidebar } from "@/components/layout/calendar-sidebar";

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden lg:p-2 md:p-0 p-0">
        <div className="content-layout rounded-none lg:rounded-md w-full h-full overflow-y-auto">
          {children}
        </div>
      </main>
      <ChatSidebar />
      <CalendarSidebar />
    </div>
  );
}

