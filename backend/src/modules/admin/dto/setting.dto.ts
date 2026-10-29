import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class SettingDto {
  @ApiProperty({ example: 'homepage_showcase_config' })
  key!: string;

  @ApiProperty({ example: '{"vip_combo":{"price":1750000}}' })
  value!: string;

  @ApiProperty({ nullable: true, example: '2026-10-23T00:00:00.000Z' })
  updated_at!: string | null;
}

export class PublicSettingResponseDto {
  @ApiProperty({ type: () => SettingDto, nullable: true })
  setting!: SettingDto | null;
}

export class UpdateSettingDto {
  @ApiProperty({
    description: 'Giá trị cấu hình dạng text/JSON',
    example: '{"vip_combo":{"price":1750000}}',
  })
  @IsString()
  @MaxLength(1_000_000)
  value!: string;
}
