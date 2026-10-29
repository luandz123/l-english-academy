import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AppRole } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  type AuthenticatedUser,
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { MediaResponseDto, UploadAvatarDto, UploadMediaDto } from './dto';
import {
  MAX_AVATAR_FILE_SIZE,
  MAX_MEDIA_FILE_SIZE,
  MediaService,
  type UploadFileInput,
} from './media.service';

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tải lên tệp media cho nội dung (chỉ Admin)',
    description:
      'Tải lên file vào thư mục được cho phép trong bucket materials của Supabase Storage',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'folder'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Tệp cần tải lên (tối đa 50MB)',
        },
        folder: {
          type: 'string',
          description: 'Thư mục đích trong bucket materials',
          example: 'lesson_pdfs',
        },
        filename: {
          type: 'string',
          description: 'Tên tệp tùy chọn',
          example: 'my_file.pdf',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tải lên thành công',
    type: MediaResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Tệp hoặc thư mục không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  @ApiResponse({ status: 403, description: 'Không có quyền admin' })
  @ApiResponse({ status: 413, description: 'Tệp vượt quá dung lượng cho phép' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_MEDIA_FILE_SIZE, files: 1 },
    }),
  )
  async uploadMedia(
    @UploadedFile() file: UploadFileInput | undefined,
    @Body() dto: UploadMediaDto,
  ): Promise<MediaResponseDto> {
    return this.mediaService.uploadMedia(file, dto);
  }

  @Post('avatar')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tải lên ảnh đại diện hoặc ảnh bìa cá nhân',
    description:
      'Học viên tải lên ảnh đại diện hoặc ảnh bìa (tối đa 5MB, chỉ nhận tệp ảnh)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Tệp ảnh (tối đa 5MB)',
        },
        folder: {
          type: 'string',
          enum: ['avatars', 'covers'],
          default: 'avatars',
          description: 'Loại ảnh: avatars hoặc covers',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tải ảnh thành công',
    type: MediaResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Tệp không hợp lệ hoặc quá lớn' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  @ApiResponse({ status: 413, description: 'Tệp vượt quá dung lượng cho phép' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_AVATAR_FILE_SIZE, files: 1 },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: UploadFileInput | undefined,
    @Body() dto: UploadAvatarDto,
  ): Promise<MediaResponseDto> {
    return this.mediaService.uploadAvatar(user.id, file, dto);
  }
}
