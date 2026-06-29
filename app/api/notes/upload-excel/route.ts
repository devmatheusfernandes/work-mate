import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/safe-action";
import { notesStorageService } from "@/modules/notes/notes-storage.service";
import { notesService } from "@/modules/notes/notes.service";
import * as XLSX from "xlsx";

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

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Validar se o arquivo é um tipo de planilha aceito (xlsx, xls, csv)
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    const allowedExtensions = ["xlsx", "xls", "csv"];
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    const isValidMime = allowedMimeTypes.includes(file.type);
    const isValidExt = fileExtension ? allowedExtensions.includes(fileExtension) : false;

    if (!isValidMime && !isValidExt) {
      return NextResponse.json(
        { error: "Apenas arquivos Excel (.xlsx, .xls) ou CSV (.csv) são permitidos" },
        { status: 400 }
      );
    }

    // Validar tamanho do arquivo (limite 10MB)
    const fileBytes = file.size;
    if (fileBytes > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "O arquivo de planilha deve ter menos de 10MB" }, { status: 400 });
    }

    // 3. Obter array buffer e converter em Buffer para o SheetJS e Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Extrair texto da planilha server-side para indexação semântica (RAG)
    let extractedText = "";
    try {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        // Converte a planilha em formato CSV
        const csvText = XLSX.utils.sheet_to_csv(sheet);
        if (csvText.trim()) {
          extractedText += `Planilha/Aba: ${sheetName}\n${csvText}\n\n`;
        }
      }
      
      // Limita a 50.000 caracteres para não exceder limites do modelo de embedding
      extractedText = extractedText.trim().slice(0, 50_000);
    } catch (parseError) {
      console.warn("Não foi possível extrair texto da planilha Excel:", parseError);
      // Continua sem texto extraído: a planilha ainda é salva, mas sem busca semântica por conteúdo
    }

    // 5. Fazer upload para o Supabase Storage
    const noteId = "note_" + Math.random().toString(36).substring(2, 11);
    const { fileUrl } = await notesStorageService.uploadExcel(
      user.id,
      noteId,
      buffer,
      file.name,
      file.type || `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
      fileBytes
    );

    // 6. Salvar a nota de planilha no banco via notesService (que também vetorizará imediatamente)
    const note = await notesService.createNote(user.id, {
      title: title || file.name.replace(/\.[^/.]+$/i, ""),
      folderId: folderId || null,
      type: "excel",
      fileUrl: fileUrl,
      fileSize: fileBytes,
      searchText: extractedText, // Texto em CSV indexado e vetorizado
      archived: false,
      trashed: false,
      isLocked: false,
      tagIds: [],
      pinned: false
    });

    return NextResponse.json({ success: true, note });
  } catch (error: unknown) {
    console.error("Erro no processamento de upload de Excel:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno no servidor de uploads." },
      { status: 500 }
    );
  }
}
