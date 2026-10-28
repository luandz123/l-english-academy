import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/** Một dòng `admin_student_notes` (ADM-004). */
export class AdminNoteDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ format: 'uuid' })
  admin_id!: string;

  @ApiProperty({ format: 'uuid' })
  student_id!: string;

  @ApiProperty({ example: 'Học viên chăm chỉ, cần cải thiện Part 5.' })
  content!: string;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  created_at!: string | null;
}

/**
 * Tạo ghi chú cho học viên (ADM-004). `admin_id` lấy từ token, `student_id` lấy từ URL;
 * giữ nguyên văn `content` như hành vi cũ (không tự trim).
 */
export class CreateAdminNoteDto {
  @ApiProperty({ example: 'Học viên chăm chỉ, cần cải thiện Part 5.' })
  @IsString()
  content!: string;
}
