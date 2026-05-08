ALTER TABLE public.vocab_quizzes ADD COLUMN lesson_id bigint REFERENCES public.lessons(id) ON DELETE CASCADE;
