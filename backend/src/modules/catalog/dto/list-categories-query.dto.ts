import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { toOptionalBoolean } from '../../../common/transforms/to-optional-boolean';

export class ListCategoriesQueryDto {
  @ApiPropertyOptional({
    description:
      'Lọc theo trạng thái hoạt động (true/false). Bỏ trống = không lọc.',
    type: Boolean,
  })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean({ message: 'active phải là boolean' })
  active?: boolean;
}
