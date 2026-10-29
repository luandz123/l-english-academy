import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // SECURITY GUARD: Vô hiệu hóa mặc định để bảo vệ hệ thống khỏi tạo/ghi đè tài khoản không an toàn
  const allowCreation = Deno.env.get("ALLOW_TEST_ACCOUNT_CREATION") === "true";
  if (!allowCreation) {
    return new Response(
      JSON.stringify({
        error: "Forbidden",
        message: "Endpoint create-test-accounts đã bị vô hiệu hóa vì lý do an toàn bảo mật.",
      }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: string[] = [];

  // Helper: create or get user
  const getOrCreateUser = async (email: string, password: string, fullName: string) => {
    // Try to get existing user by email
    const { data: users } = await supabase.auth.admin.listUsers();
    const existing = users?.users?.find((u: any) => u.email === email);
    if (existing) return { user: existing, isNew: false };

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) throw error;
    return { user: data.user, isNew: true };
  };

  try {
    // === ADMIN ACCOUNT ===
    const { user: adminUser, isNew: adminNew } = await getOrCreateUser(
      "admin@lenglish.vn", "Admin@123456", "Admin L-English"
    );
    // Set admin role (update existing student role to admin)
    await supabase.from("user_roles").upsert(
      { user_id: adminUser.id, role: "admin" },
      { onConflict: "user_id" }
    );
    results.push(adminNew
      ? `✅ Admin created: admin@lenglish.vn / Admin@123456`
      : `ℹ️ Admin exists: admin@lenglish.vn / Admin@123456`
    );

    // === STUDENT ACCOUNT ===
    const { user: studentUser, isNew: studentNew } = await getOrCreateUser(
      "student@lenglish.vn", "Student@123456", "Nguyễn Văn Học Viên"
    );
    const studentId = studentUser.id;

    if (studentNew) {
      // Enroll in courses 1, 2, 5
      await supabase.from("enrollments").insert([
        { user_id: studentId, course_id: 1, expires_at: new Date(Date.now() + 180 * 86400000).toISOString() },
        { user_id: studentId, course_id: 2, expires_at: new Date(Date.now() + 180 * 86400000).toISOString() },
        { user_id: studentId, course_id: 5, expires_at: new Date(Date.now() + 180 * 86400000).toISOString() },
      ]);

      // Lesson progress
      await supabase.from("user_lesson_progress").insert([
        { user_id: studentId, lesson_id: 1, is_completed: true, watch_duration_seconds: 720 },
        { user_id: studentId, lesson_id: 2, is_completed: true, watch_duration_seconds: 650 },
        { user_id: studentId, lesson_id: 3, is_completed: false, watch_duration_seconds: 300 },
        { user_id: studentId, lesson_id: 6, is_completed: true, watch_duration_seconds: 800 },
        { user_id: studentId, lesson_id: 7, is_completed: true, watch_duration_seconds: 900 },
      ]);

      // Quiz results
      await supabase.from("user_quiz_results").insert([
        { user_id: studentId, quiz_id: 1, correct_answers: 8, total_questions: 10, score: 80, time_spent_seconds: 420 },
        { user_id: studentId, quiz_id: 2, correct_answers: 7, total_questions: 10, score: 70, time_spent_seconds: 380 },
        { user_id: studentId, quiz_id: 4, correct_answers: 9, total_questions: 10, score: 90, time_spent_seconds: 350 },
        { user_id: studentId, quiz_id: 7, correct_answers: 6, total_questions: 10, score: 60, time_spent_seconds: 500 },
        { user_id: studentId, quiz_id: 11, correct_answers: 8, total_questions: 10, score: 80, time_spent_seconds: 300 },
      ]);

      // Favorites & notes
      await supabase.from("user_favorites").insert([
        { user_id: studentId, lesson_id: 1 },
        { user_id: studentId, lesson_id: 7 },
      ]);
      await supabase.from("user_notes").insert([
        { user_id: studentId, lesson_id: 1, content: "Part 1: Luôn có 6 câu, mỗi câu 1 ảnh, 4 đáp án. Lắng nghe kỹ mô tả hành động." },
        { user_id: studentId, lesson_id: 6, content: "Part 2: Nghe Wh-questions → loại trừ đáp án không liên quan." },
      ]);

      // Full test results  
      await supabase.from("user_full_test_results").insert([
        { user_id: studentId, test_id: 1, total_score: 650, listening_score: 330, reading_score: 320, correct_answers: 142, time_spent_seconds: 6800 },
        { user_id: studentId, test_id: 3, total_score: 720, listening_score: 370, reading_score: 350, correct_answers: 158, time_spent_seconds: 7000 },
      ]);
    }
    results.push(studentNew
      ? `✅ Student created: student@lenglish.vn / Student@123456`
      : `ℹ️ Student exists: student@lenglish.vn / Student@123456`
    );

  } catch (e: any) {
    results.push(`❌ Error: ${e.message}`);
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
