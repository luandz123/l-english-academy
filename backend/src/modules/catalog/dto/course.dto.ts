import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CourseDto {
  @ApiProperty({ example: 1, description: 'ID khóa học' })
  id!: number;

  @ApiProperty({
    example: 'Khóa học TOEIC 450+',
    description: 'Tên khóa học',
  })
  title!: string;

  @ApiPropertyOptional({
    example: 'Dành cho người mới bắt đầu',
    nullable: true,
    description: 'Tiêu đề phụ',
  })
  subtitle!: string | null;

  @ApiPropertyOptional({
    example: 'Khóa học toàn diện...',
    nullable: true,
    description: 'Mô tả chi tiết',
  })
  description!: string | null;

  @ApiProperty({
    example: 'video_quiz',
    description: 'Loại khóa học',
  })
  course_type!: string;

  @ApiPropertyOptional({
    example: 1,
    nullable: true,
    description: 'ID danh mục',
  })
  category_id!: number | null;

  @ApiPropertyOptional({
    example: 499000,
    nullable: true,
    description: 'Giá tiền (VND)',
  })
  price!: number | null;

  @ApiPropertyOptional({
    example: 6,
    nullable: true,
    description: 'Thời hạn truy cập (tháng)',
  })
  duration_months!: number | null;

  @ApiPropertyOptional({
    example: 'https://...',
    nullable: true,
    description: 'Ảnh thumbnail khóa học',
  })
  thumbnail_url!: string | null;

  @ApiPropertyOptional({
    example: 'Cô Mai Phương',
    nullable: true,
    description: 'Giảng viên',
  })
  instructor!: string | null;

  @ApiPropertyOptional({
    example: true,
    nullable: true,
    description: 'Trạng thái hoạt động',
  })
  is_active!: boolean | null;

  @ApiPropertyOptional({
    example: false,
    nullable: true,
    description: 'Khóa học miễn phí',
  })
  is_free!: boolean | null;

  @ApiPropertyOptional({
    example: 0,
    nullable: true,
    description: 'Thứ tự hiển thị',
  })
  display_order!: number | null;

  @ApiPropertyOptional({
    example: '2026-03-29T14:17:47.000Z',
    nullable: true,
    description: 'Thời điểm tạo (chuỗi ISO)',
  })
  created_at!: string | null;
}
