-- Add is_published to modules
ALTER TABLE modules ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

-- Add is_published to lessons
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

-- Add is_published to quizzes
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

-- Update existing records to be published by default
UPDATE modules SET is_published = true WHERE is_published IS NULL;
UPDATE lessons SET is_published = true WHERE is_published IS NULL;
UPDATE quizzes SET is_published = true WHERE is_published IS NULL;
