import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { grammarTopicFor } from './grammar-rules';
import { GrammarRepository } from './grammar.repository';

/**
 * Gắn chủ điểm ngữ pháp chính cho câu Part 5/6 từ nhãn dạng câu + 4 lựa chọn. Câu admin đã sửa
 * (grammar_tag_source = 'admin') không bao giờ bị gắn lại. Chạy khi khởi động, khi cần (câu mới /
 * nhãn dạng câu đổi) và khi admin bấm "Gắn lại".
 */
@Injectable()
export class GrammarTaggingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(GrammarTaggingService.name);
  private running: Promise<number> | null = null;
  private checkedAt = 0;

  constructor(private readonly repo: GrammarRepository) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test') return;
    void this.ensureTagged().catch((e: unknown) =>
      this.logger.warn(`Gắn chủ điểm ngữ pháp lỗi: ${String(e)}`),
    );
  }

  /** Gắn câu mới / câu đổi nhãn dạng câu. Kiểm tra tối đa mỗi 60 giây. */
  async ensureTagged(force = false): Promise<void> {
    if (!force && Date.now() - this.checkedAt < 60_000) return;
    this.checkedAt = Date.now();
    if (!(await this.repo.needsTagging())) return;
    await this.tagIds(await this.repo.staleQuestionIds());
  }

  /** Gắn lại toàn bộ câu không do admin sửa. Trả số câu đã xử lý. */
  async retagAll(): Promise<number> {
    const rows = await this.repo.questionsToTag(true);
    return this.apply(rows);
  }

  private async tagIds(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;
    if (this.running) return this.running;
    this.running = (async () => {
      let n = 0;
      for (let i = 0; i < ids.length; i += 500) {
        n += await this.apply(
          await this.repo.questionsForTagging(ids.slice(i, i + 500)),
        );
      }
      return n;
    })();
    try {
      return await this.running;
    } finally {
      this.running = null;
    }
  }

  private async apply(
    rows: {
      id: number;
      questionCategory: string | null;
      questionText: string | null;
      answers: { answerText: string | null }[];
    }[],
  ): Promise<number> {
    if (rows.length === 0) return 0;
    const topics = await this.repo.listTopics(true);
    const idOf = new Map(topics.map((t) => [t.slug, t.id]));
    const groups = new Map<number | null, number[]>();
    for (const q of rows) {
      const slug = grammarTopicFor(
        q.questionCategory,
        q.answers.map((a) => a.answerText ?? ''),
        q.questionText,
      );
      const topicId = slug ? (idOf.get(slug) ?? null) : null;
      const list = groups.get(topicId) ?? [];
      list.push(q.id);
      groups.set(topicId, list);
    }
    await this.repo.setQuestionTopics(groups, 'auto');
    return rows.length;
  }
}
