import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import {
  AdminExamDto,
  AdminQuestionTagDto,
  CreateReportDto,
  ExamCardDto,
  ExamLibraryDto,
  ExamLibraryQueryDto,
  FacetDto,
  FavoriteExamDto,
  FavoriteStateDto,
  ReportDto,
  UpdateExamMetaDto,
  UpdateQuestionTagsDto,
  UpdateReportDto,
  UpdateVerificationDto,
  VERIFICATION_CHECKLIST,
} from './dto/library.dto';
import { LibraryRepository } from './library.repository';
import { PracticeAccessService } from './practice-access.service';
import {
  DIFFICULTIES,
  isValidCategory,
  isValidPassageType,
} from './question-categories';
import { splitPassage } from './question-tagger';

type TestRow = Awaited<ReturnType<LibraryRepository['findTests']>>[number];

const DIFF_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
const OLDER_THAN = 2024;

/**
 * Thư viện đề (E05), yêu thích (E07), xác minh + báo lỗi (E06). Mọi số liệu (lượt làm, trạng thái
 * đã làm, quyền) tính ở server từ dữ liệu thật.
 */
@Injectable()
export class LibraryService {
  constructor(
    private readonly repo: LibraryRepository,
    private readonly access: PracticeAccessService,
  ) {}

  // ---------------- Thư viện ----------------

  async list(
    user: AuthenticatedUser,
    q: ExamLibraryQueryDto,
  ): Promise<ExamLibraryDto> {
    const all = await this.cards(user);
    const facets = this.facets(all);
    const items = all.filter((c) => this.matches(c, q));
    this.sort(items, q.sort ?? 'newest');
    return { items, total: items.length, total_all: all.length, facets };
  }

  async card(user: AuthenticatedUser, testId: number): Promise<ExamCardDto> {
    const card = (await this.cards(user, testId, true)).find(
      (c) => c.id === testId,
    );
    if (!card)
      throw new NotFoundException({
        code: 'FULLTEST_NOT_FOUND',
        message: `Không tìm thấy đề thi ${testId}`,
      });
    return card;
  }

  private async cards(
    user: AuthenticatedUser,
    onlyId?: number,
    includeInactive = false,
  ): Promise<(ExamCardDto & { popularity: number })[]> {
    const [tests, stats, favCounts, results, favorites] = await Promise.all([
      this.repo.findTests(onlyId ? { id: onlyId } : {}),
      this.repo.attemptStats(),
      this.repo.favoriteCounts(),
      this.repo.myResults(user.id),
      this.repo.myFavorites(user.id),
    ]);
    const favSet = new Set(favorites.map((f) => f.testId));
    const courseAccess = new Map<number | null, boolean>();
    for (const c of new Set(tests.map((t) => t.courseId))) {
      courseAccess.set(c, await this.access.canAccessCourse(c, user));
    }
    const mine = new Map<number, { best: number | null; completed: boolean }>();
    for (const r of results) {
      const cur = mine.get(r.testId) ?? { best: null, completed: false };
      if (
        r.totalScore !== null &&
        (cur.best === null || r.totalScore > cur.best)
      )
        cur.best = r.totalScore;
      cur.completed ||= isFullAttempt(r.answersDetail);
      mine.set(r.testId, cur);
    }
    const now = Date.now();
    // Khóa đã ẩn (is_active = false) thì đề cũng ẩn với học viên, như trang /fulltests
    const visible = includeInactive
      ? tests
      : tests.filter((t) => t.course?.isActive !== false);
    return visible.map((t) => {
      const parts = [
        ...new Set(t.fullTestSections.map((s) => s.partNumber)),
      ].sort((a, b) => a - b);
      const stat = stats.get(t.id);
      const my = mine.get(t.id);
      return {
        ...this.baseCard(t, parts),
        attempts: stat?.attempts ?? 0,
        accessible: courseAccess.get(t.courseId) ?? false,
        released: !t.releaseDate || t.releaseDate.getTime() <= now,
        user_status: !my
          ? 'not_started'
          : my.completed
            ? 'completed'
            : 'in_progress',
        best_score: my?.best ?? null,
        favorited: favSet.has(t.id),
        popularity: (stat?.users ?? 0) + (favCounts.get(t.id) ?? 0),
      };
    });
  }

  private baseCard(t: TestRow, parts: number[]) {
    const total = t.totalQuestions ?? 200;
    return {
      id: t.id,
      code: `LE-${String(t.id).padStart(4, '0')}`,
      title: t.title,
      course_id: t.courseId,
      year: t.year,
      difficulty: t.difficulty,
      topics: t.topics ?? [],
      test_type: t.testType,
      skill: skillOfParts(parts),
      parts,
      duration_minutes:
        t.durationMinutes ??
        (t.testType === 'full' ? 120 : Math.max(5, Math.round(total * 0.6))),
      total_questions: total,
      is_free: t.course?.isFree === true,
      release_date: t.releaseDate?.toISOString() ?? null,
      verification_status: t.verificationStatus,
      verified_at: t.verifiedAt?.toISOString() ?? null,
      created_at: t.createdAt?.toISOString() ?? null,
    };
  }

  private matches(c: ExamCardDto, q: ExamLibraryQueryDto): boolean {
    if (q.q) {
      const needle = q.q.trim().toLowerCase();
      const byCode = needle.replace(/^le-?0*/, '');
      if (
        !c.title.toLowerCase().includes(needle) &&
        String(c.id) !== byCode &&
        c.code.toLowerCase() !== needle
      ) {
        return false;
      }
    }
    if (q.years?.length) {
      const ok = q.years.some((y) =>
        y === 'older'
          ? c.year !== null && c.year < OLDER_THAN
          : String(c.year) === y,
      );
      if (!ok) return false;
    }
    if (q.difficulties?.length && !q.difficulties.includes(c.difficulty ?? ''))
      return false;
    if (q.topics?.length && !q.topics.some((t) => c.topics.includes(t)))
      return false;
    if (q.types?.length && !q.types.includes(c.test_type)) return false;
    if (q.skills?.length && !q.skills.includes(c.skill)) return false;
    if (q.parts?.length && !q.parts.every((p) => c.parts.includes(p)))
      return false;
    if (q.statuses?.length && !q.statuses.includes(c.user_status)) return false;
    if (q.access === 'free' && !c.is_free) return false;
    if (q.access === 'premium' && c.is_free) return false;
    if (q.verified === 'verified' && c.verification_status !== 'verified')
      return false;
    if (q.verified === 'unverified' && c.verification_status === 'verified')
      return false;
    return true;
  }

  private sort(
    items: (ExamCardDto & { popularity: number })[],
    sort: string,
  ): void {
    const newest = (a: ExamCardDto, b: ExamCardDto) =>
      (b.year ?? 0) - (a.year ?? 0) ||
      (b.created_at ?? '').localeCompare(a.created_at ?? '') ||
      b.id - a.id;
    items.sort((a, b) => {
      switch (sort) {
        case 'popular':
          return b.popularity - a.popularity || newest(a, b);
        case 'attempts':
          return b.attempts - a.attempts || newest(a, b);
        case 'difficulty':
          return (
            (DIFF_ORDER[a.difficulty ?? ''] ?? 9) -
              (DIFF_ORDER[b.difficulty ?? ''] ?? 9) || newest(a, b)
          );
        default:
          return newest(a, b);
      }
    });
  }

  private facets(all: ExamCardDto[]): Record<string, FacetDto[]> {
    const count = (values: string[]) => {
      const m = new Map<string, number>();
      for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
      return [...m.entries()].map(([value, n]) => ({ value, count: n }));
    };
    const years = count(
      all
        .filter((c) => c.year !== null)
        .map((c) => (c.year! < OLDER_THAN ? 'older' : String(c.year))),
    ).sort((a, b) =>
      a.value === 'older'
        ? 1
        : b.value === 'older'
          ? -1
          : Number(b.value) - Number(a.value),
    );
    return {
      years,
      difficulties: count(
        all.filter((c) => c.difficulty).map((c) => c.difficulty!),
      ),
      topics: count(all.flatMap((c) => c.topics)).sort(
        (a, b) => b.count - a.count,
      ),
      types: count(all.map((c) => c.test_type)),
      skills: count(all.map((c) => c.skill)),
      parts: count(all.flatMap((c) => c.parts.map(String))).sort(
        (a, b) => Number(a.value) - Number(b.value),
      ),
      statuses: count(all.map((c) => c.user_status)),
      access: count(all.map((c) => (c.is_free ? 'free' : 'premium'))),
      verified: count(
        all.map((c) =>
          c.verification_status === 'verified' ? 'verified' : 'unverified',
        ),
      ),
    };
  }

  // ---------------- Yêu thích ----------------

  async favorites(
    user: AuthenticatedUser,
    skill?: string,
  ): Promise<FavoriteExamDto[]> {
    const [favs, cards] = await Promise.all([
      this.repo.myFavorites(user.id),
      this.cards(user),
    ]);
    const byId = new Map(cards.map((c) => [c.id, c]));
    return favs
      .map((f) => {
        const exam = byId.get(f.testId) ?? null;
        return {
          test_id: f.testId,
          title: exam?.title ?? f.titleCache,
          favorited_at: f.createdAt.toISOString(),
          available: exam !== null,
          exam: exam ? stripPopularity(exam) : null,
        };
      })
      .filter((f) => !skill || !f.exam || f.exam.skill === skill);
  }

  async setFavorite(
    user: AuthenticatedUser,
    testId: number,
    favorited: boolean,
  ): Promise<FavoriteStateDto> {
    if (favorited) {
      const test = await this.repo.findTest(testId);
      if (!test)
        throw new NotFoundException({
          code: 'FULLTEST_NOT_FOUND',
          message: `Không tìm thấy đề thi ${testId}`,
        });
      await this.repo.addFavorite(user.id, testId, test.title);
    } else {
      await this.repo.removeFavorite(user.id, testId);
    }
    return { test_id: testId, favorited };
  }

  // ---------------- Báo lỗi ----------------

  async report(
    user: AuthenticatedUser,
    dto: CreateReportDto,
  ): Promise<ReportDto> {
    let testId = dto.test_id ?? null;
    if (dto.question_id !== undefined) {
      const q = await this.repo.questionExists(dto.question_id);
      if (!q)
        throw new NotFoundException({
          code: 'QUESTION_NOT_FOUND',
          message: 'Không tìm thấy câu hỏi',
        });
      testId ??= q.sourceTestId;
    }
    if (testId === null)
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Cần đề hoặc câu hỏi',
      });
    const test = await this.repo.findTest(testId);
    if (!test)
      throw new NotFoundException({
        code: 'FULLTEST_NOT_FOUND',
        message: `Không tìm thấy đề thi ${testId}`,
      });
    const row = await this.repo.createReport({
      userId: user.id,
      testId,
      questionId: dto.question_id ?? null,
      reason: dto.reason,
      message: dto.message?.trim() || null,
    });
    return toReportDto({ ...row, user: { email: null } }, test.title);
  }

  // ---------------- Admin ----------------

  async adminExams(user: AuthenticatedUser): Promise<AdminExamDto[]> {
    const [cards, tests, reports, tags] = await Promise.all([
      this.cards(user, undefined, true),
      this.repo.findTests(),
      this.repo.openReportCounts(),
      this.repo.tagCounts(),
    ]);
    const testById = new Map(tests.map((t) => [t.id, t]));
    return cards
      .sort((a, b) => a.id - b.id)
      .map((c) => {
        const t = testById.get(c.id)!;
        return {
          ...stripPopularity(c),
          checklist: normalizeChecklist(t.verificationChecklist),
          checklist_labels: VERIFICATION_CHECKLIST,
          content_changed_at: t.contentChangedAt?.toISOString() ?? null,
          open_reports: reports.get(c.id) ?? 0,
          tagged_questions: tags.get(c.id)?.tagged ?? 0,
          eligible_questions: tags.get(c.id)?.eligible ?? 0,
        };
      });
  }

  async updateMeta(
    user: AuthenticatedUser,
    testId: number,
    dto: UpdateExamMetaDto,
  ): Promise<ExamCardDto> {
    await this.mustExist(testId);
    await this.repo.updateTest(testId, {
      ...(dto.year !== undefined ? { year: dto.year } : {}),
      ...(dto.difficulty !== undefined ? { difficulty: dto.difficulty } : {}),
      ...(dto.topics !== undefined
        ? {
            topics: [
              ...new Set(dto.topics.map((t) => t.trim()).filter(Boolean)),
            ],
          }
        : {}),
      ...(dto.test_type !== undefined ? { testType: dto.test_type } : {}),
      ...(dto.duration_minutes !== undefined
        ? { durationMinutes: dto.duration_minutes }
        : {}),
    });
    return this.card(user, testId);
  }

  /** Chỉ admin (guard ở controller). Xác minh cần đủ 9 mục; bỏ xác minh → "Chưa xác minh". */
  async updateVerification(
    user: AuthenticatedUser,
    testId: number,
    dto: UpdateVerificationDto,
  ): Promise<ExamCardDto> {
    await this.mustExist(testId);
    const checklist = normalizeChecklist(dto.checklist);
    if (dto.verified && !checklist.every(Boolean)) {
      throw new BadRequestException({
        code: 'CHECKLIST_INCOMPLETE',
        message: 'Cần hoàn thành đủ 9 mục kiểm duyệt trước khi xác minh đề',
      });
    }
    await this.repo.updateTest(testId, {
      verificationChecklist: checklist,
      verificationStatus: dto.verified ? 'verified' : 'unverified',
      verifiedAt: dto.verified ? new Date() : null,
      verifiedBy: dto.verified ? user.id : null,
    });
    return this.card(user, testId);
  }

  async adminQuestions(
    testId: number,
    part?: number,
  ): Promise<AdminQuestionTagDto[]> {
    const rows = await this.repo.findQuestionsOfTest(testId, part);
    return rows.map(toAdminQuestion);
  }

  async updateQuestionTags(
    questionId: number,
    dto: UpdateQuestionTagsDto,
  ): Promise<AdminQuestionTagDto> {
    const q = await this.repo.findQuestionTagInfo(questionId);
    if (!q)
      throw new NotFoundException({
        code: 'QUESTION_NOT_FOUND',
        message: 'Không tìm thấy câu hỏi',
      });
    if (
      dto.category !== undefined &&
      (q.toeicPart === null || !isValidCategory(q.toeicPart, dto.category))
    ) {
      throw new BadRequestException({
        code: 'INVALID_CATEGORY',
        message: 'Dạng câu hỏi không thuộc Part của câu',
      });
    }
    if (
      dto.passage_type &&
      (q.toeicPart !== 7 || !isValidPassageType(dto.passage_type))
    ) {
      throw new BadRequestException({
        code: 'INVALID_PASSAGE_TYPE',
        message: 'Loại văn bản chỉ dùng cho Part 7',
      });
    }
    if (dto.difficulty && !DIFFICULTIES.includes(dto.difficulty as never)) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Độ khó không hợp lệ',
      });
    }
    const row = await this.repo.updateQuestionTags(questionId, {
      ...(dto.category !== undefined ? { questionCategory: dto.category } : {}),
      ...(dto.passage_type !== undefined
        ? { passageType: dto.passage_type }
        : {}),
      ...(dto.difficulty !== undefined ? { difficulty: dto.difficulty } : {}),
      tagSource: 'admin',
    });
    return toAdminQuestion(row);
  }

  async reports(status?: string): Promise<ReportDto[]> {
    const rows = await this.repo.findReports(status);
    const titles = new Map(
      (await this.repo.findTests()).map((t) => [t.id, t.title]),
    );
    return rows.map((r) =>
      toReportDto(r, r.testId !== null ? (titles.get(r.testId) ?? null) : null),
    );
  }

  async updateReport(id: number, dto: UpdateReportDto): Promise<ReportDto> {
    const existing = await this.repo.findReport(id);
    if (!existing)
      throw new NotFoundException({
        code: 'REPORT_NOT_FOUND',
        message: 'Không tìm thấy báo lỗi',
      });
    const row = await this.repo.updateReport(id, {
      status: dto.status,
      adminNote: dto.admin_note?.trim() || existing.adminNote,
      resolvedAt: dto.status === 'open' ? null : new Date(),
    });
    const test =
      row.testId !== null ? await this.repo.findTest(row.testId) : null;
    return toReportDto(row, test?.title ?? null);
  }

  private async mustExist(testId: number) {
    const t = await this.repo.findTest(testId);
    if (!t)
      throw new NotFoundException({
        code: 'FULLTEST_NOT_FOUND',
        message: `Không tìm thấy đề thi ${testId}`,
      });
    return t;
  }
}

function skillOfParts(parts: number[]): string {
  const l = parts.some((p) => p <= 4);
  const r = parts.some((p) => p >= 5);
  if (l && !r) return 'listening';
  if (r && !l) return 'reading';
  return 'full';
}

/** Kết quả làm đủ 7 Part = "Đã hoàn thành"; kết quả cũ không có _meta coi như làm đủ. */
function isFullAttempt(detail: unknown): boolean {
  const meta = (detail as { _meta?: { selected_parts?: unknown } } | null)
    ?._meta;
  if (!meta || !Array.isArray(meta.selected_parts)) return true;
  return meta.selected_parts.length >= 7;
}

function normalizeChecklist(value: unknown): boolean[] {
  const arr = Array.isArray(value) ? value : [];
  return VERIFICATION_CHECKLIST.map((_, i) => arr[i] === true);
}

function stripPopularity(
  c: ExamCardDto & { popularity?: number },
): ExamCardDto {
  const rest = { ...c };
  delete rest.popularity;
  return rest;
}

function toAdminQuestion(r: {
  id: number;
  toeicPart: number | null;
  partIndex: number | null;
  questionText: string | null;
  transcript: string | null;
  questionCategory: string | null;
  passageType: string | null;
  difficulty: string | null;
  practiceEligible: boolean;
  tagSource: string | null;
}): AdminQuestionTagDto {
  const text = splitPassage(r.questionText).text || r.transcript || '';
  return {
    id: r.id,
    part: r.toeicPart,
    part_index: r.partIndex,
    text:
      text
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200) || null,
    category: r.questionCategory,
    passage_type: r.passageType,
    difficulty: r.difficulty,
    practice_eligible: r.practiceEligible,
    tag_source: r.tagSource,
  };
}

function toReportDto(
  r: {
    id: number;
    testId: number | null;
    questionId: number | null;
    reason: string;
    message: string | null;
    status: string;
    adminNote: string | null;
    createdAt: Date;
    resolvedAt: Date | null;
    user: { email: string | null };
  },
  testTitle: string | null,
): ReportDto {
  return {
    id: r.id,
    test_id: r.testId,
    test_title: testTitle,
    question_id: r.questionId,
    reason: r.reason,
    message: r.message,
    status: r.status,
    admin_note: r.adminNote,
    reporter_email: r.user.email,
    created_at: r.createdAt.toISOString(),
    resolved_at: r.resolvedAt?.toISOString() ?? null,
  };
}
