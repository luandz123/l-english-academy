import { ApiProperty } from '@nestjs/swagger';

export class MediaResponseDto {
  @ApiProperty({
    description: 'Đường dẫn tệp trong bucket',
    example: 'lesson_pdfs/1730000000_sanitized.pdf',
  })
  path!: string;

  @ApiProperty({
    description: 'URL công khai của tệp',
    example:
      'https://test.supabase.co/storage/v1/object/public/materials/lesson_pdfs/1730000000_sanitized.pdf',
  })
  public_url!: string;
}
