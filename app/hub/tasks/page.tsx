import { notesService } from "@/modules/notes/notes.service";
import { getCurrentUser } from "@/lib/safe-action";
import { KanbanBoard } from "./_components/kanban-board";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function TasksPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }
  
  const allNotes = await notesService.getNotes(user.id);
  const tasks = allNotes.filter((n) => n.type === "task" && !n.archived && !n.trashed);
  const tags = await notesService.getTags(user.id);

  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">Carregando tarefas...</div>}>
      <KanbanBoard tasks={tasks} tags={tags} />
    </Suspense>
  );
}
