import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { AppRole } from '../../generated/prisma/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import {
  AdminMaterialDto,
  CreateMaterialDto,
  DeleteFolderDto,
  ListMaterialsQueryDto,
  RenameFolderDto,
} from './dto';
import { MaterialsService } from './materials.service';

@ApiTags('admin/materials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.admin)
@ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
@ApiForbiddenResponse({ description: 'Không có quyền admin' })
@Controller('admin/materials')
export class MaterialsAdminController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin lấy danh sách tài liệu' })
  @ApiOkResponse({ type: [AdminMaterialDto] })
  listMaterials(
    @Query() query: ListMaterialsQueryDto,
  ): Promise<AdminMaterialDto[]> {
    return this.materialsService.listMaterials(query);
  }

  @Post()
  @ApiOperation({ summary: 'Admin thêm tài liệu mới' })
  @ApiCreatedResponse({ type: AdminMaterialDto })
  @ApiBadRequestResponse({
    description: 'Dữ liệu không hợp lệ hoặc liên kết không tồn tại',
  })
  createMaterial(@Body() dto: CreateMaterialDto): Promise<AdminMaterialDto> {
    return this.materialsService.createMaterial(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Admin xóa tài liệu' })
  @ApiNoContentResponse({ description: 'Đã xóa tài liệu thành công' })
  @ApiNotFoundResponse({ description: 'Tài liệu không tồn tại' })
  deleteMaterial(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.materialsService.deleteMaterial(id);
  }

  @Post('rename-folder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin đổi tên thư mục trong một transaction' })
  @ApiOkResponse({ description: 'Số lượng tài liệu đã cập nhật thư mục' })
  renameFolder(@Body() dto: RenameFolderDto): Promise<{ count: number }> {
    return this.materialsService.renameFolder(dto);
  }

  @Post('delete-folder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin xóa thư mục và các tệp bên trong trong một transaction',
  })
  @ApiOkResponse({ description: 'Số lượng tài liệu đã xóa' })
  deleteFolder(@Body() dto: DeleteFolderDto): Promise<{ count: number }> {
    return this.materialsService.deleteFolder(dto);
  }
}
