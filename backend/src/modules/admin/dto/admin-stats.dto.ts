import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProfileDto } from '../../auth/dto/profile.dto';

export class AdminCountsDto {
  @ApiProperty({ example: 42 })
  total_students!: number;

  @ApiProperty({ example: 10 })
  total_courses!: number;

  @ApiProperty({ example: 120 })
  total_quiz_attempts!: number;
}

export class SimpleCourseTitleDto {
  @ApiProperty({ example: 'Khóa TOEIC 450+' })
  title!: string;
}

export class SimpleProfileUserDto {
  @ApiProperty({ format: 'uuid' })
  user_id!: string;

  @ApiProperty({ nullable: true, example: 'Nguyễn Văn A' })
  full_name!: string | null;
}

export class RecentEnrollmentDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ format: 'uuid' })
  user_id!: string;

  @ApiProperty({ example: 2 })
  course_id!: number;

  @ApiPropertyOptional({ nullable: true, example: '2026-10-29T00:00:00.000Z' })
  enrolled_at!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '2027-04-29T00:00:00.000Z' })
  expires_at!: string | null;

  @ApiPropertyOptional({ type: () => SimpleCourseTitleDto, nullable: true })
  courses!: SimpleCourseTitleDto | null;

  @ApiPropertyOptional({ type: () => SimpleProfileUserDto, nullable: true })
  profiles!: SimpleProfileUserDto | null;
}

export class SimpleQuizTitleDto {
  @ApiProperty({ example: 'Quiz Part 5 Mini Test 1' })
  title!: string;
}

export class RecentQuizResultDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ format: 'uuid' })
  user_id!: string;

  @ApiProperty({ example: 3 })
  quiz_id!: number;

  @ApiProperty({ example: 8.5 })
  score!: number;

  @ApiPropertyOptional({ nullable: true, example: 8 })
  correct_answers!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 10 })
  total_questions!: number | null;

  @ApiPropertyOptional({ nullable: true, example: '2026-10-29T00:00:00.000Z' })
  completed_at!: string | null;

  @ApiPropertyOptional({ type: () => SimpleQuizTitleDto, nullable: true })
  quizzes!: SimpleQuizTitleDto | null;

  @ApiPropertyOptional({ type: () => SimpleProfileUserDto, nullable: true })
  profiles!: SimpleProfileUserDto | null;
}

export class QuizItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Quiz 1' })
  title!: string;
}

export class QuizScoreResultDto {
  @ApiProperty({ example: 1 })
  quiz_id!: number;

  @ApiProperty({ example: 9.0 })
  score!: number;
}

export class AdminQuizScoresDto {
  @ApiProperty({ type: () => [QuizItemDto] })
  quizzes!: QuizItemDto[];

  @ApiProperty({ type: () => [QuizScoreResultDto] })
  results!: QuizScoreResultDto[];
}

export class CourseItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Khóa TOEIC 450+' })
  title!: string;
}

export class EnrollmentCourseItemDto {
  @ApiProperty({ example: 1 })
  course_id!: number;
}

export class AdminCourseEnrollmentsDto {
  @ApiProperty({ type: () => [CourseItemDto] })
  courses!: CourseItemDto[];

  @ApiProperty({ type: () => [EnrollmentCourseItemDto] })
  enrollments!: EnrollmentCourseItemDto[];
}

export class AdminUserAnswerDto {
  @ApiProperty({ example: 101 })
  question_id!: number;

  @ApiPropertyOptional({ nullable: true, example: true })
  is_correct!: boolean | null;
}

export class AdminQuestionDto {
  @ApiProperty({ example: 101 })
  id!: number;

  @ApiPropertyOptional({
    nullable: true,
    example: 'What is the correct answer?',
  })
  question_text!: string | null;
}

export class StudentEnrollmentSummaryDto {
  @ApiProperty({ format: 'uuid' })
  user_id!: string;

  @ApiPropertyOptional({ nullable: true, example: '2027-04-29T00:00:00.000Z' })
  expires_at!: string | null;
}

export class AdminStudentsDto {
  @ApiProperty({ type: () => [ProfileDto] })
  profiles!: ProfileDto[];

  @ApiProperty({ type: () => [StudentEnrollmentSummaryDto] })
  enrollments!: StudentEnrollmentSummaryDto[];
}
