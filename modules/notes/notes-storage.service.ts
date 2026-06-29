import { supabase } from "@/lib/supabase";
import { db } from "@/lib/db";
import { notesTable } from "./notes.schema";
import { eq, sum } from "drizzle-orm";

const BUCKET_NAME = "notes-files";
const MAX_STORAGE_BYTES = 200 * 1024 * 1024; // 200 MB de limite por usuário

export const notesStorageService = {
  // Retorna o total de bytes de PDFs consumidos pelo usuário no banco
  async getUserStorageUsage(userId: string): Promise<number> {
    const result = await db
      .select({ totalSize: sum(notesTable.fileSize) })
      .from(notesTable)
      .where(eq(notesTable.userId, userId));
    
    return Number(result[0]?.totalSize || 0);
  },

  // Realiza o upload do PDF para o Supabase Storage
  async uploadPdf(
    userId: string,
    noteId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    fileSize: number
  ): Promise<{ fileUrl: string; filePath: string }> {
    // 1. Validar cota de armazenamento
    const currentUsage = await this.getUserStorageUsage(userId);
    if (currentUsage + fileSize > MAX_STORAGE_BYTES) {
      throw new Error("Limite de armazenamento excedido (máximo de 200MB).");
    }

    // 2. Definir caminho do arquivo no bucket
    const fileExtension = fileName.split(".").pop() || "pdf";
    const filePath = `users/${userId}/pdfs/${noteId}.${fileExtension}`;

    // 3. Fazer upload para o Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.error("Erro no upload do Supabase Storage:", error);
      throw new Error(`Falha ao fazer upload do arquivo: ${error.message}`);
    }

    // 4. Obter a URL pública (ou assinada se o bucket for privado)
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      fileUrl: urlData.publicUrl,
      filePath,
    };
  },

  // Realiza o upload de planilhas para o Supabase Storage
  async uploadExcel(
    userId: string,
    noteId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    fileSize: number
  ): Promise<{ fileUrl: string; filePath: string }> {
    // 1. Validar cota de armazenamento
    const currentUsage = await this.getUserStorageUsage(userId);
    if (currentUsage + fileSize > MAX_STORAGE_BYTES) {
      throw new Error("Limite de armazenamento excedido (máximo de 200MB).");
    }

    // 2. Definir caminho do arquivo no bucket
    const fileExtension = fileName.split(".").pop() || "xlsx";
    const filePath = `users/${userId}/excels/${noteId}.${fileExtension}`;

    // 3. Fazer upload para o Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.error("Erro no upload do Supabase Storage:", error);
      throw new Error(`Falha ao fazer upload do arquivo Excel: ${error.message}`);
    }

    // 4. Obter a URL pública
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      fileUrl: urlData.publicUrl,
      filePath,
    };
  },

  // Deleta um arquivo Excel do Supabase Storage
  async deleteExcel(filePath: string): Promise<void> {
    if (!filePath) return;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error(`Erro ao deletar arquivo Excel "${filePath}" do Supabase Storage:`, error);
      throw new Error(`Falha ao deletar planilha do storage: ${error.message}`);
    }
  },

  // Realiza o upload de imagens do editor para o Supabase Storage
  async uploadImage(
    userId: string,
    noteId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ fileUrl: string; filePath: string }> {
    const fileExtension = fileName.split(".").pop() || "png";
    const randomId = Math.random().toString(36).substring(2, 11);
    const filePath = `users/${userId}/images/${noteId}/${randomId}.${fileExtension}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.error("Erro no upload do Supabase Storage:", error);
      throw new Error(`Falha ao fazer upload da imagem: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      fileUrl: urlData.publicUrl,
      filePath,
    };
  },

  // Deleta um arquivo de imagem do Supabase Storage
  async deleteImage(filePath: string): Promise<void> {
    if (!filePath) return;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error(`Erro ao deletar imagem "${filePath}" do Supabase Storage:`, error);
      throw new Error(`Falha ao deletar imagem do storage: ${error.message}`);
    }
  },

  // Deleta um arquivo PDF do Supabase Storage
  async deletePdf(filePath: string): Promise<void> {
    if (!filePath) return;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error(`Erro ao deletar arquivo "${filePath}" do Supabase Storage:`, error);
      throw new Error(`Falha ao deletar arquivo do storage: ${error.message}`);
    }
  },

  // Gera uma URL assinada (temporária) para arquivos em buckets privados
  async getSignedUrl(filePath: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error) {
      console.error(`Erro ao gerar URL assinada para "${filePath}":`, error);
      throw new Error(`Erro ao gerar URL do arquivo: ${error.message}`);
    }

    return data.signedUrl;
  }
};
