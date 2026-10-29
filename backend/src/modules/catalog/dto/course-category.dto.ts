import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CourseCategoryDto {
  @ApiProperty({ example: 1, description: 'ID danh mục' })
  id!: number;

  @ApiProperty({ example: 'TOEIC Căn Bản', description: 'Tên danh mục' })
  name!: string;

  @ApiProperty({
    example: 'toeic-can-ban',
    description: 'Đường dẫn slug duy nhất',
  })
  slug!: string;

  @ApiPropertyOptional({
    example: 'BookOpen',
    nullable: true,
    description: 'Icon đại diện cho danh mục',
  })
  icon!: string | null;

  @ApiPropertyOptional({
    example: 0,
    nullable: true,
    description: 'Thứ tự hiển thị',
  })
  display_order!: number | null;

  @ApiPropertyOptional({
    example: true,
    nullable: true,
    description: 'Trạng thái hoạt động',
  })
  is_active!: boolean | null;

  @ApiPropertyOptional({
    example: '2026-03-29T14:17:47.000Z',
    nullable: true,
    description: 'Thời điểm tạo (chuỗi ISO)',
  })
  created_at!: string | null;
}
