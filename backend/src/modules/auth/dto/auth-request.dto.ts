import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/**
 * user_metadata frontend đang ghi (Register: full_name; Profile.tsx: full_name,
 * avatar_url, bio, cover_url). Key khác bị từ chối để không ghi tùy ý vào DB.
 */
export class UserMetadataDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  full_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  avatar_url?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  cover_url?: string;
}

class EmailPasswordDto {
  @ApiProperty({ example: 'hocvien@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  // Supabase Auth mặc định yêu cầu tối thiểu 6 ký tự; quy tắc 8 ký tự + chữ + số
  // vẫn do giao diện kiểm như cũ.
  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Password should be at least 6 characters.' })
  @MaxLength(128)
  password!: string;
}

export class RegisterDto extends EmailPasswordDto {
  @ApiPropertyOptional({ type: UserMetadataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserMetadataDto)
  data?: UserMetadataDto;

  @ApiPropertyOptional({ description: 'Trang đích sau khi bấm link xác nhận' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  redirect_to?: string;
}

export class LoginDto extends EmailPasswordDto {}

export class AdminCreateUserDto extends RegisterDto {}

export class RecoverDto {
  @ApiProperty()
  @Transform(normalizeEmail)
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'http://localhost:8082/reset-password' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  redirect_to?: string;
}

export class UpdateMeDto {
  @ApiPropertyOptional({ minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password should be at least 6 characters.' })
  @MaxLength(128)
  password?: string;

  @ApiPropertyOptional({ type: UserMetadataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserMetadataDto)
  data?: UserMetadataDto;
}

export class VerifyQueryDto {
  @ApiProperty() @IsString() @MaxLength(200) token!: string;

  @ApiProperty({ enum: ['signup', 'recovery'] })
  @IsIn(['signup', 'recovery'])
  type!: 'signup' | 'recovery';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  redirect_to?: string;
}
