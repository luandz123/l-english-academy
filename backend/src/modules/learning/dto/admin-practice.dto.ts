import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SavePracticeDto {
  @ApiPropertyOptional({ nullable: true, type: Number, example: 5 })
  @IsOptional()
  @IsInt()
  quiz_id?: number | null;

  @ApiProperty({ example: 120, minimum: 0 })
  @IsInt()
  @Min(0)
  trigger_at_seconds!: number;

  @ApiProperty({ example: 'Luyện tập nhanh' })
  @IsString()
  title!: string;
}
