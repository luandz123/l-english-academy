-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "app_role" AS ENUM ('admin', 'student');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "google_id" TEXT,
    "email_verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_activity_log" (
    "id" SERIAL NOT NULL,
    "admin_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_student_notes" (
    "id" SERIAL NOT NULL,
    "admin_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_student_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER,
    "answer_text" TEXT,
    "is_correct" BOOLEAN DEFAULT false,
    "explanation" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_categories" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "display_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "course_type" TEXT NOT NULL,
    "price" INTEGER DEFAULT 0,
    "duration_months" INTEGER DEFAULT 6,
    "thumbnail_url" TEXT,
    "instructor" TEXT DEFAULT 'Cô Mai Phương',
    "is_active" BOOLEAN DEFAULT true,
    "display_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "is_free" BOOLEAN DEFAULT false,
    "category_id" BIGINT,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" INTEGER NOT NULL,
    "enrolled_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "full_test_answer_details" (
    "id" SERIAL NOT NULL,
    "result_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "selected_answer_id" INTEGER,
    "is_correct" BOOLEAN DEFAULT false,
    "part_number" INTEGER,

    CONSTRAINT "full_test_answer_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "full_test_sections" (
    "id" SERIAL NOT NULL,
    "test_id" INTEGER,
    "part_number" INTEGER NOT NULL,
    "quiz_id" INTEGER,

    CONSTRAINT "full_test_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "full_tests" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER,
    "category" TEXT NOT NULL DEFAULT 'general',
    "title" TEXT NOT NULL,
    "total_questions" INTEGER DEFAULT 200,
    "release_date" TIMESTAMPTZ(6),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "audio_url" TEXT,
    "description" TEXT,
    "total_attempts" INTEGER DEFAULT 10,

    CONSTRAINT "full_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_practices" (
    "id" SERIAL NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "quiz_id" INTEGER,
    "trigger_at_seconds" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT DEFAULT '',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_practices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" SERIAL NOT NULL,
    "module_id" INTEGER,
    "title" TEXT NOT NULL,
    "video_url" TEXT,
    "duration_seconds" INTEGER DEFAULT 0,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_live" BOOLEAN DEFAULT false,
    "live_time" TIMESTAMPTZ(6),
    "lesson_type" TEXT NOT NULL DEFAULT 'video',
    "quiz_id" INTEGER,
    "pdf_url" TEXT,
    "is_free" BOOLEAN DEFAULT false,
    "is_published" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" SERIAL NOT NULL,
    "lesson_id" INTEGER,
    "quiz_id" INTEGER,
    "course_id" INTEGER,
    "title" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT DEFAULT 'pdf',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "folder_path" TEXT DEFAULT '/',

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_free" BOOLEAN DEFAULT false,
    "is_published" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_code" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL NOT NULL,
    "plan_type" TEXT DEFAULT 'vip_combo',
    "status" TEXT DEFAULT 'pending',
    "payment_gateway" TEXT DEFAULT 'vietqr_sepay',
    "bank_transaction_id" TEXT,
    "transaction_content" TEXT,
    "paid_at" TIMESTAMPTZ(6),
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT,
    "is_pro" BOOLEAN DEFAULT false,
    "pro_plan" TEXT DEFAULT 'free',
    "pro_activated_at" TIMESTAMPTZ(6),

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" SERIAL NOT NULL,
    "quiz_id" INTEGER,
    "question_text" TEXT,
    "question_type" TEXT DEFAULT 'multiple_choice',
    "image_url" TEXT,
    "audio_url" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "translation" TEXT,
    "dictation_keywords" TEXT,
    "explanation" TEXT,
    "transcript" TEXT,
    "knowledge_tag" TEXT,
    "passage_text" TEXT,
    "group_id" TEXT,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" SERIAL NOT NULL,
    "module_id" INTEGER,
    "title" TEXT NOT NULL,
    "total_questions" INTEGER NOT NULL DEFAULT 0,
    "time_limit_seconds" INTEGER DEFAULT 0,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "audio_url" TEXT,
    "is_free" BOOLEAN DEFAULT false,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_answers" (
    "id" SERIAL NOT NULL,
    "result_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "selected_answer_id" INTEGER,
    "is_correct" BOOLEAN,

    CONSTRAINT "user_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorites" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_full_test_results" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "test_id" INTEGER NOT NULL,
    "total_score" INTEGER,
    "listening_score" INTEGER,
    "reading_score" INTEGER,
    "correct_answers" INTEGER,
    "time_spent_seconds" INTEGER,
    "completed_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "total_questions" INTEGER DEFAULT 200,
    "listening_correct" INTEGER DEFAULT 0,
    "reading_correct" INTEGER DEFAULT 0,
    "pause_count" INTEGER DEFAULT 0,
    "test_mode" TEXT DEFAULT 'exam',
    "answers_detail" JSONB,

    CONSTRAINT "user_full_test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_lesson_progress" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "is_completed" BOOLEAN DEFAULT false,
    "last_watched_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "watch_duration_seconds" INTEGER DEFAULT 0,

    CONSTRAINT "user_lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notes" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_quiz_results" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "quiz_id" INTEGER NOT NULL,
    "score" DECIMAL(5,2),
    "correct_answers" INTEGER,
    "total_questions" INTEGER,
    "time_spent_seconds" INTEGER,
    "completed_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_quiz_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "role" "app_role" NOT NULL DEFAULT 'student',

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocab_categories" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER,
    "title" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "vocab_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocab_questions" (
    "id" SERIAL NOT NULL,
    "vocab_quiz_id" INTEGER,
    "word" TEXT NOT NULL,
    "phonetic" TEXT,
    "definition_en" TEXT,
    "definition_vi" TEXT,
    "example_sentence" TEXT,
    "image_url" TEXT,
    "audio_male_url" TEXT,
    "audio_female_url" TEXT,
    "wrong_answer_1" TEXT,
    "wrong_answer_2" TEXT,
    "wrong_answer_3" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "question_id" INTEGER,

    CONSTRAINT "vocab_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocab_quizzes" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER,
    "title" TEXT NOT NULL,
    "total_questions" INTEGER NOT NULL DEFAULT 0,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "lesson_id" INTEGER,

    CONSTRAINT "vocab_quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "idx_answers_question_id" ON "answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_categories_slug_key" ON "course_categories"("slug");

-- CreateIndex
CREATE INDEX "idx_enrollments_user_course" ON "enrollments"("user_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_user_id_course_id_key" ON "enrollments"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "idx_lessons_quiz_id" ON "lessons"("quiz_id");

-- CreateIndex
CREATE INDEX "idx_materials_folder_path" ON "materials"("folder_path");

-- CreateIndex
CREATE UNIQUE INDEX "payment_orders_order_code_key" ON "payment_orders"("order_code");

-- CreateIndex
CREATE INDEX "idx_payment_orders_order_code" ON "payment_orders"("order_code");

-- CreateIndex
CREATE INDEX "idx_payment_orders_status" ON "payment_orders"("status");

-- CreateIndex
CREATE INDEX "idx_payment_orders_user_id" ON "payment_orders"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_questions_quiz_id" ON "questions"("quiz_id");

-- CreateIndex
CREATE INDEX "idx_user_answers_question_id" ON "user_answers"("question_id");

-- CreateIndex
CREATE INDEX "idx_user_answers_result_id" ON "user_answers"("result_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorites_user_id_lesson_id_key" ON "user_favorites"("user_id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_lesson_progress_user_id_lesson_id_key" ON "user_lesson_progress"("user_id", "lesson_id");

-- CreateIndex
CREATE INDEX "idx_user_quiz_results_completed" ON "user_quiz_results"("completed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_user_quiz_results_user_quiz" ON "user_quiz_results"("user_id", "quiz_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_key" ON "user_roles"("user_id", "role");

-- CreateIndex
CREATE INDEX "idx_vocab_questions_question" ON "vocab_questions"("question_id");

-- CreateIndex
CREATE INDEX "idx_vocab_questions_quiz" ON "vocab_questions"("vocab_quiz_id");

-- AddForeignKey
ALTER TABLE "admin_activity_log" ADD CONSTRAINT "admin_activity_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_student_notes" ADD CONSTRAINT "admin_student_notes_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_student_notes" ADD CONSTRAINT "admin_student_notes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "course_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "full_test_answer_details" ADD CONSTRAINT "full_test_answer_details_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "full_test_answer_details" ADD CONSTRAINT "full_test_answer_details_result_id_fkey" FOREIGN KEY ("result_id") REFERENCES "user_full_test_results"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "full_test_answer_details" ADD CONSTRAINT "full_test_answer_details_selected_answer_id_fkey" FOREIGN KEY ("selected_answer_id") REFERENCES "answers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "full_test_sections" ADD CONSTRAINT "full_test_sections_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "full_test_sections" ADD CONSTRAINT "full_test_sections_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "full_tests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "full_tests" ADD CONSTRAINT "full_tests_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lesson_practices" ADD CONSTRAINT "lesson_practices_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lesson_practices" ADD CONSTRAINT "lesson_practices_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_result_id_fkey" FOREIGN KEY ("result_id") REFERENCES "user_quiz_results"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_selected_answer_id_fkey" FOREIGN KEY ("selected_answer_id") REFERENCES "answers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_full_test_results" ADD CONSTRAINT "user_full_test_results_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "full_tests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_full_test_results" ADD CONSTRAINT "user_full_test_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_lesson_progress" ADD CONSTRAINT "user_lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_lesson_progress" ADD CONSTRAINT "user_lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_notes" ADD CONSTRAINT "user_notes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_notes" ADD CONSTRAINT "user_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_quiz_results" ADD CONSTRAINT "user_quiz_results_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_quiz_results" ADD CONSTRAINT "user_quiz_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vocab_categories" ADD CONSTRAINT "vocab_categories_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vocab_questions" ADD CONSTRAINT "vocab_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vocab_questions" ADD CONSTRAINT "vocab_questions_vocab_quiz_id_fkey" FOREIGN KEY ("vocab_quiz_id") REFERENCES "vocab_quizzes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vocab_quizzes" ADD CONSTRAINT "vocab_quizzes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "vocab_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vocab_quizzes" ADD CONSTRAINT "vocab_quizzes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;


-- CHECK constraints giữ nguyên từ DB Supabase (Prisma schema không biểu diễn được)
ALTER TABLE "courses" ADD CONSTRAINT "courses_course_type_check"
  CHECK (course_type = ANY (ARRAY['video_quiz'::text, 'flashcard'::text, 'listening'::text, 'speaking'::text, 'fulltest'::text]));
ALTER TABLE "full_test_answer_details" ADD CONSTRAINT "full_test_answer_details_part_number_check"
  CHECK (part_number >= 1 AND part_number <= 7);
ALTER TABLE "full_test_sections" ADD CONSTRAINT "full_test_sections_part_number_check"
  CHECK (part_number >= 1 AND part_number <= 7);
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_status_check"
  CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'cancelled'::text, 'expired'::text]));
