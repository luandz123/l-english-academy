import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import {
  CountCoursesQueryDto,
  CourseCategoryDto,
  CourseCountDto,
  CourseDto,
  ListCategoriesQueryDto,
  ListCoursesQueryDto,
} from './dto';

// Public: RLS "Courses viewable by all"
@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  @ApiOperation({
    summary: 'Lấy danh sách danh mục khóa học',
    description:
      'Trả về danh sách danh mục khóa học được sắp xếp theo display_order ASC, id ASC. Có thể lọc theo active.',
  })
  @ApiOkResponse({
    type: [CourseCategoryDto],
    description: 'Danh sách danh mục khóa học',
  })
  async getCategories(
    @Query() query: ListCategoriesQueryDto,
  ): Promise<CourseCategoryDto[]> {
    return this.catalogService.getCategories(query);
  }

  @Get('courses')
  @ApiOperation({
    summary: 'Lấy danh sách khóa học',
    description:
      'Trả về danh sách khóa học được sắp xếp theo display_order ASC, id DESC. Có thể lọc theo active và courseType.',
  })
  @ApiOkResponse({
    type: [CourseDto],
    description: 'Danh sách khóa học',
  })
  async getCourses(@Query() query: ListCoursesQueryDto): Promise<CourseDto[]> {
    return this.catalogService.getCourses(query);
  }

  @Get('courses/count')
  @ApiOperation({
    summary: 'Đếm số lượng khóa học',
    description: 'Trả về tổng số khóa học, có thể lọc theo active.',
  })
  @ApiOkResponse({
    type: CourseCountDto,
    description: 'Số lượng khóa học',
  })
  async countCourses(
    @Query() query: CountCoursesQueryDto,
  ): Promise<CourseCountDto> {
    return this.catalogService.countCourses(query);
  }

  @Get('courses/:id')
  @ApiOperation({
    summary: 'Lấy thông tin chi tiết một khóa học theo ID',
    description:
      'Trả về thông tin chi tiết của một khóa học hoặc 404 nếu không tìm thấy.',
  })
  @ApiOkResponse({
    type: CourseDto,
    description: 'Chi tiết khóa học',
  })
  @ApiNotFoundResponse({
    description: 'Khóa học không tồn tại (code: COURSE_NOT_FOUND)',
  })
  async getCourseById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CourseDto> {
    return this.catalogService.getCourseById(id);
  }
}
