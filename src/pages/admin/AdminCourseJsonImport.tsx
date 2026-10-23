import { useRef, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle, Loader2 } from "lucide-react";

// ── Map crawled part number → question_type used in DB ──
const PART_TYPE_MAP: Record<number, string> = {
  1: "part1",
  2: "part2",
  3: "part3",
  4: "part4",
  5: "part5",
  6: "part6",
  7: "part7",
};

type LogLine = { type: "info" | "ok" | "warn" | "error"; text: string };

const AdminCourseJsonImport = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [courseId, setCourseId] = useState("");
  const [jsonData, setJsonData] = useState<any>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [done, setDone] = useState(false);

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-courses-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title")
        .order("title");
      return data ?? [];
    },
  });

  const log = (type: LogLine["type"], text: string) =>
    setLogs((prev) => [...prev, { type, text }]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setDone(false);
    setLogs([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        setJsonData(parsed);
      } catch {
        toast({ title: "File JSON không hợp lệ", variant: "destructive" });
        setJsonData(null);
      }
    };
    reader.readAsText(file);
  };

  // ── Media upload helper ──────────────────────────────────
  const uploadMedia = async (
    externalUrl: string,
    type: "audio" | "image",
    prefix: string
  ): Promise<string | null> => {
    if (!externalUrl?.trim()) return null;
    if (
      externalUrl.includes("supabase.co") ||
      externalUrl.includes("/storage/v1/object/public/materials")
    )
      return externalUrl;

    try {
      const res = await fetch(externalUrl);
      if (!res.ok) return externalUrl;
      const blob = await res.blob();
      const rawName =
        externalUrl.split("/").pop()?.split("?")[0] || `${type}_${Date.now()}`;
      const sanitized = rawName.replace(/[^a-zA-Z0-9.\-_]/g, "");
      const path = `quiz_media/${Date.now()}_${prefix}_${sanitized}`;
      const { error } = await supabase.storage
        .from("materials")
        .upload(path, blob);
      if (error) return externalUrl;
      const { data: urlData } = supabase.storage
        .from("materials")
        .getPublicUrl(path);
      return urlData.publicUrl;
    } catch {
      return externalUrl;
    }
  };

  // ── Main import logic ────────────────────────────────────
  const handleImport = async () => {
    if (!courseId) {
      toast({ title: "Chưa chọn khóa học", variant: "destructive" });
      return;
    }
    if (!jsonData) {
      toast({ title: "Chưa có file JSON", variant: "destructive" });
      return;
    }

    const exams: any[] = jsonData.exams ?? [];
    if (!exams.length) {
      toast({ title: "File JSON không có exam nào", variant: "destructive" });
      return;
    }

    setImporting(true);
    setDone(false);
    setLogs([]);

    const cid = Number(courseId);
    const partTitle: string = jsonData.course_title ?? "Part mới";

    try {
      // 1. Tạo Module (Part)
      log("info", `Tạo module: "${partTitle}"...`);
      const { data: existingModules } = await supabase
        .from("modules")
        .select("display_order")
        .eq("course_id", cid)
        .order("display_order", { ascending: false })
        .limit(1);
      const nextOrder = (existingModules?.[0]?.display_order ?? -1) + 1;

      const { data: mod, error: modErr } = await supabase
        .from("modules")
        .insert({
          course_id: cid,
          title: partTitle,
          display_order: nextOrder,
        })
        .select("id")
        .single();
      if (modErr) throw new Error(`Lỗi tạo module: ${modErr.message}`);
      log("ok", `✅ Module tạo xong (id=${mod.id})`);

      // 2. Loop qua từng exam
      for (let ei = 0; ei < exams.length; ei++) {
        const exam = exams[ei];
        const examTitle: string = exam.exam_title ?? `Đề ${ei + 1}`;
        const questions: any[] = exam.questions ?? [];

        log("info", `  [${ei + 1}/${exams.length}] Quiz: "${examTitle}" (${questions.length} câu)`);

        if (!questions.length) {
          log("warn", `    ⚠️ Không có câu hỏi. Bỏ qua.`);
          continue;
        }

        // Tìm audio_url: ưu tiên exam-level, sau đó lấy từ câu hỏi đầu tiên có audio
        const examAudioUrl: string | null =
          exam.audio_url ||
          questions.find((q: any) => q.audio_url)?.audio_url ||
          null;

        // 2a. Tạo Quiz
        const { data: quiz, error: quizErr } = await supabase
          .from("quizzes")
          .insert({
            module_id: mod.id,
            title: examTitle,
            total_questions: questions.length,
            display_order: ei,
            audio_url: examAudioUrl,
          } as any)
          .select("id")
          .single();
        if (quizErr) {
          log("warn", `    ⚠️ Lỗi tạo quiz: ${quizErr.message}. Bỏ qua.`);
          continue;
        }

        // 2b. Tạo Lesson (exam type) liên kết với quiz — cần thiết để hiển thị trên LearnPage
        const { error: lessonErr } = await supabase
          .from("lessons")
          .insert({
            module_id: mod.id,
            title: examTitle,
            lesson_type: "exam",
            quiz_id: quiz.id,
            display_order: ei,
          } as any);
        if (lessonErr) {
          log("warn", `    ⚠️ Lỗi tạo lesson: ${lessonErr.message}`);
        }

        // 2b. Upload media + build questions payload
        const questionsPayload: any[] = [];
        const answersPayload: any[] = [];

        for (let qi = 0; qi < questions.length; qi++) {
          const q = questions[qi];
          const prefix = `e${ei + 1}_q${qi + 1}`;
          const qType = PART_TYPE_MAP[q.part] ?? "multiple_choice";

          // Build question_text: embed passage for part 6/7
          let questionText: string = q.question_text ?? "";
          if (q.passage_text && (q.part === 6 || q.part === 7)) {
            // Only embed passage on first question of the group (or always, dedup on read)
            questionText = `[PASSAGE]${q.passage_text}[ENDPASSAGE]${questionText}`;
          }

          const audioUrl = await uploadMedia(q.audio_url, "audio", prefix);
          const imageUrl = await uploadMedia(q.image_url, "image", prefix);

          questionsPayload.push({
            quiz_id: quiz.id,
            question_text: questionText,
            question_type: qType,
            display_order: qi,
            translation: q.translation ?? null,
            audio_url: audioUrl ?? null,
            image_url: imageUrl ?? null,
            transcript: q.transcript ?? null,
            group_id: q.group_id ?? null,
          });
        }

        // 2c. Batch insert questions
        const { data: insertedQs, error: qErr } = await supabase
          .from("questions")
          .insert(questionsPayload)
          .select("id");
        if (qErr) {
          log("warn", `    ⚠️ Lỗi insert câu hỏi: ${qErr.message}`);
          continue;
        }

        // 2d. Build answers payload
        for (let qi = 0; qi < questions.length; qi++) {
          const q = questions[qi];
          const qId = insertedQs![qi].id;
          const answers: any[] = q.answers ?? [];
          for (const a of answers) {
            answersPayload.push({
              question_id: qId,
              answer_text: a.answer_text ?? "",
              is_correct: a.is_correct ?? false,
              explanation: a.explanation ?? null,
              display_order: a.display_order ?? 0,
            });
          }
        }

        // 2e. Batch insert answers
        if (answersPayload.length > 0) {
          const { error: aErr } = await supabase
            .from("answers")
            .insert(answersPayload);
          if (aErr) log("warn", `    ⚠️ Lỗi insert đáp án: ${aErr.message}`);
        }

        // 2f. Update quiz total
        await supabase
          .from("quizzes")
          .update({ total_questions: insertedQs!.length } as any)
          .eq("id", quiz.id);

        log("ok", `    ✅ Done: ${insertedQs!.length} câu, ${answersPayload.length} đáp án`);
      }

      log("ok", `🎉 Import hoàn tất! ${exams.length} bài thi đã được tạo trong module "${partTitle}".`);
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", cid] });
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      setDone(true);
      toast({ title: "Import thành công!" });
    } catch (err: any) {
      log("error", `❌ Lỗi: ${err.message}`);
      toast({ title: "Import thất bại", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const preview = jsonData
    ? `${jsonData.course_title ?? "?"} — ${jsonData.exams?.length ?? 0} bài thi, ~${
        jsonData.exams?.reduce((s: number, e: any) => s + (e.questions?.length ?? 0), 0) ?? 0
      } câu hỏi`
    : null;

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import Part (Nghe - Đọc)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Import file JSON từ crawler để tạo Module + Bài thi cho khóa Luyện nghe - đọc.
          </p>
        </div>

        {/* Step 1: Chọn khóa học */}
        <div className="bg-card rounded-2xl border border-border/70 p-6 space-y-3 shadow-soft-sm">
          <h2 className="font-black text-base text-foreground">1. Chọn khóa học target</h2>
          <div className="space-y-2">
            <Label className="font-bold">Khóa học</Label>
            <select
              className="w-full border border-border/80 rounded-xl px-4 py-2.5 text-base sm:text-sm bg-background text-foreground font-medium shadow-soft-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">— Chọn khóa học —</option>
              {courses.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 2: Upload JSON */}
        <div className="bg-card rounded-2xl border border-border/70 p-6 space-y-3 shadow-soft-sm">
          <h2 className="font-black text-base text-foreground">2. Upload file JSON (toeic_cap_toc_part_X.json)</h2>
          <div
            className="border border-dashed border-border/80 rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 shadow-soft-xs hover:shadow-soft-sm transition-all bg-card/50"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-semibold text-foreground">
              {fileName ? (
                <span className="text-primary font-bold">{fileName}</span>
              ) : (
                "Click để chọn file JSON hoặc kéo thả vào đây"
              )}
            </p>
            {preview && (
              <p className="text-xs text-primary mt-2 font-bold bg-primary/10 py-1 px-3 rounded-lg inline-block">{preview}</p>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFile}
            className="hidden"
          />
        </div>

        {/* Step 3: Import */}
        <Button
          className="w-full btn-3d-green font-black rounded-xl py-6 text-base active:scale-95 duration-120 shadow-soft-md"
          disabled={importing || !courseId || !jsonData}
          onClick={handleImport}
        >
          {importing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Đang import...
            </>
          ) : (
            "🚀 Bắt đầu Import Dữ Liệu"
          )}
        </Button>

        {/* Logs */}
        {logs.length > 0 && (
          <div className="bg-muted/40 rounded-2xl border border-border/70 p-4 space-y-1.5 max-h-80 overflow-y-auto font-mono text-xs shadow-soft-xs">
            {logs.map((l, i) => (
              <div
                key={i}
                className={
                  l.type === "ok"
                    ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                    : l.type === "warn"
                    ? "text-amber-600 dark:text-amber-400 font-semibold"
                    : l.type === "error"
                    ? "text-destructive font-bold"
                    : "text-foreground"
                }
              >
                {l.text}
              </div>
            ))}
            {done && (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mt-2 pt-2 border-t border-border/60">
                <CheckCircle className="w-4 h-4" />
                <span className="font-black">Import hoàn tất thành công!</span>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCourseJsonImport;
