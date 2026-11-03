import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  type AuthenticatedUser,
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';
import {
  CreateRoomDto,
  CreateRoomResultDto,
  JoinResultDto,
  JoinRoomDto,
  LeaveResultDto,
  LeaveRoomDto,
  MatchResultDto,
  MatchRoomDto,
  RoomsQueryDto,
  SpeakingRoomDto,
  SpeakingStatsDto,
  UpdateLevelDto,
  VoiceTokenDto,
} from './dto/speaking.dto';
import { SpeakingService } from './speaking.service';

const uuid = new ParseUUIDPipe({ version: '4' });

@ApiTags('speaking')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
@UseGuards(JwtAuthGuard)
@Controller('speaking')
export class SpeakingController {
  constructor(private readonly speaking: SpeakingService) {}

  @Get('rooms')
  @ApiOperation({
    summary:
      'Phòng công khai đang mở (kèm thành viên). Không trả mã phòng của người khác.',
  })
  @ApiOkResponse({ type: [SpeakingRoomDto] })
  listRooms(
    @CurrentUser() user: AuthenticatedUser,
    @Query() q: RoomsQueryDto,
  ): Promise<SpeakingRoomDto[]> {
    return this.speaking.listRooms(user.id, q);
  }

  @Get('rooms/:id')
  @ApiOperation({
    summary: 'Chi tiết phòng: phòng đang mở, hoặc mình là chủ/thành viên',
  })
  @ApiOkResponse({ type: SpeakingRoomDto })
  @ApiNotFoundResponse({ description: 'ROOM_NOT_FOUND' })
  getRoom(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', uuid) id: string,
  ): Promise<SpeakingRoomDto> {
    return this.speaking.getRoom(user.id, id);
  }

  @Post('rooms')
  @ApiOperation({
    summary:
      'Tạo phòng; chủ phòng tự vào phòng. Phòng riêng tư không nhập mã → server tự sinh.',
  })
  @ApiCreatedResponse({ type: CreateRoomResultDto })
  createRoom(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoomDto,
  ): Promise<CreateRoomResultDto> {
    return this.speaking.createRoom(user.id, dto);
  }

  @Post('rooms/:id/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Vào phòng (khóa dòng, kiểm tra sĩ số và mã phòng riêng tư)',
  })
  @ApiOkResponse({ type: JoinResultDto })
  @ApiForbiddenResponse({ description: 'INVALID_PASSCODE' })
  @ApiConflictResponse({ description: 'ROOM_FULL, ROOM_CLOSED' })
  @ApiNotFoundResponse({ description: 'ROOM_NOT_FOUND' })
  join(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', uuid) id: string,
    @Body() dto: JoinRoomDto,
  ): Promise<JoinResultDto> {
    return this.speaking.joinRoom(user.id, id, dto.passcode);
  }

  @Post('rooms/:id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Rời phòng: đóng phiên, cộng thời gian nói, chuyển chủ phòng hoặc đóng phòng trống',
  })
  @ApiOkResponse({ type: LeaveResultDto })
  leave(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', uuid) id: string,
    @Body() dto: LeaveRoomDto,
  ): Promise<LeaveResultDto> {
    return this.speaking.leaveRoom(user.id, id, dto.session_id);
  }

  @Post('rooms/:id/close')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Đóng phòng (chỉ chủ phòng)' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'NOT_HOST' })
  async close(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', uuid) id: string,
  ): Promise<void> {
    await this.speaking.closeRoom(user.id, id);
  }

  @Post('rooms/:id/token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Token âm thanh: LiveKit nếu có cấu hình, không thì WebRTC mesh + STUN. Chỉ thành viên.',
  })
  @ApiOkResponse({ type: VoiceTokenDto })
  @ApiForbiddenResponse({ description: 'NOT_MEMBER' })
  token(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', uuid) id: string,
  ): Promise<VoiceTokenDto> {
    return this.speaking.voiceToken(user.id, id);
  }

  @Post('match')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ghép cặp nhanh theo trình độ và chủ đề' })
  @ApiOkResponse({ type: MatchResultDto })
  match(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MatchRoomDto,
  ): Promise<MatchResultDto> {
    return this.speaking.match(user.id, dto.level, dto.topics);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Tổng thời gian nói và trình độ của mình' })
  @ApiOkResponse({ type: SpeakingStatsDto })
  stats(@CurrentUser() user: AuthenticatedUser): Promise<SpeakingStatsDto> {
    return this.speaking.getStats(user.id);
  }

  @Put('me/level')
  @ApiOperation({ summary: 'Đổi trình độ tiếng Anh của mình' })
  @ApiOkResponse({ type: SpeakingStatsDto })
  updateLevel(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateLevelDto,
  ): Promise<SpeakingStatsDto> {
    return this.speaking.updateLevel(user.id, dto.english_level);
  }
}
