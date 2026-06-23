import { notesService } from "@/modules/notes/notes.service";
import { getCurrentUser } from "@/lib/safe-action";
import { TrashDashboard } from "./_components/trash-dashboard";

export default async function TrashPage() {
  const user = await getCurrentUser();
  const notes = await notesService.getNotes(user.id);
  const folders = await notesService.getFolders(user.id);

  return (
    <TrashDashboard
      notes={notes}
      folders={folders} 
      tags={[]}    />
  );
}