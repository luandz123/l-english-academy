# BẢNG ĐỐI SOÁT HÀNH VI VÀ TÍNH NĂNG (PARITY MATRIX)
## DỰ ÁN REFACTOR L-ENGLISH ACADEMY (REACT + NESTJS + POSTGRESQL)

> **Mục tiêu**: Đây là bản đối soát duy nhất và nguồn sự thật về mọi hành vi cần giữ nguyên khi refactor từ React + Supabase sang React + NestJS + PostgreSQL.  
> **Nguyên tắc**:  
> 1. Mỗi dòng là **MỘT** hành vi độc lập được kiểm chứng trực tiếp từ mã nguồn thực tế.  
> 2. Cột `Endpoint / Service mới` và `Test` được để trống cho đến khi module tương ứng được triển khai.  
> 3. Cột `Trạng thái` mặc định là `todo`. Chỉ tick `done` khi đã vượt qua toàn bộ tiêu chí trong Definition of Done (AGENTS.md).  
> 4. Tuyệt đối không xóa bất kỳ file cũ nào cho đến khi toàn bộ bảng đạt trạng thái `done`.

---

## 1. Module 1: Auth & Users (Xác thực & Người dùng)

> `frontend ✓` = backend + component đã đổi (T-003) + kiểm tra tay trên giao diện (2026-10-27). Chuyển `done` khi có visual regression so với bản Supabase. AUTH-007 (Google) chưa kiểm tra thật vì chưa có `GOOGLE_CLIENT_ID`.

| ID | Module | Hành vi cần giữ nguyên | File cũ (đường dẫn:dòng) | Endpoint / Service mới | Test | Trạng thái | Ghi chú |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **AUTH-001** | Auth | Route `/login` - Trang đăng nhập email & password | [src/pages/Login.tsx:69](file:///c:/Users/lenovo/l-english-academy/src/pages/Login.tsx#L69) | `POST /api/v1/auth/login` · `authClient.signInWithPassword` | backend/test/auth.e2e-spec.ts | `frontend ✓` | `supabase.auth.signInWithPassword` |
| **AUTH-002** | Auth | Route `/register` - Trang đăng ký tài khoản học viên mới | [src/pages/Register.tsx:48](file:///c:/Users/lenovo/l-english-academy/src/pages/Register.tsx#L48) | `POST /api/v1/auth/register` · `authClient.signUp` | backend/test/auth.e2e-spec.ts | `frontend ✓` | `supabase.auth.signUp`, tự tạo profile + role student |
| **AUTH-003** | Auth | Route `/forgot-password` - Gửi link khôi phục mật khẩu qua email | [src/pages/ForgotPassword.tsx:18](file:///c:/Users/lenovo/l-english-academy/src/pages/ForgotPassword.tsx#L18) | `POST /api/v1/auth/recover` · `authClient.resetPasswordForEmail` | backend/test/auth.e2e-spec.ts | `frontend ✓` | `supabase.auth.resetPasswordForEmail` |
| **AUTH-004** | Auth | Route `/reset-password` - Đặt mật khẩu mới từ link email | [src/pages/ResetPassword.tsx:37](file:///c:/Users/lenovo/l-english-academy/src/pages/ResetPassword.tsx#L37) | `GET /api/v1/auth/verify?type=recovery` + `PATCH /api/v1/auth/me` | backend/test/auth.e2e-spec.ts | `frontend ✓` | `supabase.auth.updateUser({ password })` |
| **AUTH-005** | Auth | Route `/auth/callback` - Tiếp nhận callback từ OAuth | [src/pages/AuthCallback.tsx:85](file:///c:/Users/lenovo/l-english-academy/src/pages/AuthCallback.tsx#L85) | `GET /api/v1/auth/verify`, `GET /api/v1/auth/google/callback` (đặt cookie rồi về `/auth/callback`) | backend/test/auth.e2e-spec.ts | `frontend ✓` | `supabase.auth.exchangeCodeForSession` |
| **AUTH-006** | Auth | Route `/profile` - Trang hồ sơ cá nhân và cập nhật thông tin | [src/pages/Profile.tsx:100](file:///c:/Users/lenovo/l-english-academy/src/pages/Profile.tsx#L100) | `GET/PATCH /api/v1/profiles/me` | backend/test/auth.e2e-spec.ts | `frontend ✓` | ProtectedRoute (học viên đăng nhập) |
| **AUTH-007** | Auth | Đăng nhập bằng Google OAuth popup/redirect | [src/lib/googleOAuth.ts:22](file:///c:/Users/lenovo/l-english-academy/src/lib/googleOAuth.ts#L22) | `GET /api/v1/auth/google` · `authClient.signInWithOAuth` | backend/test/auth.e2e-spec.ts (503 khi chưa cấu hình) | `frontend ✓` | `supabase.auth.signInWithOAuth({ provider: 'google' })` |
| **AUTH-008** | Auth | Đăng xuất (`signOut`) & xóa cache | [src/hooks/useAuth.tsx:293](file:///c:/Users/lenovo/l-english-academy/src/hooks/useAuth.tsx#L293) | `POST /api/v1/auth/logout` (thu hồi mọi phiên) | backend/test/auth.e2e-spec.ts | `frontend ✓` | Xóa cookie refresh và access token |
| **AUTH-009** | Auth | Lắng nghe thay đổi phiên đăng nhập (`onAuthStateChange`) | [src/hooks/useAuth.tsx:196](file:///c:/Users/lenovo/l-english-academy/src/hooks/useAuth.tsx#L196) | `authClient.onAuthStateChange` (src/lib/api/auth.ts) | src/lib/api/auth.test.ts | `frontend ✓` | Đồng bộ trạng thái user trong React context |
| **AUTH-010** | Auth | Tự động refresh token khi nhận HTTP 401 | [src/integrations/supabase/client.ts:27](file:///c:/Users/lenovo/l-english-academy/src/integrations/supabase/client.ts#L27) | `POST /api/v1/auth/refresh` + `apiClient` tự refresh khi `bad_jwt` | src/lib/api/auth.test.ts, backend/test/auth.e2e-spec.ts | `frontend ✓` | Deduplicated token refresh interceptor |
| **AUTH-011** | Auth | Tự động logout sau 7 ngày không tương tác (`SEVEN_DAYS_MS`) | [src/hooks/useAuth.tsx:40](file:///c:/Users/lenovo/l-english-academy/src/hooks/useAuth.tsx#L40) | Giữ nguyên ở client (localStorage) | — | `không đổi` | Dựa vào `lenglish_last_active` trong localStorage |
| **AUTH-012** | Auth | Cache thông tin hồ sơ `lenglish_cached_profile` | [src/hooks/useAuth.tsx:29](file:///c:/Users/lenovo/l-english-academy/src/hooks/useAuth.tsx#L29) | Giữ nguyên ở client (localStorage) | — | `không đổi` | Tránh giật UI khi tải trang |
| **AUTH-013** | Auth | Query vai trò học viên từ bảng `user_roles` | [src/hooks/useAuth.tsx:106](file:///c:/Users/lenovo/l-english-academy/src/hooks/useAuth.tsx#L106) | `GET /api/v1/auth/me/roles` · `getMyAdminRole()` | backend/test/auth.e2e-spec.ts | `frontend ✓` | Xác định quyền `student` hoặc `admin` |
| **AUTH-014** | Auth | Query thông tin hồ sơ học viên từ bảng `profiles` | [src/hooks/useAuth.tsx:101](file:///c:/Users/lenovo/l-english-academy/src/hooks/useAuth.tsx#L101) | `GET /api/v1/profiles/me` · `getMyProfile()` | backend/test/auth.e2e-spec.ts | `frontend ✓` | `full_name`, `avatar_url`, `is_pro`, `pro_plan` |
| **AUTH-015** | Auth | Cập nhật thông tin profile (`full_name`, `avatar_url`) | [src/pages/Profile.tsx:603](file:///c:/Users/lenovo/l-english-academy/src/pages/Profile.tsx#L603) | `PATCH /api/v1/profiles/me` (chỉ full_name, avatar_url) + `PATCH /api/v1/auth/me` | backend/test/auth.e2e-spec.ts | `frontend ✓` | Cập nhật cả `profiles` và user metadata |
| **AUTH-016** | Auth | Fallback bio & ảnh bìa cover photo trong `localStorage` | [src/pages/Profile.tsx:149](file:///c:/Users/lenovo/l-english-academy/src/pages/Profile.tsx#L149) | Giữ nguyên ở client (localStorage) | — | `không đổi` | `profile_bio_*`, `profile_cover_*` |
| **AUTH-017** | Auth | SQL Trigger `handle_new_user()` tự tạo profile & role | [supabase/migrations/20260329141747_3017db4a-6d94-4787-bcc1-328c5cd706ff.sql:48](file:///c:/Users/lenovo/l-english-academy/supabase/migrations/20260329141747_3017db4a-6d94-4787-bcc1-328c5cd706ff.sql#L48) | `AuthRepository.createUserWithProfile` (transaction) | backend/test/auth.e2e-spec.ts | `frontend ✓` | Chuyển logic vào NestJS register service |
| **AUTH-018** | Auth | SQL Function `has_role(_user_id, _role)` | [supabase/migrations/20260329141747_3017db4a-6d94-4787-bcc1-328c5cd706ff.sql:14](file:///c:/Users/lenovo/l-english-academy/supabase/migrations/20260329141747_3017db4a-6d94-4787-bcc1-328c5cd706ff.sql#L14) | `RolesGuard` + `@Roles()` (đọc user_roles mỗi request) | backend/test/auth.e2e-spec.ts, jwt-auth.guard.spec.ts | `frontend ✓` | Chuyển thành NestJS RolesGuard |

---

## 2. Module 2: Catalog (Khóa học & Danh mục)

| ID | Module | Hành vi cần giữ nguyên | File cũ (đường dẫn:dòng) | Endpoint / Service mới | Test | Trạng thái | Ghi chú |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **CAT-001** | Catalog | Route `/` - Trang chủ Landing Page hiển thị khóa học nổi bật | [src/pages/Index.tsx:1](file:///c:/Users/lenovo/l-english-academy/src/pages/Index.tsx#L1) | | | `todo` | Public route |
| **CAT-002** | Catalog | Route `/courses` - Điều hướng bộ lọc khóa học | [src/App.tsx:16](file:///c:/Users/lenovo/l-english-academy/src/App.tsx#L16) | | | `todo` | Redirect sang `#section-video`, `#section-fulltest`... |
| **CAT-003** | Catalog | Route `/courses/:courseId` - Điều hướng chi tiết theo `course_type` | [src/App.tsx:30](file:///c:/Users/lenovo/l-english-academy/src/App.tsx#L30) | | | `todo` | Rẽ nhánh sang `/learn`, `/fulltest`, hoặc `/vocab` |
| **CAT-004** | Catalog | Query danh sách danh mục từ bảng `course_categories` | [src/components/landing/CourseGrid.tsx:35](file:///c:/Users/lenovo/l-english-academy/src/components/landing/CourseGrid.tsx#L35) | `GET /api/v1/catalog/categories` + `src/lib/api/catalog.ts:listCategories` | `backend/test/catalog.e2e-spec.ts`, `src/lib/api/catalog.test.ts` | `frontend ✓` | Sắp xếp theo `display_order` |
| **CAT-005** | Catalog | Query danh sách khóa học active từ bảng `courses` | [src/components/landing/CourseGrid.tsx:44](file:///c:/Users/lenovo/l-english-academy/src/components/landing/CourseGrid.tsx#L44) | `GET /api/v1/catalog/courses`, `GET /api/v1/catalog/courses/count` + `src/lib/api/catalog.ts:listCourses,countCourses` | `backend/test/catalog.e2e-spec.ts`, `src/lib/api/catalog.test.ts` | `frontend ✓` | Lọc `is_active = true`, kèm category title |
| **CAT-006** | Catalog | Query chi tiết 1 khóa học theo id từ bảng `courses` | [src/pages/LearnPage.tsx:43](file:///c:/Users/lenovo/l-english-academy/src/pages/LearnPage.tsx#L43) | `GET /api/v1/catalog/courses/:id` + `src/lib/api/catalog.ts:getCourse` | `backend/test/catalog.e2e-spec.ts`, `src/lib/api/catalog.test.ts` | `frontend ✓` | Đầy đủ thông tin `title`, `description`, `price` |
| **CAT-007** | Catalog | Query cây Modules và Lessons con của khóa học | [src/pages/LearnPage.tsx:51](file:///c:/Users/lenovo/l-english-academy/src/pages/LearnPage.tsx#L51) | | | `todo` | Nested relations `modules(lessons(*))` |
| **CAT-008** | Catalog | Route `/my-courses` - Danh sách khóa học đã ghi danh | [src/pages/MyCoursesPage.tsx:106](file:///c:/Users/lenovo/l-english-academy/src/pages/MyCoursesPage.tsx#L106) | | | `todo` | Kết hợp bảng `enrollments` và `courses` |
| **CAT-009** | Catalog | Cấu hình Section Trang chủ từ `platform_settings` | [src/services/homepageShowcaseService.ts:397](file:///c:/Users/lenovo/l-english-academy/src/services/homepageShowcaseService.ts#L397) | | | `todo` | Khóa `homepage_showcase_config` (fallback localStorage) |

---

## 3. Module 3: Learning (Tiến độ học tập & Bài giảng)

| ID | Module | Hành vi cần giữ nguyên | File cũ (đường dẫn:dòng) | Endpoint / Service mới | Test | Trạng thái | Ghi chú |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **LRN-001** | Learning | Route `/courses/:courseId/learn` - Không gian học bài trực tuyến | [src/pages/LearnPage.tsx:210](file:///c:/Users/lenovo/l-english-academy/src/pages/LearnPage.tsx#L210) | `GET /api/v1/learning/courses/:courseId/curriculum` (`LearningService.getCurriculum`, T-005) | `backend/test/learning-access.e2e-spec.ts`, `backend/src/modules/learning/lesson-access.spec.ts`, `src/lib/api/learning.test.ts` | `frontend ✓` | Video player, PDF viewer, sidebar cây bài. Chờ T-007 đổi `LearnPage`. **Đổi có chủ đích (D-02)**: bài không được học có `video_url`/`pdf_url` = null |
| **LRN-002** | Learning | Route `/library` - Kho tài liệu tổng hợp | [src/pages/LibraryPage.tsx:228](file:///c:/Users/lenovo/l-english-academy/src/pages/LibraryPage.tsx#L228) | | | `todo` | Hiển thị toàn bộ tài liệu học viên sở hữu |
| **LRN-003** | Learning | Route `/listening` - Luyện nghe bài học audio chuyên biệt | [src/pages/ListeningPage.tsx:227](file:///c:/Users/lenovo/l-english-academy/src/pages/ListeningPage.tsx#L227) | | | `todo` | Trình phát audio kèm playlist |
| **LRN-004** | Learning | Kiểm tra quyền truy cập khóa học từ bảng `enrollments` | [src/pages/LearnPage.tsx:34](file:///c:/Users/lenovo/l-english-academy/src/pages/LearnPage.tsx#L34) | `GET /api/v1/learning/courses/:courseId/enrollment` + `canStudyLesson` (`lesson-access.ts`, T-005) | `backend/test/learning-access.e2e-spec.ts`, `backend/src/modules/learning/lesson-access.spec.ts`, `src/lib/api/learning.test.ts` | `frontend ✓` | user lấy từ token. **Đổi có chủ đích (OPEN_QUESTIONS #18)**: client cũ bỏ qua `expires_at`; nay ghi danh hết hạn không mở bài và endpoint trả `enrollment: null`. Policy `Users enroll themselves` không mở endpoint (đóng có chủ đích, D-02) |
| **LRN-005** | Learning | Lấy danh sách tài liệu đính kèm từ `materials` | [src/pages/LearnPage.tsx:118](file:///c:/Users/lenovo/l-english-academy/src/pages/LearnPage.tsx#L118) | `GET /api/v1/learning/lessons/:lessonId/materials` (`LearningService.getLessonMaterials`, T-005) | `backend/test/learning-access.e2e-spec.ts`, `backend/src/modules/learning/lesson-access.spec.ts`, `src/lib/api/learning.test.ts` | `frontend ✓` | Lọc theo `lesson_id`. Không được học → `[]` |
| **LRN-006** | Learning | Lấy bài tập thực hành kèm bài học từ `lesson_practices` | [src/pages/LearnPage.tsx:131](file:///c:/Users/lenovo/l-english-academy/src/pages/LearnPage.tsx#L131) | `GET /api/v1/learning/lessons/:id/practices` (công khai) | backend/test/learning-user-data.e2e-spec.ts, `src/lib/api/learning.test.ts` | `frontend ✓` | Liên kết với `quiz_id` |
| **LRN-007** | Learning | Lấy tiến độ học bài của học viên từ `user_lesson_progress` | [src/pages/LearnPage.tsx:73](file:///c:/Users/lenovo/l-english-academy/src/pages/LearnPage.tsx#L73) | `GET /api/v1/learning/progress` | backend/test/learning-user-data.e2e-spec.ts, `src/lib/api/learning.test.ts` | `frontend ✓` | `is_completed`, `watch_duration_seconds` |
| **LRN-008** | Learning | Đánh dấu hoàn thành / chưa hoàn thành bài học | [src/pages/LearnPage.tsx:234](file:///c:/Users/lenovo/l-english-academy/src/pages/LearnPage.tsx#L234) | `PUT /api/v1/learning/lessons/:id/progress` (upsert) | backend/test/learning-user-data.e2e-spec.ts, `src/lib/api/learning.test.ts` | `frontend ✓` | Upsert vào `user_lesson_progress` |
| **LRN-009** | Learning | Danh sách bài học yêu thích từ `user_favorites` | [src/pages/LearnPage.tsx:83](file:///c:/Users/lenovo/l-english-academy/src/pages/LearnPage.tsx#L83) | `GET /api/v1/learning/favorites` | backend/test/learning-user-data.e2e-spec.ts, `src/lib/api/learning.test.ts` | `frontend ✓` | Lọc theo `user_id` |
| **LRN-010** | Learning | Thêm/Xóa bài học khỏi danh sách yêu thích | [src/pages/LearnPage.tsx:258](file:///c:/Users/lenovo/l-english-academy/src/pages/LearnPage.tsx#L258) | `PUT` / `DELETE /api/v1/learning/lessons/:id/favorite` | backend/test/learning-user-data.e2e-spec.ts, `src/lib/api/learning.test.ts` | `frontend ✓` | Toggle bản ghi trong `user_favorites` |
| **LRN-011** | Learning | Danh sách ghi chú cá nhân của bài học từ `user_notes` | [src/pages/LearnPage.tsx:109](file:///c:/Users/lenovo/l-english-academy/src/pages/LearnPage.tsx#L109) | `GET /api/v1/learning/lessons/:id/notes` | backend/test/learning-user-data.e2e-spec.ts, `src/lib/api/learning.test.ts` | `frontend ✓` | Sắp xếp `created_at DESC` |
| **LRN-012** | Learning | Thêm ghi chú bài học mới vào `user_notes` | [src/pages/LearnPage.tsx:297](file:///c:/Users/lenovo/l-english-academy/src/pages/LearnPage.tsx#L297) | `POST /api/v1/learning/lessons/:id/notes` (trim, rỗng → 400) | backend/test/learning-user-data.e2e-spec.ts, `src/lib/api/learning.test.ts` | `frontend ✓` | Lưu `content`, `lesson_id`, `user_id` |
| **LRN-013** | Learning | Lưu nháp ghi chú tạm trong `localStorage` | [src/pages/LearnPage.tsx:272](file:///c:/Users/lenovo/l-english-academy/src/pages/LearnPage.tsx#L272) | | | `todo` | `lenglish_draft_note_${lessonId}_${userId}` |
| **LRN-014** | Learning | Lưu trạng thái thu gọn thanh bên `learnpage-sidebar-collapsed` | [src/pages/LearnPage.tsx:151](file:///c:/Users/lenovo/l-english-academy/src/pages/LearnPage.tsx#L151) | | | `todo` | Lưu boolean vào localStorage |
| **LRN-015** | Learning | Dashboard: tiến độ bài học ("học tiếp", % khóa) | [src/pages/DashboardPage.tsx:92](file:///c:/Users/lenovo/l-english-academy/src/pages/DashboardPage.tsx#L92) | `GET /api/v1/learning/progress` | | `todo` | **Đổi hành vi có chủ đích** (OPEN_QUESTIONS #19): cũ luôn `[]`; mới trả dữ liệu thật, `created_at`/`completed_at` = `last_watched_at`, `updated_at` = `null`. Spec T-008 |
| **LRN-016** | Learning | Khóa của tôi: n/N bài, bài tiếp theo, hoạt động gần nhất | [src/pages/MyCoursesPage.tsx:116](file:///c:/Users/lenovo/l-english-academy/src/pages/MyCoursesPage.tsx#L116) | `GET /api/v1/learning/progress` | | `todo` | Như LRN-015. Spec T-008 |
| **LRN-017** | Learning | Hồ sơ: tiến độ bài học trong thống kê | [src/pages/Profile.tsx:258](file:///c:/Users/lenovo/l-english-academy/src/pages/Profile.tsx#L258) | `GET /api/v1/learning/progress` | | `todo` | Như LRN-015. Spec T-008 |

---

## 4. Module 4: Assessment (Khảo thí & Chấm điểm)

| ID | Module | Hành vi cần giữ nguyên | File cũ (đường dẫn:dòng) | Endpoint / Service mới | Test | Trạng thái | Ghi chú |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **ASM-001** | Assessment | Route `/courses/:courseId/quiz/:quizId` - Làm bài trắc nghiệm | [src/pages/QuizPage.tsx:211](file:///c:/Users/lenovo/l-english-academy/src/pages/QuizPage.tsx#L211) | | | `todo` | Giao diện làm quiz từng câu |
| **ASM-002** | Assessment | Route `/courses/:courseId/quiz/:quizId/result` - Xem kết quả quiz | [src/pages/QuizResult.tsx:212](file:///c:/Users/lenovo/l-english-academy/src/pages/QuizResult.tsx#L212) | | | `todo` | Bảng điểm & lời giải chi tiết |
| **ASM-003** | Assessment | Tải quiz & danh sách câu hỏi kèm đáp án | [src/pages/QuizPage.tsx:207](file:///c:/Users/lenovo/l-english-academy/src/pages/QuizPage.tsx#L207) | | | `todo` | **Chống lộ đề**: Ẩn `is_correct` khỏi client |
| **ASM-004** | Assessment | Lưu nháp câu trả lời quiz trong `localStorage` | [src/pages/QuizPage.tsx:63](file:///c:/Users/lenovo/l-english-academy/src/pages/QuizPage.tsx#L63) | | | `todo` | `quiz_draft_${quizId}_${userId}` |
| **ASM-005** | Assessment | Nộp bài và chấm điểm trắc nghiệm Quiz | [src/pages/QuizPage.tsx:292](file:///c:/Users/lenovo/l-english-academy/src/pages/QuizPage.tsx#L292) | | | `todo` | **Chuyển về server**: Server tính score |
| **ASM-006** | Assessment | Lưu kết quả tổng quan vào `user_quiz_results` | [src/pages/QuizPage.tsx:305](file:///c:/Users/lenovo/l-english-academy/src/pages/QuizPage.tsx#L305) | | | `todo` | `score`, `correct_answers`, `time_spent` |
| **ASM-007** | Assessment | Lưu chi tiết từng câu trả lời vào `user_answers` | [src/pages/QuizPage.tsx:321](file:///c:/Users/lenovo/l-english-academy/src/pages/QuizPage.tsx#L321) | | | `todo` | `question_id`, `selected_answer_id`, `is_correct` |
| **ASM-008** | Assessment | Đánh dấu lần đầu hoàn thành quiz `quiz_completed_*` | [src/pages/QuizPage.tsx:326](file:///c:/Users/lenovo/l-english-academy/src/pages/QuizPage.tsx#L326) | | | `todo` | Dùng để cộng XP thưởng |
| **ASM-009** | Assessment | Route `/courses/:courseId/fulltest` - Danh sách đề Full Test | [src/pages/FullTestList.tsx:221](file:///c:/Users/lenovo/l-english-academy/src/pages/FullTestList.tsx#L221) | | | `todo` | Lọc theo `course_id` |
| **ASM-010** | Assessment | Route `/courses/:courseId/fulltest/:testId` - Làm đề thi 200 câu | [src/pages/FullTestExam.tsx:222](file:///c:/Users/lenovo/l-english-academy/src/pages/FullTestExam.tsx#L222) | | | `todo` | Đếm ngược 120 phút, audio player |
| **ASM-011** | Assessment | Route `/courses/:courseId/fulltest/:testId/result` - Xem phân tích | [src/pages/FullTestResult.tsx:223](file:///c:/Users/lenovo/l-english-academy/src/pages/FullTestResult.tsx#L223) | | | `todo` | Điểm Listening, Reading, biểu đồ part |
| **ASM-012** | Assessment | Route `/fulltests` - Trang danh sách đề thi tổng hợp | [src/pages/FullTestsPage.tsx:225](file:///c:/Users/lenovo/l-english-academy/src/pages/FullTestsPage.tsx#L225) | | | `todo` | Gom toàn bộ đề thi các năm |
| **ASM-013** | Assessment | Query cấu trúc đề thi `full_tests` & `full_test_sections` | [src/pages/FullTestExam.tsx:313](file:///c:/Users/lenovo/l-english-academy/src/pages/FullTestExam.tsx#L313) | | | `todo` | 7 parts của đề thi TOEIC |
| **ASM-014** | Assessment | Lưu nháp bài thi Full Test trong `localStorage` | [src/pages/FullTestExam.tsx:173](file:///c:/Users/lenovo/l-english-academy/src/pages/FullTestExam.tsx#L173) | | | `todo` | `fulltest_draft_${testId}_${userId}` |
| **ASM-015** | Assessment | Quy đổi điểm số Listening & Reading theo thang điểm ETS | [src/pages/FullTestExam.tsx:738](file:///c:/Users/lenovo/l-english-academy/src/pages/FullTestExam.tsx#L738) | | | `todo` | **Chuyển về server**: Thang 5 - 495 |
| **ASM-016** | Assessment | Lưu kết quả bài thi vào `user_full_test_results` | [src/pages/FullTestExam.tsx:768](file:///c:/Users/lenovo/l-english-academy/src/pages/FullTestExam.tsx#L768) | | | `todo` | `total_score`, `listening_score`, `reading_score` |
| **ASM-017** | Assessment | Lưu chi tiết 200 câu thi vào `full_test_answer_details` | [src/pages/FullTestExam.tsx:785](file:///c:/Users/lenovo/l-english-academy/src/pages/FullTestExam.tsx#L785) | | | `todo` | `question_id`, `selected_answer_id`, `part_number` |
| **ASM-018** | Assessment | Route `/courses/:courseId/vocab` - Danh sách bộ từ vựng | [src/pages/VocabPage.tsx:214](file:///c:/Users/lenovo/l-english-academy/src/pages/VocabPage.tsx#L214) | | | `todo` | Bảng `vocab_categories`, `vocab_quizzes` |
| **ASM-019** | Assessment | Route `/courses/:courseId/vocab-lesson/:lessonId` - Flashcard | [src/pages/VocabLessonPage.tsx:215](file:///c:/Users/lenovo/l-english-academy/src/pages/VocabLessonPage.tsx#L215) | | | `todo` | Lật thẻ từ vựng kèm phát âm |
| **ASM-020** | Assessment | Route `/courses/:courseId/dictation/:quizId` - Nghe chép chính tả | [src/pages/DictationPage.tsx:216](file:///c:/Users/lenovo/l-english-academy/src/pages/DictationPage.tsx#L216) | | | `todo` | Trình phát audio đoạn ngắn |
| **ASM-021** | Assessment | So khớp chuỗi chính tả và tính độ chính xác | [src/pages/DictationPage.tsx:1120](file:///c:/Users/lenovo/l-english-academy/src/pages/DictationPage.tsx#L1120) | | | `todo` | Bỏ khoảng trắng, so sánh từng từ |
| **ASM-022** | Assessment | Lưu câu chép chính tả đã hoàn thành vào `localStorage` | [src/pages/DictationPage.tsx:828](file:///c:/Users/lenovo/l-english-academy/src/pages/DictationPage.tsx#L828) | | | `todo` | `dictation_done_${userId}_${qId}` |
| **ASM-023** | Assessment | Route `/part2-coach` - Luyện nghe phản xạ TOEIC Part 2 | [src/pages/Part2CoachPage.tsx:219](file:///c:/Users/lenovo/l-english-academy/src/pages/Part2CoachPage.tsx#L219) | | | `todo` | Kéo thả câu hỏi Wh-/Yes-No |
| **ASM-024** | Assessment | Đọc dữ liệu cụm Part 2 tĩnh từ `src/data/part2CoachData.ts` | [src/pages/Part2CoachPage.tsx:25](file:///c:/Users/lenovo/l-english-academy/src/data/part2CoachData.ts#L25) | | | `todo` | **Chuyển vào CSDL** (giảm 414KB bundle) |
| **ASM-025** | Assessment | Lưu tiến độ Part 2 Coach `part2_coach_progress_*` | [src/pages/Part2CoachPage.tsx:56](file:///c:/Users/lenovo/l-english-academy/src/pages/Part2CoachPage.tsx#L56) | | | `todo` | Lưu cluster progress trong localStorage |

---

## 5. Module 5: Media (Quản lý Tệp & Âm thanh)

| ID | Module | Hành vi cần giữ nguyên | File cũ (đường dẫn:dòng) | Endpoint / Service mới | Test | Trạng thái | Ghi chú |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **MED-001** | Media | Upload avatar cá nhân vào bucket `materials/avatars` | [src/pages/Profile.tsx:566](file:///c:/Users/lenovo/l-english-academy/src/pages/Profile.tsx#L566) | | | `todo` | `supabase.storage.from("materials").upload` |
| **MED-002** | Media | Upload ảnh bìa khóa học vào `materials/course_thumbnails` | [src/pages/admin/AdminCourseNew.tsx:65](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminCourseNew.tsx#L65) | | | `todo` | Quản trị viên upload thumbnail |
| **MED-003** | Media | Upload file PDF và Audio vào `materials` | [src/pages/admin/AdminMaterials.tsx:134](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminMaterials.tsx#L134) | | | `todo` | Trình quản lý tài nguyên học tập |
| **MED-004** | Media | Upload audio & ảnh câu hỏi trắc nghiệm vào `materials/quiz_media` | [src/components/admin/QuizManager.tsx:225](file:///c:/Users/lenovo/l-english-academy/src/components/admin/QuizManager.tsx#L225) | | | `todo` | Phục vụ câu hỏi Part 1, 3, 4 |
| **MED-005** | Media | Upload audio đề thi Full Test vào `materials/fulltest_media` | [src/pages/admin/AdminFullTestManager.tsx:415](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminFullTestManager.tsx#L415) | | | `todo` | File âm thanh Full Test lớn (40-60MB) |
| **MED-006** | Media | Lấy Public URL của tệp từ bucket `materials` | [src/pages/admin/AdminMaterials.tsx:140](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminMaterials.tsx#L140) | | | `todo` | `getPublicUrl` |
| **MED-007** | Media | Proxy Google Translate TTS sang MP3 (`api/tts.ts`) | [api/tts.ts:1](file:///c:/Users/lenovo/l-english-academy/api/tts.ts#L1) | | | `todo` | Phát âm từ vựng tiếng Anh trực tuyến |
| **MED-008** | Media | Chuẩn hóa domain audio và xử lý domain Supabase cũ | [src/utils/audioUrl.ts:12](file:///c:/Users/lenovo/l-english-academy/src/utils/audioUrl.ts#L12) | | | `todo` | Xử lý `squqwkxgsxqojhqmdvbo` -> CDN |
| **MED-009** | Media | Giới hạn phát 1 audio duy nhất toàn ứng dụng | [src/App.tsx:169](file:///c:/Users/lenovo/l-english-academy/src/App.tsx#L169) | | | `todo` | Dừng audio khác khi có audio mới phát |

---

## 6. Module 6: Payments (Thanh toán & Nâng cấp VIP PRO)

| ID | Module | Hành vi cần giữ nguyên | File cũ (đường dẫn:dòng) | Endpoint / Service mới | Test | Trạng thái | Ghi chú |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **PAY-001** | Payments | Hiển thị Modal Nâng Cấp VIP PRO kèm QR SePay | [src/components/UpgradeProModal.tsx:78](file:///c:/Users/lenovo/l-english-academy/src/components/UpgradeProModal.tsx#L78) | | | `todo` | Giá gốc, giá giảm, cú pháp chuyển tiền |
| **PAY-002** | Payments | Tạo đơn thanh toán mới với `status = 'pending'` | [src/components/UpgradeProModal.tsx:118](file:///c:/Users/lenovo/l-english-academy/src/components/UpgradeProModal.tsx#L118) | | | `todo` | **Chuyển về server**: Server-side pricing |
| **PAY-003** | Payments | Tái sử dụng đơn pending còn hạn 30 phút | [src/components/UpgradeProModal.tsx:96](file:///c:/Users/lenovo/l-english-academy/src/components/UpgradeProModal.tsx#L96) | | | `todo` | Tránh spam bản ghi rác CSDL |
| **PAY-004** | Payments | Lắng nghe Realtime trạng thái đơn hàng khi tiền về | [src/components/UpgradeProModal.tsx:160](file:///c:/Users/lenovo/l-english-academy/src/components/UpgradeProModal.tsx#L160) | | | `todo` | Chuyển sang SSE `/payments/orders/:code/stream` |
| **PAY-005** | Payments | Tra cứu trạng thái đơn hàng thủ công | [src/components/UpgradeProModal.tsx:222](file:///c:/Users/lenovo/l-english-academy/src/components/UpgradeProModal.tsx#L222) | | | `todo` | RPC `check_payment_order_status` |
| **PAY-006** | Payments | Nút giả lập thanh toán thử nghiệm thành công | [src/components/UpgradeProModal.tsx:300](file:///c:/Users/lenovo/l-english-academy/src/components/UpgradeProModal.tsx#L300) | | | `todo` | Gọi qua endpoint serverless / API dev |
| **PAY-007** | Payments | Webhook nhận biến động SePay 24/7 (`api/payment-webhook.ts`) | [api/payment-webhook.ts:38](file:///c:/Users/lenovo/l-english-academy/api/payment-webhook.ts#L38) | | | `todo` | POST endpoint tiếp nhận tiền về |
| **PAY-008** | Payments | Regex trích xuất mã đơn hàng từ nội dung chuyển khoản | [api/payment-webhook.ts:20](file:///c:/Users/lenovo/l-english-academy/api/payment-webhook.ts#L20) | | | `todo` | Khớp dạng LEAxxxxx hoặc VIPxxxxx |
| **PAY-009** | Payments | Stored Procedure `complete_payment_order` | [supabase/migrations/20261020_payment_and_pro_system.sql:84](file:///c:/Users/lenovo/l-english-academy/supabase/migrations/20261020_payment_and_pro_system.sql#L84) | | | `todo` | Đổi status, gán `is_pro`, enroll all courses |
| **PAY-010** | Payments | Endpoint tra cứu trạng thái đơn (`api/check-payment.ts`) | [api/check-payment.ts:15](file:///c:/Users/lenovo/l-english-academy/api/check-payment.ts#L15) | | | `todo` | Serverless endpoint check status |
| **PAY-011** | Payments | Endpoint giả lập thanh toán (`api/simulate-payment.ts`) | [api/simulate-payment.ts:19](file:///c:/Users/lenovo/l-english-academy/api/simulate-payment.ts#L19) | | | `todo` | Dành cho môi trường test/dev |
| **PAY-012** | Payments | Hàm cứu hộ `manually_upgrade_user_to_pro` | [supabase/migrations/20261020_payment_and_pro_system.sql:254](file:///c:/Users/lenovo/l-english-academy/supabase/migrations/20261020_payment_and_pro_system.sql#L254) | | | `todo` | Nâng cấp trực tiếp theo email / user_id |

---

## 7. Module 7: Admin (Quản trị Hệ thống)

| ID | Module | Hành vi cần giữ nguyên | File cũ (đường dẫn:dòng) | Endpoint / Service mới | Test | Trạng thái | Ghi chú |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **ADM-001** | Admin | Route `/admin/dashboard` - Báo cáo tổng quan số liệu | [src/pages/admin/AdminDashboard.tsx:240](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminDashboard.tsx#L240) | | | `todo` | AdminRoute guard |
| **ADM-002** | Admin | Route `/admin/students` - Danh sách quản lý học viên | [src/pages/admin/AdminStudents.tsx:250](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminStudents.tsx#L250) | | | `todo` | Lọc học viên, trạng thái PRO |
| **ADM-003** | Admin | Route `/admin/students/:userId` - Xem chi tiết học viên | [src/pages/admin/AdminStudentDetail.tsx:251](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminStudentDetail.tsx#L251) | | | `todo` | Lịch sử thi, khóa học đã ghi danh |
| **ADM-004** | Admin | Thêm ghi chú học viên vào bảng `admin_student_notes` | [src/pages/admin/AdminStudentDetail.tsx:97](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminStudentDetail.tsx#L97) | | | `todo` | `admin_id`, `student_id`, `content` |
| **ADM-005** | Admin | Ghi danh hoặc hủy ghi danh học viên thủ công | [src/pages/admin/AdminStudentDetail.tsx:112](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminStudentDetail.tsx#L112) | | | `todo` | Thao tác trên bảng `enrollments` |
| **ADM-006** | Admin | Edge function `manage-students` (Deno runtime) | [supabase/functions/manage-students/index.ts:1](file:///c:/Users/lenovo/l-english-academy/supabase/functions/manage-students/index.ts#L1) | | | `todo` | Tạo học viên có `email_confirm: true` |
| **ADM-007** | Admin | Route `/admin/categories` - CRUD danh mục khóa học | [src/pages/admin/AdminCategories.tsx:243](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminCategories.tsx#L243) | | | `todo` | Quản lý bảng `course_categories` |
| **ADM-008** | Admin | Route `/admin/courses` - Quản lý danh sách khóa học | [src/pages/admin/AdminCourses.tsx:244](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminCourses.tsx#L244) | | | `todo` | Bật/tắt `is_active`, sắp xếp |
| **ADM-009** | Admin | Route `/admin/courses/new` & `/:courseId` - Tạo & sửa khóa | [src/pages/admin/AdminCourseNew.tsx:245](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminCourseNew.tsx#L245) | | | `todo` | Form thông tin khóa học |
| **ADM-010** | Admin | Quản lý Modules và Bài học con (`LessonManager`) | [src/components/admin/LessonManager.tsx:1](file:///c:/Users/lenovo/l-english-academy/src/components/admin/LessonManager.tsx#L1) | | | `todo` | Kéo thả sắp xếp thứ tự bài học |
| **ADM-011** | Admin | Quản lý ngân hàng câu hỏi Quiz (`QuizManager`) | [src/components/admin/QuizManager.tsx:1](file:///c:/Users/lenovo/l-english-academy/src/components/admin/QuizManager.tsx#L1) | | | `todo` | Thêm câu hỏi, đáp án, giải thích |
| **ADM-012** | Admin | Route `/admin/fulltests` - Quản lý đề thi Full Test | [src/pages/admin/AdminFullTestManager.tsx:247](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminFullTestManager.tsx#L247) | | | `todo` | Tạo đề thi, cấu hình audio |
| **ADM-013** | Admin | Route `/admin/fulltests/:testId/questions` - Quản lý 200 câu | [src/pages/admin/AdminFullTestQuestions.tsx:248](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminFullTestQuestions.tsx#L248) | | | `todo` | Quản lý từng câu của đề thi |
| **ADM-014** | Admin | Route `/admin/import-json` - Nhập hàng loạt khóa học từ JSON | [src/pages/admin/AdminCourseJsonImport.tsx:249](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminCourseJsonImport.tsx#L249) | | | `todo` | **Chuyển về server**: Xử lý 1 Transaction |
| **ADM-015** | Admin | Route `/admin/enrollments` - Quản lý đơn hàng & duyệt đơn | [src/pages/admin/AdminEnrollments.tsx:252](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminEnrollments.tsx#L252) | | | `todo` | Danh sách đơn `payment_orders` |
| **ADM-016** | Admin | Admin duyệt đơn thủ công qua `complete_payment_order` | [src/pages/admin/AdminEnrollments.tsx:110](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminEnrollments.tsx#L110) | | | `todo` | Kích hoạt PRO nếu khách chuyển sai cú pháp |
| **ADM-017** | Admin | Route `/admin/materials` - Quản lý tệp tài liệu trong bucket | [src/pages/admin/AdminMaterials.tsx:253](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminMaterials.tsx#L253) | | | `todo` | Thống kê dung lượng, xóa file rác |
| **ADM-018** | Admin | Route `/admin/reports` - Thống kê học tập và bài thi | [src/pages/admin/AdminReports.tsx:254](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminReports.tsx#L254) | | | `todo` | Báo cáo tỷ lệ đúng, thời gian làm bài |
| **ADM-019** | Admin | Route `/admin/backup` - Sao lưu CSDL | [src/pages/admin/AdminBackup.tsx:255](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminBackup.tsx#L255) | | | `todo` | Xuất dữ liệu quản trị |
| **ADM-020** | Admin | Route `/admin/settings` - Cài đặt nền tảng `platform_settings` | [src/pages/admin/AdminSettings.tsx:256](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminSettings.tsx#L256) | | | `todo` | Quản lý key-value cấu hình chung |
| **ADM-021** | Admin | Ghi nhật ký quản trị vào `admin_activity_log` | [supabase/migrations/20260329141747_3017db4a-6d94-4787-bcc1-328c5cd706ff.sql:350](file:///c:/Users/lenovo/l-english-academy/supabase/migrations/20260329141747_3017db4a-6d94-4787-bcc1-328c5cd706ff.sql#L350) | | | `todo` | Audit trail các hành động của admin |

---

## 8. Module 8: Gamification (Hệ thống Điểm thưởng & Gamification)

| ID | Module | Hành vi cần giữ nguyên | File cũ (đường dẫn:dòng) | Endpoint / Service mới | Test | Trạng thái | Ghi chú |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **GAM-001** | Gamification | Khởi tạo state Gamification từ `localStorage` | [src/hooks/useGamification.ts:137](file:///c:/Users/lenovo/l-english-academy/src/hooks/useGamification.ts#L137) | | | `todo` | `lenglish_gamification_${userId}` |
| **GAM-002** | Gamification | Chuyển dữ liệu điểm guest sang tài khoản khi đăng nhập | [src/hooks/useGamification.ts:199](file:///c:/Users/lenovo/l-english-academy/src/hooks/useGamification.ts#L199) | | | `todo` | Giữ nguyên XP khi học thử rồi mới đăng ký |
| **GAM-003** | Gamification | Logic cộng XP và thăng cấp (`addXp`) | [src/hooks/useGamification.ts:228](file:///c:/Users/lenovo/l-english-academy/src/hooks/useGamification.ts#L228) | | | `todo` | **Chuyển về server**: Level = sqrt(XP / 50) |
| **GAM-004** | Gamification | Cập nhật chuỗi Streak hàng ngày (`updateStreak`) | [src/hooks/useGamification.ts:316](file:///c:/Users/lenovo/l-english-academy/src/hooks/useGamification.ts#L316) | | | `todo` | **Chuyển về server**: Cronjob 00:00 |
| **GAM-005** | Gamification | Hệ thống nhiệm vụ ngày Daily Quests | [src/hooks/useGamification.ts:333](file:///c:/Users/lenovo/l-english-academy/src/hooks/useGamification.ts#L333) | | | `todo` | Học bài, làm quiz, luyện phản xạ |
| **GAM-006** | Gamification | Mở rương phần thưởng ngẫu nhiên ngày `lenglish_last_chest_date` | [src/hooks/useGamification.ts:364](file:///c:/Users/lenovo/l-english-academy/src/hooks/useGamification.ts#L364) | | | `todo` | Thưởng XP ngẫu nhiên mỗi ngày |
| **GAM-007** | Gamification | Hiển thị thanh tiến trình XP, level và badge | [src/pages/DashboardPage.tsx:260](file:///c:/Users/lenovo/l-english-academy/src/pages/DashboardPage.tsx#L260) | | | `todo` | UI dashboard học viên |
| **GAM-008** | Gamification | Bảng xếp hạng tuần/tháng (Leaderboard) | [src/pages/DashboardPage.tsx:320](file:///c:/Users/lenovo/l-english-academy/src/pages/DashboardPage.tsx#L320) | | | `todo` | **Chuyển về server**: Bảng xếp hạng thật |

---

## 9. Module 9: Speaking (Phòng Luyện Nói Tiếng Anh)

| ID | Module | Hành vi cần giữ nguyên | File cũ (đường dẫn:dòng) | Endpoint / Service mới | Test | Trạng thái | Ghi chú |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **SPK-001** | Speaking | Route `/speaking` - Sảnh chờ và danh sách phòng luyện nói | [src/pages/SpeakingRoomsPage.tsx:235](file:///c:/Users/lenovo/l-english-academy/src/pages/SpeakingRoomsPage.tsx#L235) | | | `todo` | Lọc theo level (A1-C2) và chủ đề |
| **SPK-002** | Speaking | Query danh sách phòng nói active từ `speaking_rooms` | [src/services/speakingService.ts:114](file:///c:/Users/lenovo/l-english-academy/src/services/speakingService.ts#L114) | | | `todo` | `status = 'active'`, kèm số lượng thành viên |
| **SPK-003** | Speaking | Tạo phòng nói mới qua `createSpeakingRoom` | [src/services/speakingService.ts:187](file:///c:/Users/lenovo/l-english-academy/src/services/speakingService.ts#L187) | | | `todo` | Hỗ trợ phòng công khai hoặc mật mã |
| **SPK-004** | Speaking | Tham gia phòng nói qua RPC `join_speaking_room` | [src/services/speakingService.ts:256](file:///c:/Users/lenovo/l-english-academy/src/services/speakingService.ts#L256) | | | `todo` | Kiểm tra mật mã nếu phòng private |
| **SPK-005** | Speaking | Rời phòng nói qua RPC `leave_speaking_room` | [src/services/speakingService.ts:363](file:///c:/Users/lenovo/l-english-academy/src/services/speakingService.ts#L363) | | | `todo` | Xóa thành viên, chuyển host nếu là chủ phòng |
| **SPK-006** | Speaking | Ghép cặp phòng tự động qua RPC `match_speaking_room` | [src/services/speakingService.ts:430](file:///c:/Users/lenovo/l-english-academy/src/services/speakingService.ts#L430) | | | `todo` | Tìm phòng phù hợp theo trình độ và chủ đề |
| **SPK-007** | Speaking | Cấp JWT Token LiveKit từ endpoint `api/speaking-token.ts` | [api/speaking-token.ts:1](file:///c:/Users/lenovo/l-english-academy/api/speaking-token.ts#L1) | | | `todo` | Trả về LiveKit AccessToken |
| **SPK-008** | Speaking | Lắng nghe Realtime thay đổi danh sách phòng nói | [src/pages/SpeakingRoomsPage.tsx:100](file:///c:/Users/lenovo/l-english-academy/src/pages/SpeakingRoomsPage.tsx#L100) | | | `todo` | Kênh `public-speaking-rooms-sync` |
| **SPK-009** | Speaking | Đàm thoại WebRTC qua LiveKit Client SDK | [src/hooks/useVoiceRoom.ts:112](file:///c:/Users/lenovo/l-english-academy/src/hooks/useVoiceRoom.ts#L112) | | | `todo` | Mic on/off, danh sách người đang nói |
| **SPK-010** | Speaking | Cơ chế WebRTC Mesh P2P dự phòng qua Supabase Broadcast | [src/hooks/useVoiceRoom.ts:334](file:///c:/Users/lenovo/l-english-academy/src/hooks/useVoiceRoom.ts#L334) | | | `todo` | **Loại bỏ**: HLD đã quyết định dùng LiveKit 100% |
| **SPK-011** | Speaking | Lưu thời lượng phiên luyện nói vào `speaking_sessions` | [src/services/speakingService.ts:375](file:///c:/Users/lenovo/l-english-academy/src/services/speakingService.ts#L375) | | | `todo` | `started_at`, `ended_at`, `duration_seconds` |

---

## 10. Module 10: Games (Trò chơi Học tập & Đấu Rank)

| ID | Module | Hành vi cần giữ nguyên | File cũ (đường dẫn:dòng) | Endpoint / Service mới | Test | Trạng thái | Ghi chú |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **GME-001** | Games | Route `/games` - Games Hub danh mục các trò chơi | [src/pages/GamesHub.tsx:230](file:///c:/Users/lenovo/l-english-academy/src/pages/GamesHub.tsx#L230) | | | `todo` | Giới thiệu game & bảng xếp hạng |
| **GME-002** | Games | Route `/games/word-shooter` - Game bắn từ vựng Word Shooter | [src/pages/WordShooterGame.tsx:231](file:///c:/Users/lenovo/l-english-academy/src/pages/WordShooterGame.tsx#L231) | | | `todo` | Chế độ Solo & PvP |
| **GME-003** | Games | Route `/games/word-defense` - Game thủ thành từ vựng | [src/pages/WordDefenseGame.tsx:232](file:///c:/Users/lenovo/l-english-academy/src/pages/WordDefenseGame.tsx#L232) | | | `todo` | Bắn hạ quái vật theo nghĩa từ vựng |
| **GME-004** | Games | Route `/admin/games` - Quản trị cấu hình game | [src/pages/admin/AdminGamesConfig.tsx:241](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminGamesConfig.tsx#L241) | | | `todo` | Tốc độ đạn, lượng máu quái vật |
| **GME-005** | Games | Route `/admin/vocab-packs` - Quản lý gói từ vựng game | [src/pages/admin/AdminVocabPacks.tsx:242](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminVocabPacks.tsx#L242) | | | `todo` | Bộ từ vựng theo chủ đề |
| **GME-006** | Games | Lưu Rank, điểm dũng khí, số sao trong `localStorage` | [src/services/wordShooterRankService.ts:161](file:///c:/Users/lenovo/l-english-academy/src/services/wordShooterRankService.ts#L161) | | | `todo` | `word_shooter_rank_data_v1` -> **Chuyển vào DB** |
| **GME-007** | Games | Logic cộng/trừ sao thăng hạng (Đồng -> Chiến Tướng) | [src/services/wordShooterRankService.ts:18](file:///c:/Users/lenovo/l-english-academy/src/services/wordShooterRankService.ts#L18) | | | `todo` | **Chuyển về server**: Chống gian lận F12 |
| **GME-008** | Games | Sảnh chờ ghép trận PvP qua kênh Realtime `lobby-pvp-${code}` | [src/components/game/WordShooter/WordShooterLobby.tsx:456](file:///c:/Users/lenovo/l-english-academy/src/components/game/WordShooter/WordShooterLobby.tsx#L456) | | | `todo` | Chuyển sang Socket.IO Gateway |
| **GME-009** | Games | Đấu trường thi đấu thời gian thực qua kênh `arena-pvp-${roomId}`| [src/components/game/WordShooter/WordShooterArena.tsx:777](file:///c:/Users/lenovo/l-english-academy/src/components/game/WordShooter/WordShooterArena.tsx#L777) | | | `todo` | Chuyển sang Socket.IO Gateway |
| **GME-010** | Games | Tải gói từ vựng từ `platform_settings.game_vocab_packs` | [src/services/vocabPacksService.ts:26](file:///c:/Users/lenovo/l-english-academy/src/services/vocabPacksService.ts#L26) | | | `todo` | Fallback cache `vocab_packs_custom_v1` |

---

## 11. Mục 'Bảo Mật Cần Siết' (Security Hardening Requirements)

| ID | Hạng mục lỗ hổng | Mô tả chi tiết & Rủi ro | Vị trí mã nguồn | Giải pháp khắc phục ở Backend NestJS | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **SEC-001** | Lộ đáp án trắc nghiệm | Bảng `answers` có policy `SELECT USING (true)` chứa cả cột `is_correct: true/false`. Học viên mở DevTools là thấy 100% đáp án. | [src/pages/QuizPage.tsx:207](file:///c:/Users/lenovo/l-english-academy/src/pages/QuizPage.tsx#L207) | Tách DTO câu hỏi của học viên: tuyệt đối không serialize cột `is_correct`. Chấm bài ở backend. | `todo` |
| **SEC-002** | Học viên tự gửi điểm | Client tự tính điểm và gửi `score: 10/10` vào bảng điểm CSDL `user_quiz_results` và `user_full_test_results`. | [src/pages/QuizPage.tsx:305](file:///c:/Users/lenovo/l-english-academy/src/pages/QuizPage.tsx#L305)<br/>[src/pages/FullTestExam.tsx:768](file:///c:/Users/lenovo/l-english-academy/src/pages/FullTestExam.tsx#L768) | Endpoint `POST /quizzes/:id/submit` và `POST /full-tests/:id/submit` chỉ nhận ID câu trả lời; backend tự so khớp DB và tính điểm. | `todo` |
| **SEC-003** | Lỗ hổng cập nhật đơn hàng | Bảng `payment_orders` từng có RLS `UPDATE USING (true)` cho `anon` và `authenticated`. Bất kỳ ai cũng có thể gửi `UPDATE status='completed'`. | [supabase/migrations/20261020_payment_and_pro_system.sql:63](file:///c:/Users/lenovo/l-english-academy/supabase/migrations/20261020_payment_and_pro_system.sql#L63) | Gỡ bỏ hoàn toàn quyền UPDATE khỏi client. Việc đổi status chỉ do NestJS Service xử lý trong webhook SePay. | `todo` |
| **SEC-004** | Client tự quyết định giá tiền | Client tự insert đơn hàng `payment_orders` kèm số tiền `amount: data.price` (dễ bị sửa thành `amount: 1000đ`). | [src/components/UpgradeProModal.tsx:118](file:///c:/Users/lenovo/l-english-academy/src/components/UpgradeProModal.tsx#L118) | Endpoint `POST /payments/create-order` chỉ nhận mã gói (plan); giá tiền do backend gán cố định theo bảng giá. | `todo` |
| **SEC-005** | Hàm kích hoạt VIP cấp cho anon | Function `complete_payment_order` và `manually_upgrade_user_to_pro` được `GRANT EXECUTE TO anon`. Bất kỳ ai cũng có thể tự nâng PRO vĩnh viễn. | [supabase/migrations/20261020_payment_and_pro_system.sql:216](file:///c:/Users/lenovo/l-english-academy/supabase/migrations/20261020_payment_and_pro_system.sql#L216)<br/>[supabase/migrations/20261020_payment_and_pro_system.sql:317](file:///c:/Users/lenovo/l-english-academy/supabase/migrations/20261020_payment_and_pro_system.sql#L317) | Đã soạn migration vá 20261024. Chuyển logic kích hoạt vào `PaymentsService` nội bộ của NestJS. | `todo` |
| **SEC-006** | Lộ tài nguyên video bài học trả phí | Bảng `lessons` và bucket `materials` cho phép đọc toàn bộ `video_url` và `pdf_url` qua `SELECT USING (true)` mà không kiểm tra học viên đã mua khóa hay chưa. | [src/pages/LearnPage.tsx:118](file:///c:/Users/lenovo/l-english-academy/src/pages/LearnPage.tsx#L118) | Endpoint `GET /lessons/:id/stream` kiểm tra `enrollments` trước khi trả về Signed URL có thời hạn (2 giờ). | `todo` — một phần: T-005 không trả `video_url`/`pdf_url`/tài liệu cho người không có quyền, `LearnPage` dùng API từ T-007 (có hiệu lực khi frontend lên production); URL vẫn là link cố định (Signed URL thuộc P4 Media) |
| **SEC-007** | Gian lận XP và Rank game | Dữ liệu Gamification (XP, Streak, Level) và Rank game lưu trong `localStorage` cho phép học viên dùng Console để sửa. | [src/hooks/useGamification.ts:221](file:///c:/Users/lenovo/l-english-academy/src/hooks/useGamification.ts#L221)<br/>[src/services/wordShooterRankService.ts:176](file:///c:/Users/lenovo/l-english-academy/src/services/wordShooterRankService.ts#L176) | Lưu trữ XP và Rank trong PostgreSQL. Chỉ backend mới có quyền cộng/trừ XP sau khi xác nhận kết quả bài học hoặc trận đấu. | `todo` |

---

## 12. Mục 'Phát Hiện Thêm' (Những Hành Vi Báo Cáo Bỏ Sót)

| ID | Hành vi phát hiện thêm | Bối cảnh & Chi tiết kỹ thuật | Vị trí mã nguồn | Giải pháp & Đề xuất kiến trúc | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **ADD-001** | Admin tạo học viên qua client SDK | Trong trang quản trị `AdminStudents.tsx`, Admin tạo học viên mới bằng cách khởi tạo `tempSupabase.auth.signUp()` trực tiếp trên browser của Admin. Điều này có thể làm ghi đè phiên đăng nhập hoặc lộ mật khẩu tạm. | [src/pages/admin/AdminStudents.tsx:38](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminStudents.tsx#L38) | Endpoint `POST /admin/students` sử dụng NestJS Service để tạo user trực tiếp trong CSDL kèm mật khẩu ngẫu nhiên và gửi email. | `todo` |
| **ADD-002** | Vòng lặp import JSON không transaction | [AdminCourseJsonImport.tsx](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminCourseJsonImport.tsx) chạy vòng lặp trên trình duyệt bắn hàng chục request upload file và insert câu hỏi. Mất mạng giữa chừng gây rác DB. | [src/pages/admin/AdminCourseJsonImport.tsx:89](file:///c:/Users/lenovo/l-english-academy/src/pages/admin/AdminCourseJsonImport.tsx#L89) | Endpoint `POST /admin/courses/import-json` xử lý toàn bộ file JSON trong 1 Database Transaction duy nhất (lỗi tự rollback). | `todo` |
| **ADD-003** | Thiếu xác thực HMAC cho SePay Webhook | Endpoint `api/payment-webhook.ts` nhận POST request từ SePay mà không kiểm tra chữ ký bí mật hay IP whitelist, có nguy cơ bị kẻ xấu spam request giả mạo thanh toán. | [api/payment-webhook.ts:38](file:///c:/Users/lenovo/l-english-academy/api/payment-webhook.ts#L38) | Thêm middleware kiểm tra API Key bí mật `SEPAY_WEBHOOK_API_KEY` từ header `Authorization` / `x-api-key`. | `todo` |
| **ADD-004** | Hardcoded Anon JWT Fallback | 5 tệp trong `api/` và client đang gán cứng chuỗi JWT anon key dài dự phòng nếu thiếu file `.env`. | [src/integrations/supabase/client.ts:6](file:///c:/Users/lenovo/l-english-academy/src/integrations/supabase/client.ts#L6)<br/>[api/payment-webhook.ts:12](file:///c:/Users/lenovo/l-english-academy/api/payment-webhook.ts#L12) | Xóa toàn bộ chuỗi token fallback; bắt buộc nạp qua biến môi trường. | `todo` |
| **ADD-005** | Dữ liệu tĩnh lớn trong bundle client | Hai file `part2CoachData.ts` (414KB) và `toeic600Data.ts` (177KB) được `import` trực tiếp vào bundle JavaScript client, làm chậm thời gian tải trang. | [src/data/part2CoachData.ts:1](file:///c:/Users/lenovo/l-english-academy/src/data/part2CoachData.ts#L1)<br/>[src/data/toeic600Data.ts:1](file:///c:/Users/lenovo/l-english-academy/src/data/toeic600Data.ts#L1) | Tạo bảng CSDL tương ứng, nạp dữ liệu một lần và cho client tải qua REST API có cache. | `todo` |
| **ADD-006** | Trình phát audio toàn cục có nguy cơ memory leak | `handleGlobalAudioPlay` lắng nghe sự kiện `play` trên `document` bằng capture mode ở `App.tsx:182` có thể xung đột với Web Audio context của LiveKit trong phòng nói. | [src/App.tsx:169](file:///c:/Users/lenovo/l-english-academy/src/App.tsx#L169) | Gom logic audio playback vào một AudioService chuyên biệt. | `todo` |
| **ADD-007** | Thiếu cơ chế đánh dấu phiên học hết hạn | Trong `speaking_rooms`, cột `expires_at` mặc định là `now() + interval '4 hours'`, nhưng không có cronjob quét đóng các phòng đã quá hạn. | [supabase/migrations/20261023_speaking_rooms.sql:35](file:///c:/Users/lenovo/l-english-academy/supabase/migrations/20261023_speaking_rooms.sql#L35) | Thêm cronjob định kỳ 15 phút trong NestJS `SpeakingModule` để cập nhật các phòng hết hạn sang `status = 'expired'`. | `todo` |
| **ADD-008** | Mật khẩu tài khoản admin cũ trong các script | Các script trong `scripts/` (`import_nghe_doc_course.js`, `restore_2026_media.js`) có chứa mật khẩu cũ `luan123`. | [scripts/import_nghe_doc_course.js:108](file:///c:/Users/lenovo/l-english-academy/scripts/import_nghe_doc_course.js#L108) | Chuyển toàn bộ sang đọc biến môi trường `ADMIN_PASSWORD`. | `todo` |
