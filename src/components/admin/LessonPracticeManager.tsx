
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Clock, Edit } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LessonPracticeManagerProps {
  lessonId: number;
  courseId: number;
}

const LessonPracticeManager = ({ lessonId, courseId }: LessonPracticeManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: practices = [] } = useQuery({
    queryKey: ["lesson-practices", lessonId],
    queryFn: async () => {
      const { data } = await supabase.from("lesson_practices").select("*, quizzes(title, total_questions)").eq("lesson_id", lessonId).order("trigger_at_seconds");
      return data ?? [];
    },
  });

  // Get all quizzes in the course for selection
  const { data: availableQuizzes = [] } = useQuery({
    queryKey: ["course-quizzes-for-practice", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quizzes")
        .select("id, title, total_questions, modules!inner(course_id)")
        .eq("modules.course_id", courseId);
      return data ?? [];
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPractice, setEditingPractice] = useState<any>(null);
  const [practiceTitle, setPracticeTitle] = useState("");
  const [triggerMinutes, setTriggerMinutes] = useState(0);
  const [triggerSeconds, setTriggerSeconds] = useState(0);
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const triggerAt = triggerMinutes * 60 + triggerSeconds;
      const payload = {
        lesson_id: lessonId,
        quiz_id: selectedQuizId ? Number(selectedQuizId) : null,
        trigger_at_seconds: triggerAt,
        title: practiceTitle,
        display_order: editingPractice ? editingPractice.display_order : practices.length,
      };
      if (editingPractice) {
        await supabase.from("lesson_practices").update(payload).eq("id", editingPractice.id);
      } else {
        await supabase.from("lesson_practices").insert(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-practices", lessonId] });
      setDialogOpen(false);
      toast({ title: "Đã lưu bài luyện tập" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await supabase.from("lesson_practices").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-practices", lessonId] });
      toast({ title: "Đã xóa" });
    },
  });

  const openNew = () => {
    setEditingPractice(null);
    setPracticeTitle("");
    setTriggerMinutes(0);
    setTriggerSeconds(0);
    setSelectedQuizId("");
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingPractice(p);
    setPracticeTitle(p.title);
    setTriggerMinutes(Math.floor(p.trigger_at_seconds / 60));
    setTriggerSeconds(p.trigger_at_seconds % 60);
    setSelectedQuizId(p.quiz_id?.toString() || "");
    setDialogOpen(true);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">⏱️ Popup luyện tập trong video</span>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={openNew}><Plus className="w-3 h-3 mr-1" /> Thêm</Button>
      </div>

      {practices.map((p: any) => (
        <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 bg-card rounded border text-xs group">
          <Clock className="w-3 h-3 text-primary shrink-0" />
          <span className="font-mono text-primary">{formatTime(p.trigger_at_seconds)}</span>
          <span className="text-foreground flex-1 truncate">{p.title || p.quizzes?.title || "Bài tập"}</span>
          <span className="text-muted-foreground">{p.quizzes?.total_questions || 0} câu</span>
          <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-6 w-6" onClick={() => openEdit(p)}><Edit className="w-3 h-3" /></Button>
          <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-6 w-6" onClick={() => { if (confirm("Xóa?")) deleteMutation.mutate(p.id); }}><Trash2 className="w-3 h-3 text-destructive" /></Button>
        </div>
      ))}

      {practices.length === 0 && <p className="text-xs text-muted-foreground">Chưa có popup luyện tập. Thêm để tạo bài tập tự động xuất hiện khi xem video.</p>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPractice ? "Sửa popup luyện tập" : "Thêm popup luyện tập"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input value={practiceTitle} onChange={(e) => setPracticeTitle(e.target.value)} placeholder="VD: Luyện tập giữa bài" />
            </div>
            <div className="space-y-2">
              <Label>Thời điểm popup (phút:giây)</Label>
              <div className="flex gap-2 items-center">
                <Input type="number" min={0} value={triggerMinutes} onChange={(e) => setTriggerMinutes(Number(e.target.value))} className="w-20" />
                <span>:</span>
                <Input type="number" min={0} max={59} value={triggerSeconds} onChange={(e) => setTriggerSeconds(Number(e.target.value))} className="w-20" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Chọn Quiz</Label>
              <Select value={selectedQuizId} onValueChange={setSelectedQuizId}>
                <SelectTrigger><SelectValue placeholder="Chọn quiz..." /></SelectTrigger>
                <SelectContent>
                  {availableQuizzes.map((q: any) => (
                    <SelectItem key={q.id} value={q.id.toString()}>{q.title} ({q.total_questions} câu)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !selectedQuizId}>
              {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LessonPracticeManager;
