"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDevice } from "@/hooks/ui/use-device";
import { useChatStore } from "@/modules/chat/chat.store";
import { ChatInterface } from "@/modules/chat/_components/chat-interface";
import { Vault, VaultContent, VaultTitle } from "@/components/ui/vault";
import { cn } from "@/lib/utils";
import { CreateButton } from "@/app/hub/notes/_components/create-button";

export function ChatSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSidebarOpen, setSidebarOpen } = useChatStore();
  const { isMobile, isStandalone } = useDevice();
  const isMobileOrPwa = isMobile || isStandalone;

  // If we are already on the Chat page, do not render the sidebar or the toggle button
  if (pathname === "/hub/chat") {
    return null;
  }

  const handleNavigateToFullPage = () => {
    setSidebarOpen(false);
    router.push("/hub/chat");
  };

  const isNotesPage = pathname.startsWith("/hub/notes");

  if (isMobileOrPwa) {
    return (
      <>
        {/* Floating Unified FAB Trigger for Mobile: Only render if we are NOT on the Notes page */}
        {!isNotesPage && (
          <CreateButton activeFolderId={null} tags={[]} />
        )}

        {/* Responsive Mobile Drawer using Vault */}
        <Vault open={isSidebarOpen} onOpenChange={setSidebarOpen}>
          <VaultContent aria-label="Assistente IA" noPadding className="h-[85vh] max-h-[85vh]">
            <VaultTitle className="sr-only">Assistente IA</VaultTitle>
            <div className="h-full w-full overflow-hidden">
              <ChatInterface
                isSidebar
                onNavigateToFullPage={handleNavigateToFullPage}
              />
            </div>
          </VaultContent>
        </Vault>
      </>
    );
  }

  return (
    <>
      {/* Floating Edge Trigger for Desktop */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.button
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={() => setSidebarOpen(true)}
            className={cn(
              "fixed right-0 top-1/3 -translate-y-1/2 z-40",
              "flex items-center justify-center gap-1.5 w-10 h-14",
              "bg-primary hover:bg-primary/95 text-white",
              "border border-r-0 border-primary/10 rounded-l-xl transition-all duration-200 cursor-pointer hover:w-12"
            )}
          >
            <Sparkles className="size-5 animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Desktop Sliding Aside Sidebar (pushes layout) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 390, opacity: 1 }} // 380px chat width + 2px left gap + 8px right padding = 390px
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
            className="relative h-full overflow-hidden shrink-0"
          >
            <div className="h-full w-full pl-[2px] py-2 pr-2">
              <div className="h-full w-[380px] bg-card rounded-xl overflow-hidden flex flex-col relative">
                {/* Header Close Arrow */}
                <div className="absolute top-2.5 left-2 z-20">
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center justify-center size-7 rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>

                {/* Chat Content */}
                <div className="flex-1 h-full w-full">
                  <ChatInterface
                    isSidebar
                    onNavigateToFullPage={handleNavigateToFullPage}
                  />
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
