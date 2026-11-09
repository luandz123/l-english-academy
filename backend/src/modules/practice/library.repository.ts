import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Đọc thư viện đề (full_tests + thống kê thật) và bảng favorite_exams, exam_reports. */
@Injectable()
export class LibraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findTests(where: Prisma.FullTestWhereInput = {}) {
    return this.prisma.fullTest.findMany({
      where,
      include: {
        course: { select: { isFree: true, isActive: true } },
        fullTestSections: { select: { partNumber: true } },
      },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async attemptStats(): Promise<
    Map<number, { attempts: number; users: number }>
  > {
    const rows = await this.prisma.$queryRaw<
      { test_id: number; attempts: bigint; users: bigint }[]
    >`
      SELECT test_id, COUNT(*) AS attempts, COUNT(DISTINCT user_id) AS users
      FROM user_full_test_results GROUP BY test_id`;
    return new Map(
      rows.map((r) => [
        r.test_id,
        { attempts: Number(r.attempts), users: Number(r.users) },
      ]),
    );
  }

  async favoriteCounts(): Promise<Map<number, number>> {
    const rows = await this.prisma.favoriteExam.groupBy({
      by: ['testId'],
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.testId, r._count._all]));
  }

  myResults(userId: string) {
    return this.prisma.userFullTestResult.findMany({
      where: { userId },
      select: { testId: true, totalScore: true, answersDetail: true },
    });
  }

  myFavorites(userId: string) {
    return this.prisma.favoriteExam.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  addFavorite(userId: string, testId: number, title: string) {
    return this.prisma.favoriteExam.upsert({
      where: { userId_testId: { userId, testId } },
      create: { userId, testId, titleCache: title },
      update: { titleCache: title },
    });
  }

  async removeFavorite(userId: string, testId: number): Promise<void> {
    await this.prisma.favoriteExam.deleteMany({ where: { userId, testId } });
  }

  findTest(id: number) {
    return this.prisma.fullTest.findUnique({
      where: { id },
      include: { course: { select: { isFree: true } } },
    });
  }

  questionExists(id: number) {
    return this.prisma.question.findUnique({
      where: { id },
      select: { id: true, sourceTestId: true },
    });
  }

  createReport(data: Prisma.ExamReportUncheckedCreateInput) {
    return this.prisma.examReport.create({ data });
  }

  findReports(status?: string) {
    return this.prisma.examReport.findMany({
      where: status ? { status } : {},
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  updateReport(id: number, data: Prisma.ExamReportUncheckedUpdateInput) {
    return this.prisma.examReport.update({
      where: { id },
      data,
      include: { user: { select: { email: true } } },
    });
  }

  findReport(id: number) {
    return this.prisma.examReport.findUnique({ where: { id } });
  }

  async openReportCounts(): Promise<Map<number, number>> {
    const rows = await this.prisma.examReport.groupBy({
      by: ['testId'],
      where: { status: 'open', testId: { not: null } },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.testId!, r._count._all]));
  }

  async tagCounts(): Promise<
    Map<number, { tagged: number; eligible: number }>
  > {
    const rows = await this.prisma.$queryRaw<
      { test_id: number; tagged: bigint; eligible: bigint }[]
    >`
      SELECT source_test_id AS test_id, COUNT(*) AS tagged,
             COUNT(*) FILTER (WHERE practice_eligible) AS eligible
      FROM questions WHERE source_test_id IS NOT NULL GROUP BY 1`;
    return new Map(
      rows.map((r) => [
        r.test_id,
        { tagged: Number(r.tagged), eligible: Number(r.eligible) },
      ]),
    );
  }

  updateTest(id: number, data: Prisma.FullTestUncheckedUpdateInput) {
    return this.prisma.fullTest.update({ where: { id }, data });
  }

  findQuestionsOfTest(testId: number, part?: number) {
    return this.prisma.question.findMany({
      where: { sourceTestId: testId, ...(part ? { toeicPart: part } : {}) },
      select: {
        id: true,
        toeicPart: true,
        partIndex: true,
        questionText: true,
        transcript: true,
        questionCategory: true,
        passageType: true,
        difficulty: true,
        practiceEligible: true,
        tagSource: true,
      },
      orderBy: [{ toeicPart: 'asc' }, { partIndex: 'asc' }, { id: 'asc' }],
    });
  }

  findQuestionTagInfo(id: number) {
    return this.prisma.question.findUnique({
      where: { id },
      select: { id: true, toeicPart: true },
    });
  }

  updateQuestionTags(id: number, data: Prisma.QuestionUncheckedUpdateInput) {
    return this.prisma.question.update({
      where: { id },
      data,
      select: {
        id: true,
        toeicPart: true,
        partIndex: true,
        questionText: true,
        transcript: true,
        questionCategory: true,
        passageType: true,
        difficulty: true,
        practiceEligible: true,
        tagSource: true,
      },
    });
  }
}
