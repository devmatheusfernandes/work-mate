import { notesService } from "@/modules/notes/notes.service";
import { getCurrentUser } from "@/lib/safe-action";
import { TrashDashboard } from "./_components/trash-dashboard";
import { redirect } from "next/navigation";

export default async function TrashPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }
  const notes = await notesService.getNotes(user.id);
  const folders = await notesService.getFolders(user.id);

  return (
    <TrashDashboard
      notes={notes}
      folders={folders} 
      tags={[]}    />
  );
}