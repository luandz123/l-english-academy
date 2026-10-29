import { ApiProperty } from '@nestjs/swagger';

export class AdminBackupStatsDto {
  @ApiProperty()
  courses!: number;

  @ApiProperty()
  lessons!: number;

  @ApiProperty()
  full_tests!: number;

  @ApiProperty()
  questions!: number;

  @ApiProperty()
  answers!: number;

  @ApiProperty()
  profiles!: number;

  @ApiProperty()
  user_full_test_results!: number;

  @ApiProperty()
  enrollments!: number;

  @ApiProperty()
  vocab_quizzes!: number;

  @ApiProperty()
  platform_settings!: number;
}
