import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { GrammarTopic } from '../../generated/prisma/client';
import type {
  AdminExerciseDto,
  AdminQuestionListDto,
  AdminQuestionsQueryDto,
  AdminTopicDto,
  ExerciseInputDto,
  FormulaDto,
  FormulaInputDto,
  ImportDto,
  TopicInputDto,
  UpdateTopicDto,
} from './dto/grammar.dto';
import { slugify, validateExercise } from './grammar-rules';
import { GrammarTaggingService } from './grammar-tagging.service';
import {
  isVisible,
  lessonOf,
  toAdminExercise,
  toFormulaDto,
} from './grammar.mapper';
import { GrammarRepository } from './grammar.repository';

const PAGE = 50;

/**
 * Quản trị Ngữ pháp: chủ điểm, bài học, công thức, bài tập, nhập hàng loạt từ JSON, chủ điểm của câu TOEIC.
 * Chủ điểm chỉ hiện với học viên khi không ẩn và có bài học hoặc bài tập.
 */
@Injectable()
export class GrammarAdminService {
  constructor(
    private readonly repo: GrammarRepository,
    private readonly tagging: GrammarTaggingService,
  ) {}

  // ---------- Chủ điểm ----------

  async listTopics(): Promise<AdminTopicDto[]> {
    const [topics, totals] = await Promise.all([
      this.repo.listTopics(true),
      this.repo.toeicTotals(),
    ]);
    return topics.map((t) => ({
      ...this.topicDto(t),
      formula_count: t._count.formulas,
      exercise_count: t._count.exercises,
      toeic_count: totals.get(t.id) ?? 0,
      visible: isVisible(t),
    }));
  }

  private topicDto(t: GrammarTopic) {
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      group_name: t.groupName,
      level: t.level,
      sort_order: t.sortOrder,
      summary: t.summary,
      hidden: t.hidden,
      video_url: t.videoUrl,
      lesson: lessonOf(t),
      toeic_categories: t.toeicCategories,
      roadmap_labels: t.roadmapLabels,
    };
  }

  async getTopic(id: number): Promise<AdminTopicDto> {
    const all = await this.listTopics();
    const t = all.find((x) => x.id === id);
    if (!t) throw this.notFound();
    return t;
  }

  async createTopic(dto: TopicInputDto): Promise<AdminTopicDto> {
    const slug = await this.freeSlug(dto.slug?.trim() || slugify(dto.name));
    const t = await this.repo.createTopic({
      slug,
      name: dto.name.trim(),
      groupName: dto.group_name.trim(),
      level: dto.level,
      sortOrder: dto.sort_order ?? 0,
      summary: dto.summary ?? null,
      hidden: dto.hidden ?? false,
      videoUrl: dto.video_url ?? null,
      lesson: dto.lesson ? cleanLesson(dto.lesson) : undefined,
      toeicCategories: dto.toeic_categories ?? [],
      roadmapLabels: dto.roadmap_labels ?? [],
    });
    return this.getTopic(t.id);
  }

  async updateTopic(id: number, dto: UpdateTopicDto): Promise<AdminTopicDto> {
    const t = await this.repo.findTopic(id);
    if (!t) throw this.notFound();
    let slug: string | undefined;
    if (dto.slug !== undefined && dto.slug.trim() !== t.slug) {
      slug = slugify(dto.slug);
      if (!slug || (await this.repo.slugExists(slug, id)))
        throw new ConflictException({
          code: 'SLUG_TAKEN',
          message: 'Đường dẫn đã được dùng',
        });
    }
    await this.repo.updateTopic(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(slug ? { slug } : {}),
      ...(dto.group_name !== undefined
        ? { groupName: dto.group_name.trim() }
        : {}),
      ...(dto.level !== undefined ? { level: dto.level } : {}),
      ...(dto.sort_order !== undefined ? { sortOrder: dto.sort_order } : {}),
      ...(dto.summary !== undefined ? { summary: dto.summary } : {}),
      ...(dto.hidden !== undefined ? { hidden: dto.hidden } : {}),
      ...(dto.video_url !== undefined
        ? { videoUrl: dto.video_url || null }
        : {}),
      ...(dto.lesson !== undefined
        ? {
            lesson: dto.lesson
              ? cleanLesson(dto.lesson)
              : (null as unknown as object),
          }
        : {}),
      ...(dto.toeic_categories !== undefined
        ? { toeicCategories: dto.toeic_categories }
        : {}),
      ...(dto.roadmap_labels !== undefined
        ? { roadmapLabels: dto.roadmap_labels }
        : {}),
    });
    return this.getTopic(id);
  }

  private async freeSlug(base: string): Promise<string> {
    const root = slugify(base) || 'chu-diem';
    let slug = root;
    for (let i = 2; await this.repo.slugExists(slug); i++)
      slug = `${root}-${i}`;
    return slug;
  }

  // ---------- Công thức ----------

  async listFormulas(topicId: number): Promise<FormulaDto[]> {
    await this.topicOrFail(topicId);
    return (await this.repo.formulasOf([topicId])).map(toFormulaDto);
  }

  async createFormula(
    topicId: number,
    dto: FormulaInputDto,
  ): Promise<FormulaDto> {
    await this.topicOrFail(topicId);
    return toFormulaDto(
      await this.repo.createFormula({
        topicId,
        pattern: dto.pattern.trim(),
        usage: dto.usage.trim(),
        examples: (dto.examples ?? []) as object,
        sortOrder: dto.sort_order ?? 0,
      }),
    );
  }

  async updateFormula(id: number, dto: FormulaInputDto): Promise<FormulaDto> {
    if (!(await this.repo.findFormula(id)))
      throw this.notFound('FORMULA_NOT_FOUND');
    return toFormulaDto(
      await this.repo.updateFormula(id, {
        pattern: dto.pattern.trim(),
        usage: dto.usage.trim(),
        examples: (dto.examples ?? []) as object,
        ...(dto.sort_order !== undefined ? { sortOrder: dto.sort_order } : {}),
      }),
    );
  }

  async deleteFormula(id: number): Promise<void> {
    if (!(await this.repo.findFormula(id)))
      throw this.notFound('FORMULA_NOT_FOUND');
    await this.repo.deleteFormula(id);
  }

  // ---------- Bài tập ----------

  async listExercises(topicId: number): Promise<AdminExerciseDto[]> {
    await this.topicOrFail(topicId);
    return (await this.repo.listExercises(topicId)).map(toAdminExercise);
  }

  private exerciseData(dto: ExerciseInputDto) {
    const data = {
      kind: dto.kind,
      level: dto.level,
      prompt: dto.prompt.trim(),
      options:
        dto.kind === 'choice' ? (dto.options ?? []).map((o) => o.trim()) : [],
      answerIndex: dto.kind === 'fill' ? null : (dto.answer_index ?? null),
      acceptedAnswers:
        dto.kind === 'fill'
          ? (dto.accepted_answers ?? []).map((a) => a.trim()).filter(Boolean)
          : [],
      explanation: dto.explanation?.trim() || null,
      lessonSection: dto.lesson_section ?? null,
    };
    const err = validateExercise(data);
    if (err)
      throw new UnprocessableEntityException({
        code: 'INVALID_EXERCISE',
        message: err,
      });
    return data;
  }

  async createExercise(
    topicId: number,
    dto: ExerciseInputDto,
  ): Promise<AdminExerciseDto> {
    await this.topicOrFail(topicId);
    return toAdminExercise(
      await this.repo.createExercise({
        topicId,
        ...this.exerciseData(dto),
        active: dto.active ?? true,
      }),
    );
  }

  /** Sửa câu: kết quả lượt cũ giữ nguyên; lỗi cũ trong sổ hiện nội dung mới kèm "Câu đã được cập nhật". */
  async updateExercise(
    id: number,
    dto: ExerciseInputDto,
  ): Promise<AdminExerciseDto> {
    if (!(await this.repo.findExercise(id)))
      throw this.notFound('EXERCISE_NOT_FOUND');
    return toAdminExercise(
      await this.repo.updateExercise(id, {
        ...this.exerciseData(dto),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      }),
    );
  }

  /** Gỡ câu: không xóa (giữ lỗi cũ), chỉ ngừng dùng → không đưa vào lượt mới, sổ ghi "không còn khả dụng". */
  async removeExercise(id: number): Promise<void> {
    if (!(await this.repo.findExercise(id)))
      throw this.notFound('EXERCISE_NOT_FOUND');
    await this.repo.updateExercise(id, { active: false });
  }

  // ---------- Nhập hàng loạt ----------

  async import(
    dto: ImportDto,
  ): Promise<{ topics: number; formulas: number; exercises: number }> {
    // Kiểm tra toàn bộ trước khi ghi
    const prepared = dto.topics.map((t, i) => ({
      t,
      exercises: (t.exercises ?? []).map((e, j) => {
        try {
          return this.exerciseData(e);
        } catch (err) {
          const msg =
            err instanceof UnprocessableEntityException
              ? (err.getResponse() as { message: string }).message
              : String(err);
          throw new UnprocessableEntityException({
            code: 'INVALID_EXERCISE',
            message: `Chủ điểm #${i + 1} "${t.name}", câu #${j + 1}: ${msg}`,
          });
        }
      }),
    }));
    let formulas = 0;
    let exercises = 0;
    const topics = await this.repo.listTopics(true);
    for (const { t, exercises: exs } of prepared) {
      const slug = slugify(t.slug?.trim() || t.name);
      const existing = topics.find((x) => x.slug === slug);
      const data = {
        name: t.name.trim(),
        groupName: t.group_name.trim(),
        level: t.level,
        sortOrder: t.sort_order ?? existing?.sortOrder ?? 0,
        summary: t.summary ?? existing?.summary ?? null,
        hidden: t.hidden ?? existing?.hidden ?? false,
        videoUrl: t.video_url ?? existing?.videoUrl ?? null,
        ...(t.lesson ? { lesson: cleanLesson(t.lesson) as object } : {}),
        toeicCategories: t.toeic_categories ?? existing?.toeicCategories ?? [],
        roadmapLabels: t.roadmap_labels ?? existing?.roadmapLabels ?? [],
      };
      const topic = existing
        ? await this.repo.updateTopic(existing.id, data)
        : await this.repo.createTopic({ slug, ...data });
      if (t.formulas?.length) {
        if (dto.replace) {
          for (const f of await this.repo.formulasOf([topic.id]))
            await this.repo.deleteFormula(f.id);
        }
        for (const [k, f] of t.formulas.entries()) {
          await this.repo.createFormula({
            topicId: topic.id,
            pattern: f.pattern.trim(),
            usage: f.usage.trim(),
            examples: (f.examples ?? []) as object,
            sortOrder: f.sort_order ?? k,
          });
          formulas++;
        }
      }
      if (exs.length) {
        if (dto.replace) {
          for (const e of await this.repo.listExercises(topic.id))
            if (e.active)
              await this.repo.updateExercise(e.id, { active: false });
        }
        await this.repo.createExercises(
          exs.map((e) => ({ topicId: topic.id, ...e, active: true })),
        );
        exercises += exs.length;
      }
    }
    return { topics: prepared.length, formulas, exercises };
  }

  // ---------- Chủ điểm của câu TOEIC ----------

  async listQuestions(
    q: AdminQuestionsQueryDto,
  ): Promise<AdminQuestionListDto> {
    await this.tagging.ensureTagged(true);
    const page = q.page ?? 1;
    const [total, rows] = await this.repo.adminQuestions({
      topicId: q.topic_id,
      testId: q.test_id,
      untagged: q.untagged,
      skip: (page - 1) * PAGE,
      take: PAGE,
    });
    return {
      total,
      page,
      items: rows.map((r) => ({
        id: r.id,
        part: r.toeicPart,
        part_index: r.partIndex,
        question_text: r.questionText,
        options: r.answers.map((a) => a.answerText ?? ''),
        category: r.questionCategory,
        source_test_id: r.sourceTestId,
        topic_id: r.grammarTopicId,
        tag_source: r.grammarTagSource,
      })),
    };
  }

  /** Admin đổi chủ điểm một câu: câu chuyển sang chủ điểm mới ở mọi nơi, không bị gắn lại đè lên. */
  async setQuestionTopic(
    id: number,
    topicId: number | null,
  ): Promise<{ ok: true }> {
    const [q] = await this.repo.questionSources([id]);
    if (!q) throw this.notFound('QUESTION_NOT_FOUND');
    if (topicId !== null && !(await this.repo.findTopic(topicId)))
      throw this.notFound();
    await this.repo.setQuestionTopics(new Map([[topicId, [id]]]), 'admin');
    return { ok: true };
  }

  async retag(): Promise<{ tagged: number }> {
    return { tagged: await this.tagging.retagAll() };
  }

  private async topicOrFail(id: number) {
    const t = await this.repo.findTopic(id);
    if (!t) throw this.notFound();
    return t;
  }

  private notFound(code = 'TOPIC_NOT_FOUND') {
    return new NotFoundException({ code, message: 'Không tìm thấy' });
  }
}

/** Chỉ giữ các phần bài học cố định, đúng kiểu. */
function cleanLesson(l: Record<string, unknown>) {
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const arr = (v: unknown): unknown[] =>
    Array.isArray(v) ? (v as unknown[]) : [];
  const out = {
    when_to_use: str(l.when_to_use),
    structure: str(l.structure),
    examples: arr(l.examples)
      .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
      .map((e) => ({ en: str(e.en), vi: str(e.vi) }))
      .filter((e) => e.en),
    mistakes: arr(l.mistakes)
      .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
      .map((e) => ({
        wrong: str(e.wrong),
        right: str(e.right),
        note: str(e.note),
      }))
      .filter((e) => e.wrong && e.right),
    signals: arr(l.signals).map(str).filter(Boolean),
  };
  return out;
}
