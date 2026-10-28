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

export class AdminEnrollmentProfileDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  user_id!: string;

  @ApiProperty({ example: 'Nguyen Van A', nullable: true })
  full_name!: string | null;
}

export class AdminEnrollmentListDto extends AdminEnrollmentDto {
  @ApiProperty({ type: AdminEnrollmentProfileDto, nullable: true })
  profiles!: AdminEnrollmentProfileDto | null;
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
