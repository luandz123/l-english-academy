import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: 'up' })
  db!: 'up';

  @ApiProperty({
    example: 42,
    description: 'Số giây kể từ khi process khởi động',
  })
  uptime!: number;
}
