
import { getCurrentUser } from "@/lib/safe-action";
import { ChatInterface } from "@/modules/chat/_components/chat-interface";

export default async function ChatPage() {
  await getCurrentUser();

  return (
    <div className="h-full flex flex-col min-w-0 bg-background">
      <ChatInterface />
    </div>
  );
}