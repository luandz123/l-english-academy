import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Cùng shape với `User` của @supabase/supabase-js (các field frontend dùng). */
export class AuthUserDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'authenticated' }) aud!: 'authenticated';
  @ApiProperty({ example: 'authenticated' }) role!: 'authenticated';
  @ApiProperty() email!: string;
  @ApiProperty({ nullable: true, type: String }) email_confirmed_at!:
    string | null;
  @ApiProperty({ nullable: true, type: String }) confirmed_at!: string | null;
  @ApiProperty({ nullable: true, type: String }) last_sign_in_at!:
    string | null;
  @ApiProperty({ example: { provider: 'email', providers: ['email'] } })
  app_metadata!: { provider: string; providers: string[] };
  @ApiProperty({ example: { full_name: 'Nguyễn Văn A' } })
  user_metadata!: Record<string, unknown>;
  @ApiProperty() created_at!: string;
  @ApiProperty() updated_at!: string;
}

/** Cùng shape với `Session` của Supabase. Refresh token nằm trong cookie httpOnly, không trả ra JSON. */
export class AuthSessionDto {
  @ApiProperty() access_token!: string;
  @ApiProperty({ example: 'bearer' }) token_type!: 'bearer';
  @ApiProperty({ example: 900 }) expires_in!: number;
  @ApiProperty({ description: 'Unix giây' }) expires_at!: number;
  @ApiProperty({ type: AuthUserDto }) user!: AuthUserDto;
}

export class AuthResultDto {
  @ApiProperty({ type: AuthUserDto }) user!: AuthUserDto;
  @ApiPropertyOptional({
    type: AuthSessionDto,
    nullable: true,
    description: 'null khi phải xác nhận email trước',
  })
  session!: AuthSessionDto | null;
}

export class AuthUserResultDto {
  @ApiProperty({ type: AuthUserDto }) user!: AuthUserDto;
}
