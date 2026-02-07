import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VectorStoreIndex, Settings } from 'llamaindex';
import { OpenAIEmbedding, openai } from '@llamaindex/openai';
import { PGVectorStore } from '@llamaindex/postgres';
import { TextNode } from 'llamaindex';

interface ChatMessageItem {
  role: 'user' | 'assistant';
  content: string;
}

interface MemoryResult {
  enhancedPrompt: string;
  recentHistory: ChatMessageItem[];
}

@Injectable()
export class ChatMemoryService {
  private readonly logger = new Logger('ChatMemory');

  constructor(private readonly prisma: PrismaService) {}

  private ensureSettings() {
    Settings.embedModel = new OpenAIEmbedding({
      model: 'text-embedding-3-small',
      dimensions: 1536,
    });
    Settings.llm = openai({
      model: 'gpt-4o',
      temperature: 0.7,
      apiKey: process.env.OPENAI_API_KEY,
      additionalSessionOptions: {
        baseURL: process.env.OPENAI_BASE_URL,
      },
    });
  }

  private getCollectionName(agentId: string): string {
    return `chat_memory_${agentId}`;
  }

  private async createVectorStore(agentId: string): Promise<PGVectorStore> {
    this.ensureSettings();
    const pgVectorStore = new PGVectorStore({
      clientConfig: {
        connectionString: process.env.DATABASE_URL,
      },
      dimensions: 1536,
      performSetup: true,
    });
    pgVectorStore.setCollection(this.getCollectionName(agentId));
    return pgVectorStore;
  }

  private async createIndex(vectorStore: PGVectorStore): Promise<VectorStoreIndex> {
    return await VectorStoreIndex.fromVectorStore(vectorStore);
  }

  /**
   * 处理聊天记忆：裁剪历史 + RAG 检索 + 增强 prompt
   */
  async processMemory(
    agentId: string,
    sessionId: string,
    currentMessage: string,
    fullHistory: ChatMessageItem[],
    systemPrompt: string,
  ): Promise<MemoryResult> {
    // 裁剪：只取最近 10 条作为 recentHistory
    const recentHistory = fullHistory.slice(-10);

    // RAG 检索相关旧对话（跨 Session）
    let relevantContext = '';
    try {
      const relevantDocs = await this.retrieveRelevantHistory(agentId, currentMessage);
      if (relevantDocs.length > 0) {
        relevantContext =
          '\n\n## 相关历史对话记忆\n以下是与当前话题相关的历史对话片段，供你参考：\n' +
          relevantDocs.map((doc, i) => `[记忆 ${i + 1}] ${doc}`).join('\n');
        this.logger.log(`[processMemory] 检索到 ${relevantDocs.length} 条相关记忆`);
      }
    } catch (error) {
      this.logger.warn(`[processMemory] RAG 检索失败，跳过记忆增强: ${error}`);
    }

    const enhancedPrompt = systemPrompt + relevantContext;

    return { enhancedPrompt, recentHistory };
  }

  /**
   * RAG 检索 Agent 级别的历史对话（跨 Session）
   */
  async retrieveRelevantHistory(agentId: string, query: string): Promise<string[]> {
    const vectorStore = await this.createVectorStore(agentId);
    const index = await this.createIndex(vectorStore);

    const retriever = index.asRetriever({ similarityTopK: 20 });
    const nodes = await retriever.retrieve(query);

    if (nodes.length === 0) {
      return [];
    }

    // 筛选策略：取 score > 0.9 的条目，或 top 6，取两者中更多的
    const highScoreNodes = nodes.filter((n: any) => (n.score || 0) > 0.9);
    const top6 = nodes.slice(0, 6);
    const selected = highScoreNodes.length > top6.length ? highScoreNodes : top6;

    // 按 metadata 中的 timestamp 排序（如果有的话）
    const sorted = selected.sort((a: any, b: any) => {
      const tsA = a.node?.metadata?.timestamp || 0;
      const tsB = b.node?.metadata?.timestamp || 0;
      return tsA - tsB;
    });

    return sorted.map((n: any) => {
      const text = n.node?.text || n.node?.getContent?.() || '';
      const score = (n.score || 0).toFixed(4);
      this.logger.log(`[retrieveRelevantHistory] score=${score}, text=${text.substring(0, 80)}...`);
      return text;
    });
  }

  /**
   * 异步向量化较早的 Q&A 对（不阻塞响应）
   */
  async vectorizeOlderPairs(
    agentId: string,
    sessionId: string,
    fullHistory: ChatMessageItem[],
  ): Promise<void> {
    try {
      // 提取所有 Q&A 对
      const pairs: Array<{ index: number; user: string; assistant: string }> = [];
      for (let i = 0; i < fullHistory.length - 1; i++) {
        if (fullHistory[i].role === 'user' && fullHistory[i + 1].role === 'assistant') {
          pairs.push({
            index: Math.floor(i / 2),
            user: fullHistory[i].content,
            assistant: fullHistory[i + 1].content,
          });
        }
      }

      // 排除最近 5 对，只向量化更早的
      if (pairs.length <= 5) {
        return;
      }
      const olderPairs = pairs.slice(0, pairs.length - 5);

      // 查询已处理的去重标识
      const collection = this.getCollectionName(agentId);
      const existingRows: Array<{ metadata: any }> = await this.prisma.$queryRawUnsafe(
        `SELECT metadata FROM public.llamaindex_embedding WHERE collection = $1 AND metadata->>'session_id' = $2 AND metadata->>'type' = 'chat_memory'`,
        collection,
        sessionId,
      );
      const existingKeys = new Set(
        existingRows.map((r) => `${r.metadata?.session_id}_${r.metadata?.pair_index}`),
      );

      // 过滤已处理的
      const newPairs = olderPairs.filter(
        (p) => !existingKeys.has(`${sessionId}_${p.index}`),
      );

      if (newPairs.length === 0) {
        this.logger.log(`[vectorizeOlderPairs] 无新的 Q&A 对需要向量化`);
        return;
      }

      this.logger.log(
        `[vectorizeOlderPairs] 准备向量化 ${newPairs.length} 个 Q&A 对 (agent=${agentId}, session=${sessionId})`,
      );

      // 构建 TextNode
      const nodes = newPairs.map((p) => {
        const text = `用户: ${p.user}\n助手: ${p.assistant}`;
        const node = new TextNode({
          text,
          metadata: {
            session_id: sessionId,
            agent_id: agentId,
            pair_index: p.index,
            type: 'chat_memory',
            timestamp: Date.now(),
          },
        });
        return node;
      });

      const vectorStore = await this.createVectorStore(agentId);
      const index = await this.createIndex(vectorStore);
      await index.insertNodes(nodes);

      this.logger.log(
        `[vectorizeOlderPairs] 成功向量化 ${nodes.length} 个 Q&A 对`,
      );
    } catch (error) {
      this.logger.error(`[vectorizeOlderPairs] 向量化失败: ${error}`);
    }
  }
}
