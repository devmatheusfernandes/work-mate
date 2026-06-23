import { notesService } from "@/modules/notes/notes.service";
import { getCurrentUser } from "@/lib/safe-action";
import { NotesDashboard } from "./_components/notes-dashboard";

export default async function NotesRootPage() {
  const user = await getCurrentUser();
  const notes = await notesService.getNotes(user.id);
  const folders = await notesService.getFolders(user.id);
  const tags = await notesService.getTags(user.id);

  return (
    <NotesDashboard
      notes={notes}
      folders={folders}
      tags={tags}
      activeFolderId={null}
    />
  );
}