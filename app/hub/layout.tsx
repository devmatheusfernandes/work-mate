import { Sidebar } from "@/components/layout/sidebar";
import { ChatSidebar } from "@/components/layout/chat-sidebar";
import { CalendarSidebar } from "@/components/layout/calendar-sidebar";
import { TasksSidebar } from "@/app/hub/notes/_components/tasks-sidebar";
import { MentionsSidebar } from "@/components/layout/mentions-sidebar";
import { getCurrentUser } from "@/lib/safe-action";
import { UserStoreInitializer } from "@/components/layout/user-store-initializer";

export const dynamic = 'force-dynamic';

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <UserStoreInitializer user={user} />
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden lg:p-2 md:p-0 p-0">
        <div className="content-layout rounded-none lg:rounded-xl w-full h-full overflow-y-auto">
          {children}
        </div>
      </main>
      <ChatSidebar />
      <CalendarSidebar />
      <TasksSidebar />
      <MentionsSidebar />
    </div>
  );
}
