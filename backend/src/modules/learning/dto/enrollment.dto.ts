import { ApiProperty } from '@nestjs/swagger';

/** Một dòng `enrollments` (shape `select *` của Supabase). */
export class EnrollmentDto {
  @ApiProperty({ example: 7 })
  id!: number;

  @ApiProperty({ format: 'uuid' })
  user_id!: string;

  @ApiProperty({ example: 1 })
  course_id!: number;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  enrolled_at!: string | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  expires_at!: string | null;
}

/** Bọc trong object vì Nest trả body rỗng khi handler trả `null`. */
export class EnrollmentResponseDto {
  @ApiProperty({ type: EnrollmentDto, nullable: true })
  enrollment!: EnrollmentDto | null;
}
