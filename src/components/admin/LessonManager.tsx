
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Video, FileQuestion, BookOpen, ChevronDown, ChevronRight, GripVertical, FileText, Upload, Volume2, Eye, EyeOff, Unlock, Lock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  createLesson,
  deleteLesson,
  patchLesson,
  reorderLessons,
  updateLesson,
} from "@/lib/api/learning";
import {
  createLessonQuiz,
  createModuleQuiz,
  deleteModuleQuiz,
  updateModuleQuiz,
} from "@/lib/api/assessment";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QuizManager from "./QuizManager";
import LessonPracticeManager from "./LessonPracticeManager";
import AdminLessonVocab from "./AdminLessonVocab";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface LessonManagerProps {
  moduleId: number;
  courseId: number;
  lessons: any[];
  quizzes: any[];
}

const lessonTypeLabels: Record<string, string> = {
  video: "🎬 Bài giảng",
  practice: "📝 Luyện tập",
  exam: "📋 Bài thi Online",
  dictation: "🎧 Luyện nghe điền từ",
};

const SortableLessonItem = ({
  l,
  isExpanded,
  setExpandedLesson,
  openEditLesson,
  deleteLessonMutation,
  courseId,
  queryClient,
  toast,
}: {
  l: any;
  isExpanded: boolean;
  setExpandedLesson: (id: number | null) => void;
  openEditLesson: (l: any) => void;
  deleteLessonMutation: any;
  courseId: number;
  queryClient: any;
  toast: any;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `lesson-${l.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/30 group">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-0.5 hover:bg-muted rounded shrink-0">
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button onClick={() => setExpandedLesson(isExpanded ? null : l.id)} className="shrink-0">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>
        {l.lesson_type === "video" && !l.pdf_url && <Video className="w-4 h-4 text-blue-500 shrink-0" />}
        {l.lesson_type === "video" && l.pdf_url && <FileText className="w-4 h-4 text-amber-600 shrink-0" />}
        {l.lesson_type === "practice" && <FileQuestion className="w-4 h-4 text-orange-500 shrink-0" />}
        {l.lesson_type === "exam" && <BookOpen className="w-4 h-4 text-red-500 shrink-0" />}
        {l.lesson_type === "dictation" && <Volume2 className="w-4 h-4 text-purple-500 shrink-0" />}
        {!l.lesson_type && <Video className="w-4 h-4 text-blue-500 shrink-0" />}
        <button onClick={() => setExpandedLesson(isExpanded ? null : l.id)} className={`text-sm flex-1 text-left truncate ${l.is_published === false ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
          {l.title}
        </button>
        <span className="text-xs text-muted-foreground">
          {l.lesson_type === "video" && l.pdf_url ? "📄 PDF" : lessonTypeLabels[l.lesson_type] || "Video"}
        </span>
        <Button 
          size="icon" 
          variant="ghost" 
          className={`h-7 w-7 ${l.is_free ? 'text-emerald-600' : 'text-muted-foreground'}`}
          onClick={(e) => {
            e.stopPropagation();
            const newStatus = !l.is_free;
            patchLesson(l.id, { is_free: newStatus }).then(({ error }: any) => {
              if (error) {
                toast({ title: "Lỗi", description: error.message, variant: "destructive" });
                return;
              }
              queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
              toast({ title: newStatus ? "Đã bật học thử bài học" : "Đã tắt học thử bài học" });
            });
          }}
          title={l.is_free ? "Bài học miễn phí" : "Bài học trả phí"}
        >
          {l.is_free ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
        </Button>
        <Button 
          size="icon" 
          variant="ghost" 
          className={`h-7 w-7 ${l.is_published === false ? 'text-muted-foreground' : 'text-primary'}`}
          onClick={(e) => {
            e.stopPropagation();
            const newStatus = l.is_published === false ? true : false;
            patchLesson(l.id, { is_published: newStatus }).then(({ error }: any) => {
              if (error) {
                toast({ title: "Lỗi", description: error.message, variant: "destructive" });
                return;
              }
              queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
              toast({ title: newStatus ? "Đã hiện bài học" : "Đã ẩn bài học" });
            });
          }}
          title={l.is_published === false ? "Hiện bài học" : "Ẩn bài học"}
        >
          {l.is_published === false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </Button>
        <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => openEditLesson(l)}><Edit className="w-3 h-3" /></Button>
        <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => { if (confirm("Xóa?")) deleteLessonMutation.mutate(l.id); }}><Trash2 className="w-3 h-3 text-destructive" /></Button>
      </div>
      {isExpanded && (
        <div className="ml-8 mb-2 p-3 bg-muted/20 rounded-lg border space-y-3">
          {/* Video/PDF lessons: show practice popup config */}
          {l.lesson_type === "video" && !l.pdf_url && (
            <LessonPracticeManager lessonId={l.id} courseId={courseId} />
          )}
          {l.lesson_type === "video" && l.pdf_url && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">📄 Tài liệu PDF</p>
              <a href={l.pdf_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
                {l.pdf_url}
              </a>
            </div>
          )}
          {/* Exam/Practice/Dictation lessons: show QuizManager for questions */}
          {(l.lesson_type === "exam" || l.lesson_type === "practice" || l.lesson_type === "dictation") && l.quiz_id && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileQuestion className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Quản lý câu hỏi</span>
              </div>
              <QuizManager quizId={l.quiz_id} courseId={courseId} lessonType={l.lesson_type} lessonId={l.id} />
            </div>
          )}
          {(l.lesson_type === "exam" || l.lesson_type === "practice" || l.lesson_type === "dictation") && !l.quiz_id && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">Bài học chưa có quiz liên kết.</p>
              <CreateQuizForLesson lessonId={l.id} moduleId={l.module_id} courseId={courseId} quizzesCount={0} lessonTitle={l.title} />
            </div>
          )}
          
          <AdminLessonVocab lessonId={l.id} lessonTitle={l.title} />
        </div>
      )}
    </div>
  );
};

const LessonManager = ({ moduleId, courseId, lessons, quizzes }: LessonManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonType, setLessonType] = useState("video");
  const [videoUrl, setVideoUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [durationVal, setDurationVal] = useState<number | "">(60);
  const [durationUnit, setDurationUnit] = useState("minutes");
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const [expandedQuiz, setExpandedQuiz] = useState<number | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleLessonDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sorted = [...lessons].sort((a, b) => a.display_order - b.display_order);
    const oldIndex = sorted.findIndex((l: any) => `lesson-${l.id}` === active.id);
    const newIndex = sorted.findIndex((l: any) => `lesson-${l.id}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sorted, oldIndex, newIndex);

    await reorderLessons(moduleId, reordered.map((l: any) => l.id));
    queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
    toast({ title: "Đã sắp xếp lại bài học" });
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
      const path = `lesson_pdfs/${Date.now()}_${sanitizedName}`;
      const { error: uploadErr } = await supabase.storage.from("materials").upload(path, file, { upsert: true });
      if (uploadErr) {
        toast({ title: "Lỗi upload", description: uploadErr.message, variant: "destructive" });
        return;
      }
      const { data: urlData } = supabase.storage.from("materials").getPublicUrl(path);
      setPdfUrl(urlData.publicUrl);
      toast({ title: "Đã tải PDF lên thành công" });
    } catch (err: any) {
      toast({ title: "Lỗi upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingPdf(false);
      e.target.value = '';
    }
  };

  const saveLessonMutation = useMutation({
    mutationFn: async () => {
      const body = {
        title: lessonTitle,
        lesson_type: lessonType,
        video_url: lessonType === "video" && videoUrl ? videoUrl : null,
        pdf_url: lessonType === "video" && pdfUrl ? pdfUrl : null,
        duration_seconds: durationUnit === "minutes" ? (Number(durationVal) || 0) * 60 : (Number(durationVal) || 0),
      };

      if (editingLesson) {
        const { error } = await updateLesson(editingLesson.id, body);
        if (error) throw error;
      } else {
        const { error } = await createLesson(moduleId, body);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      setDialogOpen(false);
      toast({ title: editingLesson ? "Đã cập nhật bài học" : "Đã tạo bài học" });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await deleteLesson(id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      toast({ title: "Đã xóa bài học" });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  // Quiz CRUD (standalone quizzes in module)
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizTotalQ, setQuizTotalQ] = useState<number | "">(10);
  const [quizTimeLimitVal, setQuizTimeLimitVal] = useState<number | "">(60);
  const [quizTimeLimitUnit, setQuizTimeLimitUnit] = useState("minutes");

  const saveQuizMutation = useMutation({
    mutationFn: async () => {
      const body = {
        title: quizTitle,
        total_questions: Number(quizTotalQ) || 0,
        time_limit_seconds: (quizTimeLimitUnit === "minutes" ? (Number(quizTimeLimitVal) || 0) * 60 : (Number(quizTimeLimitVal) || 0)) || null,
      };
      if (editingQuiz) {
        const { error } = await updateModuleQuiz(editingQuiz.id, body);
        if (error) throw error;
      } else {
        const { error } = await createModuleQuiz(moduleId, body);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      setQuizDialogOpen(false);
      toast({ title: editingQuiz ? "Đã cập nhật quiz" : "Đã tạo quiz" });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const deleteQuizMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await deleteModuleQuiz(id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      toast({ title: "Đã xóa quiz" });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const openNewLesson = () => {
    setEditingLesson(null);
    setLessonTitle("");
    setLessonDescription("");
    setLessonType("video");
    setVideoUrl("");
    setPdfUrl("");
    setDurationVal(60);
    setDurationUnit("minutes");
    setDialogOpen(true);
  };

  const openEditLesson = (l: any) => {
    setEditingLesson(l);
    setLessonTitle(l.title);
    setLessonDescription(l.description || "");
    setLessonType(l.lesson_type || "video");
    setVideoUrl(l.video_url || "");
    setPdfUrl(l.pdf_url || "");
    const ds = l.duration_seconds || 0;
    if (ds > 0 && ds % 60 === 0) {
      setDurationVal(ds / 60);
      setDurationUnit("minutes");
    } else {
      setDurationVal(ds);
      setDurationUnit("seconds");
    }
    setDialogOpen(true);
  };

  const openNewQuiz = () => {
    setEditingQuiz(null);
    setQuizTitle("");
    setQuizTotalQ(10);
    setQuizTimeLimitVal(60);
    setQuizTimeLimitUnit("minutes");
    setQuizDialogOpen(true);
  };

  const openEditQuiz = (q: any) => {
    setEditingQuiz(q);
    setQuizTitle(q.title);
    setQuizTotalQ(q.total_questions);
    const tl = q.time_limit_seconds || 0;
    if (tl > 0 && tl % 60 === 0) {
      setQuizTimeLimitVal(tl / 60);
      setQuizTimeLimitUnit("minutes");
    } else {
      setQuizTimeLimitVal(tl);
      setQuizTimeLimitUnit("seconds");
    }
    setQuizDialogOpen(true);
  };

  const sortedLessons = [...lessons].sort((a, b) => a.display_order - b.display_order);
  const sortedQuizzes = [...quizzes].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="space-y-3">
      {/* Lessons */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase">Bài học</span>
        <Button size="sm" variant="outline" onClick={openNewLesson}><Plus className="w-3 h-3 mr-1" /> Thêm bài</Button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd}>
        <SortableContext items={sortedLessons.map((l: any) => `lesson-${l.id}`)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {sortedLessons.map((l: any) => (
              <SortableLessonItem
                key={l.id}
                l={l}
                isExpanded={expandedLesson === l.id}
                setExpandedLesson={setExpandedLesson}
                openEditLesson={openEditLesson}
                deleteLessonMutation={deleteLessonMutation}
                courseId={courseId}
                queryClient={queryClient}
                toast={toast}
              />
            ))}
            {sortedLessons.length === 0 && <p className="text-xs text-muted-foreground px-3">Chưa có bài học</p>}
          </div>
        </SortableContext>
      </DndContext>

      {/* Quizzes removed per user request - use Lesson type practice/exam instead */}

      {/* Lesson Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Sửa bài học" : "Thêm bài học"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tên bài học</Label>
              <Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="VD: Bài 1 - Mô tả tranh" />
            </div>
            <div className="space-y-2">
              <Label>Mô tả bài học</Label>
              <Textarea value={lessonDescription} onChange={(e) => setLessonDescription(e.target.value)} placeholder="Mô tả ngắn về nội dung bài học..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Loại bài học</Label>
              <Select value={lessonType} onValueChange={setLessonType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">🎬 Bài giảng (Video / PDF)</SelectItem>
                  <SelectItem value="practice">📝 Luyện tập</SelectItem>
                  <SelectItem value="exam">📋 Bài thi Online</SelectItem>
                  <SelectItem value="dictation">🎧 Luyện nghe điền từ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {lessonType === "video" && (
              <div className="space-y-4 bg-muted/20 p-4 rounded-xl border">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Video className="w-4 h-4 text-blue-500" /> Link video (YouTube embed URL hoặc Link MP4)</Label>
                  <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/embed/... hoặc https://.../video.mp4" />
                  <p className="text-xs text-muted-foreground">Có thể để trống nếu chỉ muốn tải PDF.</p>
                </div>
                
                <div className="h-px bg-border my-2" />
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><FileText className="w-4 h-4 text-amber-600" /> File PDF đính kèm</Label>
                  {pdfUrl && (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span className="text-xs text-foreground truncate flex-1">{pdfUrl.split('/').pop()}</span>
                      <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={() => setPdfUrl("")}>Xóa</Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} placeholder="URL tài liệu PDF hoặc upload file bên dưới..." className="flex-1" />
                    <Button variant="outline" size="sm" asChild disabled={uploadingPdf}>
                      <label className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-1" />
                        {uploadingPdf ? "Đang tải..." : "Upload PDF"}
                        <input type="file" className="hidden" accept=".pdf" onChange={handlePdfUpload} />
                      </label>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    💡 Nếu có cả Video và PDF, bài học sẽ hiển thị 2 tab để học viên chuyển đổi.
                  </p>
                </div>
              </div>
            )}
            {(lessonType === "exam" || lessonType === "practice" || lessonType === "dictation") && (
              <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                💡 Sau khi tạo bài học, bạn có thể mở rộng bài học để cấu hình câu hỏi, đáp án, hình ảnh và audio.
                Quiz sẽ được tạo tự động khi lưu.
              </p>
            )}
            <div className="space-y-2">
              <Label>Thời lượng</Label>
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  className="flex-1" 
                  value={durationVal === 0 ? "" : durationVal} 
                  onChange={(e) => setDurationVal(e.target.value === "" ? "" : Number(e.target.value))} 
                />
                <Select value={durationUnit} onValueChange={setDurationUnit}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seconds">Giây</SelectItem>
                    <SelectItem value="minutes">Phút</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => saveLessonMutation.mutate()} disabled={saveLessonMutation.isPending || !lessonTitle.trim()}>
              {saveLessonMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quiz Dialog */}
      <Dialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingQuiz ? "Sửa Quiz" : "Thêm Quiz"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tên quiz</Label>
              <Input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} placeholder="VD: Luyện tập Part 1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Số câu hỏi</Label>
                <Input 
                  type="number" 
                  value={quizTotalQ === 0 ? "" : quizTotalQ} 
                  onChange={(e) => setQuizTotalQ(e.target.value === "" ? "" : Number(e.target.value))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Giới hạn TG (0=không)</Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    className="flex-1" 
                    value={quizTimeLimitVal === 0 ? "" : quizTimeLimitVal} 
                    onChange={(e) => setQuizTimeLimitVal(e.target.value === "" ? "" : Number(e.target.value))} 
                  />
                  <Select value={quizTimeLimitUnit} onValueChange={setQuizTimeLimitUnit}>
                    <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seconds">Giây</SelectItem>
                      <SelectItem value="minutes">Phút</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Button onClick={() => saveQuizMutation.mutate()} disabled={saveQuizMutation.isPending || !quizTitle.trim()}>
              {saveQuizMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper component to create quiz for existing exam/practice lessons without one
const CreateQuizForLesson = ({ lessonId, moduleId, courseId, quizzesCount, lessonTitle }: { lessonId: number; moduleId: number; courseId: number; quizzesCount: number; lessonTitle: string }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await createLessonQuiz(lessonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      toast({ title: "Đã tạo quiz cho bài học" });
    },
  });

  return (
    <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
      {createMutation.isPending ? "Đang tạo..." : "Tạo Quiz để cấu hình câu hỏi"}
    </Button>
  );
};

export default LessonManager;
