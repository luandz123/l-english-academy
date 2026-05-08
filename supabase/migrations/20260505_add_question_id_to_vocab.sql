ALTER TABLE public.vocab_questions ADD COLUMN question_id bigint REFERENCES public.questions(id) ON DELETE CASCADE;
