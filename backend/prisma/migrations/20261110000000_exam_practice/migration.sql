-- AlterTable
ALTER TABLE "full_tests" ADD COLUMN     "content_changed_at" TIMESTAMPTZ(6),
ADD COLUMN     "difficulty" TEXT,
ADD COLUMN     "duration_minutes" INTEGER,
ADD COLUMN     "test_type" TEXT NOT NULL DEFAULT 'full',
ADD COLUMN     "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "verification_checklist" JSONB,
ADD COLUMN     "verification_status" TEXT NOT NULL DEFAULT 'unverified',
ADD COLUMN     "verified_at" TIMESTAMPTZ(6),
ADD COLUMN     "verified_by" UUID,
ADD COLUMN     "year" INTEGER;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "difficulty" TEXT,
ADD COLUMN     "group_key" TEXT,
ADD COLUMN     "part_index" INTEGER,
ADD COLUMN     "passage_type" TEXT,
ADD COLUMN     "practice_eligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "question_category" TEXT,
ADD COLUMN     "source_test_id" INTEGER,
ADD COLUMN     "tag_source" TEXT,
ADD COLUMN     "tagged_at" TIMESTAMPTZ(6),
ADD COLUMN     "toeic_part" SMALLINT;

-- CreateTable
CREATE TABLE "practice_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "feedback" TEXT NOT NULL DEFAULT 'end',
    "config" JSONB NOT NULL DEFAULT '{}',
    "question_ids" INTEGER[],
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "time_limit_seconds" INTEGER,
    "daily_date" DATE,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ(6),
    "time_spent_seconds" INTEGER,
    "total_questions" INTEGER NOT NULL,
    "correct_count" INTEGER,
    "wrong_count" INTEGER,
    "unanswered_count" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_answers" (
    "id" SERIAL NOT NULL,
    "session_id" UUID NOT NULL,
    "question_id" INTEGER NOT NULL,
    "selected_answer_id" INTEGER,
    "is_correct" BOOLEAN,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "answered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mistake_notebook_items" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "question_id" INTEGER NOT NULL,
    "wrong_count" INTEGER NOT NULL DEFAULT 0,
    "first_wrong_at" TIMESTAMPTZ(6),
    "last_wrong_at" TIMESTAMPTZ(6),
    "last_selected_answer_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'not_reviewed',
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "last_reviewed_at" TIMESTAMPTZ(6),
    "is_bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "bookmarked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mistake_notebook_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mistake_attempts" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "selected_answer_id" INTEGER,
    "is_correct" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL,
    "source_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mistake_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_exams" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "test_id" INTEGER NOT NULL,
    "title_cache" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_reports" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "test_id" INTEGER,
    "question_id" INTEGER,
    "reason" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "admin_note" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_practice_sessions_user_status" ON "practice_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_practice_sessions_daily" ON "practice_sessions"("user_id", "kind", "daily_date");

-- CreateIndex
CREATE UNIQUE INDEX "practice_answers_session_id_question_id_key" ON "practice_answers"("session_id", "question_id");

-- CreateIndex
CREATE INDEX "idx_mistake_items_user_status" ON "mistake_notebook_items"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mistake_notebook_items_user_id_question_id_key" ON "mistake_notebook_items"("user_id", "question_id");

-- CreateIndex
CREATE INDEX "idx_mistake_attempts_item" ON "mistake_attempts"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_exams_user_id_test_id_key" ON "favorite_exams"("user_id", "test_id");

-- CreateIndex
CREATE INDEX "idx_exam_reports_status" ON "exam_reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_questions_practice" ON "questions"("toeic_part", "practice_eligible", "question_category");

-- CreateIndex
CREATE INDEX "idx_questions_source_test" ON "questions"("source_test_id");

-- CreateIndex
CREATE INDEX "idx_questions_group_key" ON "questions"("group_key");

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "practice_answers" ADD CONSTRAINT "practice_answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "practice_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "practice_answers" ADD CONSTRAINT "practice_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mistake_notebook_items" ADD CONSTRAINT "mistake_notebook_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mistake_notebook_items" ADD CONSTRAINT "mistake_notebook_items_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mistake_attempts" ADD CONSTRAINT "mistake_attempts_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "mistake_notebook_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "favorite_exams" ADD CONSTRAINT "favorite_exams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exam_reports" ADD CONSTRAINT "exam_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;


-- Daily Challenge: mỗi học viên tối đa một lượt (chưa bỏ) mỗi ngày
CREATE UNIQUE INDEX "uq_practice_sessions_daily" ON "practice_sessions"("user_id", "daily_date")
  WHERE "kind" = 'daily' AND "status" <> 'abandoned';

-- Verified Exams: sửa nội dung đề đã xác minh → tự chuyển sang "Cần duyệt lại" (E06 §6.4).
-- Bắt mọi đường sửa (admin quiz, admin Full Test, import JSON) ở tầng DB. Cột nhãn luyện tập
-- (toeic_part, question_category, …) không nằm trong danh sách nên gắn nhãn không kích hoạt.
CREATE OR REPLACE FUNCTION mark_full_tests_changed(p_quiz_ids integer[]) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE full_tests ft
  SET content_changed_at = now(),
      verification_status = CASE WHEN ft.verification_status = 'verified' THEN 'needs_review' ELSE ft.verification_status END
  WHERE ft.id IN (SELECT s.test_id FROM full_test_sections s WHERE s.quiz_id = ANY (p_quiz_ids));
END;
$$;

CREATE OR REPLACE FUNCTION trg_questions_content_changed() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM mark_full_tests_changed(ARRAY[OLD.quiz_id]);
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.quiz_id IS DISTINCT FROM NEW.quiz_id THEN
    PERFORM mark_full_tests_changed(ARRAY[OLD.quiz_id, NEW.quiz_id]);
  ELSE
    PERFORM mark_full_tests_changed(ARRAY[NEW.quiz_id]);
  END IF;
  -- Nội dung đổi → gắn nhãn lại lần sau
  IF TG_OP = 'UPDATE' THEN
    NEW.tagged_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER questions_content_changed_upd
  BEFORE UPDATE OF quiz_id, question_text, passage_text, audio_url, image_url, explanation, transcript, group_id, display_order
  ON questions FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION trg_questions_content_changed();

CREATE TRIGGER questions_content_changed_ins_del
  AFTER INSERT OR DELETE ON questions FOR EACH ROW
  EXECUTE FUNCTION trg_questions_content_changed();

CREATE OR REPLACE FUNCTION trg_answers_content_changed() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_question_id integer := COALESCE(NEW.question_id, OLD.question_id);
BEGIN
  PERFORM mark_full_tests_changed(ARRAY(SELECT q.quiz_id FROM questions q WHERE q.id = v_question_id));
  UPDATE questions SET tagged_at = NULL WHERE id = v_question_id AND tagged_at IS NOT NULL;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER answers_content_changed
  AFTER INSERT OR DELETE OR UPDATE OF answer_text, is_correct, explanation, question_id
  ON answers FOR EACH ROW
  EXECUTE FUNCTION trg_answers_content_changed();

CREATE OR REPLACE FUNCTION trg_sections_changed() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE full_tests SET content_changed_at = now(),
    verification_status = CASE WHEN verification_status = 'verified' THEN 'needs_review' ELSE verification_status END
  WHERE id IN (NEW.test_id, OLD.test_id);
  UPDATE questions SET tagged_at = NULL
  WHERE quiz_id IN (NEW.quiz_id, OLD.quiz_id) AND tagged_at IS NOT NULL;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER full_test_sections_changed
  AFTER INSERT OR DELETE OR UPDATE ON full_test_sections FOR EACH ROW
  EXECUTE FUNCTION trg_sections_changed();
