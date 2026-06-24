import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { notesStorageService } from "@/modules/notes/notes-storage.service";

export async function GET(req: NextRequest) {
  try {
    // Validar token de segurança
    const authHeader = req.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Usamos SQL puro no Drizzle para cruzar os objetos do Supabase Storage
    // com a nossa tabela de notas e encontrar arquivos órfãos (arquivos sem nota correspondente)
    const result = await db.execute(sql`
      SELECT name 
      FROM storage.objects 
      WHERE bucket_id = 'notes-files'
        AND substring(name from 'users/[^/]+/pdfs/([^.]+)\.pdf') NOT IN (
          SELECT id FROM notes
        )
    `);

    interface StorageRow { name: string }
    const orphanFiles = (result as unknown as StorageRow[]).map((r) => r.name);

    if (orphanFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhum arquivo órfão encontrado no storage.",
        deletedCount: 0,
      });
    }

    // Excluir fisicamente os arquivos órfãos do Supabase Storage
    for (const filePath of orphanFiles) {
      await notesStorageService.deletePdf(filePath);
    }

    return NextResponse.json({
      success: true,
      message: "Limpeza de storage concluída com sucesso.",
      deletedCount: orphanFiles.length,
      deletedFiles: orphanFiles,
    });
  } catch (error: unknown) {
    console.error("Erro no cron job cleanup-storage:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
