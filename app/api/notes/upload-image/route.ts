import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/safe-action";
import { notesService } from "@/modules/notes/notes.service";

// Allowed image MIME types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];
// Max file size: 5MB
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    // 1. Verify authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Extract multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const noteId = formData.get("noteId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhuma imagem enviada" }, { status: 400 });
    }

    if (!noteId) {
      return NextResponse.json({ error: "noteId é obrigatório" }, { status: 400 });
    }

    // 3. Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido. Use JPEG, PNG, GIF, WEBP ou AVIF." },
        { status: 400 }
      );
    }

    // 4. Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "A imagem deve ter menos de 5MB" }, { status: 400 });
    }

    // 5. Upload to Supabase Storage and register in DB
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { fileUrl } = await notesService.uploadEditorImage(
      user.id,
      noteId,
      buffer,
      file.name,
      file.type,
      file.size
    );

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: unknown) {
    console.error("Erro no upload de imagem do editor:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
