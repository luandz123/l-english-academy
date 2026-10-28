import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AppRole } from '../../generated/prisma/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { CatalogAdminService } from './catalog-admin.service';
import {
  AdminModuleDto,
  ModuleDto,
  PatchModuleDto,
  ReorderModulesDto,
  SaveModuleDto,
  SetFreeModuleDto,
} from './dto';

@ApiTags('catalog-admin')
@ApiBearerAuth()
@Controller('catalog/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.admin)
export class CatalogAdminController {
  constructor(private readonly catalogAdminService: CatalogAdminService) {}

  @Get('courses/:courseId/modules')
  @ApiOperation({
    summary: 'Admin xem cây chương kèm bài học và quiz của khóa (ADM-010)',
    description:
      'Trả về toàn bộ chương của khóa (kể cả chương/bài đang ẩn) kèm danh sách lessons và quizzes theo thứ tự display_order, id. Khóa không tồn tại → [].',
  })
  @ApiOkResponse({ type: [AdminModuleDto] })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không phải admin' })
  listCourseModules(
    @Param('courseId', ParseIntPipe) courseId: number,
  ): Promise<AdminModuleDto[]> {
    return this.catalogAdminService.listCourseModules(courseId);
  }

  @Post('courses/:courseId/modules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Admin tạo chương mới trong khóa học (ADM-010)',
    description: 'Server tự tính display_order = max trong khóa + 1 (hoặc 0).',
  })
  @ApiCreatedResponse({ type: ModuleDto })
  @ApiBadRequestResponse({ description: 'VALIDATION_FAILED' })
  @ApiNotFoundResponse({ description: 'COURSE_NOT_FOUND' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không phải admin' })
  createModule(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() dto: SaveModuleDto,
  ): Promise<ModuleDto> {
    return this.catalogAdminService.createModule(courseId, dto);
  }

  @Put('modules/:id')
  @ApiOperation({
    summary: 'Admin cập nhật thông tin chương (ADM-010)',
  })
  @ApiOkResponse({ type: ModuleDto })
  @ApiBadRequestResponse({ description: 'VALIDATION_FAILED' })
  @ApiNotFoundResponse({ description: 'MODULE_NOT_FOUND' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không phải admin' })
  updateModule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveModuleDto,
  ): Promise<ModuleDto> {
    return this.catalogAdminService.updateModule(id, dto);
  }

  @Patch('modules/:id')
  @ApiOperation({
    summary: 'Admin bật/tắt miễn phí hoặc hiển thị của chương (ADM-010)',
  })
  @ApiOkResponse({ type: ModuleDto })
  @ApiBadRequestResponse({ description: 'VALIDATION_FAILED' })
  @ApiNotFoundResponse({ description: 'MODULE_NOT_FOUND' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không phải admin' })
  patchModule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PatchModuleDto,
  ): Promise<ModuleDto> {
    return this.catalogAdminService.patchModule(id, dto);
  }

  @Delete('modules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Admin xóa chương học (ADM-010)',
    description:
      'Xóa chương học theo id; FK cascade xóa toàn bộ bài học (lessons) và bài kiểm tra (quizzes) thuộc chương như CSDL hiện hành. Không tồn tại vẫn trả 204.',
  })
  @ApiNoContentResponse({ description: 'Đã xóa chương' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không phải admin' })
  async deleteModule(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.catalogAdminService.deleteModule(id);
  }

  @Put('courses/:courseId/module-order')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Admin sắp xếp lại thứ tự các chương trong khóa học (ADM-010)',
  })
  @ApiNoContentResponse({ description: 'Đã cập nhật thứ tự chương' })
  @ApiBadRequestResponse({ description: 'MODULE_ORDER_INVALID' })
  @ApiNotFoundResponse({ description: 'COURSE_NOT_FOUND' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không phải admin' })
  async reorderModules(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() dto: ReorderModulesDto,
  ): Promise<void> {
    await this.catalogAdminService.reorderModules(courseId, dto);
  }

  @Put('courses/:courseId/free-module')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Admin cấu hình 1 chạm: đặt duy nhất 1 chương học thử miễn phí cho khóa (ADM-010)',
  })
  @ApiNoContentResponse({ description: 'Đã cập nhật chương miễn phí' })
  @ApiBadRequestResponse({ description: 'MODULE_NOT_IN_COURSE' })
  @ApiNotFoundResponse({ description: 'COURSE_NOT_FOUND' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không phải admin' })
  async setFreeModule(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() dto: SetFreeModuleDto,
  ): Promise<void> {
    await this.catalogAdminService.setFreeModule(courseId, dto);
  }
}
