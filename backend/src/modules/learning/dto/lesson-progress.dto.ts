import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class LessonProgressDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ format: 'uuid' })
  user_id!: string;

  @ApiProperty()
  lesson_id!: number;

  @ApiProperty({ nullable: true })
  is_completed!: boolean | null;

  @ApiProperty({ nullable: true })
  last_watched_at!: string | null;

  @ApiProperty({ nullable: true })
  watch_duration_seconds!: number | null;
}

export class UpdateLessonProgressDto {
  @ApiProperty({ description: 'Trạng thái hoàn thành bài học' })
  @IsBoolean()
  is_completed!: boolean;
}
