import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AppRole } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  type AuthenticatedUser,
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import { AdminNoteDto, CreateAdminNoteDto } from './dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.admin)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users/:userId/notes')
  @ApiOperation({
    summary: 'Admin xem danh sách ghi chú của một học viên (ADM-004)',
  })
  @ApiOkResponse({ type: [AdminNoteDto] })
  @ApiBadRequestResponse({ description: 'userId không phải UUID' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không phải admin' })
  listStudentNotes(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<AdminNoteDto[]> {
    return this.adminService.listStudentNotes(userId);
  }

  @Post('users/:userId/notes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Admin thêm ghi chú cho học viên (ADM-004)',
    description: 'admin_id lấy từ token người gọi; client chỉ gửi content.',
  })
  @ApiCreatedResponse({ type: AdminNoteDto })
  @ApiBadRequestResponse({ description: 'VALIDATION_FAILED' })
  @ApiNotFoundResponse({ description: 'USER_NOT_FOUND' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không phải admin' })
  addStudentNote(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: CreateAdminNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminNoteDto> {
    return this.adminService.addStudentNote(user.id, userId, dto);
  }
}
