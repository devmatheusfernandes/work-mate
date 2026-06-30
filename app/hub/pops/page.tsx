import { notesService } from "@/modules/notes/notes.service";
import { getCurrentUser } from "@/lib/safe-action";
import { NotesDashboard } from "../notes/_components/notes-dashboard";
import { redirect } from "next/navigation";

export default async function PopsRootPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }
  
  // O motor subjacente é o mesmo de notas
  const notes = await notesService.getNotes(user.id);
  const folders = await notesService.getFolders(user.id);
  const tags = await notesService.getTags(user.id);

  return (
    <NotesDashboard
      notes={notes}
      folders={folders}
      tags={tags}
      activeFolderId={null}
      mode="pops"
    />
  );
}
