import { ApiProperty } from '@nestjs/swagger';

export class TranscriptionDto {
  @ApiProperty({
    description: 'Chữ nhận được từ bản ghi (rỗng nếu không nghe thấy gì)',
    example: 'Where is the nearest bus stop?',
  })
  text!: string;
}
