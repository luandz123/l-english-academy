import { ApiProperty } from '@nestjs/swagger';

export class FavoriteDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ format: 'uuid' })
  user_id!: string;

  @ApiProperty()
  lesson_id!: number;

  @ApiProperty({ nullable: true })
  created_at!: string | null;
}
