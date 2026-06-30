import { memoryRepository } from "./memory.repository";
import { encryptText, decryptText } from "@/lib/encryption";

export const memoryService = {
  async getUserMemories(userId: string) {
    const memories = await memoryRepository.getByUserId(userId);
    return memories.map(mem => ({
      ...mem,
      content: decryptText(mem.content)
    }));
  },

  async saveMemory(userId: string, content: string, isAuto: boolean = true) {
    const id = "mem_" + Math.random().toString(36).substring(2, 11);
    
    // Criptografar conteúdo antes de salvar
    const encryptedContent = encryptText(content);
    
    await memoryRepository.insert({
      id,
      userId,
      content: encryptedContent,
      isAuto
    });
    return id;
  },

  async deleteMemory(userId: string, memoryId: string) {
    const mem = await memoryRepository.findById(memoryId);
    if (!mem) throw new Error("Memória não encontrada.");
    if (mem.userId !== userId) throw new Error("Acesso negado.");
    
    await memoryRepository.deleteById(memoryId);
  }
};
