import { Suspense } from "react";
import { getCurrentUser } from "@/lib/safe-action";
import { ChatInterface } from "@/modules/chat/_components/chat-interface";
import { ShareTargetHandler } from "./_components/ShareTargetHandler";

export default async function ChatPage() {
  await getCurrentUser();

  return (
    <div className="h-full flex flex-col min-w-0 bg-background">
      <ChatInterface />
      <Suspense fallback={null}>
        <ShareTargetHandler />
      </Suspense>
    </div>
  );
}