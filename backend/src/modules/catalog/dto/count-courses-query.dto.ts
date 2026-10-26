import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class CountCoursesQueryDto {
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
}
