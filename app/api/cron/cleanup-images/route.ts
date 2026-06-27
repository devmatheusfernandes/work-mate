import { NextRequest, NextResponse } from "next/server";
import { notesRepository } from "@/modules/notes/notes.repository";
import { notesStorageService } from "@/modules/notes/notes-storage.service";

// Purge images soft-deleted more than 7 days ago
const PURGE_AFTER_DAYS = 7;

export async function GET(req: NextRequest) {
  try {
    // Validate cron secret
    const authHeader = req.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Find all images soft-deleted more than PURGE_AFTER_DAYS ago
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - PURGE_AFTER_DAYS);

    const expiredImages = await notesRepository.getExpiredDeletedEditorImages(cutoffDate);

    if (expiredImages.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhuma imagem expirada encontrada.",
        purgedCount: 0,
      });
    }

    let purgedCount = 0;
    const errors: string[] = [];

    for (const image of expiredImages) {
      try {
        // Delete from Supabase Storage
        await notesStorageService.deleteImage(image.filePath);
        // Hard-delete the DB record
        await notesRepository.hardDeleteEditorImage(image.id);
        purgedCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Falha ao purgar imagem ${image.id} (${image.filePath}):`, msg);
        errors.push(`${image.id}: ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Purga concluída: ${purgedCount} imagens removidas.`,
      purgedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    console.error("Erro no cron job cleanup-images:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
