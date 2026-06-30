import { supabase } from "@/lib/supabase";

const BUCKET_NAME = "notes-files"; // Reusing the same bucket for simplicity and permissions

export const chatStorageService = {
  async uploadAudio(
    userId: string,
    sessionId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ fileUrl: string; filePath: string }> {
    const fileExtension = fileName.split(".").pop() || "webm";
    const randomId = Math.random().toString(36).substring(2, 11);
    const filePath = `users/${userId}/chat-audios/${sessionId}/${randomId}.${fileExtension}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.error("Erro no upload do Supabase Storage para áudio de chat:", error);
      throw new Error(`Falha ao fazer upload do áudio: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      fileUrl: urlData.publicUrl,
      filePath,
    };
  }
};
