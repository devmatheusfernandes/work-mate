import { NextRequest, NextResponse } from "next/server";
import { vectorService } from "@/modules/vector/vector.service";

export async function POST(req: NextRequest) {
  try {
    // Validar token Bearer de segurança
    const authHeader = req.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Processa até 100 itens pendentes na fila
    const result = await vectorService.processQueue(100);
    
    return NextResponse.json({
      success: true,
      message: "Fila de vetorização processada com sucesso.",
      ...result,
    });
  } catch (error: unknown) {
    console.error("Erro no cron job process-queue:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno no servidor." },
      { status: 500 }
    );
  }
}

// Suporta GET para acionamento rápido e testes manuais
export async function GET(req: NextRequest) {
  return POST(req);
}
