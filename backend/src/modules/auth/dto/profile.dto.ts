import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

/** Đúng các cột bảng profiles (snake_case như PostgREST trả về). */
export class ProfileDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) user_id!: string;
  @ApiProperty({ nullable: true, type: String }) full_name!: string | null;
  @ApiProperty({ nullable: true, type: String }) avatar_url!: string | null;
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty({ nullable: true, type: Boolean }) is_pro!: boolean | null;
  @ApiProperty({ nullable: true, type: String }) pro_plan!: string | null;
  @ApiProperty({ nullable: true, type: String }) pro_activated_at!:
    string | null;
  @ApiProperty({ nullable: true, type: String }) created_at!: string | null;
  @ApiProperty({ nullable: true, type: String }) updated_at!: string | null;
}

/**
 * Học viên chỉ được sửa tên và ảnh đại diện. Policy cũ "Users update own profile"
 * cho sửa mọi cột → tự bật is_pro được (OPEN_QUESTIONS #10). Cột khác → 400.
 */
export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  full_name?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(2000)
  avatar_url?: string | null;
}

export class RolesDto {
  @ApiProperty({ enum: ['admin', 'student'], isArray: true })
  roles!: ('admin' | 'student')[];
}

export class AdminUserProfileResponseDto {
  @ApiPropertyOptional({ type: ProfileDto, nullable: true })
  profile!: ProfileDto | null;
}
