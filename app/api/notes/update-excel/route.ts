import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/safe-action";
import { notesStorageService } from "@/modules/notes/notes-storage.service";
import { notesService } from "@/modules/notes/notes.service";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticação
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Extrair dados da requisição Multipart FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const noteId = formData.get("noteId") as string | null;

    if (!file || !noteId) {
      return NextResponse.json({ error: "Arquivo ou ID da nota ausente" }, { status: 400 });
    }

    // 3. Validar se a nota existe e pertence ao usuário
    try {
      await notesService.getNote(user.id, noteId);
    } catch {
      return NextResponse.json({ error: "Nota não encontrada" }, { status: 404 });
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

    // 4. Obter array buffer e converter em Buffer para o SheetJS e Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Extrair texto da planilha para indexação semântica (RAG)
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
      
      extractedText = extractedText.trim().slice(0, 50_000);
    } catch (parseError) {
      console.warn("Não foi possível extrair texto da planilha Excel editada:", parseError);
    }

    // 6. Fazer upload para o Supabase Storage (sobrescrevendo com upsert: true)
    const { fileUrl } = await notesStorageService.uploadExcel(
      user.id,
      noteId,
      buffer,
      file.name,
      file.type || `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
      fileBytes
    );

    // 7. Atualizar a nota no banco de dados (que automaticamente re-vetorizará)
    const updatedNote = await notesService.updateNote(user.id, noteId, {
      fileUrl,
      fileSize: fileBytes,
      searchText: extractedText,
    });

    return NextResponse.json({ success: true, note: updatedNote });
  } catch (error: unknown) {
    console.error("Erro ao atualizar arquivo Excel:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
