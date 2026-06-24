import { GoogleGenerativeAI, EmbedContentRequest } from "@google/generative-ai";
import { vectorRepository } from "./vector.repository";

// Inicializa a SDK do Gemini com a chave de API
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const vectorService = {
  // Gera o embedding para uma única string de texto
  async getEmbedding(text: string): Promise<number[]> {
    if (!genAI) {
      throw new Error("GEMINI_API_KEY não configurada no ambiente.");
    }
    
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const request = {
      content: { role: "user", parts: [{ text }] },
      outputDimensionality: 768,
    } as EmbedContentRequest & { outputDimensionality: number };
    const result = await model.embedContent(request);
    const embedding = result.embedding;
    
    if (!embedding || !embedding.values) {
      throw new Error("Erro ao gerar embedding com Gemini.");
    }
    
    return embedding.values;
  },

  // Gera embeddings em lote para otimizar chamadas HTTP
  async getBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!genAI) {
      throw new Error("GEMINI_API_KEY não configurada no ambiente.");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    
    // Gemini batch embed contents
    type BatchEmbedRequest = EmbedContentRequest & { model: string; outputDimensionality: number };
    const result = await model.batchEmbedContents({
      requests: texts.map((text): BatchEmbedRequest => ({
        content: { role: "user", parts: [{ text }] },
        model: "models/gemini-embedding-001",
        outputDimensionality: 768,
      })),
    });

    if (!result.embeddings) {
      throw new Error("Erro ao gerar embeddings em lote.");
    }

    return result.embeddings.map((e) => e.values ?? []);
  },

  // Adiciona ou atualiza um item na fila de vetorização
  async enqueue(userId: string, sourceId: string, sourceType: "note" | "pdf" | "task", contentToEmbed: string) {
    // Garante que não fiquem restos de tipos antigos (ex: nota que virou tarefa)
    await vectorRepository.deleteQueueItemsForOtherTypes(sourceId, sourceType);

    if (!contentToEmbed || contentToEmbed.trim() === "") {
      // Se não há texto para vetorizar, limpamos um possível item antigo
      await vectorRepository.deleteQueueItem(sourceId, sourceType);
      return;
    }
    await vectorRepository.enqueue(userId, sourceId, sourceType, contentToEmbed);
  },

  // Remove um item da fila (ex: deleção física da nota)
  async dequeue(sourceId: string, sourceType: "note" | "pdf" | "task") {
    await vectorRepository.deleteQueueItem(sourceId, sourceType);
  },

  // Processa a fila pendente de embeddings (chamado pelo Cron Job)
  async processQueue(batchSize = 100): Promise<{ processed: number; errors: number }> {
    const pendingItems = await vectorRepository.getPendingItems(batchSize);
    
    if (pendingItems.length === 0) {
      return { processed: 0, errors: 0 };
    }

    let processedCount = 0;
    let errorCount = 0;

    // Agrupamos em lotes de até 100 para chamar a API do Gemini de uma vez
    const textsToEmbed = pendingItems.map((item) => item.contentToEmbed);
    
    try {
      const embeddings = await this.getBatchEmbeddings(textsToEmbed);
      
      for (let i = 0; i < pendingItems.length; i++) {
        const item = pendingItems[i];
        const vectorValues = embeddings[i];
        
        try {
          await vectorRepository.updateEmbedding(item.id, vectorValues);
          processedCount++;
        } catch (dbErr) {
          console.error(`Erro ao salvar vetor no banco para o item ${item.id}:`, dbErr);
          await vectorRepository.markAsError(item.id);
          errorCount++;
        }
      }
    } catch (apiErr) {
      console.error("Erro no processamento em lote com a API Gemini, marcando itens individuais como erro:", apiErr);
      // Caso o lote inteiro falhe, marcamos individualmente como erro
      for (const item of pendingItems) {
        await vectorRepository.markAsError(item.id);
        errorCount++;
      }
    }

    return { processed: processedCount, errors: errorCount };
  },

  // Processa a fila pendente de embeddings de um usuário específico em tempo real
  async processUserQueue(userId: string): Promise<{ processed: number; errors: number }> {
    const pendingItems = await vectorRepository.getPendingItemsByUser(userId, 50);
    
    if (pendingItems.length === 0) {
      return { processed: 0, errors: 0 };
    }

    let processedCount = 0;
    let errorCount = 0;
    const textsToEmbed = pendingItems.map((item) => item.contentToEmbed);
    
    try {
      const embeddings = await this.getBatchEmbeddings(textsToEmbed);
      
      for (let i = 0; i < pendingItems.length; i++) {
        const item = pendingItems[i];
        const vectorValues = embeddings[i];
        
        try {
          await vectorRepository.updateEmbedding(item.id, vectorValues);
          processedCount++;
        } catch (dbErr) {
          console.error(`Erro ao salvar vetor no banco para o item ${item.id}:`, dbErr);
          await vectorRepository.markAsError(item.id);
          errorCount++;
        }
      }
    } catch (apiErr) {
      console.error("Erro no processamento da fila vetorial do usuário:", apiErr);
      for (const item of pendingItems) {
        await vectorRepository.markAsError(item.id);
        errorCount++;
      }
    }

    return { processed: processedCount, errors: errorCount };
  },

  // Vetoriza e salva um item imediatamente
  async embedNow(userId: string, sourceId: string, sourceType: "note" | "pdf" | "task", contentToEmbed: string) {
    // 1. Enfileira o item (upsert) e limpa tipos antigos
    await this.enqueue(userId, sourceId, sourceType, contentToEmbed);
    
    // 2. Gera o vetor
    const embedding = await this.getEmbedding(contentToEmbed);
    
    // 3. Salva no banco de dados e marca como synced
    const queueId = `${sourceType}_${sourceId}`;
    await vectorRepository.updateEmbedding(queueId, embedding);
  },

  // Realiza a busca semântica
  async search(userId: string, queryText: string, limit = 10) {
    if (!queryText || queryText.trim() === "") {
      return [];
    }

    // 1. Gera o embedding da consulta
    const queryVector = await this.getEmbedding(queryText);

    // 2. Busca os itens mais similares no Postgres usando o pgvector
    return vectorRepository.searchSimilarity(userId, queryVector, limit);
  }
};
