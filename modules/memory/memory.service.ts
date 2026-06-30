import { memoryRepository } from "./memory.repository";

export const memoryService = {
  async getUserMemories(userId: string) {
    return memoryRepository.getByUserId(userId);
  },

  async saveMemory(userId: string, content: string, isAuto: boolean = true) {
    const id = "mem_" + Math.random().toString(36).substring(2, 11);
    await memoryRepository.insert({
      id,
      userId,
      content,
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
