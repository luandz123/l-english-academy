-- Add is_free to courses, modules, lessons, and quizzes
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;

-- Keep is_published for visibility (already added in previous turn)
-- If you want to undo is_published, we could, but it's useful.
-- The user said "public là ai cũng học được", which is usually "is_free".
