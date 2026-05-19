-- Add folder_path to materials for folder-based organization
ALTER TABLE materials ADD COLUMN IF NOT EXISTS folder_path text DEFAULT '/';

-- Add pdf_url to lessons for PDF-type lectures
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS pdf_url text;

-- Add audio_url to quizzes for exam-level audio
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS audio_url text;

-- Add translation to questions for Vietnamese meaning
ALTER TABLE questions ADD COLUMN IF NOT EXISTS translation text;

-- Create index for folder browsing
CREATE INDEX IF NOT EXISTS idx_materials_folder_path ON materials(folder_path);
