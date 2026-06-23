import { notesService } from "@/modules/notes/notes.service";
import { getCurrentUser } from "@/lib/safe-action";
import { KanbanBoard } from "./_components/kanban-board";

export default async function TasksPage() {
  const user = await getCurrentUser();
  const allNotes = await notesService.getNotes(user.id);
  const tasks = allNotes.filter((n) => n.type === "task" && !n.archived && !n.trashed);

  return <KanbanBoard tasks={tasks} />;
}
