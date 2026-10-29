import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Material } from '../../generated/prisma/client';
import {
  AdminMaterialDto,
  CreateMaterialDto,
  DeleteFolderDto,
  ListMaterialsQueryDto,
  RenameFolderDto,
} from './dto';

type MaterialWithCourse = Material & {
  course?: { title: string } | null;
};

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMaterials(
    query?: ListMaterialsQueryDto,
  ): Promise<AdminMaterialDto[]> {
    const where: { courseId?: number; folderPath?: string } = {};
    if (query?.course_id !== undefined) {
      where.courseId = query.course_id;
    }
    if (query?.folder_path !== undefined) {
      where.folderPath = query.folder_path;
    }

    const isCourseScoped = query?.course_id !== undefined;

    const materials = await this.prisma.material.findMany({
      where,
      include: {
        course: { select: { title: true } },
      },
      orderBy: isCourseScoped
        ? [{ displayOrder: 'asc' }, { id: 'asc' }]
        : [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return materials.map((m) => this.toDto(m));
  }

  async createMaterial(dto: CreateMaterialDto): Promise<AdminMaterialDto> {
    if (dto.course_id !== undefined) {
      const course = await this.prisma.course.findUnique({
        where: { id: dto.course_id },
      });
      if (!course) {
        throw new BadRequestException({
          code: 'COURSE_NOT_FOUND',
          message: 'Khóa học không tồn tại',
        });
      }
    }

    if (dto.lesson_id !== undefined) {
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: dto.lesson_id },
      });
      if (!lesson) {
        throw new BadRequestException({
          code: 'LESSON_NOT_FOUND',
          message: 'Bài học không tồn tại',
        });
      }
    }

    if (dto.quiz_id !== undefined) {
      const quiz = await this.prisma.quiz.findUnique({
        where: { id: dto.quiz_id },
      });
      if (!quiz) {
        throw new BadRequestException({
          code: 'QUIZ_NOT_FOUND',
          message: 'Bài kiểm tra không tồn tại',
        });
      }
    }

    const created = await this.prisma.material.create({
      data: {
        title: dto.title,
        fileUrl: dto.file_url,
        fileType: dto.file_type ?? 'pdf',
        folderPath: dto.folder_path ?? '/',
        courseId: dto.course_id ?? null,
        lessonId: dto.lesson_id ?? null,
        quizId: dto.quiz_id ?? null,
        displayOrder: dto.display_order ?? 0,
      },
      include: {
        course: { select: { title: true } },
      },
    });

    return this.toDto(created);
  }

  async deleteMaterial(id: number): Promise<void> {
    const existing = await this.prisma.material.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'MATERIAL_NOT_FOUND',
        message: 'Tài liệu không tồn tại',
      });
    }

    await this.prisma.material.delete({
      where: { id },
    });
  }

  async renameFolder(dto: RenameFolderDto): Promise<{ count: number }> {
    return this.prisma.$transaction(async (tx) => {
      const all = await tx.material.findMany({
        select: { id: true, folderPath: true },
      });

      const matching = all.filter((m) => {
        const fp = m.folderPath || '';
        return fp === dto.old_path || fp.startsWith(dto.old_path + '/');
      });

      for (const m of matching) {
        const fp = m.folderPath || '';
        const updatedPath = fp.replace(dto.old_path, dto.new_path);
        await tx.material.update({
          where: { id: m.id },
          data: { folderPath: updatedPath },
        });
      }

      return { count: matching.length };
    });
  }

  async deleteFolder(dto: DeleteFolderDto): Promise<{ count: number }> {
    return this.prisma.$transaction(async (tx) => {
      const all = await tx.material.findMany({
        select: { id: true, folderPath: true },
      });

      const idsToDelete = all
        .filter((m) => {
          const fp = m.folderPath || '';
          return fp === dto.folder_path || fp.startsWith(dto.folder_path + '/');
        })
        .map((m) => m.id);

      if (idsToDelete.length > 0) {
        await tx.material.deleteMany({
          where: { id: { in: idsToDelete } },
        });
      }

      return { count: idsToDelete.length };
    });
  }

  private toDto(m: MaterialWithCourse): AdminMaterialDto {
    return {
      id: m.id,
      lesson_id: m.lessonId,
      quiz_id: m.quizId,
      course_id: m.courseId,
      title: m.title,
      file_url: m.fileUrl,
      file_type: m.fileType,
      display_order: m.displayOrder,
      created_at: m.createdAt ? m.createdAt.toISOString() : null,
      folder_path: m.folderPath,
      courses: m.course ? { title: m.course.title } : null,
    };
  }
}

