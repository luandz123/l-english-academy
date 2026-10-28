import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { CatalogMapper } from './catalog.mapper';
import { CatalogRepository } from './catalog.repository';
import {
  AdminModuleDto,
  CourseCategoryDto,
  CourseDto,
  ModuleDto,
  PatchCourseDto,
  PatchModuleDto,
  ReorderModulesDto,
  SaveCategoryDto,
  SaveCourseDto,
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

  async listAdminCourses(): Promise<CourseDto[]> {
    const courses = await this.repo.findAdminCourses();
    return this.mapper.toCourseDtoList(courses);
  }

  async createCourse(dto: SaveCourseDto): Promise<CourseDto> {
    if (dto.category_id !== null && dto.category_id !== undefined) {
      const category = await this.repo.findCategoryById(dto.category_id);
      if (!category) {
        throw this.categoryNotFound();
      }
    }

    const price = dto.is_free ? 0 : dto.price;
    const course = await this.repo.createCourse({
      title: dto.title,
      subtitle: dto.subtitle ?? null,
      description: dto.description ?? null,
      instructor: dto.instructor ?? null,
      thumbnailUrl: dto.thumbnail_url ?? null,
      courseType: dto.course_type,
      categoryId:
        dto.category_id !== null && dto.category_id !== undefined
          ? BigInt(dto.category_id)
          : null,
      price,
      isFree: dto.is_free,
      isActive: dto.is_active,
      durationMonths: dto.duration_months ?? null,
      displayOrder: dto.display_order,
    });
    return this.mapper.toCourseDto(course);
  }

  async updateCourse(id: number, dto: SaveCourseDto): Promise<CourseDto> {
    const existing = await this.repo.findCourseById(id);
    if (!existing) {
      throw this.courseNotFound();
    }

    if (dto.category_id !== null && dto.category_id !== undefined) {
      const category = await this.repo.findCategoryById(dto.category_id);
      if (!category) {
        throw this.categoryNotFound();
      }
    }

    const price = dto.is_free ? 0 : dto.price;
    const updated = await this.repo.updateCourse(id, {
      title: dto.title,
      subtitle: dto.subtitle ?? null,
      description: dto.description ?? null,
      instructor: dto.instructor ?? null,
      thumbnailUrl: dto.thumbnail_url ?? null,
      courseType: dto.course_type,
      categoryId:
        dto.category_id !== null && dto.category_id !== undefined
          ? BigInt(dto.category_id)
          : null,
      price,
      isFree: dto.is_free,
      isActive: dto.is_active,
      durationMonths: dto.duration_months ?? null,
      displayOrder: dto.display_order,
    });
    return this.mapper.toCourseDto(updated);
  }

  async patchCourse(id: number, dto: PatchCourseDto): Promise<CourseDto> {
    if (dto.is_active === undefined && dto.is_free === undefined) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Cần ít nhất một trường để cập nhật',
      });
    }

    const existing = await this.repo.findCourseById(id);
    if (!existing) {
      throw this.courseNotFound();
    }

    const data: Prisma.CourseUncheckedUpdateInput = {};
    if (dto.is_active !== undefined) {
      data.isActive = dto.is_active;
    }
    if (dto.is_free !== undefined) {
      data.isFree = dto.is_free;
      if (dto.is_free) {
        data.price = 0;
      }
    }

    const updated = await this.repo.updateCourse(id, data);
    return this.mapper.toCourseDto(updated);
  }

  async deleteCourse(id: number): Promise<void> {
    try {
      await this.repo.deleteCourse(id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return;
      }
      throw error;
    }
  }

  async listAdminCategories(): Promise<CourseCategoryDto[]> {
    const categories = await this.repo.findAdminCategories();
    return this.mapper.toCategoryDtoList(categories);
  }

  async createCategory(dto: SaveCategoryDto): Promise<CourseCategoryDto> {
    try {
      const category = await this.repo.createCategory({
        name: dto.name,
        slug: dto.slug,
        icon: dto.icon,
        displayOrder: dto.display_order,
        isActive: dto.is_active,
      });
      return this.mapper.toCategoryDto(category);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'CATEGORY_SLUG_EXISTS',
          message: 'Slug danh mục đã tồn tại',
        });
      }
      throw error;
    }
  }

  async updateCategory(
    id: number,
    dto: SaveCategoryDto,
  ): Promise<CourseCategoryDto> {
    const existing = await this.repo.findCategoryById(id);
    if (!existing) {
      throw this.categoryNotFound();
    }

    try {
      const updated = await this.repo.updateCategory(id, {
        name: dto.name,
        slug: dto.slug,
        icon: dto.icon,
        displayOrder: dto.display_order,
        isActive: dto.is_active,
      });
      return this.mapper.toCategoryDto(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'CATEGORY_SLUG_EXISTS',
          message: 'Slug danh mục đã tồn tại',
        });
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw this.categoryNotFound();
      }
      throw error;
    }
  }

  async deleteCategory(id: number): Promise<void> {
    try {
      await this.repo.deleteCategory(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return;
        }
        if (error.code === 'P2003') {
          throw new ConflictException({
            code: 'CATEGORY_HAS_COURSES',
            message: 'Không thể xóa danh mục đang có khóa học',
          });
        }
      }
      throw error;
    }
  }

  private courseNotFound(): NotFoundException {
    return new NotFoundException({
      code: 'COURSE_NOT_FOUND',
      message: 'Khóa học không tồn tại',
    });
  }

  private categoryNotFound(): NotFoundException {
    return new NotFoundException({
      code: 'CATEGORY_NOT_FOUND',
      message: 'Danh mục không tồn tại',
    });
  }

  private moduleNotFound(): NotFoundException {
    return new NotFoundException({
      code: 'MODULE_NOT_FOUND',
      message: 'Chương học không tồn tại',
    });
  }
}
