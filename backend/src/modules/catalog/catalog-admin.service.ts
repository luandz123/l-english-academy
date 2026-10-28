import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CatalogMapper } from './catalog.mapper';
import { CatalogRepository } from './catalog.repository';
import {
  AdminModuleDto,
  ModuleDto,
  PatchModuleDto,
  ReorderModulesDto,
  SaveModuleDto,
  SetFreeModuleDto,
} from './dto';

@Injectable()
export class CatalogAdminService {
  constructor(
    private readonly repo: CatalogRepository,
    private readonly mapper: CatalogMapper,
  ) {}

  async listCourseModules(courseId: number): Promise<AdminModuleDto[]> {
    const modules = await this.repo.findAdminModulesByCourse(courseId);
    return modules.map((m) => this.mapper.toAdminModuleDto(m));
  }

  async createModule(courseId: number, dto: SaveModuleDto): Promise<ModuleDto> {
    if (!(await this.repo.courseExists(courseId))) {
      throw this.courseNotFound();
    }

    const displayOrder = await this.repo.nextModuleDisplayOrder(courseId);
    const mod = await this.repo.createModule({
      courseId,
      title: dto.title,
      description: dto.description ?? null,
      isFree: dto.is_free,
      displayOrder,
    });
    return this.mapper.toModuleDto(mod);
  }

  async updateModule(id: number, dto: SaveModuleDto): Promise<ModuleDto> {
    const existing = await this.repo.findModuleById(id);
    if (!existing) {
      throw this.moduleNotFound();
    }

    const updated = await this.repo.updateModule(id, {
      title: dto.title,
      description: dto.description ?? null,
      isFree: dto.is_free,
    });
    return this.mapper.toModuleDto(updated);
  }

  async patchModule(id: number, dto: PatchModuleDto): Promise<ModuleDto> {
    if (dto.is_free === undefined && dto.is_published === undefined) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Cần ít nhất một trường để cập nhật',
      });
    }

    const existing = await this.repo.findModuleById(id);
    if (!existing) {
      throw this.moduleNotFound();
    }

    const updated = await this.repo.updateModule(id, {
      ...(dto.is_free !== undefined ? { isFree: dto.is_free } : {}),
      ...(dto.is_published !== undefined
        ? { isPublished: dto.is_published }
        : {}),
    });
    return this.mapper.toModuleDto(updated);
  }

  async deleteModule(id: number): Promise<void> {
    await this.repo.deleteModule(id);
  }

  async reorderModules(
    courseId: number,
    dto: ReorderModulesDto,
  ): Promise<void> {
    if (!(await this.repo.courseExists(courseId))) {
      throw this.courseNotFound();
    }

    const uniqueIds = new Set(dto.module_ids);
    if (uniqueIds.size !== dto.module_ids.length) {
      throw new BadRequestException({
        code: 'MODULE_ORDER_INVALID',
        message: 'Danh sách chương chứa ID trùng lặp',
      });
    }

    const courseModuleIds = new Set(
      await this.repo.findModuleIdsByCourse(courseId),
    );
    const allBelongToCourse = dto.module_ids.every((id) =>
      courseModuleIds.has(id),
    );
    if (!allBelongToCourse) {
      throw new BadRequestException({
        code: 'MODULE_ORDER_INVALID',
        message: 'Có chương không thuộc khóa học này',
      });
    }

    await this.repo.reorderModules(dto.module_ids);
  }

  async setFreeModule(courseId: number, dto: SetFreeModuleDto): Promise<void> {
    if (!(await this.repo.courseExists(courseId))) {
      throw this.courseNotFound();
    }

    const courseModuleIds = new Set(
      await this.repo.findModuleIdsByCourse(courseId),
    );
    if (!courseModuleIds.has(dto.module_id)) {
      throw new BadRequestException({
        code: 'MODULE_NOT_IN_COURSE',
        message: 'Chương không thuộc khóa học này',
      });
    }

    await this.repo.setFreeModuleForCourse(courseId, dto.module_id);
  }

  private courseNotFound(): NotFoundException {
    return new NotFoundException({
      code: 'COURSE_NOT_FOUND',
      message: 'Khóa học không tồn tại',
    });
  }

  private moduleNotFound(): NotFoundException {
    return new NotFoundException({
      code: 'MODULE_NOT_FOUND',
      message: 'Chương học không tồn tại',
    });
  }
}
