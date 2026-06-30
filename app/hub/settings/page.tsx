import { calendarService } from "@/modules/calendar/calendar.service";
import { getCurrentUser } from "@/lib/safe-action";
import { SettingsContainer } from "./_components/settings-container";
import { Header } from "@/components/layout/header";
import { redirect } from "next/navigation";
import { memoryService } from "@/modules/memory/memory.service";
import { notesStorageService } from "@/modules/notes/notes-storage.service";
import { db } from "@/lib/db";
import { embeddingsQueueTable } from "@/modules/vector/vector.schema";
import { notesTable } from "@/modules/notes/notes.schema";
import { eq, and, count } from "drizzle-orm";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  const [
    calendars,
    storageUsedBytes,
    syncedResult,
    queuePendingResult,
    queueErrorResult,
    totalActiveNotesResult,
    memories,
  ] = await Promise.all([
    calendarService.getCalendars(user.id),
    notesStorageService.getUserStorageUsage(user.id),
    // Items confirmed vectorized (synced in embeddings table)
    db
      .select({ total: count() })
      .from(embeddingsQueueTable)
      .where(and(eq(embeddingsQueueTable.userId, user.id), eq(embeddingsQueueTable.syncStatus, "synced"))),
    // Items waiting in the queue (explicit pending status)
    db
      .select({ total: count() })
      .from(embeddingsQueueTable)
      .where(and(eq(embeddingsQueueTable.userId, user.id), eq(embeddingsQueueTable.syncStatus, "pending"))),
    // Items that errored during vectorization
    db
      .select({ total: count() })
      .from(embeddingsQueueTable)
      .where(and(eq(embeddingsQueueTable.userId, user.id), eq(embeddingsQueueTable.syncStatus, "error"))),
    // All active (non-trashed) notes — to compute "not yet vectorized" count
    db
      .select({ total: count() })
      .from(notesTable)
      .where(and(eq(notesTable.userId, user.id), eq(notesTable.trashed, false))),
    // User AI Memories
    memoryService.getUserMemories(user.id),
  ]);

  const vectorizedItems = syncedResult[0]?.total ?? 0;
  const queuePending = queuePendingResult[0]?.total ?? 0;
  const queueErrors = queueErrorResult[0]?.total ?? 0;
  const totalActiveNotes = totalActiveNotesResult[0]?.total ?? 0;
  // "Not vectorized" = active notes that are NOT synced in the embeddings table.
  // This matches exactly what the note cards show as "IA Pendente".
  const notVectorizedItems = Math.max(0, totalActiveNotes - vectorizedItems);

  const usageStats = {
    storageUsedBytes,
    storageLimitBytes: 200 * 1024 * 1024, // 200 MB
    vectorizedItems,
    totalActiveNotes,
    notVectorizedItems,
    queuePending,
    queueErrors,
    // Limits from the codebase
    maxPdfFileSizeMb: 10,
    maxExcelFileSizeMb: 10,
    maxImageFileSizeMb: 5,
    maxEmbeddingTextChars: 50_000,
    embeddingModel: "gemini-embedding-001",
    embeddingDimensions: 768,
    aiModel: "gemini-2.5-flash",
    ragTopResults: 5,
    batchEmbedSize: 100,
  };

  return (
    <>
      <Header
        title="Configurações"
        subtitle="Gerencie sua conta, aparência e calendário"
        className="contents"
        showSubHeader={true}
        user={user}
      />
      <main className="container">
        <SettingsContainer initialCalendars={calendars} initialMemories={memories} user={user} usageStats={usageStats} />
      </main>
    </>
  );
}