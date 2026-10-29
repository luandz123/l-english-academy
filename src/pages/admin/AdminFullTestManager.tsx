import AdminLayout from "@/components/AdminLayout";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  appendAdminFullTestQuestions,
  bulkDeleteAdminFullTests,
  deleteAdminFullTest,
  packageImportAdminFullTests,
} from "@/lib/api/assessment";
import { uploadMedia as uploadMediaToStorage } from "@/lib/api/media";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Edit2, FileDown, UploadCloud, CheckCircle2, ClipboardList } from "lucide-react";
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
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatusText, setImportStatusText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [selectedTestIds, setSelectedTestIds] = useState<number[]>([]);

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
      queryClient.invalidateQueries({ queryKey: ["admin-course-fulltests"] });
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
      const { error } = await deleteAdminFullTest(testId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Đã xóa đề thi thành công" });
      queryClient.invalidateQueries({ queryKey: ["admin-fulltests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-course-fulltests"] });
    },
    onError: (err: any) => {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
    },
  });

  // Bulk Delete Test Mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (testIds: number[]) => {
      const { error } = await bulkDeleteAdminFullTests(testIds);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Đã xóa các đề thi thành công" });
      setSelectedTestIds([]);
      queryClient.invalidateQueries({ queryKey: ["admin-fulltests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-course-fulltests"] });
    },
    onError: (err: any) => {
      toast({ title: "Lỗi xóa nhiều đề thi", description: err.message, variant: "destructive" });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTestIds(fullTests.map((t: any) => t.id));
    } else {
      setSelectedTestIds([]);
    }
  };

  const handleSelectOne = (testId: number, checked: boolean) => {
    if (checked) {
      setSelectedTestIds((prev) => [...prev, testId]);
    } else {
      setSelectedTestIds((prev) => prev.filter((id) => id !== testId));
    }
  };

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
    let jsonString = importJson.trim();
    if (importFile) {
      try {
        jsonString = await importFile.text();
      } catch (e: any) {
        toast({ title: "Lỗi đọc file", description: e.message, variant: "destructive" });
        return;
      }
    }

    if (!jsonString) {
      toast({ title: "Vui lòng nhập dữ liệu JSON hoặc chọn file", variant: "destructive" });
      return;
    }

    try {
      setIsImporting(true);
      setImportProgress(5);
      setImportStatusText("Đang phân tích cú pháp JSON...");

      const parsedData = JSON.parse(jsonString);

      // Determine if this is a course-level import or single-exam import
      if (parsedData.course_title && Array.isArray(parsedData.exams)) {
        // --- 1. COURSE-WIDE IMPORT ---
        setImportStatusText("Phát hiện dữ liệu Bộ Đề. Đang xử lý media...");

        const exams = parsedData.exams;
        const totalExams = exams.length;
        const preparedExams: any[] = [];

        // Media upload helper cached locally
        const mediaCache: Record<string, string> = {};
        const uploadMedia = async (url: string, index: number, type: "audio" | "image") => {
          if (!url || !url.startsWith("http")) return url;
          if (mediaCache[url]) {
            return mediaCache[url];
          }
          if (url.includes("supabase.co") || url.includes("/storage/v1/object/public/materials")) {
            return url;
          }
          try {
            const res = await fetch(url);
            if (!res.ok) return url;
            const blob = await res.blob();
            const ext = url.split(".").pop()?.split("?")[0] || (type === "audio" ? "mp3" : "jpg");
            const { publicUrl } = await uploadMediaToStorage(
              blob,
              "full_test_media",
              `package/part_${type}_${index}_${Date.now()}.${ext}`,
            );
            mediaCache[url] = publicUrl;
            return publicUrl;
          } catch (e) {
            console.error(`Lỗi upload media: ${url}`, e);
            return url;
          }
        };

        for (let exIdx = 0; exIdx < totalExams; exIdx++) {
          const exam = exams[exIdx];
          const examTitle = exam.exam_title || exam.title || `Đề thi số ${exIdx + 1}`;

          const examProgressBase = Math.round((exIdx / totalExams) * 80);
          setImportProgress(examProgressBase);
          setImportStatusText(`[Đề ${exIdx + 1}/${totalExams}] Bắt đầu xử lý media "${examTitle}"...`);

          let finalMainAudio = exam.audio_url || null;
          if (exam.audio_url) {
            finalMainAudio = await uploadMedia(exam.audio_url, 0, "audio");
          }

          const questionsArray = exam.questions || [];
          const preparedQuestions: any[] = [];
          for (let i = 0; i < questionsArray.length; i++) {
            const q = questionsArray[i];
            const currentStep = i + 1;
            const finalAudioUrl = q.audio_url ? await uploadMedia(q.audio_url, currentStep, "audio") : null;
            const finalImageUrl = q.image_url ? await uploadMedia(q.image_url, currentStep, "image") : null;
            preparedQuestions.push({
              ...q,
              audio_url: finalAudioUrl,
              image_url: finalImageUrl,
            });
          }

          preparedExams.push({
            ...exam,
            exam_title: examTitle,
            audio_url: finalMainAudio,
            questions: preparedQuestions,
          });
        }

        setImportProgress(90);
        setImportStatusText("Đang gửi toàn bộ bộ đề lên máy chủ trong 1 transaction...");
        const { error: pkgErr } = await packageImportAdminFullTests({
          course_title: parsedData.course_title,
          exams: preparedExams,
        });
        if (pkgErr) throw new Error(pkgErr.message);

        setImportProgress(100);
        setImportStatusText("Import trọn bộ đề thi thành công!");
        toast({ title: "Thành công!", description: `Đã import trọn bộ ${totalExams} đề thi.` });

      } else {
        // --- 2. SINGLE EXAM IMPORT ---
        if (!selectedTestForImport) {
          throw new Error("Vui lòng chọn đề thi để import hoặc dán file JSON chứa trọn bộ đề.");
        }

        const questionsArray = parsedData.questions || [];
        if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
          throw new Error("Không tìm thấy danh sách câu hỏi hợp lệ trong JSON.");
        }

        const totalQs = questionsArray.length;
        setImportStatusText(`Đã tìm thấy ${totalQs} câu hỏi. Bắt đầu xử lý...`);

        // Media upload helper cached locally
        const mediaCache: Record<string, string> = {};
        const uploadMedia = async (url: string, index: number, type: "audio" | "image") => {
          if (!url || !url.startsWith("http")) return url;
          if (mediaCache[url]) {
            return mediaCache[url];
          }
          if (url.includes("supabase.co") || url.includes("/storage/v1/object/public/materials")) {
            return url;
          }
          try {
            const res = await fetch(url);
            if (!res.ok) return url;
            const blob = await res.blob();
            const ext = url.split(".").pop()?.split("?")[0] || (type === "audio" ? "mp3" : "jpg");
            const { publicUrl } = await uploadMediaToStorage(
              blob,
              "full_test_media",
              `${selectedTestForImport.id}/part_${type}_${index}_${Date.now()}.${ext}`,
            );
            mediaCache[url] = publicUrl;
            return publicUrl;
          } catch (e) {
            console.error(`Lỗi upload media: ${url}`, e);
            return url;
          }
        };

        let finalMainAudio: string | undefined = undefined;
        if (parsedData.audio_url && parsedData.audio_url !== selectedTestForImport.audio_url) {
          setImportStatusText("Đang tải và upload Audio nghe chung...");
          finalMainAudio = await uploadMedia(parsedData.audio_url, 0, "audio");
        }

        const preparedQuestions: any[] = [];
        for (let i = 0; i < totalQs; i++) {
          const q = questionsArray[i];
          const currentStep = i + 1;
          const pct = Math.round((currentStep / totalQs) * 80) + 5;
          setImportProgress(pct);
          setImportStatusText(`[${currentStep}/${totalQs}] Đang xử lý file phương tiện của câu ${currentStep}...`);

          const finalAudioUrl = q.audio_url ? await uploadMedia(q.audio_url, currentStep, "audio") : undefined;
          const finalImageUrl = q.image_url ? await uploadMedia(q.image_url, currentStep, "image") : undefined;

          preparedQuestions.push({
            part: q.part || q.part_number,
            part_number: q.part_number || q.part,
            question_text: q.question_text,
            passage_text: q.passage_text,
            display_order: q.display_order || currentStep,
            translation: q.translation || q.translation_text,
            translation_text: q.translation_text || q.translation,
            audio_url: finalAudioUrl,
            image_url: finalImageUrl,
            group_id: q.group_id ? String(q.group_id) : undefined,
            transcript: q.transcript,
            answers: q.answers,
          });
        }

        setImportProgress(90);
        setImportStatusText("Đang lưu câu hỏi lên máy chủ...");

        const { error: importErr } = await appendAdminFullTestQuestions(selectedTestForImport.id, {
          audio_url: finalMainAudio,
          questions: preparedQuestions,
        });

        if (importErr) throw new Error(importErr.message);

        setImportProgress(100);
        setImportStatusText("Import hoàn tất thành công!");
        toast({ title: "Thành công!", description: `Đã import trọn bộ ${totalQs} câu hỏi cho đề thi.` });
      }

      setTimeout(() => {
        setImportDialogOpen(false);
        setImportJson("");
        setImportFile(null);
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
            {activeTab === "list" && selectedTestIds.length > 0 && (
              <Button
                onClick={() => {
                  if (confirm(`Bạn có chắc chắn muốn xóa ${selectedTestIds.length} đề thi đã chọn? Hành động này sẽ xóa sạch toàn bộ câu hỏi và section liên quan!`)) {
                    bulkDeleteMutation.mutate(selectedTestIds);
                  }
                }}
                variant="destructive"
                className="font-bold flex items-center gap-2 rounded-xl active:scale-95 duration-120"
              >
                <Trash2 className="w-4 h-4" />
                Xóa {selectedTestIds.length} đề đã chọn
              </Button>
            )}
            {activeTab === "list" && (
              <Button
                onClick={() => {
                  setSelectedTestForImport(null);
                  setImportDialogOpen(true);
                }}
                variant="outline"
                className="border border-border/70 font-bold flex items-center gap-2 hover:bg-muted/50 rounded-xl active:scale-95 duration-120"
              >
                <UploadCloud className="w-4 h-4 text-primary" />
                Import Bộ Đề (JSON)
              </Button>
            )}
            <Button
              onClick={() => {
                if (activeTab === "list") {
                  resetForm();
                  setActiveTab("create");
                } else {
                  setActiveTab("list");
                }
              }}
              className="btn-3d btn-3d-primary rounded-xl font-bold active:scale-95 duration-120"
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
          <div className="bg-card rounded-2xl border border-border/70 shadow-soft-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40">
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={fullTests.length > 0 && selectedTestIds.length === fullTests.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border border-border text-primary focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th className="text-left p-4 font-bold text-foreground">Tên đề thi</th>
                  <th className="text-left p-4 font-bold text-foreground">Khóa học liên kết</th>
                  <th className="text-center p-4 font-bold text-foreground">Số câu đã import</th>
                  <th className="text-left p-4 font-bold text-foreground">Audio tổng</th>
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
                    <tr key={test.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedTestIds.includes(test.id)}
                          onChange={(e) => handleSelectOne(test.id, e.target.checked)}
                          className="w-4 h-4 rounded border border-border text-primary focus:ring-primary cursor-pointer"
                        />
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-foreground">{test.title}</p>
                        {test.description && <p className="text-xs text-muted-foreground mt-0.5">{test.description}</p>}
                      </td>
                      <td className="p-4 font-semibold text-muted-foreground">
                        {test.courses?.title || "Chưa gắn khóa học"}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`badge-duo font-bold ${totalQuestionsImported === 200 ? "badge-green" : "badge-orange"}`}>
                          {totalQuestionsImported} / 200 câu
                        </span>
                      </td>
                      <td className="p-4 text-xs font-mono text-muted-foreground max-w-[200px] truncate">
                        {test.audio_url ? "Có audio" : "Không có"}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Link to={`/admin/fulltests/${test.id}/questions`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border border-border/70 hover:bg-muted/50 font-bold rounded-xl active:scale-95 duration-120"
                            >
                              <ClipboardList className="w-4 h-4 mr-1.5 text-primary" />
                              Quản lý câu hỏi
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border border-border/70 hover:bg-muted/50 font-bold rounded-xl active:scale-95 duration-120"
                            onClick={() => {
                              setSelectedTestForImport(test);
                              setImportDialogOpen(true);
                            }}
                          >
                            <UploadCloud className="w-4 h-4 mr-1.5 text-primary" />
                            Import JSON
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(test)}
                            className="hover:bg-muted/60 text-foreground font-bold rounded-xl active:scale-95 duration-120"
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
                            className="text-destructive hover:bg-destructive/10 font-bold rounded-xl active:scale-95 duration-120"
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
                    <td colSpan={6} className="p-8 text-center text-muted-foreground font-semibold">
                      Chưa có đề thi Full Test nào được tạo.
                    </td>
                  </tr>
                )}
                {loadingTests && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-card border border-border/70 rounded-2xl shadow-soft-sm p-6 sm:p-8 max-w-xl space-y-4">
            <h3 className="font-bold text-lg text-foreground">
              {editingTest ? "Chỉnh sửa thông tin đề thi" : "Khởi tạo đề thi thử mới"}
            </h3>

            <div className="space-y-2">
              <Label className="font-bold text-foreground">Tên đề thi (*)</Label>
              <Input
                className="rounded-xl border-border/80"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: TOEIC ETS 2026 Test 1"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-foreground">Khóa học liên kết (*)</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="rounded-xl border-border/80">
                  <SelectValue placeholder="Chọn khóa học Full Test..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
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
              <Label className="font-bold text-foreground">Audio nghe tổng Listening (Không bắt buộc)</Label>
              <Input
                className="rounded-xl border-border/80"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-foreground">Mô tả ngắn</Label>
              <Textarea
                className="rounded-xl border-border/80"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả cho đề thi thử này..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="border border-border/70 font-semibold rounded-xl active:scale-95 duration-120"
                onClick={resetForm}
              >
                Hủy
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="btn-3d btn-3d-primary font-bold rounded-xl active:scale-95 duration-120"
              >
                {saveMutation.isPending ? "Đang lưu..." : editingTest ? "Lưu thay đổi" : "Khởi tạo Đề & 7 Section"}
              </Button>
            </div>
          </div>
        )}

        {/* JSON Import Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={(open) => {
          if (!isImporting) {
            setImportDialogOpen(open);
            if (!open) {
              setImportJson("");
              setImportFile(null);
            }
          }
        }}>
          <DialogContent className="rounded-2xl border-border/80 shadow-soft-xl max-w-2xl font-sans">
            <DialogHeader>
              <DialogTitle className="font-bold text-xl text-foreground">
                {selectedTestForImport ? `Import câu hỏi cho đề: "${selectedTestForImport.title}"` : "Import trọn bộ đề thi (nhiều đề)"}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium">
                {selectedTestForImport
                  ? "Dán mã JSON chứa 200 câu hỏi. Hệ thống sẽ tự tải ảnh/audio về và reupload lên Supabase Storage của bạn."
                  : "Dán mã JSON chứa toàn bộ các đề thi của bộ đề. Hệ thống sẽ tự động tạo Khóa học/Bộ đề mới và import tất cả đề thi cùng toàn bộ câu hỏi tương ứng."}
              </DialogDescription>
            </DialogHeader>

            {isImporting ? (
              <div className="space-y-4 py-4 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                <div className="space-y-2">
                  <p className="text-sm font-bold text-foreground">{importStatusText}</p>
                  <Progress value={importProgress} className="w-full h-3" />
                  <span className="text-xs text-muted-foreground font-bold">{importProgress}%</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                <div className="space-y-2">
                  <Label className="font-bold text-foreground">Cách 1: Chọn file JSON từ máy tính (Khuyên dùng cho file dung lượng lớn)</Label>
                  <Input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setImportFile(file);
                      if (file) {
                        setImportJson("");
                      }
                    }}
                    className="border border-border/70 bg-muted/30 cursor-pointer rounded-xl"
                  />
                  {importFile && (
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      ✓ Đã chọn file: {importFile.name} ({(importFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/70" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground font-bold text-xs">Hoặc cách 2</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold flex items-center justify-between text-foreground">
                    <span>Dán mã JSON trực tiếp</span>
                    <span className="text-xs text-muted-foreground uppercase font-bold">Format NgoaiNgu24h Crawler</span>
                  </Label>
                  <Textarea
                    value={importJson}
                    onChange={(e) => {
                      setImportJson(e.target.value);
                      if (e.target.value) {
                        setImportFile(null);
                      }
                    }}
                    disabled={!!importFile}
                    rows={6}
                    placeholder={selectedTestForImport 
                      ? '{"title": "ETS 2026 Test 1", "questions": [...]}' 
                      : '{"course_title": "Bộ đề thi thử 2026", "exams": [{"exam_title": "Đề số 01", "questions": [...]}, ...]}'
                    }
                    className="font-mono text-xs bg-muted/30 border border-border/70 rounded-xl"
                  />
                  {importFile && (
                    <p className="text-xs text-muted-foreground italic">
                      Vui lòng bỏ chọn file phía trên nếu muốn dán JSON trực tiếp.
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" className="font-semibold border border-border/70 rounded-xl active:scale-95 duration-120" onClick={() => setImportDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button
                    onClick={handleBatchImportJSON}
                    className="btn-3d btn-3d-primary font-bold flex items-center gap-2 rounded-xl active:scale-95 duration-120"
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
