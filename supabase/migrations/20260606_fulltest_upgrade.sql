-- =====================================================
-- Full Test TOEIC Upgrade — Database Schema Enhancement
-- =====================================================

-- 1. Add columns to full_tests
ALTER TABLE public.full_tests ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE public.full_tests ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.full_tests ADD COLUMN IF NOT EXISTS total_attempts INTEGER DEFAULT 10;

-- 2. Add columns to questions for explanation/review data
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS transcript TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS knowledge_tag TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS passage_text TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS group_id TEXT;

-- 3. Add columns to user_full_test_results for detailed tracking
ALTER TABLE public.user_full_test_results ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 200;
ALTER TABLE public.user_full_test_results ADD COLUMN IF NOT EXISTS listening_correct INTEGER DEFAULT 0;
ALTER TABLE public.user_full_test_results ADD COLUMN IF NOT EXISTS reading_correct INTEGER DEFAULT 0;
ALTER TABLE public.user_full_test_results ADD COLUMN IF NOT EXISTS pause_count INTEGER DEFAULT 0;
ALTER TABLE public.user_full_test_results ADD COLUMN IF NOT EXISTS test_mode TEXT DEFAULT 'exam';
ALTER TABLE public.user_full_test_results ADD COLUMN IF NOT EXISTS answers_detail JSONB;

-- 4. Create full_test_answer_details table for per-question tracking
CREATE TABLE IF NOT EXISTS public.full_test_answer_details (
  id SERIAL PRIMARY KEY,
  result_id INTEGER REFERENCES public.user_full_test_results(id) ON DELETE CASCADE NOT NULL,
  question_id INTEGER REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  selected_answer_id INTEGER REFERENCES public.answers(id) ON DELETE SET NULL,
  is_correct BOOLEAN DEFAULT false,
  part_number INTEGER CHECK (part_number BETWEEN 1 AND 7)
);

ALTER TABLE public.full_test_answer_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own FT answer details" ON public.full_test_answer_details 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_full_test_results r WHERE r.id = result_id AND r.user_id = auth.uid())
  );

CREATE POLICY "Users insert own FT answer details" ON public.full_test_answer_details 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_full_test_results r WHERE r.id = result_id AND r.user_id = auth.uid())
  );

CREATE POLICY "Admins manage FT answer details" ON public.full_test_answer_details 
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
