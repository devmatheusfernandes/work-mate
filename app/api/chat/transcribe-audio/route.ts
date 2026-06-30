import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/safe-action";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

const SUPPORTED_MIME_TYPES: Record<string, string> = {
  "audio/ogg": "audio/ogg",
  "audio/opus": "audio/ogg",
  "audio/mp4": "audio/mp4",
  "audio/m4a": "audio/mp4",
  "audio/mpeg": "audio/mpeg",
  "audio/mp3": "audio/mpeg",
  "audio/wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/webm": "audio/webm",
  "audio/x-m4a": "audio/mp4",
};

// Map extensions to MIME types (fallback)
const EXT_TO_MIME: Record<string, string> = {
  opus: "audio/ogg",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  webm: "audio/webm",
};

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("audio") as File | null;
    const mode = (formData.get("mode") as string) || "both"; // "transcribe" | "summarize" | "both"

    if (!file) {
      return NextResponse.json({ success: false, error: "Nenhum arquivo de áudio enviado." }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: `Arquivo muito grande. O limite é 15MB. Tamanho recebido: ${(file.size / 1024 / 1024).toFixed(1)}MB.` },
        { status: 413 }
      );
    }

    // Resolve MIME type
    const rawMime = file.type?.toLowerCase() || "";
    const ext = file.name?.split(".").pop()?.toLowerCase() || "";
    const mimeType = SUPPORTED_MIME_TYPES[rawMime] || EXT_TO_MIME[ext] || "";

    if (!mimeType) {
      return NextResponse.json(
        { success: false, error: "Formato de áudio não suportado. Use .opus, .m4a, .mp3, .wav, .ogg ou .webm." },
        { status: 415 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Serviço de IA não configurado." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Build prompt based on mode
    let textPrompt: string;
    if (mode === "transcribe") {
      textPrompt = `Você é um transcritor profissional. Faça a transcrição literal e completa deste áudio em português. 
Retorne APENAS o texto transcrito, sem comentários, sem formatação extra, sem cabeçalhos.
Se o áudio estiver em outro idioma, transcreva no idioma original e adicione uma tradução ao final entre parênteses.`;
    } else if (mode === "summarize") {
      textPrompt = `Você é um assistente especializado em resumos. Escute este áudio e crie um resumo estruturado em português.
Formato de resposta:
**📌 Resumo:**
[Resumo objetivo em 2-5 frases]

**🎯 Pontos principais:**
- [ponto 1]
- [ponto 2]
- [etc.]

Se houver tarefas, decisões ou itens de ação mencionados, liste-os separadamente como "**✅ Ações identificadas:**".`;
    } else {
      // both — transcribe + summarize
      textPrompt = `Você é um assistente especializado em processar áudios. Analise este áudio e retorne em português:

**📝 Transcrição:**
[Texto literal do que foi falado]

---

**📌 Resumo:**
[Resumo objetivo em 2-4 frases capturando os pontos essenciais]

**🎯 Pontos principais:**
- [ponto 1]
- [ponto 2]
- [etc.]

Se houver tarefas, decisões ou compromissos mencionados, adicione:
**✅ Ações identificadas:**
- [ação 1]

Responda apenas com o conteúdo estruturado acima, sem comentários adicionais.`;
    }

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: textPrompt },
          ],
        },
      ],
    });

    const responseText = result.response.text();

    // Upload audio to Supabase
    let audioUrl = null;
    try {
      const sessionId = request.headers.get("x-session-id") || "temp-session";
      // We need to import chatStorageService
      const { chatStorageService } = await import("@/modules/chat/chat-storage.service");
      const buffer = Buffer.from(arrayBuffer);
      const { fileUrl } = await chatStorageService.uploadAudio(
        user.id,
        sessionId,
        buffer,
        file.name,
        mimeType
      );
      audioUrl = fileUrl;
    } catch (uploadErr) {
      console.error("Failed to upload audio to Supabase:", uploadErr);
    }

    return NextResponse.json({
      success: true,
      result: responseText,
      fileName: file.name,
      fileSizeMB: (file.size / 1024 / 1024).toFixed(2),
      mode,
      audioUrl,
    });
  } catch (error) {
    console.error("[transcribe-audio] Erro:", error);
    const message = error instanceof Error ? error.message : "Erro interno ao processar o áudio.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
