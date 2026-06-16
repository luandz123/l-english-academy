-- Fix: courses INSERT policy (USING clause không apply cho INSERT, cần WITH CHECK)
DROP POLICY IF EXISTS "Admins manage courses" ON public.courses;
CREATE POLICY "Admins manage courses" ON public.courses
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix: modules
DROP POLICY IF EXISTS "Admins manage modules" ON public.modules;
CREATE POLICY "Admins manage modules" ON public.modules
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix: lessons
DROP POLICY IF EXISTS "Admins manage lessons" ON public.lessons;
CREATE POLICY "Admins manage lessons" ON public.lessons
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix: quizzes
DROP POLICY IF EXISTS "Admins manage quizzes" ON public.quizzes;
CREATE POLICY "Admins manage quizzes" ON public.quizzes
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix: questions
DROP POLICY IF EXISTS "Admins manage questions" ON public.questions;
CREATE POLICY "Admins manage questions" ON public.questions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix: answers
DROP POLICY IF EXISTS "Admins manage answers" ON public.answers;
CREATE POLICY "Admins manage answers" ON public.answers
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix: materials
DROP POLICY IF EXISTS "Admins manage materials" ON public.materials;
CREATE POLICY "Admins manage materials" ON public.materials
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix: enrollments - admin manage
DROP POLICY IF EXISTS "Admins manage enrollments" ON public.enrollments;
CREATE POLICY "Admins manage enrollments" ON public.enrollments
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix: course_categories - restrict to admin only (không phải mọi authenticated user)
DROP POLICY IF EXISTS "Cho phép admin tạo/sửa/xoá danh mục khóa học" ON public.course_categories;
CREATE POLICY "Admins manage course categories" ON public.course_categories
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix: storage - thêm UPDATE policy cho admin upload ảnh
DROP POLICY IF EXISTS "Admins upload materials" ON storage.objects;
CREATE POLICY "Admins upload materials" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'materials' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update materials" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'materials' AND public.has_role(auth.uid(), 'admin'));
