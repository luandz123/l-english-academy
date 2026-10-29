# T-026: Upload file qua backend (Supabase Storage)

> **Người làm**: Antigravity · **Module**: Media (`backend/src/modules/media/`) · **Nhánh**: `task/T-026-media-upload` (tách từ `refactor/nestjs-backend`)  
> **Phụ thuộc**: — · **Ước lượng**: 4 giờ  
> **Tài liệu tham chiếu**: `AGENTS.md`, `docs/tasks/BRIEFS.md` §T-026, `docs/OPEN_QUESTIONS.md` (#27)

---

## 1. Mục tiêu
Chuyển toàn bộ các lệnh upload file từ client (`supabase.storage.from("materials").upload(...)` và `getPublicUrl(...)`) qua backend NestJS. Backend upload vào bucket `materials` của Supabase Storage sử dụng `SUPABASE_SERVICE_ROLE_KEY`. Cung cấp endpoint cho admin upload file nội dung và endpoint cho học viên upload ảnh đại diện / ảnh bìa.

---

## 2. Phạm vi

### Được tạo / sửa:
**Backend**:
- `backend/src/config/env.schema.ts`: thêm `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_PROVIDER`
- `backend/.env.example`: thêm biến môi trường mẫu
- `render.yaml`: thêm `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (`sync: false`)
- `backend/src/modules/media/storage/storage.interface.ts`: định nghĩa interface `StorageService` và injection token
- `backend/src/modules/media/storage/supabase-storage.service.ts`: implementation gọi Supabase Storage REST API bằng service role key
- `backend/src/modules/media/storage/in-memory-storage.service.ts`: implementation in-memory phục vụ unit/e2e test
- `backend/src/modules/media/dto/upload-media.dto.ts`: DTO cho upload media (folder, filename)
- `backend/src/modules/media/dto/media-response.dto.ts`: DTO trả về `{ path, public_url }`
- `backend/src/modules/media/dto/index.ts`: export DTOs
- `backend/src/modules/media/media.service.ts`: service kiểm tra quyền, validate MIME type, kích thước file, thư mục
- `backend/src/modules/media/media.service.spec.ts`: unit tests cho service
- `backend/src/modules/media/media.controller.ts`: controller với 2 endpoint `POST /upload` và `POST /avatar`
- `backend/src/modules/media/media.module.ts`: module Media
- `backend/src/app.module.ts`: đăng ký `MediaModule`
- `backend/test/media.e2e-spec.ts`: E2E test cho 2 endpoint (kiểm tra phân quyền 401/403/2xx, validate MIME type, file size)

**Frontend**:
- `src/lib/api/media.ts`: client adapter `uploadMedia` và `uploadAvatar`
- `src/lib/api/media.test.ts`: unit tests cho media client API
- 12 components/pages thay thế `supabase.storage`:
  - `src/components/admin/CourseFullTestManager.tsx`
  - `src/components/admin/ImportDialog.tsx`
  - `src/components/admin/LessonManager.tsx`
  - `src/components/admin/QuizManager.tsx`
  - `src/pages/Profile.tsx`
  - `src/pages/admin/AdminCourseDetail.tsx`
  - `src/pages/admin/AdminCourseJsonImport.tsx`
  - `src/pages/admin/AdminCourseNew.tsx`
  - `src/pages/admin/AdminFullTestManager.tsx`
  - `src/pages/admin/AdminFullTestQuestions.tsx`
  - `src/pages/admin/AdminGamesConfig.tsx`
  - `src/pages/admin/AdminMaterials.tsx`

### Cấm sửa:
- Thẻ JSX, class CSS / Tailwind, bố cục giao diện, chuỗi hiển thị, tên state, `queryKey`.
- Không chạm `FullTestExam.tsx`, `FullTestResult.tsx`, `DictationPage.tsx`.

---

## 3. Hành vi cũ cần giữ (nguồn sự thật)

### 3.1 Khảo sát 12 file sử dụng `supabase.storage`
| File | Dòng | Thư mục & Thao tác cũ | Cách xử lý lỗi cũ | Kết quả mong đợi |
|---|---|---|---|---|
| `src/components/admin/CourseFullTestManager.tsx` | 112, 118 | `fulltests/audio/${Date.now()}_${sanitizedName}`. `upload(path, file)`. `getPublicUrl(path)` | Throw `uploadErr`, catch hiển thị toast destructive `err.message` | Cập nhật `audioUrl = urlData.publicUrl` |
| `src/components/admin/ImportDialog.tsx` | 60, 65 | `quiz_media/${Date.now()}_${prefix}${sanitizedName}`. `upload(storagePath, blob)`. `getPublicUrl(storagePath)` | Throw `uploadErr`, catch ghi console log và fallback trả lại `externalUrl` gốc | Trả `urlData.publicUrl`, insert `materials` |
| `src/components/admin/LessonManager.tsx` | 236, 241 | `lesson_pdfs/${Date.now()}_${sanitizedName}`. `upload(path, file, { upsert: true })`. `getPublicUrl(path)` | Kiểm tra `if (uploadErr)` -> toast destructive `uploadErr.message`, return | Cập nhật `pdfUrl = urlData.publicUrl` |
| `src/components/admin/QuizManager.tsx` | 237, 240 | `quiz_media/${Date.now()}_...`. `upload(storagePath, blob)`. `getPublicUrl(storagePath)` | Throw `uploadErr`, catch ghi console log và trả lại `externalUrl` gốc | Trả `urlData.publicUrl`, insert `materials` |
| `src/components/admin/QuizManager.tsx` | 322, 329 | `quiz_media/${Date.now()}_${sanitizedName}`. `upload(path, file, { upsert: true })`. `getPublicUrl(path)` | Kiểm tra `if (uploadErr)` -> toast destructive `uploadErr.message`, return | Cập nhật `qImageUrl` hoặc `qAudioUrl` |
| `src/components/admin/QuizManager.tsx` | 536, 541 | `quiz_audio/${Date.now()}_${sanitizedName}`. `upload(path, file, { upsert: true })`. `getPublicUrl(path)` | Kiểm tra `if (uploadErr)` -> toast destructive `uploadErr.message`, return | Cập nhật `wizardAudioUrl = urlData.publicUrl` |
| `src/pages/Profile.tsx` | 558, 563 | `profiles/${folder}/${fileName}` (`avatars` hoặc `covers`). `upload(filePath, file, { upsert: true, contentType })`. `getPublicUrl(filePath)` | Catch bỏ qua lỗi (`console.warn`) và fallback đọc Base64 data URL | Cập nhật avatar/cover URL cho user profile |
| `src/pages/admin/AdminCourseDetail.tsx` | 122, 125 | `course-thumbnails/${Date.now()}_${sanitizedName}`. `upload(path, file)`. `getPublicUrl(path)` | Throw `uploadErr`, catch toast destructive `error.message` | Cập nhật `thumbnailUrl = urlData.publicUrl` |
| `src/pages/admin/AdminCourseJsonImport.tsx` | 89, 93 | `quiz_media/${Date.now()}_${prefix}_${sanitized}`. `upload(path, blob)`. `getPublicUrl(path)` | `if (error) return externalUrl;` (fallback link cũ) | Trả `urlData.publicUrl` |
| `src/pages/admin/AdminCourseNew.tsx` | 62, 65 | `course-thumbnails/${Date.now()}_${sanitizedName}`. `upload(path, file)`. `getPublicUrl(path)` | Throw `uploadErr`, catch toast destructive `error.message` | Cập nhật form `thumbnail_url = urlData.publicUrl` |
| `src/pages/admin/AdminFullTestManager.tsx` | 415, 417 | `full_test_media/${testId}/part_${type}_${index}_${Date.now()}.${ext}`. `upload(path, blob)`. `getPublicUrl(path)` | Throw `uploadErr`, catch log console và trả về `url` gốc | Trả `publicUrl`, cache media URL |
| `src/pages/admin/AdminFullTestManager.tsx` | 596, 598 | `full_test_media/${selectedTestForImport.id}/...`. `upload(path, blob)`. `getPublicUrl(path)` | Throw `uploadErr`, catch log console và trả về `url` gốc | Trả `publicUrl`, cache media URL |
| `src/pages/admin/AdminFullTestQuestions.tsx` | 189, 195 | `${folder}/${Date.now()}_${sanitizedName}` (`fulltests/audio` hoặc `fulltests/images`). `upload(path, file)`. `getPublicUrl(path)` | Throw `uploadErr`, catch toast destructive `err.message` | Gọi `onSuccess(urlData.publicUrl)` |
| `src/pages/admin/AdminGamesConfig.tsx` | 214, 219 | `game-avatars/${fileName}`. `upload(filePath, file, { upsert: true })`. `getPublicUrl(filePath)` | Nếu lỗi upload -> fallback đọc Base64 FileReader | Cập nhật `avatar_url` cho game |
| `src/pages/admin/AdminMaterials.tsx` | 134, 140 | `uploads/${Date.now()}_${i}_${sanitizedName}`. `upload(path, file)`. `getPublicUrl(path)` | Kiểm tra `if (uploadErr)` -> toast destructive `uploadErr.message`, continue | Insert bảng `materials` với `file_url = urlData.publicUrl` |

### 3.2 RLS Policies trong Supabase cũ
- `supabase/migrations/20260329141747_3017db4a-6d94-4787-bcc1-328c5cd706ff.sql`:
  - `Materials publicly accessible`: `SELECT` công khai cho bucket `'materials'`.
  - `Admins upload materials`: `INSERT` kiểm tra `public.has_role(auth.uid(), 'admin')`.
  - `Admins delete materials`: `DELETE` kiểm tra `public.has_role(auth.uid(), 'admin')`.
- `supabase/migrations/20260614_fix_admin_policies.sql`:
  - `Admins update materials`: `UPDATE` kiểm tra `public.has_role(auth.uid(), 'admin')`.

---

## 4. Đặc tả

### 4.1 Interface `StorageService`
Đúng luật "Interface chỉ khi có từ 2 implementation thật":
```ts
export interface StorageService {
  upload(options: {
    bucket: string;
    path: string;
    buffer: Buffer;
    contentType: string;
    upsert?: boolean;
  }): Promise<{ path: string; publicUrl: string }>;

  getPublicUrl(bucket: string, path: string): string;
}
```
Hai implementation:
1. `SupabaseStorageService`: Gửi HTTP `POST` đến `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}` kèm header `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}` và `x-upsert: true`.
2. `InMemoryStorageService`: Lưu file trong bộ nhớ (`Map`), trả URL dạng `http://storage.local/${bucket}/${path}`, dùng khi chạy test hoặc khi không có service key.

### 4.2 Endpoint 1: `POST /api/v1/media/upload`
- **Mục đích**: Admin tải lên file media nội dung (bài học, đề thi, quiz, thumbnails, v.v.).
- **Quyền**: `JwtAuthGuard`, `RolesGuard`, `@Roles('admin')`.
- **Content-Type**: `multipart/form-data`.
- **Form Data**:
  - `file`: File upload (tối đa 50MB). Bắt buộc.
  - `folder`: Chuỗi thư mục. Whitelist:
    - `lesson_pdfs`
    - `quiz_media`
    - `quiz_audio`
    - `fulltests/audio`
    - `fulltests/images`
    - `full_test_media`
    - `course-thumbnails`
    - `game-avatars`
    - `uploads`
    - `materials`
  - `filename`: Chuỗi tên file tùy chọn (nếu có, server sanitize giữ an toàn). Nếu không truyền: server tự tạo `${Date.now()}_${sanitizedName}`.
- **Validation**:
  - Thiếu file -> 400 `FILE_REQUIRED`
  - Folder không hợp lệ -> 400 `INVALID_FOLDER`
  - File size > 50MB -> 400 `FILE_TOO_LARGE`
- **Trả về (201)**:
  ```json
  {
    "path": "lesson_pdfs/1730000000_sanitized.pdf",
    "public_url": "https://.../storage/v1/object/public/materials/lesson_pdfs/1730000000_sanitized.pdf"
  }
  ```

### 4.3 Endpoint 2: `POST /api/v1/media/avatar`
- **Mục đích**: Học viên tải lên ảnh đại diện hoặc ảnh bìa cá nhân.
- **Quyền**: `JwtAuthGuard` (bất kỳ học viên nào đã đăng nhập).
- **Content-Type**: `multipart/form-data`.
- **Form Data**:
  - `file`: File ảnh. Bắt buộc.
  - `folder`: Tùy chọn (`avatars` hoặc `covers`, mặc định `avatars`).
- **Validation**:
  - Thiếu file -> 400 `FILE_REQUIRED`
  - MIME type không phải image (`image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/svg+xml`) -> 400 `INVALID_FILE_TYPE`
  - File size > 5MB -> 400 `FILE_TOO_LARGE`
- **Tên và đường dẫn**:
  - Do server tạo theo ID của user: `profiles/${folder}/${user.id}-${Date.now()}-${random}.${ext}`.
- **Trả về (201)**:
  ```json
  {
    "path": "profiles/avatars/user-id-1730000000-abc12.png",
    "public_url": "https://.../storage/v1/object/public/materials/profiles/avatars/user-id-1730000000-abc12.png"
  }
  ```

### 4.4 Adapter Frontend: `src/lib/api/media.ts`
- Cung cấp 2 hàm:
  - `uploadMedia(file: File | Blob, folder: string, filename?: string): Promise<{ path: string; publicUrl: string }>`: gọi `POST /api/v1/media/upload`.
  - `uploadAvatar(file: File | Blob, folder?: 'avatars' | 'covers'): Promise<{ path: string; publicUrl: string }>`: gọi `POST /api/v1/media/avatar`.
- Dùng `apiClient.postForm(...)` hoặc `fetch` có token để gửi multipart.

---

## 5. Tiêu chí nghiệm thu
- [x] Interface `StorageService` có 2 implementation (`SupabaseStorageService` và `InMemoryStorageService`)
- [x] E2E phân quyền cho mọi route media:
  - `POST /api/v1/media/upload`: 401 khi chưa login, 403 khi là student, 201 khi là admin
  - `POST /api/v1/media/avatar`: 401 khi chưa login, 201 khi là student/admin
  - Chặn file quá dung lượng (400 `FILE_TOO_LARGE`)
  - Chặn MIME type không hợp lệ ở avatar (400 `INVALID_FILE_TYPE`)
  - Chặn folder không nằm trong whitelist ở admin upload (400 `INVALID_FOLDER`)
- [x] Unit tests service & adapter test đầy đủ
- [x] `git grep -n "supabase.storage" src` **rỗng** (0 kết quả)
- [x] Không đổi bất kỳ thẻ JSX, className, bố cục hay câu chữ giao diện nào; `check-ui-diff` OK
- [x] Backend lint, typecheck, unit test, e2e test, build pass 100%
- [x] Frontend vitest test, build pass 100%

---

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
git grep -n "supabase.storage" src/
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

---

## 7. Kết quả (người làm điền)
- Commit(s):
  - `b72a89d docs(tasks): spec T-026 media upload`
  - `358721a feat(media): backend upload endpoints and frontend adapter (T-026)`
  - `3fe41d3 fix(media): preserve error handling toasts in admin components`
- File đã sửa:
  - `backend/.env.example`
  - `backend/src/app.module.ts`
  - `backend/src/config/env.schema.spec.ts`
  - `backend/src/config/env.schema.ts`
  - `backend/src/modules/media/dto/index.ts`
  - `backend/src/modules/media/dto/media-response.dto.ts`
  - `backend/src/modules/media/dto/upload-media.dto.ts`
  - `backend/src/modules/media/media.controller.ts`
  - `backend/src/modules/media/media.module.ts`
  - `backend/src/modules/media/media.service.spec.ts`
  - `backend/src/modules/media/media.service.ts`
  - `backend/src/modules/media/storage/in-memory-storage.service.ts`
  - `backend/src/modules/media/storage/storage.interface.ts`
  - `backend/src/modules/media/storage/supabase-storage.service.ts`
  - `backend/test/media.e2e-spec.ts`
  - `docs/tasks/T-026-media-upload.md`
  - `render.yaml`
  - `src/components/admin/CourseFullTestManager.tsx`
  - `src/components/admin/ImportDialog.tsx`
  - `src/components/admin/LessonManager.tsx`
  - `src/components/admin/QuizManager.tsx`
  - `src/lib/api/media.test.ts`
  - `src/lib/api/media.ts`
  - `src/pages/Profile.tsx`
  - `src/pages/admin/AdminCourseDetail.tsx`
  - `src/pages/admin/AdminCourseJsonImport.tsx`
  - `src/pages/admin/AdminCourseNew.tsx`
  - `src/pages/admin/AdminFullTestManager.tsx`
  - `src/pages/admin/AdminFullTestQuestions.tsx`
  - `src/pages/admin/AdminGamesConfig.tsx`
  - `src/pages/admin/AdminMaterials.tsx`
- Output lệnh kiểm tra:
```
$ docker compose up -d postgres
 Container l-english-academy-postgres-1  Running

$ npm --prefix backend run lint; npm --prefix backend run typecheck
> backend@0.0.1 lint
> eslint "{src,test}/**/*.ts"

> backend@0.0.1 typecheck
> tsc --noEmit -p tsconfig.json

$ npm --prefix backend test
> backend@0.0.1 test
> node --experimental-vm-modules node_modules/jest/bin/jest.js

PASS src/common/filters/all-exceptions.filter.spec.ts
PASS src/modules/catalog/catalog.mapper.spec.ts
PASS src/modules/auth/guards/optional-jwt-auth.guard.spec.ts
PASS src/modules/auth/guards/jwt-auth.guard.spec.ts
PASS src/modules/catalog/catalog-admin.service.spec.ts
PASS src/mail/gmail-api.transport.spec.ts
PASS src/modules/learning/learning-quiz-access.spec.ts
PASS src/modules/learning/learning.mapper.spec.ts
PASS src/modules/assessment/assessment-admin.service.spec.ts
PASS src/modules/payments/payment-rules.spec.ts
PASS src/modules/assessment/assessment.service.spec.ts
PASS src/modules/assessment/vocab.service.spec.ts
PASS src/modules/admin/admin.service.spec.ts
PASS src/common/transforms/to-optional-boolean.spec.ts
PASS src/config/env.schema.spec.ts
PASS src/modules/auth/auth.mapper.spec.ts
PASS src/modules/assessment/toeic-scoring.spec.ts
PASS src/modules/learning/lesson-access.spec.ts
PASS src/modules/payments/payments.service.spec.ts
PASS src/modules/assessment/quiz-grading.spec.ts
PASS src/modules/catalog/catalog.service.spec.ts
PASS src/modules/learning/learning-admin.service.spec.ts
PASS src/modules/learning/learning.service.spec.ts
PASS src/modules/media/media.service.spec.ts

Test Suites: 24 passed, 24 total
Tests:       296 passed, 296 total
Snapshots:   0 total
Time:        4.06 s
Ran all test suites.

$ npm --prefix backend run test:e2e
> backend@0.0.1 test:e2e
> node --experimental-vm-modules node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand

PASS test/auth.e2e-spec.ts (6.225 s)
PASS test/learning-admin.e2e-spec.ts
PASS test/assessment-admin.e2e-spec.ts
PASS test/assessment-full-test.e2e-spec.ts
PASS test/assessment-quiz.e2e-spec.ts
PASS test/admin-stats.e2e-spec.ts
PASS test/assessment-admin-fulltest.e2e-spec.ts
PASS test/catalog-admin.e2e-spec.ts
PASS test/learning-user-data.e2e-spec.ts
PASS test/assessment-vocab.e2e-spec.ts
PASS test/learning-access.e2e-spec.ts
PASS test/assessment-full-test-lists.e2e-spec.ts
PASS test/payments.e2e-spec.ts
PASS test/platform-settings.e2e-spec.ts
PASS test/catalog-admin-courses.e2e-spec.ts
PASS test/admin-notes.e2e-spec.ts
PASS test/media.e2e-spec.ts
PASS test/payments-admin.e2e-spec.ts
PASS test/catalog.e2e-spec.ts
PASS test/assessment-results.e2e-spec.ts
PASS test/health.e2e-spec.ts

Test Suites: 21 passed, 21 total
Tests:       337 passed, 337 total
Snapshots:   0 total
Time:        32.186 s, estimated 34 s
Ran all test suites.

$ npm --prefix backend run build
> backend@0.0.1 build
> nest build

$ npm test
> vite_react_shadcn_ts@0.0.0 test
> vitest run

 Test Files  14 passed (14)
      Tests  191 passed (191)
   Start at  11:50:23
   Duration  7.00s (transform 1.31s, setup 5.12s, collect 5.08s, tests 919ms, environment 48.44s, prepare 4.00s)

$ npm run build
> vite_react_shadcn_ts@0.0.0 build
> vite build

vite v5.4.19 building for production...
transforming...
✓ 2739 modules transformed.
rendering chunks...
computing gzip size...
✓ built in 10.46s

$ node scripts/check-ui-diff.mjs refactor/nestjs-backend
check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).

$ git grep -n "supabase.storage" src/
(0 matches - exit code 1)

$ git log --oneline -3 && git diff --stat refactor/nestjs-backend
3fe41d3 fix(media): preserve error handling toasts in admin components
358721a feat(media): backend upload endpoints and frontend adapter (T-026)
b72a89d docs(tasks): spec T-026 media upload
 backend/.env.example                               |   7 +
 backend/src/app.module.ts                          |   2 +
 backend/src/config/env.schema.spec.ts              |  14 ++
 backend/src/config/env.schema.ts                   |  16 ++
 backend/src/modules/media/dto/index.ts             |   3 +
 .../src/modules/media/dto/media-response.dto.ts    |  16 ++
 backend/src/modules/media/dto/upload-media.dto.ts  |  46 +++++
 backend/src/modules/media/media.controller.ts      | 129 ++++++++++++
 backend/src/modules/media/media.module.ts          |  42 ++++
 backend/src/modules/media/media.service.spec.ts    | 165 ++++++++++++++++
 backend/src/modules/media/media.service.ts         | 142 ++++++++++++++
 .../media/storage/in-memory-storage.service.ts     |  53 +++++
 .../src/modules/media/storage/storage.interface.ts |  20 ++
 .../media/storage/supabase-storage.service.ts      |  53 +++++
 backend/test/media.e2e-spec.ts                     | 216 +++++++++++++++++++++
 docs/tasks/T-026-media-upload.md                   | 209 ++++++++++++++++++++
 render.yaml                                        |   5 +
 src/components/admin/CourseFullTestManager.tsx     |  16 +-
 src/components/admin/ImportDialog.tsx              |  22 +--
 src/components/admin/LessonManager.tsx             |   8 +-
 src/components/admin/QuizManager.tsx               |  33 ++--
 src/lib/api/media.test.ts                          | 103 ++++++++++
 src/lib/api/media.ts                               |  82 ++++++++
 src/pages/Profile.tsx                              |  17 +-
 src/pages/admin/AdminCourseDetail.tsx              |  11 +-
 src/pages/admin/AdminCourseJsonImport.tsx          |  16 +-
 src/pages/admin/AdminCourseNew.tsx                 |  11 +-
 src/pages/admin/AdminFullTestManager.tsx           |  21 +-
 src/pages/admin/AdminFullTestQuestions.tsx         |  16 +-
 src/pages/admin/AdminGamesConfig.tsx               |   7 +-
 src/pages/admin/AdminMaterials.tsx                 |   9 +-
 31 files changed, 1392 insertions(+), 118 deletions(-)
```
- Chỗ chưa chắc: Không có

---

## 8. Câu hỏi (người làm điền khi bị chặn)
Không có.

---

## 9. Review (Claude điền)

