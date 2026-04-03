
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Video, FileQuestion, BookOpen } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QuizManager from "./QuizManager";
import LessonPracticeManager from "./LessonPracticeManager";

interface LessonManagerProps {
  moduleId: number;
  courseId: number;
  lessons: any[];
  quizzes: any[];
}

const lessonTypeLabels: Record<string, string> = {
  video: "🎬 Bài giảng Video",
  practice: "📝 Luyện tập",
  exam: "📋 Bài thi Online",
};

const LessonManager = ({ moduleId, courseId, lessons, quizzes }: LessonManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonType, setLessonType] = useState("video");
  const [videoUrl, setVideoUrl] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const [expandedQuiz, setExpandedQuiz] = useState<number | null>(null);

  const saveLessonMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: lessonTitle,
        lesson_type: lessonType,
        video_url: lessonType === "video" ? videoUrl : null,
        duration_seconds: durationSeconds,
        module_id: moduleId,
        display_order: editingLesson ? editingLesson.display_order : lessons.length,
      };
      if (editingLesson) {
        const { error } = await supabase.from("lessons").update(payload).eq("id", editingLesson.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lessons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      setDialogOpen(false);
      toast({ title: editingLesson ? "Đã cập nhật bài học" : "Đã tạo bài học" });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      toast({ title: "Đã xóa bài học" });
    },
  });

  // Quiz CRUD
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizTotalQ, setQuizTotalQ] = useState(10);
  const [quizTimeLimit, setQuizTimeLimit] = useState(0);

  const saveQuizMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: quizTitle,
        total_questions: quizTotalQ,
        time_limit_seconds: quizTimeLimit || null,
        module_id: moduleId,
        display_order: editingQuiz ? editingQuiz.display_order : quizzes.length,
      };
      if (editingQuiz) {
        const { error } = await supabase.from("quizzes").update(payload).eq("id", editingQuiz.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("quizzes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      setQuizDialogOpen(false);
      toast({ title: editingQuiz ? "Đã cập nhật quiz" : "Đã tạo quiz" });
    },
  });

  const deleteQuizMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("quizzes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      toast({ title: "Đã xóa quiz" });
    },
  });

  const openNewLesson = () => {
    setEditingLesson(null);
    setLessonTitle("");
    setLessonType("video");
    setVideoUrl("");
    setDurationSeconds(0);
    setDialogOpen(true);
  };

  const openEditLesson = (l: any) => {
    setEditingLesson(l);
    setLessonTitle(l.title);
    setLessonType(l.lesson_type || "video");
    setVideoUrl(l.video_url || "");
    setDurationSeconds(l.duration_seconds || 0);
    setDialogOpen(true);
  };

  const openNewQuiz = () => {
    setEditingQuiz(null);
    setQuizTitle("");
    setQuizTotalQ(10);
    setQuizTimeLimit(0);
    setQuizDialogOpen(true);
  };

  const openEditQuiz = (q: any) => {
    setEditingQuiz(q);
    setQuizTitle(q.title);
    setQuizTotalQ(q.total_questions);
    setQuizTimeLimit(q.time_limit_seconds || 0);
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
      <div className="space-y-1">
        {sortedLessons.map((l: any) => (
          <div key={l.id}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/30 group">
              {l.lesson_type === "video" && <Video className="w-4 h-4 text-blue-500 shrink-0" />}
              {l.lesson_type === "practice" && <FileQuestion className="w-4 h-4 text-orange-500 shrink-0" />}
              {l.lesson_type === "exam" && <BookOpen className="w-4 h-4 text-red-500 shrink-0" />}
              {!l.lesson_type && <Video className="w-4 h-4 text-blue-500 shrink-0" />}
              <button onClick={() => setExpandedLesson(expandedLesson === l.id ? null : l.id)} className="text-sm text-foreground flex-1 text-left truncate">
                {l.title}
              </button>
              <span className="text-xs text-muted-foreground">{lessonTypeLabels[l.lesson_type] || "Video"}</span>
              <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => openEditLesson(l)}><Edit className="w-3 h-3" /></Button>
              <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => { if (confirm("Xóa?")) deleteLessonMutation.mutate(l.id); }}><Trash2 className="w-3 h-3 text-destructive" /></Button>
            </div>
            {expandedLesson === l.id && l.lesson_type === "video" && (
              <div className="ml-8 mb-2 p-3 bg-muted/20 rounded-lg border">
                <LessonPracticeManager lessonId={l.id} courseId={courseId} />
              </div>
            )}
          </div>
        ))}
        {sortedLessons.length === 0 && <p className="text-xs text-muted-foreground px-3">Chưa có bài học</p>}
      </div>

      {/* Quizzes */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-xs font-semibold text-muted-foreground uppercase">Quiz / Bài thi</span>
        <Button size="sm" variant="outline" onClick={openNewQuiz}><Plus className="w-3 h-3 mr-1" /> Thêm Quiz</Button>
      </div>
      <div className="space-y-1">
        {sortedQuizzes.map((q: any) => (
          <div key={q.id}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/30 group">
              <FileQuestion className="w-4 h-4 text-emerald-500 shrink-0" />
              <button onClick={() => setExpandedQuiz(expandedQuiz === q.id ? null : q.id)} className="text-sm text-foreground flex-1 text-left truncate">
                {q.title}
              </button>
              <span className="text-xs text-muted-foreground">{q.total_questions} câu</span>
              <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => openEditQuiz(q)}><Edit className="w-3 h-3" /></Button>
              <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => { if (confirm("Xóa?")) deleteQuizMutation.mutate(q.id); }}><Trash2 className="w-3 h-3 text-destructive" /></Button>
            </div>
            {expandedQuiz === q.id && (
              <div className="ml-8 mb-2 p-3 bg-muted/20 rounded-lg border">
                <QuizManager quizId={q.id} courseId={courseId} />
              </div>
            )}
          </div>
        ))}
        {sortedQuizzes.length === 0 && <p className="text-xs text-muted-foreground px-3">Chưa có quiz</p>}
      </div>

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
              <Label>Loại bài học</Label>
              <Select value={lessonType} onValueChange={setLessonType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">🎬 Bài giảng Video</SelectItem>
                  <SelectItem value="practice">📝 Luyện tập</SelectItem>
                  <SelectItem value="exam">📋 Bài thi Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {lessonType === "video" && (
              <div className="space-y-2">
                <Label>Link video (YouTube embed URL)</Label>
                <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/embed/..." />
              </div>
            )}
            <div className="space-y-2">
              <Label>Thời lượng (giây)</Label>
              <Input type="number" value={durationSeconds} onChange={(e) => setDurationSeconds(Number(e.target.value))} />
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
                <Input type="number" value={quizTotalQ} onChange={(e) => setQuizTotalQ(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Giới hạn thời gian (giây, 0=không)</Label>
                <Input type="number" value={quizTimeLimit} onChange={(e) => setQuizTimeLimit(Number(e.target.value))} />
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

export default LessonManager;
