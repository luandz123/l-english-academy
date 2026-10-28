import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { EnrollmentDto } from './enrollment.dto';

export class AdminEnrollmentCourseDto {
  @ApiProperty({ example: 'TOEIC 450+' })
  title!: string;
}

export class AdminEnrollmentDto extends EnrollmentDto {
  @ApiProperty({ type: AdminEnrollmentCourseDto, nullable: true })
  courses!: AdminEnrollmentCourseDto | null;
}

export class CreateAdminEnrollmentDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  course_id!: number;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    minimum: 1,
    maximum: 3650,
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  expires_in_days?: number | null;
}
