import { notesService } from "@/modules/notes/notes.service";
import { getCurrentUser } from "@/lib/safe-action";
import { NotesDashboard } from "../../_components/notes-dashboard";

interface FolderPageProps {
  params: Promise<{
    folderId: string;
  }>;
}

export default async function FolderPage({ params }: FolderPageProps) {
  const resolvedParams = await params;
  const folderId = resolvedParams.folderId;

  const user = await getCurrentUser();
  const notes = await notesService.getNotes(user.id);
  const folders = await notesService.getFolders(user.id);
  const tags = await notesService.getTags(user.id);

  return (
    <div className="w-full h-full">
      <NotesDashboard
        notes={notes}
        folders={folders}
        tags={tags}
        activeFolderId={folderId}
      />
    </div>
  );
}
