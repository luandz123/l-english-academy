import AdminLayout from "@/components/AdminLayout";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Edit2, FileDown, UploadCloud, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const AdminFullTestManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [editingTest, setEditingTest] = useState<any>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [courseId, setCourseId] = useState("");

  // JSON Import States
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedTestForImport, setSelectedTestForImport] = useState<any>(null);
  const [importJson, setImportJson] = useState("");
  const [importProgress, setImportProgress] = useState(0);
  const [importStatusText, setImportStatusText] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Fetch Full Tests
  const { data: fullTests = [], isLoading: loadingTests } = useQuery({
    queryKey: ["admin-fulltests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("full_tests")
        .select(`
          *,
          courses (title),
          full_test_sections (
            id,
            part_number,
            quiz_id,
            quizzes (
              total_questions
            )
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch Courses (Fetch all courses so admin can choose any course)
  const { data: courses = [] } = useQuery({
    queryKey: ["admin-fulltest-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, course_type");
      if (error) throw error;
      return data || [];
    },
  });

  // Create / Update Test Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !courseId) {
        throw new Error("Vui lòng điền đầy đủ Tên đề thi và chọn Khóa học liên kết.");
      }

      const payload = {
        title,
        description: description || null,
        audio_url: audioUrl || null,
        course_id: Number(courseId),
      };

      if (editingTest) {
        // Update
        const { error } = await supabase
          .from("full_tests")
          .update(payload)
          .eq("id", editingTest.id);
        if (error) throw error;
      } else {
        // Create
        const { data: newTest, error: createError } = await supabase
          .from("full_tests")
          .insert(payload)
          .select("id")
          .single();

        if (createError) throw createError;

        // Auto create 7 sections for 7 Parts of TOEIC
        const sectionsToInsert = [];
        for (let part = 1; part <= 7; part++) {
          // Create quiz for this part
          const { data: newQuiz, error: quizError } = await supabase
            .from("quizzes")
            .insert({
              title: `Part ${part} - ${title}`,
              description: `Phần thi Part ${part} của ${title}`,
              total_questions: 0,
              display_order: part,
            })
            .select("id")
            .single();

          if (quizError) throw quizError;

          sectionsToInsert.push({
            test_id: newTest.id,
            part_number: part,
            quiz_id: newQuiz.id,
            display_order: part,
          });
        }

        const { error: sectionError } = await supabase
          .from("full_test_sections")
          .insert(sectionsToInsert);

        if (sectionError) throw sectionError;
      }
    },
    onSuccess: () => {
      toast({
        title: editingTest ? "Đã cập nhật đề thi" : "Đã tạo đề thi mới",
        description: "Hệ thống tự động khởi tạo 7 section cho đề thi.",
      });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-fulltests"] });
    },
    onError: (err: any) => {
      toast({
        title: "Lỗi",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Delete Test Mutation
  const deleteMutation = useMutation({
    mutationFn: async (testId: number) => {
      // Get related quizzes to delete
      const { data: sections } = await supabase
        .from("full_test_sections")
        .select("quiz_id")
        .eq("test_id", testId);

      // Delete test (cascade will delete sections, but we should clean quizzes if needed)
      const { error } = await supabase.from("full_tests").delete().eq("id", testId);
      if (error) throw error;

      if (sections && sections.length > 0) {
        const quizIds = sections.map((s) => s.quiz_id).filter(Boolean);
        if (quizIds.length > 0) {
          await supabase.from("quizzes").delete().in("id", quizIds);
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Đã xóa đề thi thành công" });
      queryClient.invalidateQueries({ queryKey: ["admin-fulltests"] });
    },
    onError: (err: any) => {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAudioUrl("");
    setCourseId("");
    setEditingTest(null);
    setActiveTab("list");
  };

  const startEdit = (test: any) => {
    setEditingTest(test);
    setTitle(test.title);
    setDescription(test.description || "");
    setAudioUrl(test.audio_url || "");
    setCourseId(String(test.course_id));
    setActiveTab("create");
  };

  // 🚀 Logic import JSON có download & re-upload media lên Storage
  const handleBatchImportJSON = async () => {
    if (!importJson.trim()) {
      toast({ title: "Vui lòng nhập dữ liệu JSON", variant: "destructive" });
      return;
    }

    try {
      setIsImporting(true);
      setImportProgress(5);
      setImportStatusText("Đang phân tích cú pháp JSON...");

      const testData = JSON.parse(importJson);
      const questionsArray = testData.questions || [];

      if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
        throw new Error("Không tìm thấy danh sách câu hỏi hợp lệ trong JSON.");
      }

      const totalQs = questionsArray.length;
      setImportStatusText(`Đã tìm thấy ${totalQs} câu hỏi. Bắt đầu xử lý...`);

      // 1. Get sections of the test to map Part -> Quiz
      const { data: sections, error: secErr } = await supabase
        .from("full_test_sections")
        .select("part_number, quiz_id")
        .eq("test_id", selectedTestForImport.id);

      if (secErr || !sections || sections.length === 0) {
        throw new Error("Không thể tìm thấy các Sections của đề thi này. Hãy thử tạo lại đề.");
      }

      // Quiz mapping: part_number -> quiz_id
      const quizMap: Record<number, number> = {};
      sections.forEach((s) => {
        quizMap[s.part_number] = s.quiz_id;
      });

      // Helper to upload media file to Supabase Storage
      const uploadMedia = async (url: string, index: number, type: "audio" | "image") => {
        if (!url || !url.startsWith("http")) return url;
        // Avoid re-uploading if already on our storage
        if (url.includes("supabase.co") || url.includes("/storage/v1/object/public/materials")) {
          return url;
        }

        try {
          const res = await fetch(url);
          if (!res.ok) return url; // fallback to original on error
          const blob = await res.blob();

          const ext = url.split(".").pop()?.split("?")[0] || (type === "audio" ? "mp3" : "jpg");
          const path = `full_test_media/${selectedTestForImport.id}/part_${type}_${index}_${Date.now()}.${ext}`;

          const { error: uploadErr } = await supabase.storage.from("materials").upload(path, blob);
          if (uploadErr) throw uploadErr;

          const { data: urlData } = supabase.storage.from("materials").getPublicUrl(path);
          return urlData.publicUrl;
        } catch (e) {
          console.error(`Lỗi upload media: ${url}`, e);
          return url; // fallback to original
        }
      };

      // 2. Loop and process questions
      const parsedQuestions: any[] = [];
      const allAnswers: any[] = [];

      // If test has general audio, upload it first
      if (testData.audio_url && testData.audio_url !== selectedTestForImport.audio_url) {
        setImportStatusText("Đang tải và upload Audio nghe chung...");
        const finalMainAudio = await uploadMedia(testData.audio_url, 0, "audio");
        await supabase
          .from("full_tests")
          .update({ audio_url: finalMainAudio })
          .eq("id", selectedTestForImport.id);
      }

      for (let i = 0; i < totalQs; i++) {
        const q = questionsArray[i];
        const part = q.part || q.part_number || 5;
        const quizId = quizMap[part];

        if (!quizId) continue;

        const currentStep = i + 1;
        const pct = Math.round((currentStep / totalQs) * 80) + 5;
        setImportProgress(pct);
        setImportStatusText(`[${currentStep}/${totalQs}] Đang xử lý file phương tiện của câu ${currentStep}...`);

        // Upload images and audios to Supabase
        const finalAudioUrl = q.audio_url ? await uploadMedia(q.audio_url, currentStep, "audio") : null;
        const finalImageUrl = q.image_url ? await uploadMedia(q.image_url, currentStep, "image") : null;

        // Prep question payload
        let questionText = q.question_text || "";
        if (q.passage_text) {
          questionText = `[PASSAGE]${q.passage_text}[ENDPASSAGE]${questionText}`;
        }

        parsedQuestions.push({
          quiz_id: quizId,
          question_text: questionText,
          question_type: `part${part}`,
          display_order: q.display_order || currentStep,
          translation: q.translation || q.translation_text || null,
          audio_url: finalAudioUrl,
          image_url: finalImageUrl,
          group_id: q.group_id ? String(q.group_id) : null,
          transcript: q.transcript || null,
          answers: q.answers || [],
        });
      }

      setImportProgress(90);
      setImportStatusText("Đang tạo các câu hỏi trên database...");

      // Insert questions in chunks
      const insertedQs: any[] = [];
      for (let i = 0; i < parsedQuestions.length; i += 20) {
        const chunk = parsedQuestions.slice(i, i + 20);
        const { data: inserted, error: qInsertErr } = await supabase
          .from("questions")
          .insert(
            chunk.map((pq) => ({
              quiz_id: pq.quiz_id,
              question_text: pq.question_text,
              question_type: pq.question_type,
              display_order: pq.display_order,
              translation: pq.translation,
              audio_url: pq.audio_url,
              image_url: pq.image_url,
              group_id: pq.group_id,
              transcript: pq.transcript,
            }))
          )
          .select("id");

        if (qInsertErr) throw qInsertErr;
        if (inserted) insertedQs.push(...inserted);
      }

      setImportStatusText("Đang liên kết các đáp án giải thích...");

      // Insert answers
      parsedQuestions.forEach((pq, idx) => {
        const questionId = insertedQs[idx]?.id;
        if (!questionId) return;

        pq.answers.forEach((ans: any, aIdx: number) => {
          allAnswers.push({
            question_id: questionId,
            answer_text: ans.answer_text || ans.text || "",
            is_correct: !!ans.is_correct || !!ans.correct,
            explanation: ans.explanation || null,
            display_order: ans.display_order !== undefined ? ans.display_order : aIdx,
          });
        });
      });

      for (let i = 0; i < allAnswers.length; i += 50) {
        const chunk = allAnswers.slice(i, i + 50);
        const { error: ansInsertErr } = await supabase.from("answers").insert(chunk);
        if (ansInsertErr) throw ansInsertErr;
      }

      // Update total question count in quizzes
      setImportStatusText("Cập nhật lại số câu hỏi cho từng phần...");
      for (const part of Object.keys(quizMap)) {
        const partNum = Number(part);
        const quizId = quizMap[partNum];

        const { count } = await supabase
          .from("questions")
          .select("id", { count: "exact", head: true })
          .eq("quiz_id", quizId);

        await supabase
          .from("quizzes")
          .update({ total_questions: count || 0 })
          .eq("id", quizId);
      }

      setImportProgress(100);
      setImportStatusText("Import hoàn tất thành công!");
      toast({ title: "Thành công!", description: `Đã import trọn bộ ${totalQs} câu hỏi cho đề thi.` });

      setTimeout(() => {
        setImportDialogOpen(false);
        setImportJson("");
        setIsImporting(false);
        queryClient.invalidateQueries({ queryKey: ["admin-fulltests"] });
      }, 1000);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Lỗi import", description: e.message, variant: "destructive" });
      setIsImporting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">Quản lý Đề thi Full Test TOEIC</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Khởi tạo cấu trúc đề 7 section và import trọn bộ 200 câu hỏi nhanh chóng.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (activeTab === "list") {
                  resetForm();
                  setActiveTab("create");
                } else {
                  setActiveTab("list");
                }
              }}
              className="btn-3d btn-3d-primary"
            >
              {activeTab === "list" ? (
                <>
                  <Plus className="w-4 h-4 mr-2" /> Tạo đề thi mới
                </>
              ) : (
                "Quay lại danh sách"
              )}
            </Button>
          </div>
        </div>

        {activeTab === "list" ? (
          <div className="bg-card rounded-2xl border-2 border-[var(--duo-gray)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--duo-gray)] bg-slate-50">
                  <th className="text-left p-4 font-black text-foreground">Tên đề thi</th>
                  <th className="text-left p-4 font-black text-foreground">Khóa học liên kết</th>
                  <th className="text-center p-4 font-black text-foreground">Số câu đã import</th>
                  <th className="text-left p-4 font-black text-foreground">Audio tổng</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {fullTests.map((test: any) => {
                  const totalQuestionsImported = test.full_test_sections?.reduce(
                    (sum: number, s: any) => sum + (s.quizzes?.total_questions || 0),
                    0
                  );

                  return (
                    <tr key={test.id} className="border-b-2 border-[var(--duo-gray)] last:border-0 hover:bg-slate-50/50">
                      <td className="p-4">
                        <p className="font-extrabold text-foreground">{test.title}</p>
                        {test.description && <p className="text-xs text-muted-foreground mt-0.5">{test.description}</p>}
                      </td>
                      <td className="p-4 font-bold text-muted-foreground">
                        {test.courses?.title || "Chưa gắn khóa học"}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`badge-duo font-black ${totalQuestionsImported === 200 ? "badge-green" : "badge-orange"}`}>
                          {totalQuestionsImported} / 200 câu
                        </span>
                      </td>
                      <td className="p-4 text-xs font-mono text-muted-foreground max-w-[200px] truncate">
                        {test.audio_url ? "Có audio" : "Không có"}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-2 border-[var(--duo-gray)] hover:bg-slate-50 font-bold"
                            onClick={() => {
                              setSelectedTestForImport(test);
                              setImportDialogOpen(true);
                            }}
                          >
                            <UploadCloud className="w-4 h-4 mr-1.5 text-[var(--duo-blue)]" />
                            Import JSON
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(test)}
                            className="hover:bg-slate-100 text-foreground font-bold"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Bạn có chắc chắn muốn xóa đề thi này? Hành động này sẽ xóa sạch tất cả câu hỏi thuộc 7 sections!")) {
                                deleteMutation.mutate(test.id);
                              }
                            }}
                            className="text-destructive hover:bg-red-50 hover:text-red-600 font-bold"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {fullTests.length === 0 && !loadingTests && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground font-bold">
                      Chưa có đề thi Full Test nào được tạo.
                    </td>
                  </tr>
                )}
                {loadingTests && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-card border-2 border-[var(--duo-gray)] rounded-2xl p-6 max-w-xl space-y-4">
            <h3 className="font-black text-lg text-foreground">
              {editingTest ? "Chỉnh sửa thông tin đề thi" : "Khởi tạo đề thi thử mới"}
            </h3>

            <div className="space-y-2">
              <Label className="font-bold">Tên đề thi</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: TOEIC ETS 2026 Test 1"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Khóa học liên kết</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn khóa học Full Test..." />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c: any) => {
                    const typeLabels: Record<string, string> = {
                      fulltest: "Full Test",
                      listening: "Listening",
                      video_quiz: "TOEIC Nghe-Đọc",
                      grammar: "Ngữ pháp",
                      vocabulary: "Từ vựng",
                    };
                    const label = typeLabels[c.course_type] || c.course_type || "Khác";
                    return (
                      <SelectItem key={c.id} value={String(c.id)}>
                        [{label}] {c.title}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Audio nghe tổng Listening (Không bắt buộc)</Label>
              <Input
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Mô tả ngắn</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả cho đề thi thử này..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="border-2 border-[var(--duo-gray)] font-bold"
                onClick={resetForm}
              >
                Hủy
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="btn-3d btn-3d-primary font-black"
              >
                {saveMutation.isPending ? "Đang lưu..." : editingTest ? "Lưu thay đổi" : "Khởi tạo Đề & 7 Section"}
              </Button>
            </div>
          </div>
        )}

        {/* JSON Import Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={(open) => !isImporting && setImportDialogOpen(open)}>
          <DialogContent className="max-w-2xl font-sans">
            <DialogHeader>
              <DialogTitle className="font-black text-xl">Import trọn bộ câu hỏi từ file JSON</DialogTitle>
              <DialogDescription className="text-sm font-semibold">
                Dán mã JSON chứa 200 câu hỏi (Crawl từ Ngoại Ngữ 24h). Hệ thống sẽ tự tải ảnh/audio về và reupload lên Supabase Storage của bạn.
              </DialogDescription>
            </DialogHeader>

            {isImporting ? (
              <div className="space-y-4 py-4 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-[var(--duo-blue)] mx-auto" />
                <div className="space-y-2">
                  <p className="text-sm font-bold text-foreground">{importStatusText}</p>
                  <Progress value={importProgress} className="w-full h-3" />
                  <span className="text-xs text-muted-foreground font-black">{importProgress}%</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold flex items-center justify-between">
                    <span>Mã JSON dữ liệu đề thi</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-black">Format NgoaiNgu24h Crawler</span>
                  </Label>
                  <Textarea
                    value={importJson}
                    onChange={(e) => setImportJson(e.target.value)}
                    rows={12}
                    placeholder='{"title": "ETS 2026 Test 1", "questions": [...]}'
                    className="font-mono text-[11px] bg-slate-50 border-2 border-[var(--duo-gray)]"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" className="font-bold border-2" onClick={() => setImportDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button
                    onClick={handleBatchImportJSON}
                    className="btn-3d btn-3d-primary font-black flex items-center gap-2"
                  >
                    <UploadCloud className="w-4 h-4" /> Bắt đầu Import
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

const partShortNames = [
  "Part 1: Photo",
  "Part 2: Q&A",
  "Part 3: Conversation",
  "Part 4: Short Talk",
  "Part 5: Incomplete Sentences",
  "Part 6: Text Completion",
  "Part 7: Reading Comprehension",
];

export default AdminFullTestManager;
