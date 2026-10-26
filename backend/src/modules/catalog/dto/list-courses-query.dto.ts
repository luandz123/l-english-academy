import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export const COURSE_TYPES = [
  'video_quiz',
  'flashcard',
  'listening',
  'speaking',
  'fulltest',
] as const;

export type CourseType = (typeof COURSE_TYPES)[number];

export class ListCoursesQueryDto {
  @ApiPropertyOptional({
    description:
      'Lọc theo trạng thái hoạt động (true/false). Bỏ trống = không lọc.',
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): unknown => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'active phải là boolean' })
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Lọc theo loại khóa học',
    enum: COURSE_TYPES,
  })
  @IsOptional()
  @IsIn(COURSE_TYPES, { message: 'courseType không hợp lệ' })
  courseType?: CourseType;
}
