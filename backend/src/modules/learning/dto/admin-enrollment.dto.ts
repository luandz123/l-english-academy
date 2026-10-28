import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min, ValidateIf } from 'class-validator';
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

  @ApiProperty({
    nullable: true,
    type: Number,
    minimum: 1,
    maximum: 3650,
    example: 30,
  })
  @ValidateIf((o: CreateAdminEnrollmentDto) => o.expires_in_days !== null)
  @IsInt()
  @Min(1)
  @Max(3650)
  expires_in_days!: number | null;
}
