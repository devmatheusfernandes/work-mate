"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Trash2 } from "lucide-react";
import { createTagAction, deleteTagAction } from "@/modules/notes/notes.actions";
import { saveOfflineItem, deleteOfflineItem } from "@/lib/offline-db";
import { Tag } from "@/modules/notes/notes.schema";
import {
  Vault,
  VaultContent,
  VaultHeader,
  VaultTitle,
  VaultDescription,
  VaultBody,
  VaultPrimaryButton,
  VaultInput,
} from "@/components/ui/vault";

interface TagVaultProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: Tag[];
  onTagCreatedOffline?: (tag: Tag) => void;
  onTagDeletedOffline?: (tagId: string) => void;
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

const springConfig = { type: "spring", stiffness: 400, damping: 28, mass: 0.8 } as const;

export function TagVault({
  open,
  onOpenChange,
  tags,
  onTagCreatedOffline,
  onTagDeletedOffline,
}: TagVaultProps) {
  const [newTagTitle, setNewTagTitle] = useState("");
  const [newTagColor, setNewTagColor] = useState(tagColors[0]);
  const [isSubmittingTag, setIsSubmittingTag] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);

  const handleCreateTag = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTagTitle.trim()) return;

    setIsSubmittingTag(true);
    const isOffline = typeof window !== "undefined" && !window.navigator.onLine;

    if (isOffline) {
      const tempId = `temp_tag_${Date.now()}`;
      const newTag = {
        userId: "local",
        id: tempId,
        title: newTagTitle.trim(),
        color: newTagColor,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await saveOfflineItem("tags", newTag);
        await saveOfflineItem("syncQueue", {
          id: `op_${tempId}`,
          actionName: "createTag",
          payload: {
            id: tempId,
            title: newTagTitle.trim(),
            color: newTagColor,
          },
          timestamp: Date.now(),
        });

        toast.success("Tag criada offline!");
        setNewTagTitle("");
        if (onTagCreatedOffline) {
          onTagCreatedOffline(newTag);
        } else {
          window.location.reload();
        }
      } catch (err) {
        console.error(err);
        toast.error("Erro ao criar tag offline.");
      } finally {
        setIsSubmittingTag(false);
      }
      return;
    }

    try {
      const res = await createTagAction({
        title: newTagTitle.trim(),
        color: newTagColor,
      });

      if (res?.data?.success) {
        toast.success("Tag criada com sucesso!");
        setNewTagTitle("");
      } else {
        toast.error(res?.serverError || "Erro ao criar tag.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar tag.");
    } finally {
      setIsSubmittingTag(false);
    }
  }, [newTagTitle, newTagColor, onTagCreatedOffline]);

  const handleDeleteTag = useCallback(async (tagId: string) => {
    setDeletingTagId(tagId);
    const isOffline = typeof window !== "undefined" && !window.navigator.onLine;

    if (isOffline) {
      try {
        await deleteOfflineItem("tags", tagId);
        await saveOfflineItem("syncQueue", {
          id: `op_del_tag_${tagId}_${Date.now()}`,
          actionName: "deleteTag",
          payload: { id: tagId },
          timestamp: Date.now(),
        });
        toast.success("Tag excluída offline.");
        if (onTagDeletedOffline) {
          onTagDeletedOffline(tagId);
        } else {
          window.location.reload();
        }
      } catch (err) {
        console.error(err);
        toast.error("Erro ao excluir tag offline.");
      } finally {
        setDeletingTagId(null);
      }
      return;
    }

    try {
      const res = await deleteTagAction({ id: tagId });
      if (res?.data?.success) {
        toast.success("Tag excluída.");
      } else {
        toast.error("Erro ao excluir tag.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir tag.");
    } finally {
      setDeletingTagId(null);
    }
  }, [onTagDeletedOffline]);

  return (
    <Vault open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <VaultContent aria-label="Tags">
        <VaultHeader>
          <VaultTitle>Organizar Tags</VaultTitle>
          <VaultDescription>Crie novas tags ou remova as existentes.</VaultDescription>
        </VaultHeader>
        <VaultBody>
          <div className="border border-border/50 bg-muted/20 p-3 rounded-lg flex flex-col gap-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Nova Tag</div>
            <div className="flex gap-2">
              <VaultInput
                placeholder="Nome da tag..."
                value={newTagTitle}
                onChange={(e) => setNewTagTitle(e.target.value)}
                className="flex-1"
              />
              <VaultPrimaryButton
                onClick={() => handleCreateTag()}
                disabled={!newTagTitle.trim() || isSubmittingTag}
                className="px-4 py-2"
              >
                Criar
              </VaultPrimaryButton>
            </div>

            <div className="flex flex-wrap gap-2 pt-1 justify-center">
              {tagColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewTagColor(color)}
                  className={cn(
                    "size-6 rounded-full border border-border/40 transition-all cursor-pointer",
                    color,
                    newTagColor === color && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Tags Existentes</div>
            {tags.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">Nenhuma tag criada.</div>
            ) : (
              <AnimatePresence initial={false}>
                {tags.map((tag) => (
                  <motion.div
                    key={tag.id}
                    layout
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1, transition: springConfig }}
                    exit={{ opacity: 0, x: 16, scale: 0.94, transition: { duration: 0.18, ease: "easeIn" } }}
                    className="flex items-center justify-between border border-border/40 px-3 py-2 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("size-2.5 rounded-full shrink-0", tag.color)} />
                      <span className="text-sm font-medium">{tag.title}</span>
                    </div>
                    <motion.button
                      onClick={() => handleDeleteTag(tag.id)}
                      disabled={deletingTagId === tag.id}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.88 }}
                      className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer disabled:opacity-40 p-1"
                    >
                      {deletingTagId === tag.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </VaultBody>
      </VaultContent>
    </Vault>
  );
}
