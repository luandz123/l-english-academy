import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminMaterialDto,
  CreateMaterialDto,
  DeleteFolderDto,
  ListMaterialsQueryDto,
  RenameFolderDto,
} from './dto';
import { MaterialsMapper } from './materials.mapper';
import { MaterialsRepository } from './materials.repository';

@Injectable()
export class MaterialsService {
  constructor(
    private readonly repository: MaterialsRepository,
    private readonly mapper: MaterialsMapper,
  ) {}

  async listMaterials(
    query?: ListMaterialsQueryDto,
  ): Promise<AdminMaterialDto[]> {
    const materials = await this.repository.findMany({
      courseId: query?.course_id,
      folderPath: query?.folder_path,
    });

    return materials.map((m) => this.mapper.toAdminDto(m));
  }

  async createMaterial(dto: CreateMaterialDto): Promise<AdminMaterialDto> {
    if (dto.course_id !== undefined) {
      const course = await this.repository.findCourseById(dto.course_id);
      if (!course) {
        throw new BadRequestException({
          code: 'COURSE_NOT_FOUND',
          message: 'Khóa học không tồn tại',
        });
      }
    }

    if (dto.lesson_id !== undefined) {
      const lesson = await this.repository.findLessonById(dto.lesson_id);
      if (!lesson) {
        throw new BadRequestException({
          code: 'LESSON_NOT_FOUND',
          message: 'Bài học không tồn tại',
        });
      }
    }

    if (dto.quiz_id !== undefined) {
      const quiz = await this.repository.findQuizById(dto.quiz_id);
      if (!quiz) {
        throw new BadRequestException({
          code: 'QUIZ_NOT_FOUND',
          message: 'Bài kiểm tra không tồn tại',
        });
      }
    }

    const created = await this.repository.create({
      title: dto.title,
      fileUrl: dto.file_url,
      fileType: dto.file_type ?? 'pdf',
      folderPath: dto.folder_path ?? '/',
      courseId: dto.course_id ?? null,
      lessonId: dto.lesson_id ?? null,
      quizId: dto.quiz_id ?? null,
      displayOrder: dto.display_order ?? 0,
    });

    return this.mapper.toAdminDto(created);
  }

  async deleteMaterial(id: number): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'MATERIAL_NOT_FOUND',
        message: 'Tài liệu không tồn tại',
      });
    }

    await this.repository.delete(id);
  }

  async renameFolder(dto: RenameFolderDto): Promise<{ count: number }> {
    return this.repository.inTransaction(async (txRepo) => {
      const all = await txRepo.findAllForFolderOps();

      const matching = all.filter((m) => {
        const fp = m.folderPath || '';
        return fp === dto.old_path || fp.startsWith(dto.old_path + '/');
      });

      for (const m of matching) {
        const fp = m.folderPath || '';
        const updatedPath = fp.replace(dto.old_path, dto.new_path);
        await txRepo.updateFolderPath(m.id, updatedPath);
      }

      return { count: matching.length };
    });
  }

  async deleteFolder(dto: DeleteFolderDto): Promise<{ count: number }> {
    return this.repository.inTransaction(async (txRepo) => {
      const all = await txRepo.findAllForFolderOps();

      const idsToDelete = all
        .filter((m) => {
          const fp = m.folderPath || '';
          return fp === dto.folder_path || fp.startsWith(dto.folder_path + '/');
        })
        .map((m) => m.id);

      if (idsToDelete.length > 0) {
        await txRepo.deleteManyByIds(idsToDelete);
      }

      return { count: idsToDelete.length };
    });
  }
}
