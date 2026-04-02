import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: string[] = [];

  // Create admin account
  const { data: adminData, error: adminErr } = await supabase.auth.admin.createUser({
    email: "admin@lenglish.vn",
    password: "Admin@123456",
    email_confirm: true,
    user_metadata: { full_name: "Admin L-English" },
  });
  if (adminErr) {
    results.push(`Admin: ${adminErr.message}`);
  } else {
    // Set admin role
    await supabase.from("user_roles").update({ role: "admin" }).eq("user_id", adminData.user.id);
    results.push(`Admin created: admin@lenglish.vn / Admin@123456`);
  }

  // Create student account
  const { data: studentData, error: studentErr } = await supabase.auth.admin.createUser({
    email: "student@lenglish.vn",
    password: "Student@123456",
    email_confirm: true,
    user_metadata: { full_name: "Nguyễn Văn Học Viên" },
  });
  if (studentErr) {
    results.push(`Student: ${studentErr.message}`);
  } else {
    // Enroll in courses
    const studentId = studentData.user.id;
    await supabase.from("enrollments").insert([
      { user_id: studentId, course_id: 1, expires_at: new Date(Date.now() + 180 * 86400000).toISOString() },
      { user_id: studentId, course_id: 2, expires_at: new Date(Date.now() + 180 * 86400000).toISOString() },
      { user_id: studentId, course_id: 5, expires_at: new Date(Date.now() + 180 * 86400000).toISOString() },
    ]);

    // Add some lesson progress
    await supabase.from("user_lesson_progress").insert([
      { user_id: studentId, lesson_id: 1, is_completed: true, watch_duration_seconds: 720 },
      { user_id: studentId, lesson_id: 2, is_completed: true, watch_duration_seconds: 650 },
      { user_id: studentId, lesson_id: 3, is_completed: false, watch_duration_seconds: 300 },
      { user_id: studentId, lesson_id: 6, is_completed: true, watch_duration_seconds: 800 },
      { user_id: studentId, lesson_id: 7, is_completed: true, watch_duration_seconds: 900 },
    ]);

    // Add quiz results
    await supabase.from("user_quiz_results").insert([
      { user_id: studentId, quiz_id: 1, correct_answers: 8, total_questions: 10, score: 80, time_spent_seconds: 420 },
      { user_id: studentId, quiz_id: 2, correct_answers: 7, total_questions: 10, score: 70, time_spent_seconds: 380 },
      { user_id: studentId, quiz_id: 4, correct_answers: 9, total_questions: 10, score: 90, time_spent_seconds: 350 },
    ]);

    // Add some favorites and notes
    await supabase.from("user_favorites").insert([
      { user_id: studentId, lesson_id: 1 },
      { user_id: studentId, lesson_id: 7 },
    ]);
    await supabase.from("user_notes").insert([
      { user_id: studentId, lesson_id: 1, content: "Cần nhớ: Part 1 luôn có 6 câu, mỗi câu 1 ảnh, 4 đáp án. Lắng nghe kỹ mô tả hành động của người trong ảnh." },
      { user_id: studentId, lesson_id: 6, content: "Part 2: Nghe câu hỏi Wh- (Who, What, Where, When, Why, How) → loại trừ đáp án không liên quan." },
    ]);

    results.push(`Student created: student@lenglish.vn / Student@123456`);
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
