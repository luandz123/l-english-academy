import { Injectable, NotFoundException } from '@nestjs/common';
import { CatalogRepository } from './catalog.repository';
import { CatalogMapper } from './catalog.mapper';
import {
  CountCoursesQueryDto,
  CourseCategoryDto,
  CourseCountDto,
  CourseDto,
  ListCategoriesQueryDto,
  ListCoursesQueryDto,
} from './dto';

@Injectable()
export class CatalogService {
  constructor(
    private readonly catalogRepository: CatalogRepository,
    private readonly catalogMapper: CatalogMapper,
  ) {}

  async getCategories(
    query: ListCategoriesQueryDto,
  ): Promise<CourseCategoryDto[]> {
    const categories = await this.catalogRepository.findCategories({
      isActive: query.active,
    });
    return this.catalogMapper.toCategoryDtoList(categories);
  }

  async getCourses(query: ListCoursesQueryDto): Promise<CourseDto[]> {
    const courses = await this.catalogRepository.findCourses({
      isActive: query.active,
      courseType: query.courseType,
    });
    return this.catalogMapper.toCourseDtoList(courses);
  }

  async countCourses(query: CountCoursesQueryDto): Promise<CourseCountDto> {
    const count = await this.catalogRepository.countCourses({
      isActive: query.active,
    });
    return { count };
  }

  async getCourseById(id: number): Promise<CourseDto> {
    const course = await this.catalogRepository.findCourseById(id);
    if (!course) {
      throw new NotFoundException({
        code: 'COURSE_NOT_FOUND',
        message: `Khóa học với ID ${id} không tồn tại`,
      });
    }
    return this.catalogMapper.toCourseDto(course);
  }
}
