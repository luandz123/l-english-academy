import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class NoteDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ format: 'uuid' })
  user_id!: string;

  @ApiProperty()
  lesson_id!: number;

  @ApiProperty()
  content!: string;

  @ApiProperty({ nullable: true })
  created_at!: string | null;

  @ApiProperty({ nullable: true })
  updated_at!: string | null;
}

export class CreateNoteDto {
  @ApiProperty({ description: 'Nội dung ghi chú' })
  @IsString()
  content!: string;
}
