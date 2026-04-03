
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Upload, Image, Music } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface QuizManagerProps {
  quizId: number;
  courseId: number;
}

const QuizManager = ({ quizId, courseId }: QuizManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: questions = [] } = useQuery({
    queryKey: ["quiz-questions-admin", quizId],
    queryFn: async () => {
      const { data } = await supabase.from("questions").select("*, answers(*)").eq("quiz_id", quizId).order("display_order");
      return (data ?? []).map((q: any) => ({ ...q, answers: (q.answers ?? []).sort((a: any, b: any) => a.display_order - b.display_order) }));
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQ, setEditingQ] = useState<any>(null);
  const [qText, setQText] = useState("");
  const [qImageUrl, setQImageUrl] = useState("");
  const [qAudioUrl, setQAudioUrl] = useState("");
  const [qType, setQType] = useState("multiple_choice");
  const [answerFields, setAnswerFields] = useState([
    { text: "", is_correct: false, explanation: "" },
    { text: "", is_correct: false, explanation: "" },
    { text: "", is_correct: false, explanation: "" },
    { text: "", is_correct: false, explanation: "" },
  ]);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openNew = () => {
    setEditingQ(null);
    setQText("");
    setQImageUrl("");
    setQAudioUrl("");
    setQType("multiple_choice");
    setAnswerFields([
      { text: "", is_correct: false, explanation: "" },
      { text: "", is_correct: false, explanation: "" },
      { text: "", is_correct: false, explanation: "" },
      { text: "", is_correct: false, explanation: "" },
    ]);
    setDialogOpen(true);
  };

  const openEdit = (q: any) => {
    setEditingQ(q);
    setQText(q.question_text);
    setQImageUrl(q.image_url || "");
    setQAudioUrl(q.audio_url || "");
    setQType(q.question_type || "multiple_choice");
    const answers = q.answers.length > 0
      ? q.answers.map((a: any) => ({ text: a.answer_text, is_correct: a.is_correct, explanation: a.explanation || "" }))
      : [{ text: "", is_correct: false, explanation: "" }, { text: "", is_correct: false, explanation: "" }, { text: "", is_correct: false, explanation: "" }, { text: "", is_correct: false, explanation: "" }];
    setAnswerFields(answers);
    setDialogOpen(true);
  };

  const saveQuestionMutation = useMutation({
    mutationFn: async () => {
      let questionId: number;
      if (editingQ) {
        await supabase.from("questions").update({
          question_text: qText,
          image_url: qImageUrl || null,
          audio_url: qAudioUrl || null,
          question_type: qType,
        }).eq("id", editingQ.id);
        questionId = editingQ.id;
        // Delete old answers and re-insert
        await supabase.from("answers").delete().eq("question_id", questionId);
      } else {
        const { data, error } = await supabase.from("questions").insert({
          quiz_id: quizId,
          question_text: qText,
          image_url: qImageUrl || null,
          audio_url: qAudioUrl || null,
          question_type: qType,
          display_order: questions.length,
        }).select("id").single();
        if (error) throw error;
        questionId = data.id;
      }
      // Insert answers
      const validAnswers = answerFields.filter(a => a.text.trim());
      if (validAnswers.length > 0) {
        await supabase.from("answers").insert(
          validAnswers.map((a, i) => ({
            question_id: questionId,
            answer_text: a.text,
            is_correct: a.is_correct,
            explanation: a.explanation || null,
            display_order: i,
          }))
        );
      }
      // Update quiz total_questions
      const { count } = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("quiz_id", quizId);
      await supabase.from("quizzes").update({ total_questions: (count ?? 0) + (editingQ ? 0 : 1) }).eq("id", quizId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions-admin", quizId] });
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      setDialogOpen(false);
      toast({ title: "Đã lưu câu hỏi" });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      await supabase.from("answers").delete().eq("question_id", id);
      await supabase.from("questions").delete().eq("id", id);
      const { count } = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("quiz_id", quizId);
      await supabase.from("quizzes").update({ total_questions: count ?? 0 }).eq("id", quizId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions-admin", quizId] });
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      toast({ title: "Đã xóa câu hỏi" });
    },
  });

  // Import CSV
  const importMutation = useMutation({
    mutationFn: async () => {
      const lines = importText.trim().split("\n").filter(l => l.trim());
      if (lines.length < 2) throw new Error("Cần ít nhất header + 1 dòng dữ liệu");
      // Format: question_text,answer_a,answer_b,answer_c,answer_d,correct(A/B/C/D),image_url,audio_url,explanation
      const rows = lines.slice(1);
      for (let i = 0; i < rows.length; i++) {
        const cols = rows[i].split("\t").length > 1 ? rows[i].split("\t") : rows[i].split(",");
        if (cols.length < 6) continue;
        const [questionText, a, b, c, d, correct, imgUrl, audioUrl, explanation] = cols.map(s => s?.trim());
        const correctIdx = "ABCD".indexOf(correct?.toUpperCase());

        const { data: qData } = await supabase.from("questions").insert({
          quiz_id: quizId,
          question_text: questionText,
          image_url: imgUrl || null,
          audio_url: audioUrl || null,
          question_type: "multiple_choice",
          display_order: questions.length + i,
        }).select("id").single();

        if (qData) {
          const answers = [a, b, c, d].filter(Boolean).map((text, idx) => ({
            question_id: qData.id,
            answer_text: text,
            is_correct: idx === correctIdx,
            explanation: idx === correctIdx ? (explanation || null) : null,
            display_order: idx,
          }));
          await supabase.from("answers").insert(answers);
        }
      }
      // Update total
      const { count } = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("quiz_id", quizId);
      await supabase.from("quizzes").update({ total_questions: count ?? 0 }).eq("id", quizId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions-admin", quizId] });
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      setImportDialogOpen(false);
      setImportText("");
      toast({ title: "Import thành công!" });
    },
    onError: (e: any) => toast({ title: "Lỗi import", description: e.message, variant: "destructive" }),
  });

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportText(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{questions.length} câu hỏi</span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setImportDialogOpen(true)}><Upload className="w-3 h-3 mr-1" /> Import</Button>
          <Button size="sm" variant="outline" onClick={openNew}><Plus className="w-3 h-3 mr-1" /> Thêm câu</Button>
        </div>
      </div>

      <div className="space-y-1 max-h-60 overflow-y-auto">
        {questions.map((q: any, i: number) => (
          <div key={q.id} className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-muted/30 group text-xs">
            <span className="text-muted-foreground font-mono w-6 shrink-0">{i + 1}.</span>
            <div className="flex-1 min-w-0">
              <p className="text-foreground truncate">{q.question_text}</p>
              <div className="flex gap-2 mt-0.5">
                {q.image_url && <span className="text-blue-500"><Image className="w-3 h-3 inline" /> Hình</span>}
                {q.audio_url && <span className="text-orange-500"><Music className="w-3 h-3 inline" /> Audio</span>}
                <span className="text-muted-foreground">{q.answers.length} đáp án</span>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-6 w-6" onClick={() => openEdit(q)}><Edit className="w-3 h-3" /></Button>
            <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-6 w-6" onClick={() => { if (confirm("Xóa câu hỏi?")) deleteQuestionMutation.mutate(q.id); }}><Trash2 className="w-3 h-3 text-destructive" /></Button>
          </div>
        ))}
      </div>

      {/* Question Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQ ? "Sửa câu hỏi" : "Thêm câu hỏi"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Câu hỏi</Label>
              <Textarea value={qText} onChange={(e) => setQText(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>URL hình ảnh (Part 1, 6, 7)</Label>
                <Input value={qImageUrl} onChange={(e) => setQImageUrl(e.target.value)} placeholder="https://..." />
                {qImageUrl && <img src={qImageUrl} alt="preview" className="w-32 h-20 object-cover rounded border" />}
              </div>
              <div className="space-y-2">
                <Label>URL audio (Part 1-4)</Label>
                <Input value={qAudioUrl} onChange={(e) => setQAudioUrl(e.target.value)} placeholder="https://..." />
                {qAudioUrl && <audio controls src={qAudioUrl} className="w-full h-8" />}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Đáp án (tick = đáp án đúng)</Label>
              {answerFields.map((ans, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Checkbox checked={ans.is_correct} onCheckedChange={(v) => {
                    const next = answerFields.map((a, j) => ({ ...a, is_correct: j === i ? !!v : false }));
                    setAnswerFields(next);
                  }} className="mt-2.5" />
                  <div className="flex-1 space-y-1">
                    <Input value={ans.text} onChange={(e) => {
                      const next = [...answerFields];
                      next[i] = { ...next[i], text: e.target.value };
                      setAnswerFields(next);
                    }} placeholder={`Đáp án ${String.fromCharCode(65 + i)}`} />
                    {ans.is_correct && (
                      <Input value={ans.explanation} onChange={(e) => {
                        const next = [...answerFields];
                        next[i] = { ...next[i], explanation: e.target.value };
                        setAnswerFields(next);
                      }} placeholder="Giải thích (tùy chọn)" className="text-xs" />
                    )}
                  </div>
                  {answerFields.length > 2 && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setAnswerFields(prev => prev.filter((_, j) => j !== i))}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
              {answerFields.length < 6 && (
                <Button size="sm" variant="ghost" onClick={() => setAnswerFields(prev => [...prev, { text: "", is_correct: false, explanation: "" }])}>
                  <Plus className="w-3 h-3 mr-1" /> Thêm đáp án
                </Button>
              )}
            </div>

            <Button onClick={() => saveQuestionMutation.mutate()} disabled={saveQuestionMutation.isPending || !qText.trim()}>
              {saveQuestionMutation.isPending ? "Đang lưu..." : "Lưu câu hỏi"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import câu hỏi từ CSV/TSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Format: <code>question_text, answer_a, answer_b, answer_c, answer_d, correct(A/B/C/D), image_url, audio_url, explanation</code>
              <br />Dòng đầu tiên là header. Hỗ trợ CSV (dấu phẩy) hoặc TSV (tab).
            </p>
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFileImport} className="text-sm" />
              <Button size="sm" variant="outline" onClick={() => {
                const template = "question_text\tanswer_a\tanswer_b\tanswer_c\tanswer_d\tcorrect\timage_url\taudio_url\texplanation\nWhat is shown in the picture?\tA man reading\tA woman cooking\tA child playing\tA dog sleeping\tA\t\t\tThe image shows a man reading";
                const blob = new Blob([template], { type: "text/tab-separated-values" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "template_questions.tsv";
                a.click();
              }}>📥 Tải template</Button>
            </div>
            <Textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={8} placeholder="Dán dữ liệu ở đây..." className="font-mono text-xs" />
            <Button onClick={() => importMutation.mutate()} disabled={importMutation.isPending || !importText.trim()}>
              {importMutation.isPending ? "Đang import..." : `Import (${(importText.trim().split("\n").length - 1)} câu)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuizManager;
