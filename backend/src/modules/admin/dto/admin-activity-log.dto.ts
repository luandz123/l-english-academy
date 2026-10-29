import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAdminActivityLogDto {
  @ApiProperty({ description: 'Hành động thực hiện' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  action!: string;

  @ApiPropertyOptional({ description: 'Loại đối tượng tác động' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  entity_type?: string;

  @ApiPropertyOptional({ description: 'ID của đối tượng tác động' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  entity_id?: string;

  @ApiPropertyOptional({ description: 'Chi tiết bổ sung dạng JSON' })
  @IsOptional()
  details?: Record<string, unknown>;
}

export class AdminActivityLogDto {
  @ApiProperty()
  id!: number;

  @ApiPropertyOptional({ nullable: true })
  admin_id!: string | null;

  @ApiProperty()
  action!: string;

  @ApiPropertyOptional({ nullable: true })
  entity_type!: string | null;

  @ApiPropertyOptional({ nullable: true })
  entity_id!: string | null;

  @ApiPropertyOptional({ nullable: true })
  details!: any;

  @ApiPropertyOptional({ nullable: true })
  created_at!: string | null;
}
