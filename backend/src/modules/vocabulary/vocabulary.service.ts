import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UserVocab, VocabEntry } from '../../generated/prisma/client';
import type {
  CardDto,
  CreateEntryDto,
  EntriesQueryDto,
  EntryDto,
  EntryListDto,
  LookupDto,
  NotebookListDto,
  NotebookQueryDto,
  QueueDto,
  SaveBatchDto,
  SaveResultDto,
  SaveWordDto,
  SummaryDto,
  UpdateEntryDto,
  UpdateWordDto,
  WordDto,
} from './dto/vocabulary.dto';
import { VocabularyRepository } from './vocabulary.repository';
import {
  assignTags,
  countByPart,
  lemmaCandidates,
  previewIntervals,
  schedule,
  SRS,
  wordKey,
  type Rating,
} from './vocab-rules';

const VN_OFFSET = 7 * 3600_000;
/** 00:00 hôm nay theo giờ Việt Nam (mốc "từ mới mỗi ngày"). */
export function vnDayStart(now: Date): Date {
  const local = new Date(now.getTime() + VN_OFFSET);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
      VN_OFFSET,
  );
}

/**
 * Từ vựng: kho từ (V02/V04), sổ từ cá nhân (V07), ôn SRS SM-2 (V06), lưu từ từ bài nghe/đọc (L08/V11).
 * Lịch ôn tính ở server; client chỉ gửi nút đánh giá.
 */
@Injectable()
export class VocabularyService implements OnApplicationBootstrap {
  private readonly logger = new Logger(VocabularyService.name);
  private tagging: Promise<number> | null = null;

  constructor(
    private readonly repo: VocabularyRepository,
    private readonly config: ConfigService,
  ) {}

  now(): Date {
    return new Date();
  }

  onApplicationBootstrap(): void {
    if (this.config.get<string>('NODE_ENV') === 'test') return;
    void this.ensureTagged().catch((err: unknown) =>
      this.logger.error(`Gắn nhãn từ vựng lỗi: ${String(err)}`),
    );
  }

  // =================== Tra từ ===================

  async lookup(userId: string, word: string): Promise<LookupDto> {
    const key = wordKey(word);
    const candidates = lemmaCandidates(word);
    const [saved, found] = await Promise.all([
      this.findSaved(userId, candidates),
      this.findInBank(candidates),
    ]);
    return { word: key, found, saved: saved ? this.toWord(saved) : null };
  }

  private async findSaved(
    userId: string,
    keys: string[],
  ): Promise<UserVocab | null> {
    for (const k of keys) {
      const row = await this.repo.findByKey(userId, k);
      if (row) return row;
    }
    return null;
  }

  /** Kho: 600 từ / từ admin trước, rồi từ trong bộ flashcard. Ưu tiên dạng đúng nguyên văn. */
  private async findInBank(keys: string[]) {
    const entries = await this.repo.findEntriesByKeys(keys);
    const entry = keys
      .map((k) => entries.find((e) => e.wordKey === k))
      .find((e) => e && e.definitionVi);
    if (entry) {
      return {
        source: 'entry',
        entry_id: entry.id,
        word: entry.word,
        phonetic: entry.phonetic,
        definition_vi: entry.definitionVi,
        definition_en: entry.definitionEn,
        example: entry.example,
        part: entry.toeicPart,
        level: entry.level,
      };
    }
    const pack = (await this.repo.findPackWords(keys)).find(
      (p) => p.definition_vi,
    );
    if (pack) {
      return {
        source: 'pack',
        pack_word_id: pack.id,
        word: pack.word,
        phonetic: pack.phonetic,
        definition_vi: pack.definition_vi,
        definition_en: pack.definition_en,
        example: pack.example_sentence,
        part: null,
        level: null,
      };
    }
    return null;
  }

  // =================== Sổ từ ===================

  async save(userId: string, dto: SaveWordDto): Promise<SaveResultDto> {
    if (!wordKey(dto.word))
      throw new UnprocessableEntityException({
        code: 'INVALID_WORD',
        message: 'Từ không hợp lệ',
      });
    // Có trong kho (kể cả dạng gốc: "companies" → "company") thì lưu theo từ gốc để không trùng
    const bank = await this.findInBank(lemmaCandidates(dto.word));
    const word = bank?.word?.trim() || dto.word.trim();
    const key = wordKey(word);
    const existing = await this.repo.findByKey(userId, key);
    if (existing) {
      // Không tạo trùng; bổ sung câu ngữ cảnh nếu dòng cũ chưa có
      const updated =
        !existing.example && dto.example
          ? await this.repo.update(existing.id, { example: dto.example })
          : existing;
      return { word: this.toWord(updated), already: true };
    }
    const definition = dto.definition_vi?.trim() || bank?.definition_vi || null;
    if (!definition) {
      throw new UnprocessableEntityException({
        code: 'DEFINITION_REQUIRED',
        message: 'Kho chưa có nghĩa của từ này — hãy nhập nghĩa tiếng Việt',
      });
    }
    const row = await this.repo.create({
      userId,
      word,
      wordKey: key,
      phonetic: dto.phonetic?.trim() || bank?.phonetic || null,
      definitionVi: definition,
      definitionEn: dto.definition_en?.trim() || bank?.definition_en || null,
      example: dto.example?.trim() || bank?.example || null,
      note: dto.note?.trim() || null,
      source: dto.source,
      sourceRef: dto.source_ref ?? null,
      entryId: bank?.source === 'entry' ? (bank.entry_id ?? null) : null,
      toeicPart: bank?.part ?? null,
      level: bank?.level ?? null,
    });
    return { word: this.toWord(row), already: false };
  }

  /** Lưu nhiều từ (cả bộ flashcard / danh sách theo Part). Từ đã có thì bỏ qua. */
  async saveBatch(
    userId: string,
    dto: SaveBatchDto,
  ): Promise<{ added: number; skipped: number }> {
    const [entries, packs] = await Promise.all([
      this.repo.findEntriesByIds(dto.entry_ids ?? []),
      this.repo.findPackWordsByIds(dto.pack_word_ids ?? []),
    ]);
    const rows = new Map<
      string,
      Parameters<VocabularyRepository['createMany']>[0][number]
    >();
    for (const e of entries) {
      rows.set(e.wordKey, {
        userId,
        word: e.word,
        wordKey: e.wordKey,
        phonetic: e.phonetic,
        definitionVi: e.definitionVi,
        example: e.example,
        source: e.source === 'toeic600' ? 'toeic600' : 'manual',
        entryId: e.id,
        toeicPart: e.toeicPart,
        level: e.level,
      });
    }
    for (const p of packs) {
      const key = wordKey(p.word);
      if (!key || rows.has(key) || !p.definitionVi) continue;
      rows.set(key, {
        userId,
        word: p.word.trim(),
        wordKey: key,
        phonetic: p.phonetic,
        definitionVi: p.definitionVi,
        definitionEn: p.definitionEn,
        example: p.exampleSentence,
        source: 'pack',
        sourceRef: String(p.id),
      });
    }
    const total = rows.size;
    const added = await this.repo.createMany([...rows.values()]);
    return { added, skipped: total - added };
  }

  async list(userId: string, q: NotebookQueryDto): Promise<NotebookListDto> {
    const page = q.page ?? 1;
    const limit = q.limit ?? 30;
    const { total, items } = await this.repo.listNotebook(
      userId,
      {
        q: q.q,
        sources: q.sources,
        parts: q.parts,
        levels: q.levels,
        states: q.states,
        due: q.due,
      },
      page,
      limit,
      this.now(),
    );
    return { total, page, limit, items: items.map((i) => this.toWord(i)) };
  }

  async savedWords(userId: string): Promise<{ words: string[] }> {
    return { words: [...(await this.repo.savedKeys(userId)).keys()] };
  }

  async update(
    userId: string,
    id: number,
    dto: UpdateWordDto,
  ): Promise<WordDto> {
    await this.own(userId, id);
    const row = await this.repo.update(id, {
      ...(dto.definition_vi !== undefined
        ? { definitionVi: dto.definition_vi.trim() }
        : {}),
      ...(dto.phonetic !== undefined
        ? { phonetic: dto.phonetic.trim() || null }
        : {}),
      ...(dto.example !== undefined
        ? { example: dto.example.trim() || null }
        : {}),
      ...(dto.note !== undefined ? { note: dto.note.trim() || null } : {}),
    });
    return this.toWord(row);
  }

  async remove(userId: string, id: number): Promise<void> {
    if ((await this.repo.delete(userId, id)) === 0) throw this.notFound();
  }

  async summary(userId: string): Promise<SummaryDto> {
    const now = this.now();
    const [s, settings] = await Promise.all([
      this.repo.notebookSummary(userId, now, vnDayStart(now)),
      this.repo.settings(userId),
    ]);
    const perDay = settings?.newPerDay ?? SRS.defaultNewPerDay;
    return {
      total: s.total,
      due: s.due,
      new_available: Math.max(
        0,
        Math.min(s.newCount, perDay - s.introducedToday),
      ),
      new_count: s.newCount,
      learning: s.learning,
      review: s.review,
      mastered: s.mastered,
      reviewed_today: s.reviewedToday,
      new_per_day: perDay,
    };
  }

  // =================== SRS ===================

  async queue(userId: string): Promise<QueueDto> {
    const now = this.now();
    const sum = await this.summary(userId);
    const [due, fresh] = await Promise.all([
      this.repo.dueCards(userId, now, 100),
      this.repo.newCards(userId, sum.new_available),
    ]);
    const cards: CardDto[] = [...due, ...fresh].map((c) => ({
      ...this.toWord(c),
      intervals: previewIntervals(this.srsOf(c), now),
    }));
    return {
      cards,
      due: sum.due,
      new_today: sum.new_available,
      new_per_day: sum.new_per_day,
    };
  }

  async review(userId: string, id: number, rating: Rating): Promise<CardDto> {
    const card = await this.own(userId, id);
    const now = this.now();
    if (
      card.state !== 'new' &&
      card.dueAt &&
      card.dueAt.getTime() > now.getTime() + 60_000
    ) {
      throw new ConflictException({
        code: 'NOT_DUE',
        message: 'Từ này chưa đến hạn ôn',
      });
    }
    const next = schedule(this.srsOf(card), rating, now);
    const row = await this.repo.review(
      id,
      {
        ease: next.ease,
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        lapses: next.lapses,
        state: next.state,
        dueAt: next.dueAt,
        lastReviewedAt: now,
        introducedAt: card.introducedAt ?? now,
      },
      { rating, intervalDays: next.intervalDays },
    );
    return {
      ...this.toWord(row),
      intervals: previewIntervals(this.srsOf(row), now),
    };
  }

  async saveSettings(userId: string, newPerDay: number) {
    await this.repo.saveSettings(userId, newPerDay);
    return this.summary(userId);
  }

  // =================== Kho từ (V02/V04) ===================

  async entries(userId: string, q: EntriesQueryDto): Promise<EntryListDto> {
    await this.ensureTagged();
    const page = q.page ?? 1;
    const limit = q.limit ?? 40;
    const [{ total, items }, saved, facets] = await Promise.all([
      this.repo.listEntries(
        { parts: q.parts, levels: q.levels, q: q.q },
        page,
        limit,
      ),
      this.repo.savedKeys(userId),
      this.repo.entryFacets(),
    ]);
    return {
      total,
      items: items.map((e) => this.toEntry(e, saved.has(e.wordKey))),
      facets,
    };
  }

  async updateEntry(id: number, dto: UpdateEntryDto): Promise<EntryDto> {
    if (!(await this.repo.findEntry(id))) throw this.notFound();
    const row = await this.repo.updateEntry(id, {
      ...(dto.part !== undefined ? { toeicPart: dto.part } : {}),
      ...(dto.level !== undefined ? { level: dto.level } : {}),
      ...(dto.definition_vi !== undefined
        ? { definitionVi: dto.definition_vi }
        : {}),
      ...(dto.phonetic !== undefined ? { phonetic: dto.phonetic } : {}),
      ...(dto.example !== undefined ? { example: dto.example } : {}),
      ...(dto.part !== undefined || dto.level !== undefined
        ? { tagSource: 'admin', taggedAt: new Date() }
        : {}),
    });
    return this.toEntry(row, false);
  }

  async createEntry(dto: CreateEntryDto): Promise<EntryDto> {
    const key = wordKey(dto.word);
    const exists = await this.repo.findEntriesByKeys([key]);
    if (exists.length)
      throw new ConflictException({
        code: 'ENTRY_EXISTS',
        message: 'Từ đã có trong kho',
      });
    const row = await this.repo.createEntry({
      word: dto.word.trim(),
      wordKey: key,
      definitionVi: dto.definition_vi,
      phonetic: dto.phonetic ?? null,
      example: dto.example ?? null,
      toeicPart: dto.part ?? null,
      level: dto.level ?? null,
      source: 'admin',
      tagSource: dto.part || dto.level ? 'admin' : null,
    });
    return this.toEntry(row, false);
  }

  /** Gắn nhãn khi còn từ chưa gắn (khởi động, hoặc trước khi đọc kho). Gọi đồng thời → chạy một lần. */
  ensureTagged(): Promise<number> {
    this.tagging ??= (async () =>
      (await this.repo.untaggedEntryCount()) > 0 ? this.retag() : 0)().finally(
      () => {
        this.tagging = null;
      },
    );
    return this.tagging;
  }

  /** Đếm tần suất từ theo Part trong kho câu hỏi đã gắn nhãn; giữ nhãn admin đã sửa. */
  async retag(): Promise<number> {
    const [entries, texts] = await Promise.all([
      this.repo.allEntriesForTagging(),
      this.repo.questionTexts(),
    ]);
    const counts = countByPart(
      entries.map((e) => e.wordKey),
      texts.map((t) => [Number(t.part), t.text ?? ''] as [number, string]),
    );
    const tags = assignTags(
      entries.map((e) => ({ key: e.wordKey, source: e.source })),
      counts,
    );
    await this.repo.saveTags(
      entries.map((e) => {
        const t = tags.get(e.wordKey)!;
        return {
          id: e.id,
          part: t.part,
          level: t.level,
          frequency: t.frequency,
          keep: e.tagSource === 'admin',
        };
      }),
    );
    this.logger.log(`Đã gắn nhãn ${entries.length} từ (${texts.length} câu)`);
    return entries.length;
  }

  // =================== Nội bộ ===================

  private async own(userId: string, id: number): Promise<UserVocab> {
    const row = await this.repo.findOwn(userId, id);
    if (!row) throw this.notFound();
    return row;
  }

  private srsOf(c: UserVocab) {
    return {
      ease: c.ease,
      intervalDays: c.intervalDays,
      repetitions: c.repetitions,
      lapses: c.lapses,
    };
  }

  private notFound() {
    return new NotFoundException({
      code: 'WORD_NOT_FOUND',
      message: 'Không tìm thấy từ',
    });
  }

  toWord(r: UserVocab): WordDto {
    return {
      id: r.id,
      word: r.word,
      phonetic: r.phonetic,
      definition_vi: r.definitionVi,
      definition_en: r.definitionEn,
      example: r.example,
      note: r.note,
      source: r.source,
      part: r.toeicPart,
      level: r.level,
      state: r.state,
      due_at: r.dueAt?.toISOString() ?? null,
      interval_days: r.intervalDays,
      lapses: r.lapses,
      created_at: r.createdAt.toISOString(),
    };
  }

  private toEntry(e: VocabEntry, saved: boolean): EntryDto {
    return {
      id: e.id,
      word: e.word,
      phonetic: e.phonetic,
      definition_vi: e.definitionVi,
      example: e.example,
      part: e.toeicPart,
      level: e.level,
      frequency: e.frequency,
      tag_source: e.tagSource,
      saved,
    };
  }
}
