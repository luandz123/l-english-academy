ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS folder_path text DEFAULT '/';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS pdf_url text;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS audio_url text;
CREATE INDEX IF NOT EXISTS idx_materials_folder_path ON public.materials(folder_path);