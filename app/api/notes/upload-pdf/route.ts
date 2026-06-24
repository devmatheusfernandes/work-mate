import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/safe-action";
import { notesStorageService } from "@/modules/notes/notes-storage.service";
import { notesService } from "@/modules/notes/notes.service";

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticação do usuário
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Extrair dados da requisição Multipart FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const folderId = formData.get("folderId") as string | null;
    const searchText = formData.get("searchText") as string | null; // Texto extraído do PDF no client-side

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Validar se o arquivo é um PDF
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Apenas arquivos PDF são permitidos" }, { status: 400 });
    }

    // Validar tamanho do arquivo (limite 10MB)
    const fileBytes = file.size;
    if (fileBytes > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "O arquivo PDF deve ter menos de 10MB" }, { status: 400 });
    }

    // 3. Gerar ID determinístico da nota para o caminho do arquivo
    const noteId = "note_" + Math.random().toString(36).substring(2, 11);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Fazer upload para o Supabase Storage
    const { fileUrl } = await notesStorageService.uploadPdf(
      user.id,
      noteId,
      buffer,
      file.name,
      file.type,
      fileBytes
    );

    // 4. Salvar a nota de PDF no banco via notesService (que também enfileirará na vetorização)
    const note = await notesService.createNote(user.id, {
      title: title || file.name.replace(/\.pdf$/i, ""),
      folderId: folderId || null,
      type: "pdf",
      fileUrl: fileUrl,
      fileSize: fileBytes,
      searchText: searchText || "", // O texto será indexado e vetorizado de forma assíncrona
      archived: false,
      trashed: false,
      isLocked: false,
      tagIds: [],
      pinned: false
    });

    return NextResponse.json({ success: true, note });
  } catch (error: unknown) {
    console.error("Erro no processamento de upload de PDF:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno no servidor de uploads." },
      { status: 500 }
    );
  }
}
