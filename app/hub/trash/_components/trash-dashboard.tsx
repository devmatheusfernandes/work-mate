"use client";

import { useMemo, useState } from "react";
import { Folder, Note, Tag } from "@/modules/notes/notes.schema";
import { Header, type HeaderAction } from "@/components/layout/header";
import { FolderCard } from "../../notes/_components/folder-card";
import { NoteCard } from "../../notes/_components/note-card";
import { SelectionActionBar } from "../../notes/_components/selection-action-bar";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyResults } from "@/components/ui/empty";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { updateNoteAction, updateFolderAction, deleteNoteAction, deleteFolderAction, emptyTrashAction } from "@/modules/notes/notes.actions";
import { useDevice } from "@/hooks/ui/use-device";
import { SearchBar } from "@/components/ui/search-bar";
import {
  Vault,
  VaultContent,
  VaultHeader,
  VaultTitle,
  VaultDescription,
  VaultFooter,
  VaultPrimaryButton,
  VaultSecondaryButton,
  VaultIcon,
} from "@/components/ui/vault";

interface TrashDashboardProps {
  notes: Note[];
  folders: Folder[];
  tags: Tag[];
}

export function TrashDashboard({
  notes,
  folders
}: TrashDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { isMobile } = useDevice();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk Selection States
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());

  // Filter folders and notes that are trashed
  const displayedFolders = useMemo(() => {
    return folders.filter((f) => f.trashed);
  }, [folders]);

  const displayedNotes = useMemo(() => {
    return notes.filter((n) => n.trashed);
  }, [notes]);

  // Filter both lists by search query
  const queryFilteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return displayedFolders;
    const q = searchQuery.toLowerCase();
    return displayedFolders.filter((f) => f.title.toLowerCase().includes(q));
  }, [displayedFolders, searchQuery]);

  const queryFilteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return displayedNotes;
    const q = searchQuery.toLowerCase();
    return displayedNotes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.searchText && n.searchText.toLowerCase().includes(q))
    );
  }, [displayedNotes, searchQuery]);

  // Check if selection is active
  const isSelectionActive = selectedNoteIds.size > 0 || selectedFolderIds.size > 0;

  // Toggle selection functions
  const toggleSelectNote = (id: string) => {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectFolder = (id: string) => {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedNoteIds(new Set());
    setSelectedFolderIds(new Set());
  };

  // Bulk Mutators
  const handleBulkDeletePermanently = async () => {
    const totalCount = selectedNoteIds.size + selectedFolderIds.size;
    const toastId = toast.loading(`Excluindo ${totalCount} itens permanentemente...`);

    try {
      // Hard delete notes
      for (const id of Array.from(selectedNoteIds)) {
        await deleteNoteAction({ id });
      }
      // Hard delete folders
      for (const id of Array.from(selectedFolderIds)) {
        await deleteFolderAction({ id });
      }

      toast.success("Itens excluídos permanentemente!", { id: toastId });
      handleClearSelection();
    } catch {
      toast.error("Erro ao excluir alguns itens.", { id: toastId });
    }
  };

  const handleBulkRestore = async () => {
    const totalCount = selectedNoteIds.size + selectedFolderIds.size;
    const toastId = toast.loading(`Restaurando ${totalCount} itens...`);

    try {
      // Restore notes
      for (const id of Array.from(selectedNoteIds)) {
        await updateNoteAction({ id, updates: { trashed: false, archived: false } });
      }
      // Restore folders
      for (const id of Array.from(selectedFolderIds)) {
        await updateFolderAction({ id, updates: { trashed: false, archived: false } });
      }

      toast.success("Itens restaurados com sucesso!", { id: toastId });
      handleClearSelection();
    } catch {
      toast.error("Erro ao restaurar alguns itens.", { id: toastId });
    }
  };

  const handleEmptyTrash = async () => {
    setIsDeleting(true);
    const toastId = toast.loading("Esvaziando lixeira...");
    try {
      const res = await emptyTrashAction({});
      if (res?.data?.success) {
        toast.success("Lixeira esvaziada com sucesso!", { id: toastId });
        setConfirmOpen(false);
      } else {
        toast.error("Erro ao esvaziar lixeira.", { id: toastId });
      }
    } catch {
      toast.error("Erro ao esvaziar lixeira.", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  const hasItems = queryFilteredFolders.length > 0 || queryFilteredNotes.length > 0;
  const originalHasItems = displayedFolders.length > 0 || displayedNotes.length > 0;

  const headerActions: HeaderAction[] = originalHasItems
    ? [
        {
          icon: <Trash2 className="size-5" />,
          label: "Esvaziar Lixeira",
          onClick: () => setConfirmOpen(true),
          className: "text-destructive hover:text-destructive hover:bg-destructive/10",
        },
      ]
    : [];

  return (
    <div>
      <Header
        title="Lixeira"
        className="contents"
        onSearchChange={isMobile ? setSearchQuery : undefined}
        showSubHeader={false}
        actions={headerActions}
      />

      <main className="container flex-1 py-6 flex flex-col gap-6">
        {/* Search Row */}
        {originalHasItems && (
          <div className="flex justify-end gap-4 w-full">
            <div className="w-full md:w-72">
              <SearchBar
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar na lixeira..."
              />
            </div>
          </div>
        )}

        {/* Dashboard Content Grid */}
        <div className="flex flex-col gap-6">
          {!hasItems ? (
            searchQuery ? (
              <EmptyResults searchQuery={searchQuery} />
            ) : (
              <Empty className="py-20 border-none bg-transparent">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Trash2 className="size-6 text-muted-foreground" />
                  </EmptyMedia>
                  <EmptyTitle>Lixeira vazia</EmptyTitle>
                  <EmptyDescription>
                    Nenhum item na lixeira. Notas e pastas excluídas no painel principal serão mantidas aqui.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )
          ) : (
            <>
              {/* Folders Section */}
              {queryFilteredFolders.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Pastas Excluídas ({queryFilteredFolders.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {queryFilteredFolders.map((folder) => (
                      <FolderCard
                        key={folder.id}
                        folder={folder}
                        mode="trash"
                        isSelected={selectedFolderIds.has(folder.id)}
                        onToggleSelect={() => toggleSelectFolder(folder.id)}
                        isSelectionActive={isSelectionActive}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Notes Section */}
              {queryFilteredNotes.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Notas Excluídas ({queryFilteredNotes.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {queryFilteredNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        mode="trash"
                        searchQuery={searchQuery}
                        isSelected={selectedNoteIds.has(note.id)}
                        onToggleSelect={() => toggleSelectNote(note.id)}
                        isSelectionActive={isSelectionActive}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Bulk Selection Floating Action Bar */}
      <SelectionActionBar
        selectedNoteIds={selectedNoteIds}
        selectedFolderIds={selectedFolderIds}
        onClear={handleClearSelection}
        onDelete={handleBulkDeletePermanently}
        onArchive={handleBulkRestore}
        mode="trash"
      />

      {/* Confirm Empty Trash Vault */}
      <Vault open={confirmOpen} onOpenChange={setConfirmOpen}>
        <VaultContent aria-label="Esvaziar lixeira">
          <VaultHeader showCloseButton={false}>
            <VaultIcon type="delete" />
            <VaultTitle>Esvaziar Lixeira?</VaultTitle>
            <VaultDescription>
              Esta ação excluirá permanentemente todos os itens na lixeira. Ela não poderá ser desfeita.
            </VaultDescription>
          </VaultHeader>

          <VaultFooter className="mt-6 flex gap-3">
            <VaultSecondaryButton
              disabled={isDeleting}
              onClick={() => setConfirmOpen(false)}
              className="flex-1"
            >
              Cancelar
            </VaultSecondaryButton>
            <VaultPrimaryButton
              disabled={isDeleting}
              onClick={handleEmptyTrash}
              variant="destructive"
              className="flex-1"
            >
              Esvaziar
            </VaultPrimaryButton>
          </VaultFooter>
        </VaultContent>
      </Vault>
    </div>
  );
}
