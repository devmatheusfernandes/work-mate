"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createFolderAction } from "@/modules/notes/notes.actions";
import { saveOfflineItem } from "@/lib/offline-db";
import { Folder } from "@/modules/notes/notes.schema";
import {
  Vault,
  VaultContent,
  VaultHeader,
  VaultTitle,
  VaultDescription,
  VaultBody,
  VaultFooter,
  VaultPrimaryButton,
  VaultSecondaryButton,
  VaultField,
  VaultInput,
} from "@/components/ui/vault";

interface FolderVaultProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFolderId: string | null;
  onFolderCreatedOffline?: (folder: Folder) => void;
}

const tagColors = [
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-green-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-purple-500",
  "bg-pink-500",
];

export function FolderVault({
  open,
  onOpenChange,
  activeFolderId,
  onFolderCreatedOffline,
}: FolderVaultProps) {
  const [folderTitle, setFolderTitle] = useState("");
  const [folderColor, setFolderColor] = useState(tagColors[4]);
  const [isSubmittingFolder, setIsSubmittingFolder] = useState(false);

  const handleCreateFolder = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!folderTitle.trim()) return;

    setIsSubmittingFolder(true);
    const isOffline = typeof window !== "undefined" && !window.navigator.onLine;

    if (isOffline) {
      const tempId = `temp_folder_${Date.now()}`;
      const newFolder = {
        userId: "local",
        id: tempId,
        title: folderTitle.trim(),
        parentId: activeFolderId,
        color: folderColor,
        archived: false,
        trashed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isLocked: false,
      };

      try {
        await saveOfflineItem("folders", newFolder);
        await saveOfflineItem("syncQueue", {
          id: `op_${tempId}`,
          actionName: "createFolder",
          payload: {
            id: tempId,
            title: folderTitle.trim(),
            parentId: activeFolderId,
            color: folderColor,
          },
          timestamp: Date.now(),
        });

        toast.success("Pasta criada offline!");
        setFolderTitle("");
        onOpenChange(false);
        if (onFolderCreatedOffline) {
          onFolderCreatedOffline(newFolder);
        } else {
          window.location.reload();
        }
      } catch (err) {
        console.error(err);
        toast.error("Erro ao criar pasta offline.");
      } finally {
        setIsSubmittingFolder(false);
      }
      return;
    }

    const toastId = toast.loading("Criando pasta...");
    try {
      const res = await createFolderAction({
        title: folderTitle.trim(),
        parentId: activeFolderId,
        color: folderColor,
      });

      if (res?.data?.success) {
        toast.success("Pasta criada com sucesso!", { id: toastId });
        setFolderTitle("");
        onOpenChange(false);
      } else {
        toast.error(res?.serverError || "Erro ao criar pasta.", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado ao criar pasta.", { id: toastId });
    } finally {
      setIsSubmittingFolder(false);
    }
  }, [folderTitle, folderColor, activeFolderId, onFolderCreatedOffline, onOpenChange]);

  return (
    <Vault open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <VaultContent aria-label="Criar Pasta">
        <VaultHeader>
          <VaultTitle>Nova Pasta</VaultTitle>
          <VaultDescription>Organize seus estudos e notas em um diretório próprio.</VaultDescription>
        </VaultHeader>
        <VaultBody>
          <VaultField label="Nome da Pasta" required>
            <VaultInput
              placeholder="Ex: Engenharia de Software"
              value={folderTitle}
              onChange={(e) => setFolderTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && folderTitle.trim()) {
                  handleCreateFolder();
                }
              }}
            />
          </VaultField>

          <VaultField label="Cor da Pasta">
            <div className="flex flex-wrap gap-2 pt-1">
              {tagColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFolderColor(color)}
                  className={cn(
                    "size-8 rounded-full border border-border/40 transition-all cursor-pointer",
                    color,
                    folderColor === color && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                />
              ))}
            </div>
          </VaultField>
        </VaultBody>
        <VaultFooter>
          <VaultSecondaryButton onClick={() => onOpenChange(false)}>
            Cancelar
          </VaultSecondaryButton>
          <VaultPrimaryButton
            onClick={() => handleCreateFolder()}
            disabled={!folderTitle.trim() || isSubmittingFolder}
          >
            {isSubmittingFolder ? "Criando..." : "Criar Pasta"}
          </VaultPrimaryButton>
        </VaultFooter>
      </VaultContent>
    </Vault>
  );
}
