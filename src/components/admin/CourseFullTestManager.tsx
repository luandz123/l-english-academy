import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  UploadCloud, 
  FileText, 
  Volume2, 
  Eye, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Calendar,
  Layers,
  Upload,
  Loader2,
  FileCheck2,
  ListOrdered
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CourseFullTestManagerProps {
  courseId: number;
  courseTitle: string;
}

const categoryLabels: Record<string, string> = {
  "2026": "Bộ Đề TOEIC 2026",
  "real_2024_2026": "Đề Thi Thực Tế 2024 - 2026",
  "2025": "Bộ Đề TOEIC 2025",
  "2024": "Bộ Đề TOEIC 2024",
  "general": "Bộ Đề Tổng Hợp",
};

export const CourseFullTestManager = ({ courseId, courseTitle }: CourseFullTestManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<any>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [category, setCategory] = useState("2026");
  const [releaseDate, setReleaseDate] = useState("");
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isAudioUploading, setIsAudioUploading] = useState(false);

  // JSON Import States
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [testForImport, setTestForImport] = useState<any>(null);
  const [importJson, setImportJson] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatusText, setImportStatusText] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Fetch Full Tests for this specific course
  const { data: fullTests = [], isLoading } = useQuery({
    queryKey: ["admin-course-fulltests", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("full_tests")
        .select(`
          *,
          full_test_sections (
            id,
            part_number,
            quiz_id,
            quizzes (
              total_questions
            )
          )
        `)
        .eq("course_id", courseId)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Handle Audio File Upload to Supabase Storage
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAudioUploading(true);
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "");
      const path = `fulltests/audio/${Date.now()}_${sanitizedName}`;

      const { error: uploadErr } = await supabase.storage
        .from("materials")
        .upload(path, file);

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("materials")
        .getPublicUrl(path);

      setAudioUrl(urlData.publicUrl);
      toast({
        title: "Tải file nghe thành công",
        description: "Đã tạo link âm thanh lưu trữ trên hệ thống.",
      });
    } catch (err: any) {
      toast({
        title: "Lỗi tải âm thanh",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsAudioUploading(false);
    }
  };

  // Create Test Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) {
        throw new Error("Vui lòng nhập tên đề thi.");
      }

      // 1. Insert full_test
      const { data: newTest, error: createError } = await supabase
        .from("full_tests")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          audio_url: audioUrl.trim() || null,
          category: category || "2026",
          course_id: courseId,
          display_order: Number(displayOrder) || (fullTests.length + 1),
          release_date: releaseDate ? new Date(releaseDate).toISOString() : null,
          total_questions: 200,
        })
        .select("id")
        .single();

      if (createError) throw createError;

      // 2. Auto create 7 TOEIC section quizzes
      const sectionsToInsert = [];
      for (let part = 1; part <= 7; part++) {
        const { data: newQuiz, error: quizError } = await supabase
          .from("quizzes")
          .insert({
            title: `Part ${part} - ${title.trim()}`,
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
    },
    onSuccess: () => {
      toast({
        title: "Tạo đề thi thành công",
        description: "Hệ thống đã tự động khởi tạo 7 phần (Part 1 - Part 7).",
      });
      resetForm();
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-course-fulltests", courseId] });
    },
    onError: (err: any) => {
      toast({
        title: "Lỗi tạo đề thi",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Update Test Mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTest || !title.trim()) {
        throw new Error("Vui lòng nhập tên đề thi.");
      }

      const { error } = await supabase
        .from("full_tests")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          audio_url: audioUrl.trim() || null,
          category: category || "2026",
          display_order: Number(displayOrder) || 1,
          release_date: releaseDate ? new Date(releaseDate).toISOString() : null,
        })
        .eq("id", selectedTest.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Đã cập nhật thông tin đề thi",
      });
      resetForm();
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-course-fulltests", courseId] });
    },
    onError: (err: any) => {
      toast({
        title: "Lỗi cập nhật",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Delete Test Mutation
  const deleteMutation = useMutation({
    mutationFn: async (testId: number) => {
      const { data: sections } = await supabase
        .from("full_test_sections")
        .select("quiz_id")
        .eq("test_id", testId);

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
      queryClient.invalidateQueries({ queryKey: ["admin-course-fulltests", courseId] });
    },
    onError: (err: any) => {
      toast({ title: "Lỗi xóa đề thi", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAudioUrl("");
    setCategory("2026");
    setReleaseDate("");
    setDisplayOrder(fullTests.length + 1);
    setSelectedTest(null);
  };

  const openCreateModal = () => {
    resetForm();
    setDisplayOrder(fullTests.length + 1);
    setIsCreateOpen(true);
  };

  const openEditModal = (test: any) => {
    setSelectedTest(test);
    setTitle(test.title || "");
    setDescription(test.description || "");
    setAudioUrl(test.audio_url || "");
    setCategory(test.category || "2026");
    setReleaseDate(test.release_date ? test.release_date.split("T")[0] : "");
    setDisplayOrder(test.display_order || 1);
    setIsEditOpen(true);
  };

  const openImportModal = (test: any) => {
    setTestForImport(test);
    setImportJson("");
    setImportFile(null);
    setImportProgress(0);
    setImportStatusText("");
    setIsImporting(false);
    setImportDialogOpen(true);
  };

  // Batch import JSON questions for this test
  const handleImportJSON = async () => {
    let jsonString = importJson.trim();
    if (importFile) {
      try {
        jsonString = await importFile.text();
      } catch {
        toast({ title: "Lỗi đọc file", description: "Không thể đọc nội dung file JSON đã chọn.", variant: "destructive" });
        return;
      }
    }

    if (!jsonString) {
      toast({ title: "Chưa có dữ liệu", description: "Vui lòng dán JSON hoặc tải lên file JSON.", variant: "destructive" });
      return;
    }

    let parsedData: any[] = [];
    try {
      const parsed = JSON.parse(jsonString);
      parsedData = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      toast({ title: "JSON không hợp lệ", description: "Dữ liệu JSON không đúng định dạng cú pháp.", variant: "destructive" });
      return;
    }

    try {
      setIsImporting(true);
      setImportProgress(10);
      setImportStatusText("Đang kiểm tra các phần (sections) của đề thi...");

      // Get sections for test
      let { data: sections } = await supabase
        .from("full_test_sections")
        .select("id, part_number, quiz_id")
        .eq("test_id", testForImport.id);

      if (!sections || sections.length === 0) {
        // Create 7 sections if not present
        const secList = [];
        for (let p = 1; p <= 7; p++) {
          const { data: qz } = await supabase
            .from("quizzes")
            .insert({ title: `Part ${p} - ${testForImport.title}`, total_questions: 0, display_order: p })
            .select("id")
            .single();
          if (qz) {
            secList.push({ test_id: testForImport.id, part_number: p, quiz_id: qz.id });
          }
        }
        const { data: insertedSec } = await supabase.from("full_test_sections").insert(secList).select("id, part_number, quiz_id");
        sections = insertedSec || [];
      }

      setImportProgress(30);
      setImportStatusText("Đang xử lý câu hỏi và đáp án...");

      // Group questions by part
      let totalQuestionsImported = 0;

      for (let part = 1; part <= 7; part++) {
        const partSection = sections.find((s) => s.part_number === part);
        if (!partSection || !partSection.quiz_id) continue;

        const partQuestions = parsedData.filter((q) => {
          const qPart = q.part_number || q.part || (q.display_order ? (
            q.display_order <= 6 ? 1 :
            q.display_order <= 31 ? 2 :
            q.display_order <= 70 ? 3 :
            q.display_order <= 100 ? 4 :
            q.display_order <= 130 ? 5 :
            q.display_order <= 146 ? 6 : 7
          ) : 5);
          return qPart === part;
        });

        if (partQuestions.length === 0) continue;

        for (const item of partQuestions) {
          // Insert question
          const { data: insertedQ, error: qErr } = await supabase
            .from("questions")
            .insert({
              quiz_id: partSection.quiz_id,
              display_order: item.display_order || (totalQuestionsImported + 1),
              question_text: item.question_text || item.text || "",
              audio_url: item.audio_url || null,
              image_url: item.image_url || null,
              passage_text: item.passage_text || item.passage || null,
              transcript: item.transcript || null,
              translation: item.translation || null,
              group_id: item.group_id || null,
            })
            .select("id")
            .single();

          if (qErr || !insertedQ) continue;

          // Insert answers
          const rawAnswers = item.answers || item.options || [];
          const answersToInsert = rawAnswers.map((ans: any, aIdx: number) => ({
            question_id: insertedQ.id,
            answer_text: typeof ans === "string" ? ans : (ans.answer_text || ans.text || ""),
            is_correct: typeof ans === "object" ? !!ans.is_correct : (item.correct_answer === aIdx || item.correct === aIdx),
            explanation: typeof ans === "object" ? ans.explanation || item.explanation || null : (item.explanation || null),
            display_order: aIdx,
          }));

          if (answersToInsert.length > 0) {
            await supabase.from("answers").insert(answersToInsert);
          }

          totalQuestionsImported++;
        }

        // Update quiz total_questions
        await supabase
          .from("quizzes")
          .update({ total_questions: partQuestions.length })
          .eq("id", partSection.quiz_id);
      }

      // Update full_tests total questions
      await supabase
        .from("full_tests")
        .update({ total_questions: totalQuestionsImported })
        .eq("id", testForImport.id);

      setImportProgress(100);
      setImportStatusText(`Đã nhập thành công ${totalQuestionsImported} câu hỏi!`);

      toast({
        title: "Import thành công",
        description: `Đã nhập ${totalQuestionsImported} câu hỏi vào đề thi ${testForImport.title}`,
      });

      setTimeout(() => {
        setImportDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ["admin-course-fulltests", courseId] });
      }, 1000);
    } catch (err: any) {
      toast({
        title: "Lỗi khi import",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border/70 shadow-soft-sm">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-primary" /> Quản lý Đề Thi Full Test ({fullTests.length})
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Các đề thi thử định dạng chuẩn TOEIC (200 câu) được gán vào khóa học này.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateModal} className="btn-3d btn-3d-primary font-bold rounded-xl active:scale-95 duration-120">
            <Plus className="w-4 h-4 mr-1.5" /> Thêm Đề Thi Mới
          </Button>
        </div>
      </div>

      {/* Tests Grid / List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Đang tải danh sách đề thi...</p>
        </div>
      ) : fullTests.length === 0 ? (
        <Card className="border border-dashed border-border/70 bg-muted/15 rounded-2xl shadow-soft-xs">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-soft-xs">
              <FileText className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-foreground">Chưa có đề thi nào trong khóa học này</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Hãy tạo đề thi mới để học viên có thể luyện tập đề thi thử TOEIC 200 câu sát thực tế.
              </p>
            </div>
            <Button onClick={openCreateModal} className="btn-3d btn-3d-primary font-bold rounded-xl active:scale-95 duration-120">
              <Plus className="w-4 h-4 mr-2" /> Tạo Đề Thi Đầu Tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fullTests.map((test: any, idx: number) => {
            const sections = test.full_test_sections || [];
            const totalQuestions = sections.reduce(
              (acc: number, sec: any) => acc + (sec.quizzes?.total_questions || 0),
              0
            );

            return (
              <Card 
                key={test.id} 
                className="overflow-hidden border border-border/70 hover:border-primary/50 transition-all duration-200 hover:shadow-soft-md bg-card rounded-2xl flex flex-col justify-between"
              >
                <div>
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-semibold text-xs border-primary/30 text-primary bg-primary/5 rounded-lg">
                            #{test.display_order || idx + 1}
                          </Badge>
                          <Badge variant="secondary" className="text-xs rounded-lg font-semibold">
                            {categoryLabels[test.category] || test.category || "2026"}
                          </Badge>
                          {test.audio_url && (
                            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20 flex items-center gap-1 rounded-lg">
                              <Volume2 className="w-3 h-3" /> Audio sẵn sàng
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-base font-bold text-foreground truncate mt-1">
                          {test.title}
                        </CardTitle>
                        {test.description && (
                          <CardDescription className="text-xs line-clamp-2 mt-0.5">
                            {test.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-3 rounded-xl border border-border/50">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <ListOrdered className="w-3.5 h-3.5 text-primary" />
                        <span>Số câu hỏi: <strong className="text-foreground">{totalQuestions || test.total_questions || 200} câu</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Layers className="w-3.5 h-3.5 text-primary" />
                        <span>Phần thi: <strong className="text-foreground">{sections.length || 7} parts</strong></span>
                      </div>
                      {test.release_date && (
                        <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                          <Calendar className="w-3.5 h-3.5 text-amber-500" />
                          <span>Ngày mở đề: <strong className="text-foreground">{new Date(test.release_date).toLocaleDateString("vi-VN")}</strong></span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-4 border-t border-border/60 bg-muted/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Direct to Questions Editor */}
                    <Button size="sm" asChild className="text-xs h-8 btn-3d btn-3d-primary font-bold rounded-xl active:scale-95 duration-120">
                      <Link to={`/admin/fulltests/${test.id}/questions`}>
                        <Edit3 className="w-3.5 h-3.5 mr-1" /> Sửa 200 câu hỏi
                      </Link>
                    </Button>

                    {/* Import JSON */}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => openImportModal(test)} 
                      className="text-xs h-8 border-border/80 hover:bg-muted font-semibold rounded-xl active:scale-95 duration-120"
                      title="Nhập câu hỏi từ file JSON"
                    >
                      <UploadCloud className="w-3.5 h-3.5 mr-1 text-primary" /> Nhập JSON
                    </Button>

                    {/* Preview Student Test */}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      asChild 
                      className="text-xs h-8 text-muted-foreground hover:text-foreground font-semibold rounded-xl active:scale-95 duration-120"
                    >
                      <Link to={`/courses/${courseId}/fulltest/${test.id}`} target="_blank">
                        <Eye className="w-3.5 h-3.5 mr-1 text-primary" /> Thi thử <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                      </Link>
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => openEditModal(test)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl active:scale-95 duration-120"
                      title="Sửa thông tin đề thi"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => {
                        if (confirm(`Bạn có chắc chắn muốn xóa đề thi "${test.title}"? Thao tác này sẽ xóa toàn bộ câu hỏi và kết quả thi liên quan.`)) {
                          deleteMutation.mutate(test.id);
                        }
                      }}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-xl active:scale-95 duration-120"
                      title="Xóa đề thi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ================= CREATE / EDIT TEST METADATA MODAL ================= */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setIsEditOpen(false);
        }
      }}>
        <DialogContent className="rounded-2xl border-border/80 shadow-soft-xl max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {isEditOpen ? "Chỉnh sửa Thông tin Đề Thi" : "Thêm Đề Thi Mới"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Đề thi sẽ được liên kết trực tiếp với khóa học: <strong>{courseTitle}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="test-title" className="text-xs font-bold text-foreground">Tên đề thi (*)</Label>
              <Input
                id="test-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: TOEIC 2026 Practice Test 01"
                className="text-sm rounded-xl border-border/80"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="test-category" className="text-xs font-bold text-foreground">Bộ đề / Năm thi</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="test-category" className="text-sm rounded-xl border-border/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="2026">Bộ Đề TOEIC 2026</SelectItem>
                    <SelectItem value="real_2024_2026">Đề Thi Thực Tế 2024 - 2026</SelectItem>
                    <SelectItem value="2025">Bộ Đề TOEIC 2025</SelectItem>
                    <SelectItem value="2024">Bộ Đề TOEIC 2024</SelectItem>
                    <SelectItem value="general">Bộ Đề Tổng Hợp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="display-order" className="text-xs font-bold text-foreground">Thứ tự hiển thị</Label>
                <Input
                  id="display-order"
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  className="text-sm rounded-xl border-border/80"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="test-description" className="text-xs font-bold text-foreground">Mô tả / Ghi chú</Label>
              <Textarea
                id="test-description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ví dụ: Đề thi thử ETS 2026 format mới, kiểm tra Listening & Reading..."
                className="text-sm rounded-xl border-border/80"
              />
            </div>

            {/* Audio URL + File Uploader */}
            <div className="space-y-1.5">
              <Label htmlFor="audio-url" className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>File nghe tổng thể (Audio Listening)</span>
                {audioUrl && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Đã gắn link</span>}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="audio-url"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="https://storage.googleapis.com/.../audio.mp3"
                  className="text-sm flex-1 font-mono text-xs rounded-xl border-border/80"
                />
                <Button variant="outline" className="shrink-0 text-xs rounded-xl font-semibold active:scale-95 duration-120" asChild disabled={isAudioUploading}>
                  <label className="cursor-pointer">
                    {isAudioUploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 mr-1" />
                    )}
                    {isAudioUploading ? "Đang tải..." : "Tải file lên"}
                    <input
                      type="file"
                      className="hidden"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      disabled={isAudioUploading}
                    />
                  </label>
                </Button>
              </div>
              {audioUrl && (
                <div className="mt-2 p-2 bg-muted/40 rounded-xl border border-border/60">
                  <audio controls src={audioUrl} className="w-full h-8" />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="release-date" className="text-xs font-bold text-foreground">Ngày mở đề (Bỏ trống nếu mở ngay)</Label>
              <Input
                id="release-date"
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                className="text-sm rounded-xl border-border/80"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
            <Button 
              variant="outline" 
              className="rounded-xl font-semibold active:scale-95 duration-120"
              onClick={() => {
                setIsCreateOpen(false);
                setIsEditOpen(false);
              }}
            >
              Hủy
            </Button>
            <Button
              className="btn-3d btn-3d-primary font-bold rounded-xl active:scale-95 duration-120"
              onClick={() => {
                if (isEditOpen) {
                  updateMutation.mutate();
                } else {
                  createMutation.mutate();
                }
              }}
              disabled={createMutation.isPending || updateMutation.isPending || !title.trim()}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              {isEditOpen ? "Lưu thay đổi" : "Tạo đề thi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= IMPORT JSON MODAL ================= */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="rounded-2xl border-border/80 shadow-soft-xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-primary" /> Nhập Câu Hỏi Cho Đề: {testForImport?.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Hỗ trợ nhập 200 câu hỏi từ file JSON format chuẩn TOEIC. Hệ thống sẽ tự động gán vào các Part 1 - 7.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Tải lên file .json</Label>
              <Input
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="text-sm rounded-xl border-border/80"
                disabled={isImporting}
              />
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink mx-3 text-xs text-muted-foreground uppercase font-semibold">hoặc dán trực tiếp mã JSON</span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Mã JSON câu hỏi</Label>
              <Textarea
                rows={8}
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='[{"part_number": 1, "display_order": 1, "question_text": "...", "answers": [{"answer_text": "A", "is_correct": true}]}]'
                className="font-mono text-xs rounded-xl border-border/80"
                disabled={isImporting}
              />
            </div>

            {isImporting && (
              <div className="space-y-2 p-3 bg-muted/40 rounded-xl border border-border">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-primary">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> {importStatusText}
                  </span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="h-2" />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
            <Button variant="outline" className="rounded-xl font-semibold active:scale-95 duration-120" onClick={() => setImportDialogOpen(false)} disabled={isImporting}>
              Hủy
            </Button>
            <Button className="btn-3d btn-3d-primary font-bold rounded-xl active:scale-95 duration-120" onClick={handleImportJSON} disabled={isImporting || (!importJson.trim() && !importFile)}>
              {isImporting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Bắt đầu Nhập dữ liệu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
