
-- Roles enum and user_roles table (per security guidelines - NOT on profiles)
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles viewable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile + student role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Courses
CREATE TABLE public.courses (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  course_type TEXT NOT NULL CHECK (course_type IN ('video_quiz', 'flashcard', 'listening', 'speaking', 'fulltest')),
  price INTEGER DEFAULT 0,
  duration_months INTEGER DEFAULT 6,
  thumbnail_url TEXT,
  instructor TEXT DEFAULT 'Cô Mai Phương',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Courses viewable by all" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Admins manage courses" ON public.courses FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Modules (PARTs)
CREATE TABLE public.modules (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Modules viewable by all" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Admins manage modules" ON public.modules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Lessons
CREATE TABLE public.lessons (
  id SERIAL PRIMARY KEY,
  module_id INTEGER REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_live BOOLEAN DEFAULT false,
  live_time TIMESTAMPTZ
);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lessons viewable by all" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Admins manage lessons" ON public.lessons FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Quizzes
CREATE TABLE public.quizzes (
  id SERIAL PRIMARY KEY,
  module_id INTEGER REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  total_questions INTEGER NOT NULL DEFAULT 0,
  time_limit_seconds INTEGER DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quizzes viewable by all" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Admins manage quizzes" ON public.quizzes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Questions
CREATE TABLE public.questions (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice',
  image_url TEXT,
  audio_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questions viewable by all" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Admins manage questions" ON public.questions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Answers
CREATE TABLE public.answers (
  id SERIAL PRIMARY KEY,
  question_id INTEGER REFERENCES public.questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  explanation TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Answers viewable by all" ON public.answers FOR SELECT USING (true);
CREATE POLICY "Admins manage answers" ON public.answers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Materials
CREATE TABLE public.materials (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER REFERENCES public.lessons(id) ON DELETE SET NULL,
  quiz_id INTEGER REFERENCES public.quizzes(id) ON DELETE SET NULL,
  course_id INTEGER REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT 'pdf',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Materials viewable by all" ON public.materials FOR SELECT USING (true);
CREATE POLICY "Admins manage materials" ON public.materials FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Enrollments
CREATE TABLE public.enrollments (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id INTEGER REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own enrollments" ON public.enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage enrollments" ON public.enrollments FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users enroll themselves" ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User lesson progress
CREATE TABLE public.user_lesson_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id INTEGER REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  last_watched_at TIMESTAMPTZ DEFAULT now(),
  watch_duration_seconds INTEGER DEFAULT 0,
  UNIQUE(user_id, lesson_id)
);
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own progress" ON public.user_lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own progress" ON public.user_lesson_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins view all progress" ON public.user_lesson_progress FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User quiz results
CREATE TABLE public.user_quiz_results (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quiz_id INTEGER REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  score NUMERIC(5,2),
  correct_answers INTEGER,
  total_questions INTEGER,
  time_spent_seconds INTEGER,
  completed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_quiz_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own results" ON public.user_quiz_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own results" ON public.user_quiz_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all results" ON public.user_quiz_results FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User answers
CREATE TABLE public.user_answers (
  id SERIAL PRIMARY KEY,
  result_id INTEGER REFERENCES public.user_quiz_results(id) ON DELETE CASCADE NOT NULL,
  question_id INTEGER REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  selected_answer_id INTEGER REFERENCES public.answers(id) ON DELETE SET NULL,
  is_correct BOOLEAN
);
ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own answers" ON public.user_answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_quiz_results r WHERE r.id = result_id AND r.user_id = auth.uid())
);
CREATE POLICY "Users insert own answers" ON public.user_answers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_quiz_results r WHERE r.id = result_id AND r.user_id = auth.uid())
);
CREATE POLICY "Admins view all answers" ON public.user_answers FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Vocab categories
CREATE TABLE public.vocab_categories (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.vocab_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vocab categories viewable" ON public.vocab_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage vocab cats" ON public.vocab_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Vocab quizzes (Days)
CREATE TABLE public.vocab_quizzes (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES public.vocab_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  total_questions INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.vocab_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vocab quizzes viewable" ON public.vocab_quizzes FOR SELECT USING (true);
CREATE POLICY "Admins manage vocab quizzes" ON public.vocab_quizzes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Vocab questions
CREATE TABLE public.vocab_questions (
  id SERIAL PRIMARY KEY,
  vocab_quiz_id INTEGER REFERENCES public.vocab_quizzes(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  phonetic TEXT,
  definition_en TEXT,
  definition_vi TEXT NOT NULL,
  example_sentence TEXT,
  image_url TEXT,
  audio_male_url TEXT,
  audio_female_url TEXT,
  wrong_answer_1 TEXT,
  wrong_answer_2 TEXT,
  wrong_answer_3 TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.vocab_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vocab questions viewable" ON public.vocab_questions FOR SELECT USING (true);
CREATE POLICY "Admins manage vocab qs" ON public.vocab_questions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Full tests
CREATE TABLE public.full_tests (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES public.courses(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  total_questions INTEGER DEFAULT 200,
  release_date TIMESTAMPTZ,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.full_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full tests viewable" ON public.full_tests FOR SELECT USING (true);
CREATE POLICY "Admins manage full tests" ON public.full_tests FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Full test questions (linked to questions table via quiz)
CREATE TABLE public.full_test_sections (
  id SERIAL PRIMARY KEY,
  test_id INTEGER REFERENCES public.full_tests(id) ON DELETE CASCADE,
  part_number INTEGER NOT NULL CHECK (part_number BETWEEN 1 AND 7),
  quiz_id INTEGER REFERENCES public.quizzes(id) ON DELETE SET NULL
);
ALTER TABLE public.full_test_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "FT sections viewable" ON public.full_test_sections FOR SELECT USING (true);
CREATE POLICY "Admins manage FT sections" ON public.full_test_sections FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- User full test results
CREATE TABLE public.user_full_test_results (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  test_id INTEGER REFERENCES public.full_tests(id) ON DELETE CASCADE NOT NULL,
  total_score INTEGER,
  listening_score INTEGER,
  reading_score INTEGER,
  correct_answers INTEGER,
  time_spent_seconds INTEGER,
  completed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_full_test_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own FT results" ON public.user_full_test_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own FT results" ON public.user_full_test_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all FT results" ON public.user_full_test_results FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User notes
CREATE TABLE public.user_notes (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id INTEGER REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notes" ON public.user_notes FOR ALL USING (auth.uid() = user_id);

-- User favorites
CREATE TABLE public.user_favorites (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id INTEGER REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own favorites" ON public.user_favorites FOR ALL USING (auth.uid() = user_id);

-- Admin student notes
CREATE TABLE public.admin_student_notes (
  id SERIAL PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.admin_student_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage student notes" ON public.admin_student_notes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Admin activity log
CREATE TABLE public.admin_activity_log (
  id SERIAL PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view activity log" ON public.admin_activity_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert activity log" ON public.admin_activity_log FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Platform settings
CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings viewable by admins" ON public.platform_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_notes_updated_at BEFORE UPDATE ON public.user_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed platform settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('platform_name', 'L-English'),
  ('tagline', 'Learn Smart. Score High.'),
  ('primary_color', '#4f46e5'),
  ('accent_color', '#10b981'),
  ('session_timeout_hours', '8'),
  ('send_welcome_email', 'true'),
  ('expiry_reminder_days', '7');

-- Storage bucket for materials
INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', true);
CREATE POLICY "Materials publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'materials');
CREATE POLICY "Admins upload materials" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'materials' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete materials" ON storage.objects FOR DELETE USING (bucket_id = 'materials' AND public.has_role(auth.uid(), 'admin'));
