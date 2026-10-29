import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminLessonVocabQuiz,
  createAdminLessonVocabQuiz,
  getAdminLessonVocabWords,
  createAdminVocabWordsBatch,
  updateAdminVocabWord,
  deleteAdminVocabWord,
  bulkDeleteAdminVocabWords,
  getAllLessonsForVocab,
  getLessonQuestionsForVocab,
} from "@/lib/api/assessment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Download, Upload, Plus, Copy, Search, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminLessonVocab({ lessonId, lessonTitle, questionId }: { lessonId: number, lessonTitle: string, questionId?: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newWord, setNewWord] = useState({ word: "", definition_vi: "", phonetic: "", audio_url: "", example_sentence: "" });
  const [editOpen, setEditOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<{ id: number, word: string, definition_vi: string, phonetic: string, audio_url: string, example_sentence: string } | null>(null);

  const [copyOpen, setCopyOpen] = useState(false);
  const [searchLesson, setSearchLesson] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [selectedWords, setSelectedWords] = useState<number[]>([]);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<number[]>([]);

  const { data: quiz, isLoading: isQuizLoading } = useQuery({
    queryKey: ["lesson-vocab-quiz", lessonId],
    queryFn: async () => {
      const { data } = await getAdminLessonVocabQuiz(lessonId);
      return data;
    }
  });

  const { data: words, isLoading: isWordsLoading } = useQuery({
    queryKey: ["lesson-vocab-words", quiz?.id, questionId],
    queryFn: async () => {
      if (!quiz?.id) return [];
      const { data } = await getAdminLessonVocabWords(quiz.id, questionId);
      return data || [];
    },
    enabled: !!quiz?.id
  });
  
  const { data: allLessons } = useQuery({
    queryKey: ["all-lessons-for-copy"],
    queryFn: async () => {
      const { data } = await getAllLessonsForVocab();
      return data || [];
    },
    enabled: copyOpen
  });

  const { data: otherLessonWords } = useQuery({
    queryKey: ["lesson-words", selectedLessonId],
    queryFn: async () => {
      if (!selectedLessonId) return [];
      const { data: q } = await getAdminLessonVocabQuiz(selectedLessonId);
      if (!q) return [];
      const { data } = await getAdminLessonVocabWords(q.id);
      return data || [];
    },
    enabled: !!selectedLessonId
  });

  const { data: allQuestions } = useQuery({
    queryKey: ["all-questions-for-vocab", quiz?.id],
    queryFn: async () => {
      if (!quiz?.id) return [];
      const { data } = await getLessonQuestionsForVocab(lessonId);
      return data || [];
    },
    enabled: !!quiz?.id && !questionId
  });

  const getOrCreateQuiz = async () => {
    if (quiz) return quiz;
    const { data, error } = await createAdminLessonVocabQuiz(lessonId, {
      title: `Từ vựng - ${lessonTitle}`,
      display_order: 0,
    });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["lesson-vocab-quiz", lessonId] });
    return data;
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importText.trim()) throw new Error("Chưa có dữ liệu");
      
      const q = await getOrCreateQuiz();
      
      const lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
      
      const newQuestions = lines.map((line, lineIdx) => {
        // Simple CSV parser that handles quotes
        const row: string[] = [];
        let inQuotes = false;
        let currentField = "";
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if ((char === ',' || char === '\t') && !inQuotes) {
            row.push(currentField.trim());
            currentField = "";
          } else {
            currentField += char;
          }
        }
        row.push(currentField.trim());

        // Skip header
        if (lineIdx === 0 && row[0].toLowerCase().includes("word")) return null;
        
        // Map based on column count
        let word, def, phonetic, audio_url, example, qNum;
        
        if (row.length === 5) {
          // Format: Word, Definition, Phonetic, Example, Question #
          [word, def, phonetic, example, qNum] = row;
          audio_url = null;
        } else {
          // Format: Word, Definition, Phonetic, Audio URL, Example, Question # (6 columns or more)
          [word, def, phonetic, audio_url, example, qNum] = row;
        }
        
        // Clean up quotes if present
        const clean = (s: string | null | undefined) => {
          if (!s) return s;
          return s.replace(/^"|"$/g, '').trim();
        };

        word = clean(word);
        def = clean(def);
        phonetic = clean(phonetic);
        audio_url = clean(audio_url);
        example = clean(example);
        qNum = clean(qNum);

        if (!word || !def) return null;

        let targetQId = questionId || null;
        if (!targetQId && qNum && allQuestions) {
          const qIdx = parseInt(qNum) - 1;
          if (!isNaN(qIdx) && allQuestions[qIdx]) {
            targetQId = allQuestions[qIdx].id;
          }
        }

        return {
          vocab_quiz_id: q.id,
          word,
          definition_vi: def,
          phonetic: phonetic || null,
          audio_male_url: audio_url || null,
          example_sentence: example || null,
          question_id: targetQId,
          display_order: (words?.length || 0) + lineIdx
        };
      }).filter((item): item is any => item !== null);

      if (newQuestions.length > 0) {
        const { error: insertErr } = await createAdminVocabWordsBatch(q.id, newQuestions);
        if (insertErr) throw insertErr;
      }
    },
    onSuccess: () => {
      setImportOpen(false);
      setImportText("");
      // Invalidate all related queries to be safe
      queryClient.invalidateQueries({ queryKey: ["lesson-vocab-quiz", lessonId] });
      queryClient.invalidateQueries({ queryKey: ["lesson-vocab-words"] });
      toast({ title: "Import từ vựng thành công", description: "Đã thêm từ vựng mới vào danh sách." });
    },
    onError: (e: any) => {
      console.error("Import error:", e);
      toast({ 
        title: "Lỗi import", 
        description: e.message || "Đã xảy ra lỗi trong quá trình import dữ liệu.", 
        variant: "destructive" 
      });
    }
  });

  const addWordMutation = useMutation({
    mutationFn: async () => {
      if (!newWord.word || !newWord.definition_vi) throw new Error("Vui lòng điền đủ từ và nghĩa");
      const q = await getOrCreateQuiz();
      const { error } = await createAdminVocabWordsBatch(q.id, [{
        word: newWord.word,
        definition_vi: newWord.definition_vi,
        phonetic: newWord.phonetic || null,
        audio_male_url: newWord.audio_url || null,
        example_sentence: newWord.example_sentence || null,
        question_id: questionId || null,
        display_order: words?.length || 0
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      setAddOpen(false);
      setNewWord({ word: "", definition_vi: "", phonetic: "", audio_url: "", example_sentence: "" });
      queryClient.invalidateQueries({ queryKey: ["lesson-vocab-words"] });
      toast({ title: "Đã thêm từ vựng" });
    }
  });

  const updateWordMutation = useMutation({
    mutationFn: async () => {
      if (!editingWord || !editingWord.word || !editingWord.definition_vi) throw new Error("Vui lòng điền đủ từ và nghĩa");
      const { error } = await updateAdminVocabWord(editingWord.id, {
        word: editingWord.word,
        definition_vi: editingWord.definition_vi,
        phonetic: editingWord.phonetic || null,
        audio_male_url: editingWord.audio_url || null,
        example_sentence: editingWord.example_sentence || null,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      setEditOpen(false);
      setEditingWord(null);
      queryClient.invalidateQueries({ queryKey: ["lesson-vocab-words"] });
      toast({ title: "Đã cập nhật từ vựng" });
    },
    onError: (e: any) => {
      toast({ title: "Lỗi cập nhật", description: e.message, variant: "destructive" });
    }
  });

  const deleteWordMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await deleteAdminVocabWord(id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-vocab-words"] });
      toast({ title: "Đã xóa từ vựng" });
    }
  })

  const deleteMultipleWordsMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const { error } = await bulkDeleteAdminVocabWords(ids);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedDeleteIds([]);
      queryClient.invalidateQueries({ queryKey: ["lesson-vocab-words"] });
      toast({ title: "Đã xóa các từ vựng đã chọn" });
    }
  });

  const updateWordQuestion = useMutation({
    mutationFn: async ({ id, question_id }: { id: number, question_id: number | null }) => {
      const { error } = await updateAdminVocabWord(id, { question_id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-vocab-words"] });
      toast({ title: "Đã cập nhật liên kết câu hỏi" });
    }
  });

  const copyWordsMutation = useMutation({
    mutationFn: async () => {
      if (selectedWords.length === 0) throw new Error("Chưa chọn từ nào");
      const q = await getOrCreateQuiz();
      
      const wordsToCopy = otherLessonWords?.filter(w => selectedWords.includes(w.id)) || [];
      const newQuestions = wordsToCopy.map((w, i) => ({
        word: w.word,
        definition_vi: w.definition_vi,
        phonetic: w.phonetic,
        audio_male_url: w.audio_male_url,
        example_sentence: w.example_sentence,
        display_order: (words?.length || 0) + i
      }));

      const { error } = await createAdminVocabWordsBatch(q.id, newQuestions);
      if (error) throw error;
    },
    onSuccess: () => {
      setCopyOpen(false);
      setSelectedWords([]);
      setSelectedLessonId(null);
      queryClient.invalidateQueries({ queryKey: ["lesson-vocab-words"] });
      toast({ title: "Đã gộp từ vựng thành công" });
    }
  });

  const exportWords = () => {
    if (!words || words.length === 0) return toast({ title: "Không có dữ liệu để export" });
    const header = ["Word", "Definition", "Phonetic", "Audio URL", "Example Sentence", "Question #"].join(",");
    const rows = words.map(w => {
      const match = w.question_id && allQuestions ? allQuestions.find(q => q.id === w.question_id) : null;
      const qNum = match && match.display_order != null ? String(match.display_order + 1) : "";
      return [
        `"${w.word}"`,
        `"${w.definition_vi}"`,
        `"${w.phonetic || ""}"`,
        `"${w.audio_male_url || ""}"`,
        `"${w.example_sentence || ""}"`,
        `"${qNum}"`
      ].join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [header, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vocab_${lessonId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportText(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  if (isQuizLoading || isWordsLoading) return <div className="text-sm py-4">Đang tải...</div>

  return (
    <div className="bg-card p-5 sm:p-6 rounded-2xl border border-border/70 shadow-soft-sm mt-3 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/50">
        <h4 className="font-bold text-base text-foreground flex items-center gap-2">
          📚 Danh sách từ vựng ({words?.length || 0})
        </h4>
        <div className="flex flex-wrap gap-2">
          {selectedDeleteIds.length > 0 && (
            <Button size="sm" variant="destructive" className="rounded-xl font-bold active:scale-95 duration-120" onClick={() => { if(confirm(`Xóa ${selectedDeleteIds.length} từ đã chọn?`)) deleteMultipleWordsMutation.mutate(selectedDeleteIds); }}>
              <Trash2 className="w-4 h-4 mr-1.5"/> Xóa ({selectedDeleteIds.length})
            </Button>
          )}
          <Button size="sm" variant="outline" className="rounded-xl font-semibold border-border/80 shadow-soft-xs active:scale-95 duration-120" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-1.5 text-primary"/> Thêm</Button>
          <Button size="sm" variant="outline" className="rounded-xl font-semibold border-border/80 shadow-soft-xs active:scale-95 duration-120" onClick={() => setCopyOpen(true)}><Copy className="w-4 h-4 mr-1.5 text-muted-foreground"/> Gộp từ bài khác</Button>
          <Button size="sm" variant="outline" className="rounded-xl font-semibold border-border/80 shadow-soft-xs active:scale-95 duration-120" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-1.5 text-muted-foreground"/> Import</Button>
          <Button size="sm" variant="outline" className="rounded-xl font-semibold border-border/80 shadow-soft-xs active:scale-95 duration-120" onClick={exportWords}><Download className="w-4 h-4 mr-1.5 text-muted-foreground"/> Export</Button>
        </div>
      </div>

      <div className="grid gap-2.5">
        {words && words.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1">
            <input 
              type="checkbox" 
              className="rounded-md border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
              checked={selectedDeleteIds.length === words.length && words.length > 0}
              onChange={(e) => {
                if (e.target.checked) setSelectedDeleteIds(words.map(w => w.id));
                else setSelectedDeleteIds([]);
              }}
            />
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Chọn tất cả</span>
          </div>
        )}
        {words?.map((w, idx) => (
          <div key={w.id} className="flex items-center gap-3 bg-card hover:bg-muted/30 p-3.5 sm:p-4 rounded-xl border border-border/70 shadow-soft-xs text-sm transition-all hover:border-primary/30">
            <input 
              type="checkbox" 
              className="rounded-md border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
              checked={selectedDeleteIds.includes(w.id)}
              onChange={(e) => {
                if (e.target.checked) setSelectedDeleteIds([...selectedDeleteIds, w.id]);
                else setSelectedDeleteIds(selectedDeleteIds.filter(id => id !== w.id));
              }}
            />
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="font-bold text-base text-foreground">{w.word}</span>
                {w.phonetic && <span className="text-muted-foreground font-mono text-xs px-2 py-0.5 rounded bg-muted/60">({w.phonetic})</span>}
                <span className="text-muted-foreground font-medium">— {w.definition_vi}</span>
                {!questionId && allQuestions && allQuestions.length > 0 && (
                  <div className="w-32">
                    <Select 
                      value={w.question_id?.toString() || "none"} 
                      onValueChange={(val) => updateWordQuestion.mutate({ id: w.id, question_id: val === "none" ? null : parseInt(val) })}
                    >
                      <SelectTrigger className="h-8 text-xs rounded-lg">
                        <SelectValue placeholder="Gắn vào câu..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Không gắn câu</SelectItem>
                        {allQuestions.map((q, idx) => (
                          <SelectItem key={q.id} value={q.id.toString()}>Câu {idx + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {w.example_sentence && (
                <p className="text-xs text-muted-foreground italic bg-muted/40 p-2 rounded-lg border border-border/40">
                  {w.example_sentence}
                </p>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg active:scale-95" 
                onClick={() => {
                  setEditingWord({
                    id: w.id,
                    word: w.word,
                    definition_vi: w.definition_vi,
                    phonetic: w.phonetic || "",
                    audio_url: w.audio_male_url || "",
                    example_sentence: w.example_sentence || "",
                  });
                  setEditOpen(true);
                }}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg active:scale-95" onClick={() => { if(confirm("Xóa từ này?")) deleteWordMutation.mutate(w.id); }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {words?.length === 0 && (
          <div className="py-8 text-center text-muted-foreground space-y-1.5 border border-dashed border-border/70 rounded-xl bg-muted/10">
            <p className="text-sm font-semibold text-foreground">Chưa có từ vựng nào trong bài học này</p>
            <p className="text-xs text-muted-foreground">Bấm "+ Thêm" hoặc "Import" để bắt đầu bổ sung từ vựng cho bài học.</p>
          </div>
        )}
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="rounded-2xl border-border/80 shadow-soft-xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Import Từ Vựng</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Định dạng CSV: <strong className="text-foreground">Word, Definition, Phonetic, Audio URL, Example Sentence, Question #</strong>
                <br />
                <span className="italic">• Question #: Số thứ tự câu (1, 2, 3...) để gắn từ vựng vào câu đó.</span>
              </p>
              <Input type="file" accept=".csv,.txt,.tsv" onChange={handleFileChange} ref={fileInputRef} className="mb-3 rounded-xl border-border/80" />
              <textarea 
                className="w-full h-36 p-3 rounded-xl border border-border/80 bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                placeholder="Hoặc dán dữ liệu CSV vào đây..."
                value={importText}
                onChange={e => setImportText(e.target.value)}
              />
            </div>
            <Button className="w-full btn-3d btn-3d-primary py-2.5 rounded-xl font-bold text-sm active:scale-95 duration-120" onClick={() => importMutation.mutate()} disabled={importMutation.isPending || !importText.trim()}>
              {importMutation.isPending ? "Đang xử lý..." : "Bắt đầu Import"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl border-border/80 shadow-soft-xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Thêm từ vựng</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">Từ tiếng Anh (*)</Label>
              <Input className="rounded-xl" value={newWord.word} onChange={(e) => setNewWord({...newWord, word: e.target.value})} placeholder="Ví dụ: innovation" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">Nghĩa tiếng Việt (*)</Label>
              <Input className="rounded-xl" value={newWord.definition_vi} onChange={(e) => setNewWord({...newWord, definition_vi: e.target.value})} placeholder="Sự đổi mới, sáng kiến" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">Phiên âm (tùy chọn)</Label>
              <Input className="rounded-xl" value={newWord.phonetic} onChange={(e) => setNewWord({...newWord, phonetic: e.target.value})} placeholder="/ˌɪn.əˈveɪ.ʃən/" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">URL File Audio (tùy chọn)</Label>
              <Input className="rounded-xl" value={newWord.audio_url} onChange={(e) => setNewWord({...newWord, audio_url: e.target.value})} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">Câu ví dụ (tùy chọn)</Label>
              <Input className="rounded-xl" value={newWord.example_sentence} onChange={(e) => setNewWord({...newWord, example_sentence: e.target.value})} placeholder="Ví dụ: Technological innovation drives economic growth." />
            </div>
            <Button className="w-full btn-3d btn-3d-primary py-2.5 rounded-xl font-bold text-sm active:scale-95 duration-120" onClick={() => addWordMutation.mutate()} disabled={addWordMutation.isPending}>
              {addWordMutation.isPending ? "Đang lưu..." : "Thêm từ vựng"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl border-border/80 shadow-soft-xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Chỉnh sửa từ vựng</DialogTitle>
          </DialogHeader>
          {editingWord && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">Từ tiếng Anh (*)</Label>
                <Input className="rounded-xl" value={editingWord.word} onChange={(e) => setEditingWord({...editingWord, word: e.target.value})} placeholder="Hello" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">Nghĩa tiếng Việt (*)</Label>
                <Input className="rounded-xl" value={editingWord.definition_vi} onChange={(e) => setEditingWord({...editingWord, definition_vi: e.target.value})} placeholder="Xin chào" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">Phiên âm (tùy chọn)</Label>
                <Input className="rounded-xl" value={editingWord.phonetic} onChange={(e) => setEditingWord({...editingWord, phonetic: e.target.value})} placeholder="/həˈləʊ/" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">URL File Audio (tùy chọn)</Label>
                <Input className="rounded-xl" value={editingWord.audio_url} onChange={(e) => setEditingWord({...editingWord, audio_url: e.target.value})} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">Câu ví dụ (tùy chọn)</Label>
                <Input className="rounded-xl" value={editingWord.example_sentence} onChange={(e) => setEditingWord({...editingWord, example_sentence: e.target.value})} placeholder="Ví dụ: She is a student." />
              </div>
              <Button className="w-full btn-3d btn-3d-primary py-2.5 rounded-xl font-bold text-sm active:scale-95 duration-120" onClick={() => updateWordMutation.mutate()} disabled={updateWordMutation.isPending}>
                {updateWordMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="rounded-2xl border-border/80 shadow-soft-xl max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Gộp từ vựng từ bài học khác</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col pt-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Tìm bài học..." 
                className="pl-9 rounded-xl border-border/80" 
                value={searchLesson}
                onChange={e => setSearchLesson(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
              <div className="border border-border/70 rounded-xl overflow-y-auto p-2 space-y-1 bg-muted/20">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-2 px-2">Danh sách bài học</p>
                {allLessons?.filter(l => l.title.toLowerCase().includes(searchLesson.toLowerCase())).map(l => (
                  <button
                    key={l.id}
                    onClick={() => { setSelectedLessonId(l.id); setSelectedWords([]); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedLessonId === l.id ? 'bg-primary text-primary-foreground font-semibold shadow-soft-xs' : 'hover:bg-muted text-foreground'}`}
                  >
                    {l.title}
                  </button>
                ))}
              </div>

              <div className="border border-border/70 rounded-xl overflow-y-auto p-2 space-y-1 bg-card">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-2 px-2">Từ vựng trong bài</p>
                {otherLessonWords?.map(w => (
                  <label key={w.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer border-b last:border-0 border-border/40 transition-colors">
                    <input 
                      type="checkbox" 
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                      checked={selectedWords.includes(w.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedWords([...selectedWords, w.id]);
                        else setSelectedWords(selectedWords.filter(id => id !== w.id));
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{w.word}</p>
                      <p className="text-xs text-muted-foreground truncate">{w.definition_vi}</p>
                    </div>
                  </label>
                ))}
                {selectedLessonId && otherLessonWords?.length === 0 && (
                  <p className="text-xs text-center py-8 text-muted-foreground italic">Bài này chưa có từ vựng</p>
                )}
                {!selectedLessonId && (
                  <p className="text-xs text-center py-8 text-muted-foreground italic">Chọn một bài học để xem từ vựng</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" className="rounded-xl font-semibold active:scale-95 duration-120" onClick={() => setCopyOpen(false)}>Hủy</Button>
            <Button 
              className="btn-3d btn-3d-primary rounded-xl font-bold active:scale-95 duration-120"
              onClick={() => copyWordsMutation.mutate()} 
              disabled={copyWordsMutation.isPending || selectedWords.length === 0}
            >
              {copyWordsMutation.isPending ? "Đang xử lý..." : `Gộp ${selectedWords.length} từ đã chọn`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
