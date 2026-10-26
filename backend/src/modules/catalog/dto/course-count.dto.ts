import { ApiProperty } from '@nestjs/swagger';

export class CourseCountDto {
  @ApiProperty({ example: 12, description: 'Tổng số lượng khóa học' })
  count!: number;
}
