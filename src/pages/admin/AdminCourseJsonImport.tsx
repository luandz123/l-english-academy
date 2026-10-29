import { useRef, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { importCourseJson, listAdminCourses } from "@/lib/api/catalog";
import { uploadMedia as uploadMediaFile } from "@/lib/api/media";
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
      const { data, error } = await listAdminCourses();
      if (error) throw error;
      return (data ?? []).map((c) => ({ id: c.id, title: c.title }));
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
      const { publicUrl } = await uploadMediaFile(
        blob,
        "quiz_media",
        `${Date.now()}_${prefix}_${sanitized}`,
      );
      return publicUrl;
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
      log("info", `Bắt đầu xử lý media cho ${exams.length} bài thi...`);
      const preparedExams: any[] = [];
      for (let ei = 0; ei < exams.length; ei++) {
        const exam = exams[ei];
        const examTitle: string = exam.exam_title ?? `Đề ${ei + 1}`;
        const questions: any[] = exam.questions ?? [];

        log("info", `  [${ei + 1}/${exams.length}] Xử lý: "${examTitle}" (${questions.length} câu)`);

        if (!questions.length) {
          log("warn", `    ⚠️ Không có câu hỏi. Bỏ qua.`);
          continue;
        }

        const preparedQuestions: any[] = [];
        for (let qi = 0; qi < questions.length; qi++) {
          const q = questions[qi];
          const prefix = `e${ei + 1}_q${qi + 1}`;
          const audioUrl = await uploadMedia(q.audio_url, "audio", prefix);
          const imageUrl = await uploadMedia(q.image_url, "image", prefix);

          preparedQuestions.push({
            ...q,
            audio_url: audioUrl,
            image_url: imageUrl,
          });
        }

        preparedExams.push({
          ...exam,
          exam_title: examTitle,
          questions: preparedQuestions,
        });
      }

      log("info", `Đang gửi toàn bộ dữ liệu lên máy chủ để tạo module và bài thi trong 1 transaction...`);
      const { data: result, error: importErr } = await importCourseJson(cid, {
        course_title: partTitle,
        exams: preparedExams,
      });
      if (importErr) throw new Error(importErr.message);

      log("ok", `🎉 Import hoàn tất! ${result?.exams_count ?? preparedExams.length} bài thi đã được tạo trong module "${partTitle}".`);
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
