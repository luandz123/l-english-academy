import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { PublicSettingResponseDto } from './dto';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly adminService: AdminService) {}

  @Get(':key')
  @ApiOperation({
    summary: 'Đọc cấu hình công khai không nhạy cảm',
    description:
      'Key không nằm trong danh sách công khai trả về { setting: null }, không báo lỗi hay lộ sự tồn tại của key.',
  })
  @ApiOkResponse({ type: PublicSettingResponseDto })
  async getPublicSetting(
    @Param('key') key: string,
  ): Promise<PublicSettingResponseDto> {
    const setting = await this.adminService.getPublicSetting(key);
    return { setting };
  }
}
