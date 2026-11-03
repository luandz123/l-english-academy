import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const ENGLISH_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type EnglishLevel = (typeof ENGLISH_LEVELS)[number];
export const VISIBILITIES = ['public', 'private'] as const;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// ---------- Request ----------

export class RoomsQueryDto {
  @ApiPropertyOptional({ enum: [...ENGLISH_LEVELS, 'all'] })
  @IsOptional()
  @IsIn([...ENGLISH_LEVELS, 'all'])
  level?: EnglishLevel | 'all';

  @ApiPropertyOptional({ description: 'Một chủ đề, "all" = tất cả' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  topic?: string;

  @ApiPropertyOptional({ description: 'Chỉ phòng còn chỗ' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  has_slots?: boolean;
}

export class CreateRoomDto {
  @ApiProperty({ example: 'Daily talk B1' })
  @Transform(trim)
  @IsString()
  @Length(1, 80)
  name!: string;

  @ApiProperty({ enum: ENGLISH_LEVELS })
  @IsIn(ENGLISH_LEVELS)
  english_level!: EnglishLevel;

  @ApiProperty({ type: [String], example: ['Travel'] })
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  topics!: string[];

  @ApiProperty({ minimum: 2, maximum: 5, example: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(5)
  capacity!: number;

  @ApiProperty({ enum: VISIBILITIES })
  @IsIn(VISIBILITIES)
  visibility!: (typeof VISIBILITIES)[number];

  @ApiPropertyOptional({
    description: 'Phòng riêng tư; bỏ trống → server tự sinh 6 ký tự',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  passcode?: string;
}

export class JoinRoomDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  passcode?: string;
}

export class LeaveRoomDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  session_id?: string;
}

export class MatchRoomDto {
  @ApiProperty({ enum: ENGLISH_LEVELS })
  @IsIn(ENGLISH_LEVELS)
  level!: EnglishLevel;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  topics!: string[];
}

export class UpdateLevelDto {
  @ApiProperty({ enum: ENGLISH_LEVELS })
  @IsIn(ENGLISH_LEVELS)
  english_level!: EnglishLevel;
}

// ---------- Response (đúng shape `src/types/speaking.ts`) ----------

export class SpeakingMemberDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) room_id!: string;
  @ApiProperty({ format: 'uuid' }) user_id!: string;
  @ApiProperty({ enum: ['host', 'member'] }) role!: string;
  @ApiProperty({ format: 'date-time' }) joined_at!: string;
  @ApiProperty({ format: 'date-time' }) last_seen_at!: string;
  @ApiProperty() is_muted!: boolean;
  @ApiProperty() is_speaking!: boolean;
  @ApiProperty() full_name!: string;
  @ApiProperty({ nullable: true, type: String }) avatar_url!: string | null;
}

export class SpeakingRoomDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ format: 'uuid' }) host_user_id!: string;
  @ApiProperty({ enum: ENGLISH_LEVELS }) english_level!: string;
  @ApiProperty({ type: [String] }) topics!: string[];
  @ApiProperty({ enum: VISIBILITIES }) visibility!: string;
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Chỉ trả cho chủ phòng; người khác luôn null',
  })
  passcode!: string | null;
  @ApiProperty() capacity!: number;
  @ApiProperty({ enum: ['active', 'closed', 'expired'] }) status!: string;
  @ApiProperty({ format: 'date-time' }) created_at!: string;
  @ApiProperty({ format: 'date-time' }) expires_at!: string;
  @ApiProperty() current_members!: number;
  @ApiProperty({ type: [SpeakingMemberDto] }) members!: SpeakingMemberDto[];
  @ApiPropertyOptional({ nullable: true, type: String }) host_name?:
    string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) host_avatar?:
    string | null;
}

export class JoinResultDto {
  @ApiProperty({ format: 'uuid' }) member_id!: string;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' })
  session_id!: string | null;
  @ApiProperty({ enum: ['host', 'member'] }) role!: string;
  @ApiProperty() is_existing!: boolean;
}

export class CreateRoomResultDto extends JoinResultDto {
  @ApiProperty({ type: SpeakingRoomDto }) room!: SpeakingRoomDto;
}

export class LeaveResultDto {
  @ApiProperty() duration_seconds!: number;
  @ApiProperty() remaining_members!: number;
}

export class MatchResultDto {
  @ApiProperty() matched!: boolean;
  @ApiPropertyOptional({ type: SpeakingRoomDto, nullable: true })
  room!: SpeakingRoomDto | null;
}

export class SpeakingStatsDto {
  @ApiProperty() total_speaking_seconds!: number;
  @ApiProperty({ enum: ENGLISH_LEVELS }) english_level!: string;
}

export class IceServerDto {
  @ApiProperty() urls!: string;
}

export class VoiceTokenDto {
  @ApiProperty({ enum: ['livekit', 'webrtc-mesh'] }) mode!:
    'livekit' | 'webrtc-mesh';
  @ApiProperty({ format: 'uuid' }) roomId!: string;
  @ApiProperty() identity!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) avatarUrl!: string | null;
  @ApiPropertyOptional({ description: 'JWT LiveKit (mode livekit)' })
  token?: string;
  @ApiPropertyOptional({ description: 'URL máy chủ LiveKit (mode livekit)' })
  url?: string;
  @ApiPropertyOptional({ type: [IceServerDto] }) iceServers?: IceServerDto[];
}
