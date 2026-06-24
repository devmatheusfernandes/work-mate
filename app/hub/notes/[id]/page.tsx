import { notesService } from "@/modules/notes/notes.service";
import { getCurrentUser } from "@/lib/safe-action";
import { Header } from "@/components/layout/header";
import { buttonVariants } from "@/components/ui/button-variants";
import { FileText, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NoteEditorClient } from "./note-editor-client";
import { redirect } from "next/navigation";

interface NotePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function NotePage({ params }: NotePageProps) {
  const resolvedParams = await params;
  const noteId = resolvedParams.id;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }
  const note = await notesService.getNote(user.id, noteId);

  const backHref = note.folderId
    ? `/hub/notes/folder/${note.folderId}`
    : "/hub/notes";

  if (note.type === "pdf") {
    return (
      <div className="flex flex-col h-full min-h-screen pb-10">
        <Header
          title={note.title}
          backHref={backHref}
          showSubHeader={false}
          className="contents"
          user={user}
        />

        <main className="container flex-1 py-6 flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={backHref}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "flex items-center gap-2 cursor-pointer"
              )}
            >
              <ArrowLeft className="size-4" />
              Voltar
            </Link>

            {note.fileUrl && (
              <a
                href={note.fileUrl}
                download={note.title}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "flex items-center gap-2 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/95"
                )}
              >
                <Download className="size-4" />
                Baixar PDF
              </a>
            )}
          </div>

          {note.fileUrl ? (
            <div className="flex-1 w-full h-[75vh] min-h-[500px] border border-border/40 rounded-2xl overflow-hidden bg-muted/10 shadow-none">
              <iframe
                title={note.title}
                src={note.fileUrl}
                className="w-full h-full border-none"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border/60 rounded-2xl bg-muted/5">
              <FileText className="size-12 text-muted-foreground/60 mb-3" />
              <h3 className="text-base font-bold text-foreground">Arquivo ausente</h3>
              <p className="text-sm text-muted-foreground mt-1">Este PDF não possui um link de arquivo válido.</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Text note editing flow
  return (
    <div className="w-full h-full min-h-screen">
      <NoteEditorClient note={note} />
    </div>
  );
}
