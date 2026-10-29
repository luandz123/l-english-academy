import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const ALLOWED_MEDIA_FOLDERS = [
  'lesson_pdfs',
  'quiz_media',
  'quiz_audio',
  'fulltests/audio',
  'fulltests/images',
  'full_test_media',
  'course-thumbnails',
  'game-avatars',
  'uploads',
  'materials',
] as const;

export type AllowedMediaFolder = (typeof ALLOWED_MEDIA_FOLDERS)[number];

export class UploadMediaDto {
  @ApiProperty({
    description: 'Thư mục lưu trữ media',
    enum: ALLOWED_MEDIA_FOLDERS,
  })
  @IsString()
  @IsNotEmpty()
  folder!: string;

  @ApiPropertyOptional({
    description: 'Tên file tùy chọn (nếu có, server sẽ sanitize)',
  })
  @IsString()
  @IsOptional()
  filename?: string;
}

export class UploadAvatarDto {
  @ApiPropertyOptional({
    description: 'Loại ảnh hồ sơ: avatars hoặc covers',
    enum: ['avatars', 'covers'],
    default: 'avatars',
  })
  @IsString()
  @IsOptional()
  @IsIn(['avatars', 'covers'])
  folder?: 'avatars' | 'covers';
}
