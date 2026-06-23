import { notesService } from "@/modules/notes/notes.service";
import { getCurrentUser } from "@/lib/safe-action";
import { ArchiveDashboard } from "./_components/archive-dashboard";

export default async function ArchivePage() {
  const user = await getCurrentUser();
  const notes = await notesService.getNotes(user.id);
  const folders = await notesService.getFolders(user.id);
  const tags = await notesService.getTags(user.id);

  return (
    <ArchiveDashboard
      notes={notes}
      folders={folders}
      tags={tags}
    />
  );
}