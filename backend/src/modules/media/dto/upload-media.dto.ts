import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

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

/** Xin URL ký tạm để trình duyệt tải tệp thẳng lên kho (tệp lớn: GIF động, video). */
export class CreateUploadUrlDto {
  @ApiProperty({ example: 'uploads' })
  @IsString()
  @IsNotEmpty()
  folder!: string;

  @ApiProperty({ example: 'hero-banner.gif' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  filename!: string;

  @ApiProperty({
    example: 'image/gif',
    description: 'MIME: image/*, video/*, audio/* hoặc application/pdf',
  })
  @IsString()
  @Matches(/^(image|video|audio)\/[\w.+-]+$|^application\/pdf$/)
  content_type!: string;

  @ApiProperty({
    example: 12_000_000,
    description: 'Dung lượng (byte), tối đa 50MB',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size!: number;
}

export class UploadUrlResponseDto {
  @ApiProperty({
    nullable: true,
    type: String,
    description:
      'URL PUT ký tạm (2 giờ). null = kho không hỗ trợ, hãy dùng POST /media/upload',
  })
  upload_url!: string | null;

  @ApiProperty({ example: 'uploads/1730000000_hero-banner.gif' })
  path!: string;

  @ApiProperty()
  public_url!: string;
}
