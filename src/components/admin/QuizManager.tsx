
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Upload, Download, Image, Music, Library, GripVertical, Check, ChevronRight, ArrowLeft, ArrowRight, FolderOpen, Folder } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

interface QuizManagerProps {
  quizId: number;
  courseId: number;
  lessonType?: string;
  lessonId?: number;
}

type ImageSwapSource =
  | { type: "pool"; index: number }
  | { type: "question"; questionId: number }
  | null;

const normalizeFolderPath = (folderPath?: string | null) => {
  const normalized = folderPath?.trim();
  return normalized && normalized.length > 0 ? normalized : "/";
};

const buildFolderSet = (items: any[]) => {
  const folders = new Set<string>();
  items.forEach((item) => {
    const folderPath = normalizeFolderPath(item.folder_path);
    if (folderPath === "/") return;

    const parts = folderPath.split("/").filter(Boolean);
    let acc = "";
    parts.forEach((part) => {
      acc += `/${part}`;
      folders.add(acc);
    });
  });
  return folders;
};

const getSubFolders = (folders: Set<string>, currentPath: string) => {
  const subs = new Set<string>();
  folders.forEach((folderPath) => {
    if (currentPath === "/") {
      const match = folderPath.match(/^\/([^/]+)$/);
      if (match) subs.add(match[1]);
      return;
    }

    const prefix = `${currentPath}/`;
    if (!folderPath.startsWith(prefix)) return;
    const remaining = folderPath.slice(prefix.length);
    const nextPart = remaining.split("/")[0];
    if (nextPart) subs.add(nextPart);
  });
  return Array.from(subs).sort((a, b) => a.localeCompare(b, "vi"));
};

const getBreadcrumbs = (currentPath: string) => currentPath === "/" ? ["/"] : ["/", ...currentPath.split("/").filter(Boolean)];

const getParentPath = (currentPath: string) => {
  if (currentPath === "/") return "/";
  const parts = currentPath.split("/").filter(Boolean);
  parts.pop();
  return parts.length === 0 ? "/" : `/${parts.join("/")}`;
};

const joinFolderPath = (currentPath: string, folderName: string) => currentPath === "/" ? `/${folderName}` : `${currentPath}/${folderName}`;

// Sortable question item
const SortableQuestionItem = ({
  q,
  index,
  openEdit,
  deleteQuestionMutation,
  isSelected,
  onToggleSelect,
  showCheckbox = false,
}: {
  q: any;
  index: number;
  openEdit: (q: any) => void;
  deleteQuestionMutation: any;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
  showCheckbox?: boolean;
  openVocab?: (q: any) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `q-${q.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-muted/30 group text-xs">
      {showCheckbox && (
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={() => onToggleSelect?.(q.id)} 
          className="mt-1"
        />
      )}
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-0.5 hover:bg-muted rounded shrink-0 mt-0.5">
        <GripVertical className="w-3 h-3 text-muted-foreground" />
      </button>
      <span className="text-muted-foreground font-mono w-6 shrink-0">{index + 1}.</span>
      <div className="flex-1 min-w-0">
        <p className="text-foreground truncate">{q.question_text}</p>
        <div className="flex gap-2 mt-0.5">
          {q.image_url && <span className="text-blue-500"><Image className="w-3 h-3 inline" /> Hình</span>}
          {q.audio_url && <span className="text-orange-500"><Music className="w-3 h-3 inline" /> Audio</span>}
          <span className="text-muted-foreground">{q.answers.length} đáp án</span>
        </div>
      </div>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-6 w-6 text-blue-600" onClick={() => openVocab?.(q)} title="Quản lý từ vựng cho câu này"><Library className="w-3 h-3" /></Button>
        <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-6 w-6" onClick={() => openEdit(q)}><Edit className="w-3 h-3" /></Button>
        <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-6 w-6" onClick={() => { if (confirm("Xóa câu hỏi?")) deleteQuestionMutation.mutate(q.id); }}><Trash2 className="w-3 h-3 text-destructive" /></Button>
      </div>
    </div>
  );
};

import AdminLessonVocab from "./AdminLessonVocab";

const QuizManager = ({ quizId, courseId, lessonType, lessonId }: QuizManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isDictation = lessonType === "dictation";

  const { data: questions = [] } = useQuery({
    queryKey: ["quiz-questions-admin", quizId],
    queryFn: async () => {
      const { data } = await supabase.from("questions").select("*, answers(*)").eq("quiz_id", quizId).order("display_order");
      return (data ?? []).map((q: any) => ({ ...q, answers: (q.answers ?? []).sort((a: any, b: any) => a.display_order - b.display_order) }));
    },
  });

  // Fetch quiz data for audio_url
  const { data: quizData } = useQuery({
    queryKey: ["quiz-detail-admin", quizId],
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("*").eq("id", quizId).single();
      return data;
    },
  });

  // Fetch course data for folder path
  const { data: courseData } = useQuery({
    queryKey: ["course-detail-admin", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("id", courseId).single();
      return data;
    },
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["admin-materials-all"],
    queryFn: async () => {
      const { data } = await supabase.from("materials").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQ, setEditingQ] = useState<any>(null);
  const [qText, setQText] = useState("");
  const [qTranslation, setQTranslation] = useState("");
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
  
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerType, setMediaPickerType] = useState<"image" | "audio">("image");
  const [mediaPickerTarget, setMediaPickerTarget] = useState<"question" | "quiz-audio">("question");
  const [mediaPickerPath, setMediaPickerPath] = useState("/");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [isDraggingAudio, setIsDraggingAudio] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  const [vocabDialogOpen, setVocabDialogOpen] = useState(false);
  const [vocabTargetQ, setVocabTargetQ] = useState<any>(null);

  const openVocab = (q: any) => {
    setVocabTargetQ(q);
    setVocabDialogOpen(true);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === questions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(questions.map((q: any) => q.id));
    }
  };

  const autoImportMedia = async (externalUrl: string, folderPath: string, title: string, type: "audio" | "image", filePrefix?: string) => {
    if (!externalUrl || !externalUrl.trim()) return null;
    // If already in our Supabase storage, just return it
    if (externalUrl.includes('supabase.co') || externalUrl.includes('/storage/v1/object/public/materials')) return externalUrl;
    
    try {
      const res = await fetch(externalUrl);
      if (!res.ok) throw new Error(`Không thể tải ${type} từ link bên ngoài`);
      const blob = await res.blob();
      
      const fileName = externalUrl.split('/').pop()?.split('?')[0] || `${type}_${Date.now()}`;
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '');
      const storagePath = `quiz_media/${Date.now()}_${filePrefix ? filePrefix + "_" : ""}${sanitizedName}`;
      
      const { error: uploadErr } = await supabase.storage.from("materials").upload(storagePath, blob);
      if (uploadErr) throw uploadErr;
      
      const { data: urlData } = supabase.storage.from("materials").getPublicUrl(storagePath);
      
      await supabase.from("materials").insert({
        title: title || sanitizedName,
        file_url: urlData.publicUrl,
        file_type: type,
        folder_path: folderPath || (type === "audio" ? "/Quiz Audios" : "/Quiz Images"),
        quiz_id: quizId,
        course_id: courseId,
      });
      
      return urlData.publicUrl;
    } catch (err) {
      console.error(`Auto import ${type} failed:`, err);
      return externalUrl;
    }
  };

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardAudioUrl, setWizardAudioUrl] = useState("");
  const [wizardImageAssignments, setWizardImageAssignments] = useState<Record<number, string>>({});
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [wizardLibraryPath, setWizardLibraryPath] = useState("/");
  const [pendingImageSwap, setPendingImageSwap] = useState<ImageSwapSource>(null);

  const imagesMaterials = useMemo(() => materials.filter((m: any) => m.file_type === "image"), [materials]);
  const mediaPickerMaterials = useMemo(
    () => materials.filter((m: any) => m.file_type === mediaPickerType),
    [materials, mediaPickerType]
  );
  const mediaPickerFolders = useMemo(() => buildFolderSet(mediaPickerMaterials), [mediaPickerMaterials]);
  const mediaPickerSubFolders = useMemo(
    () => getSubFolders(mediaPickerFolders, mediaPickerPath),
    [mediaPickerFolders, mediaPickerPath]
  );
  const mediaPickerItems = useMemo(
    () => mediaPickerMaterials.filter((m: any) => normalizeFolderPath(m.folder_path) === mediaPickerPath),
    [mediaPickerMaterials, mediaPickerPath]
  );
  const wizardImageFolders = useMemo(() => buildFolderSet(imagesMaterials), [imagesMaterials]);
  const wizardImageSubFolders = useMemo(
    () => getSubFolders(wizardImageFolders, wizardLibraryPath),
    [wizardImageFolders, wizardLibraryPath]
  );
  const wizardLibraryImages = useMemo(
    () => imagesMaterials.filter((m: any) => normalizeFolderPath(m.folder_path) === wizardLibraryPath),
    [imagesMaterials, wizardLibraryPath]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleQuestionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex((q: any) => `q-${q.id}` === active.id);
    const newIndex = questions.findIndex((q: any) => `q-${q.id}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(questions, oldIndex, newIndex);

    // Optimistic update
    queryClient.setQueryData(["quiz-questions-admin", quizId], reordered);

    for (let i = 0; i < reordered.length; i++) {
      await supabase.from("questions").update({ display_order: i }).eq("id", reordered[i].id);
    }
    queryClient.invalidateQueries({ queryKey: ["quiz-questions-admin", quizId] });
    toast({ title: "Đã sắp xếp lại câu hỏi" });
  };
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement> | any, type: "image" | "audio") => {
    e.preventDefault();
    const file = e.dataTransfer ? e.dataTransfer.files?.[0] : e.target.files?.[0];
    if (!file) return;
    
    setUploadingMedia(true);
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
      const path = `quiz_media/${Date.now()}_${sanitizedName}`;
      const { error: uploadErr } = await supabase.storage.from("materials").upload(path, file, { upsert: true });
      
      if (uploadErr) {
        toast({ title: "Lỗi upload", description: uploadErr.message, variant: "destructive" });
        return;
      }
      
      const { data: urlData } = supabase.storage.from("materials").getPublicUrl(path);
      
      if (type === "image") {
        setQImageUrl(urlData.publicUrl);
        toast({ title: "Đã tải ảnh lên thành công" });
      } else {
        setQAudioUrl(urlData.publicUrl);
        toast({ title: "Đã tải audio lên thành công" });
      }
    } catch (err: any) {
      toast({ title: "Lỗi upload file", description: err.message, variant: "destructive" });
    } finally {
      setUploadingMedia(false);
      e.target.value = '';
    }
  };

  const openNew = () => {
    setEditingQ(null);
    setQText("");
    setQTranslation("");
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
    setQTranslation(q.translation || "");
    setQImageUrl(q.image_url || "");
    setQAudioUrl(q.audio_url || "");
    setQType(q.question_type || "multiple_choice");
    const answers = q.answers.length > 0
      ? q.answers.map((a: any) => ({ text: a.answer_text, is_correct: a.is_correct, explanation: a.explanation || "" }))
      : [{ text: "", is_correct: false, explanation: "" }, { text: "", is_correct: false, explanation: "" }, { text: "", is_correct: false, explanation: "" }, { text: "", is_correct: false, explanation: "" }];
    setAnswerFields(answers);
    setDialogOpen(true);
  };

  const openWizard = () => {
    setWizardStep(1);
    setWizardAudioUrl(quizData?.audio_url || "");
    const assignments: Record<number, string> = {};
    const orderedImages: string[] = [];
    questions.forEach((q: any) => {
      if (q.image_url) {
        assignments[q.id] = q.image_url;
        if (!orderedImages.includes(q.image_url)) orderedImages.push(q.image_url);
      }
    });
    setWizardImageAssignments(assignments);
    setSelectedImages(orderedImages);
    setPendingImageSwap(null);
    setWizardLibraryPath("/");
    setWizardOpen(true);
  };

  const saveQuestionMutation = useMutation({
    mutationFn: async () => {
      setUploadingMedia(true);
      try {
        const courseTitle = courseData?.title || "Khóa học chưa rõ";
        const quizTitle = quizData?.title || `Bài tập ${quizId}`;
        const quizFolder = `/${courseTitle}/${quizTitle}`;
        
        // Use current index for naming
        const qIndex = editingQ ? (questions.findIndex(q => q.id === editingQ.id) + 1) : (questions.length + 1);
        const finalAudioUrl = await autoImportMedia(qAudioUrl, quizFolder, `Q${qIndex} - Audio`, "audio", `Q${qIndex}`);
        const finalImageUrl = await autoImportMedia(qImageUrl, quizFolder, `Q${qIndex} - Image`, "image", `Q${qIndex}`);
        
        let targetQuestionId: number;
        if (editingQ) {
          await supabase.from("questions").update({
            question_text: qText,
            translation: qTranslation || null,
            image_url: finalImageUrl || null,
            audio_url: finalAudioUrl || null,
            question_type: qType,
          }).eq("id", editingQ.id);
          targetQuestionId = editingQ.id;
          // Delete old answers and re-insert
          await supabase.from("answers").delete().eq("question_id", targetQuestionId);
        } else {
          const { data, error } = await supabase.from("questions").insert({
            quiz_id: quizId,
            question_text: qText,
            translation: qTranslation || null,
            image_url: finalImageUrl || null,
            audio_url: finalAudioUrl || null,
            question_type: qType,
            display_order: questions.length,
          }).select("id").single();
          if (error) throw error;
          targetQuestionId = data.id;
        }
        // Insert answers
        const validAnswers = answerFields.filter(a => a.text.trim());
        if (validAnswers.length > 0) {
          await supabase.from("answers").insert(
            validAnswers.map((a, i) => ({
              question_id: targetQuestionId,
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
      } finally {
        setUploadingMedia(false);
      }
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

  const deleteMultipleQuestionsMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await supabase.from("answers").delete().in("question_id", ids);
      await supabase.from("questions").delete().in("id", ids);
      const { count } = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("quiz_id", quizId);
      await supabase.from("quizzes").update({ total_questions: count ?? 0 }).eq("id", quizId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions-admin", quizId] });
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      setSelectedIds([]);
      toast({ title: `Đã xóa ${selectedIds.length} câu hỏi` });
    },
    onError: (err: any) => {
      toast({ title: "Lỗi khi xóa nhiều câu hỏi", description: err.message, variant: "destructive" });
    }
  });

  // Import CSV
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importText.trim()) throw new Error("Chưa có dữ liệu.");
      
      const parseQuotesCSV = (text: string) => {
        const result: string[][] = [];
        let row: string[] = [];
        let inQuotes = false;
        let currentVal = '';
        
        const delimiter = text.includes('\t') ? '\t' : ',';
        
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          
          if (inQuotes) {
            if (char === '"') {
              if (i + 1 < text.length && text[i + 1] === '"') {
                currentVal += '"';
                i++;
              } else {
                inQuotes = false;
              }
            } else {
              currentVal += char;
            }
          } else {
            if (char === '"') {
              inQuotes = true;
            } else if (char === delimiter) {
              row.push(currentVal);
              currentVal = '';
            } else if (char === '\n' || char === '\r') {
              row.push(currentVal);
              if (row.some(val => val.trim().length > 0)) {
                result.push(row);
              }
              row = [];
              currentVal = '';
              if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
                i++;
              }
            } else {
              currentVal += char;
            }
          }
        }
        
        row.push(currentVal);
        if (row.some(val => val.trim().length > 0)) {
          result.push(row);
        }
        
        return result;
      };

      const parsedRows = parseQuotesCSV(importText);
      if (parsedRows.length < 2) throw new Error("Cần ít nhất header + 1 dòng dữ liệu");
      
      const courseTitle = courseData?.title || "Khóa học chưa rõ";
      const quizTitle = quizData?.title || `Bài tập ${quizId}`;
      const quizFolder = `/${courseTitle}/${quizTitle}`;
      const rows = parsedRows.slice(1);
      for (let i = 0; i < rows.length; i++) {
        const cols = rows[i];
        if (isDictation) {
          // Format for dictation: Question, A, B, C, D, Translation, AudioURL, ImageURL, Vocabulary
          const [questionText, a, b, c, d, translation, audioUrl, imageUrl, vocabText] = cols.map(s => s?.trim());
          
          const qOrder = questions.length + i;
          const finalAudioUrl = await autoImportMedia(audioUrl, quizFolder, `Q${qOrder + 1} - Audio`, "audio", `Q${qOrder + 1}`);
          const finalImageUrl = await autoImportMedia(imageUrl, quizFolder, `Q${qOrder + 1} - Image`, "image", `Q${qOrder + 1}`);

          const { data: qData } = await supabase.from("questions").insert({
            quiz_id: quizId,
            question_text: questionText || '', // Empty if no question
            question_type: "multiple_choice",
            display_order: qOrder,
            translation: translation || null,
            audio_url: finalAudioUrl || null,
            image_url: finalImageUrl || null,
          }).select("id").single();

          if (qData) {
            const answers = [a, b, c, d].filter(text => text && text.length > 0).map((text, idx) => ({
              question_id: qData.id,
              answer_text: text,
              is_correct: true, // Always true for dictation filling
              explanation: null,
              display_order: idx,
            }));
            if (answers.length > 0) {
              await supabase.from("answers").insert(answers);
            }
            
            // Handle Vocabulary Import
            if (vocabText) {
              const { data: vQuiz } = await supabase.from("vocab_quizzes").select("id").eq("lesson_id", effectiveLessonId).maybeSingle();
              if (vQuiz) {
                const words = vocabText.split(';').map(v => v.trim()).filter(Boolean);
                const vocabEntries = words.map((v, vIdx) => {
                  const [word, def, phonetic, audio, example] = v.split('|').map(s => s.trim());
                  return {
                    vocab_quiz_id: vQuiz.id,
                    question_id: qData.id,
                    word: word || "",
                    definition_vi: def || "",
                    phonetic: phonetic || null,
                    audio_male_url: audio || null,
                    example_sentence: example || null,
                    display_order: vIdx
                  };
                }).filter(v => v.word);
                
                if (vocabEntries.length > 0) {
                  await supabase.from("vocab_questions").insert(vocabEntries);
                }
              }
            }
          }
        } else {
          // Format for quiz: QuestionText, A, B, C, D, Correct, Explanation, Translation, AudioURL, ImageURL
          if (cols.length < 6) continue;
          const [questionText, a, b, c, d, correct, explanation, translation, audioUrl, imageUrl] = cols.map(s => s?.trim());
          const correctIdx = "ABCD".indexOf(correct?.toUpperCase() || "");

          const qOrder = questions.length + i;
          const finalAudioUrl = await autoImportMedia(audioUrl, quizFolder, `Q${qOrder + 1} - Audio`, "audio", `Q${qOrder + 1}`);
          const finalImageUrl = await autoImportMedia(imageUrl, quizFolder, `Q${qOrder + 1} - Image`, "image", `Q${qOrder + 1}`);

          const { data: qData } = await supabase.from("questions").insert({
            quiz_id: quizId,
            question_text: questionText,
            question_type: "multiple_choice",
            display_order: qOrder,
            translation: translation || null,
            audio_url: finalAudioUrl || null,
            image_url: finalImageUrl || null,
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
      queryClient.invalidateQueries({ queryKey: ["lesson-vocab-words"] });
      toast({ title: "Import thành công!" });
    },
    onError: (e: any) => toast({ title: "Lỗi import", description: e.message, variant: "destructive" }),
  });

  // Wizard: Save audio to quiz level
  const saveAudioMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("quizzes").update({
        audio_url: wizardAudioUrl || null,
      }).eq("id", quizId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-detail-admin", quizId] });
      queryClient.invalidateQueries({ queryKey: ["quiz-questions-admin", quizId] });
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      toast({ title: "Đã lưu audio cho bài thi" });
    },
    onError: (e: any) => {
      toast({ title: "Lỗi lưu audio", description: e.message, variant: "destructive" });
    },
  });

  // Wizard: Save image assignments
  const saveImageAssignmentsMutation = useMutation({
    mutationFn: async () => {
      for (const q of questions) {
        const imageUrl = wizardImageAssignments[q.id] || null;
        await supabase.from("questions").update({ image_url: imageUrl }).eq("id", q.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions-admin", quizId] });
      setWizardOpen(false);
      toast({ title: "Đã lưu ảnh cho các câu hỏi" });
    },
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

  // Helper to get lessonId (needed for vocab import)
  const { data: lessonIdFromQuiz } = useQuery({
    queryKey: ["lesson-id-from-quiz", quizId],
    queryFn: async () => {
      const { data } = await supabase.from("lessons").select("id").eq("quiz_id", quizId).single();
      return data?.id;
    },
    enabled: !!isDictation
  });
  const effectiveLessonId = lessonId || lessonIdFromQuiz;

  const handleUploadWizardAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
      const path = `quiz_audio/${Date.now()}_${sanitizedName}`;
      const { error: uploadErr } = await supabase.storage.from("materials").upload(path, file, { upsert: true });
      if (uploadErr) {
        toast({ title: "Lỗi upload audio", description: uploadErr.message, variant: "destructive" });
        return;
      }
      const { data: urlData } = supabase.storage.from("materials").getPublicUrl(path);
      setWizardAudioUrl(urlData.publicUrl);
      toast({ title: "Đã tải audio lên" });
    } catch (err: any) {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
    } finally {
      setUploadingMedia(false);
      e.target.value = '';
    }
  };

  const addImageToSelection = (imageUrl: string) => {
    if (selectedImages.includes(imageUrl)) return;

    setSelectedImages((prev) => [...prev, imageUrl]);
    setWizardImageAssignments((prev) => {
      const next = { ...prev };
      const nextQuestion = questions.find((q: any) => !next[q.id]);
      if (nextQuestion) {
        next[nextQuestion.id] = imageUrl;
      }
      return next;
    });
  };

  const removeImageFromSelection = (imageUrl: string) => {
    setSelectedImages((prev) => prev.filter((url) => url !== imageUrl));
    setWizardImageAssignments((prev) => {
      const next = { ...prev };
      Object.entries(next).forEach(([questionId, assignedUrl]) => {
        if (assignedUrl === imageUrl) {
          delete next[Number(questionId)];
        }
      });
      return next;
    });
    setPendingImageSwap(null);
  };

  const swapQuestionsImages = (sourceQuestionId: number, targetQuestionId: number) => {
    if (sourceQuestionId === targetQuestionId) return;

    setWizardImageAssignments((prev) => {
      const next = { ...prev };
      const sourceUrl = next[sourceQuestionId];
      const targetUrl = next[targetQuestionId];

      if (targetUrl) next[sourceQuestionId] = targetUrl;
      else delete next[sourceQuestionId];

      if (sourceUrl) next[targetQuestionId] = sourceUrl;
      else delete next[targetQuestionId];

      return next;
    });
  };

  const exportQuestions = async () => {
    if (questions.length === 0) return toast({ title: "Không có câu hỏi để export" });
    
    // Fetch vocabulary if it's dictation
    let vocabByQuestion: Record<number, any[]> = {};
    if (isDictation && effectiveLessonId) {
      const { data: vQuiz } = await supabase.from("vocab_quizzes").select("id").eq("lesson_id", effectiveLessonId).maybeSingle();
      if (vQuiz) {
        const { data: vocabWords } = await supabase.from("vocab_questions").select("*").eq("vocab_quiz_id", vQuiz.id);
        if (vocabWords) {
          vocabWords.forEach(w => {
            if (w.question_id) {
              if (!vocabByQuestion[w.question_id]) vocabByQuestion[w.question_id] = [];
              vocabByQuestion[w.question_id].push(w);
            }
          });
        }
      }
    }

    let header = "";
    if (isDictation) {
      header = "QuestionText,A,B,C,D,Translation,AudioURL,ImageURL,Vocabulary";
    } else {
      header = "QuestionText,A,B,C,D,Correct,Explanation,Translation,AudioURL,ImageURL";
    }

    const rows = questions.map((q: any) => {
      const answers = q.answers || [];
      const a = answers[0]?.answer_text || "";
      const b = answers[1]?.answer_text || "";
      const c = answers[2]?.answer_text || "";
      const d = answers[3]?.answer_text || "";
      
      if (isDictation) {
        const vocabList = vocabByQuestion[q.id] || [];
        const vocabStr = vocabList.map(v => `${v.word}|${v.definition_vi}|${v.phonetic || ""}|${v.audio_male_url || ""}|${v.example_sentence || ""}`).join(";");
        return [
          `"${q.question_text || ""}"`,
          `"${a}"`, `"${b}"`, `"${c}"`, `"${d}"`,
          `"${q.translation || ""}"`,
          `"${q.audio_url || ""}"`,
          `"${q.image_url || ""}"`,
          `"${vocabStr}"`
        ].join(",");
      } else {
        const correctIdx = answers.findIndex((ans: any) => ans.is_correct);
        const correct = correctIdx >= 0 ? "ABCD"[correctIdx] : "";
        const explanation = answers[correctIdx]?.explanation || "";
        return [
          `"${q.question_text || ""}"`,
          `"${a}"`, `"${b}"`, `"${c}"`, `"${d}"`,
          `"${correct}"`,
          `"${explanation}"`,
          `"${q.translation || ""}"`,
          `"${q.audio_url || ""}"`,
          `"${q.image_url || ""}"`
        ].join(",");
      }
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [header, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `quiz_${quizId}_questions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const swapPoolImageWithQuestion = (poolIndex: number, questionId: number) => {
    const poolImageUrl = selectedImages[poolIndex];
    if (!poolImageUrl) return;

    const currentQuestionUrl = wizardImageAssignments[questionId] || null;
    const currentQuestionUsingPoolImage = Object.entries(wizardImageAssignments).find(
      ([qid, assignedUrl]) => Number(qid) !== questionId && assignedUrl === poolImageUrl
    )?.[0];

    setSelectedImages((prev) => {
      const next = [...prev];
      if (!currentQuestionUrl) return next;

      const currentQuestionUrlIndex = next.indexOf(currentQuestionUrl);
      if (currentQuestionUrlIndex >= 0) {
        [next[poolIndex], next[currentQuestionUrlIndex]] = [next[currentQuestionUrlIndex], next[poolIndex]];
      } else {
        next[poolIndex] = currentQuestionUrl;
      }
      return next;
    });

    setWizardImageAssignments((prev) => {
      const next = { ...prev };
      next[questionId] = poolImageUrl;

      if (currentQuestionUsingPoolImage) {
        if (currentQuestionUrl) next[Number(currentQuestionUsingPoolImage)] = currentQuestionUrl;
        else delete next[Number(currentQuestionUsingPoolImage)];
      }

      return next;
    });
  };

  const handlePoolImageClick = (index: number) => {
    if (index < 0 || index >= selectedImages.length) return;

    if (!pendingImageSwap) {
      setPendingImageSwap({ type: "pool", index });
      return;
    }

    if (pendingImageSwap.type === "pool" && pendingImageSwap.index === index) {
      setPendingImageSwap(null);
      return;
    }

    if (pendingImageSwap.type === "question") {
      swapPoolImageWithQuestion(index, pendingImageSwap.questionId);
    } else {
      setSelectedImages((prev) => {
        const next = [...prev];
        [next[pendingImageSwap.index], next[index]] = [next[index], next[pendingImageSwap.index]];
        return next;
      });
    }

    setPendingImageSwap(null);
  };

  const handleQuestionImageClick = (questionId: number) => {
    if (!pendingImageSwap) {
      if (!wizardImageAssignments[questionId]) return;
      setPendingImageSwap({ type: "question", questionId });
      return;
    }

    if (pendingImageSwap.type === "question" && pendingImageSwap.questionId === questionId) {
      setPendingImageSwap(null);
      return;
    }

    if (pendingImageSwap.type === "pool") {
      swapPoolImageWithQuestion(pendingImageSwap.index, questionId);
    } else {
      swapQuestionsImages(pendingImageSwap.questionId, questionId);
    }

    setPendingImageSwap(null);
  };

  const removeImageFromQuestion = (questionId: number) => {
    setWizardImageAssignments(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    setPendingImageSwap((prev) => prev?.type === "question" && prev.questionId === questionId ? null : prev);
  };

  const assignedImageCount = questions.filter((q: any) => wizardImageAssignments[q.id]).length;
  const mediaPickerBreadcrumbs = getBreadcrumbs(mediaPickerPath);
  const wizardLibraryBreadcrumbs = getBreadcrumbs(wizardLibraryPath);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Checkbox 
            checked={questions.length > 0 && selectedIds.length === questions.length}
            onCheckedChange={selectAll}
          />
          <span className="text-xs font-semibold text-muted-foreground">{questions.length} câu hỏi {selectedIds.length > 0 && `(Đã chọn ${selectedIds.length})`}</span>
          {selectedIds.length > 0 && (
            <Button 
              size="sm" 
              variant="destructive" 
              className="h-7 text-[10px] px-2"
              onClick={() => {
                if (confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} câu hỏi đã chọn?`)) {
                  deleteMultipleQuestionsMutation.mutate(selectedIds);
                }
              }}
              disabled={deleteMultipleQuestionsMutation.isPending}
            >
              <Trash2 className="w-3 h-3 mr-1" /> Xóa {selectedIds.length} mục
            </Button>
          )}
        </div>
        <div className="flex gap-1 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setImportDialogOpen(true)}><Upload className="w-3 h-3 mr-1" /> Import</Button>
          <Button size="sm" variant="outline" onClick={exportQuestions}><Download className="w-3 h-3 mr-1" /> Export</Button>
          <Button size="sm" variant="outline" onClick={openNew}><Plus className="w-3 h-3 mr-1" /> Thêm câu</Button>
          {questions.length > 0 && (
            <Button size="sm" variant="default" onClick={openWizard} className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700">
              🎯 Thiết lập bài thi
            </Button>
          )}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleQuestionDragEnd}>
        <SortableContext items={questions.map((q: any) => `q-${q.id}`)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {questions.map((q: any, i: number) => (
              <SortableQuestionItem
                key={q.id}
                q={q}
                index={i}
                openEdit={openEdit}
                openVocab={openVocab}
                deleteQuestionMutation={deleteQuestionMutation}
                isSelected={selectedIds.includes(q.id)}
                onToggleSelect={toggleSelect}
                showCheckbox={true}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Question Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQ ? "Sửa câu hỏi" : "Thêm câu hỏi"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isDictation ? "Nội dung cần nghe (mặc định lấy làm câu hỏi hoặc ô điền 1)" : "Câu hỏi"}</Label>
              <Textarea value={qText} onChange={(e) => setQText(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Dịch nghĩa</Label>
              <Textarea
                value={qTranslation}
                onChange={(e) => setQTranslation(e.target.value)}
                rows={2}
                placeholder="Nội dung dịch nghĩa để hiện ở phần xem đáp án"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {!isDictation && (
                <div className="space-y-2">
                  <Label>URL hình ảnh</Label>
                  <div className="flex gap-2">
                    <Input value={qImageUrl} onChange={(e) => setQImageUrl(e.target.value)} placeholder="https://..." disabled={uploadingMedia} />
                    <Button variant="outline" size="sm" type="button" onClick={() => { setMediaPickerType("image"); setMediaPickerTarget("question"); setMediaPickerPath("/"); setMediaPickerOpen(true); }}>
                      <Library className="w-4 h-4 mr-1" /> Thư viện
                    </Button>
                    <Button variant="outline" size="icon" className="shrink-0" asChild disabled={uploadingMedia}>
                      <label className="cursor-pointer">
                        <Upload className="w-4 h-4" />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUploadFile(e, "image")} />
                      </label>
                    </Button>
                  </div>
                  {qImageUrl && <img src={qImageUrl} alt="preview" className="w-32 h-20 object-cover rounded border" />}
                </div>
              )}
              <div 
                className={`space-y-2 p-3 rounded-lg border-2 border-dashed transition-colors ${isDictation ? 'col-span-2' : ''} ${isDraggingAudio ? 'border-primary bg-primary/10' : 'border-transparent hover:border-muted-foreground/30'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingAudio(true); }}
                onDragLeave={() => setIsDraggingAudio(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingAudio(false);
                  handleUploadFile(e, "audio");
                }}
              >
                <Label>URL audio {isDraggingAudio && <span className="text-primary font-normal text-xs ml-2">(Thả file vào đây)</span>}</Label>
                <div className="flex gap-2">
                  <Input value={qAudioUrl} onChange={(e) => setQAudioUrl(e.target.value)} placeholder="https://... hoặc kéo thả file audio vào đây" disabled={uploadingMedia} />
                  <Button variant="outline" size="sm" type="button" onClick={() => { setMediaPickerType("audio"); setMediaPickerTarget("question"); setMediaPickerPath("/"); setMediaPickerOpen(true); }}>
                    <Library className="w-4 h-4 mr-1" /> Thư viện
                  </Button>
                  <Button variant="outline" size="icon" className="shrink-0" asChild disabled={uploadingMedia}>
                    <label className="cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <input type="file" className="hidden" accept="audio/*" onChange={(e) => handleUploadFile(e, "audio")} />
                    </label>
                  </Button>
                </div>
                {qAudioUrl && <audio controls src={qAudioUrl} className="w-full h-8 mt-2" />}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isDictation ? "Các đoạn đáp án cần nghe điền" : "Đáp án (tick = đáp án đúng)"}</Label>
              {answerFields.map((ans, i) => (
                <div key={i} className="flex items-start gap-2">
                  {!isDictation && (
                    <Checkbox checked={ans.is_correct} onCheckedChange={(v) => {
                      const next = answerFields.map((a, j) => ({ ...a, is_correct: j === i ? !!v : false }));
                      setAnswerFields(next);
                    }} className="mt-2.5" />
                  )}
                  <div className="flex-1 space-y-1">
                    <Input value={ans.text} onChange={(e) => {
                      const next = [...answerFields];
                      next[i] = { ...next[i], text: e.target.value };
                      setAnswerFields(next);
                    }} placeholder={isDictation ? `Đoạn cần điền ${i + 1} (thường là đáp án A/B/C/D)` : `Đáp án ${String.fromCharCode(65 + i)}`} />
                    {!isDictation && ans.is_correct && (
                      <Input value={ans.explanation} onChange={(e) => {
                        const next = [...answerFields];
                        next[i] = { ...next[i], explanation: e.target.value };
                        setAnswerFields(next);
                      }} placeholder="Giải thích (tùy chọn)" className="text-xs" />
                    )}
                  </div>
                  {answerFields.length > (isDictation ? 0 : 2) && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setAnswerFields(prev => prev.filter((_, j) => j !== i))}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
              {answerFields.length < 6 && (
                <Button size="sm" variant="ghost" onClick={() => setAnswerFields(prev => [...prev, { text: "", is_correct: isDictation, explanation: "" }])}>
                  <Plus className="w-3 h-3 mr-1" /> Thêm đáp án
                </Button>
              )}
            </div>

            <Button 
              onClick={() => saveQuestionMutation.mutate()} 
              disabled={
                saveQuestionMutation.isPending || 
                (isDictation ? (!qText.trim() && answerFields.filter(a => a.text.trim()).length === 0) : !qText.trim())
              }
            >
              {saveQuestionMutation.isPending ? "Đang lưu..." : "Lưu câu hỏi"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bước 1: Import câu hỏi từ CSV/TSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isDictation ? (
                <>
                  Format: <code>question_text, answer_1, answer_2, answer_3, answer_4, translation, audio_url</code>
                  <br />Dòng đầu tiên là header. Hỗ trợ CSV (dấu phẩy) hoặc TSV (tab).
                  <br /><strong>Lưu ý quan trọng:</strong> 
                  <ul className="list-disc ml-4 space-y-1 mt-1">
                    <li><strong>Nhập Media tự động:</strong> Bạn có thể dán link <strong>Audio</strong> (cột 7) và <strong>Ảnh</strong> (cột 8), hệ thống sẽ tự động tải về thư viện.</li>
                    <li><strong>Part 1 (4 đáp án):</strong> Để trống cột 1, điền đáp án vào cột 2,3,4,5.</li>
                    <li><strong>Part 2 (1 câu hỏi, 3 đáp án):</strong> Điền câu hỏi vào cột 1, đáp án vào cột 2,3,4.</li>
                    <li>Cột 7 là URL Audio, Cột 8 là URL Ảnh.</li>
                  </ul>
                </>
              ) : (
                <>
                  Format: <code>question_text, a, b, c, d, correct(A/B/C/D), explanation, translation, audio_url</code>
                  <br />Dòng đầu tiên là header. Hỗ trợ CSV (dấu phẩy) hoặc TSV (tab).
                  <br /><strong>Tính năng mới:</strong> 
                  <ul className="list-disc ml-4 space-y-1 mt-1">
                    <li><strong>Tự động nhập Media:</strong> Dán link Audio (cột 9) và Ảnh (cột 10) để hệ thống tự động lưu vào thư viện.</li>
                    <li>Cột <code>translation</code>, <code>audio_url</code> và <code>image_url</code> là tùy chọn.</li>
                  </ul>
                </>
              )}
            </p>
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFileImport} className="text-sm" />
              <Button size="sm" variant="outline" onClick={() => {
                const template = isDictation 
                  ? "question_text\tanswer_1\tanswer_2\tanswer_3\tanswer_4\ttranslation\taudio_url\timage_url\nWhat is shown ...\tin the picture?\tand the video?\t\t\tCái gì xuất hiện trong hình và video?\thttps://example.com/audio.mp3\thttps://example.com/image.jpg"
                  : "question_text\tanswer_a\tanswer_b\tanswer_c\tanswer_d\tcorrect\texplanation\ttranslation\taudio_url\timage_url\nWhat is shown in the picture?\tA man reading\tA woman cooking\tA child playing\tA dog sleeping\tA\tThe image shows a man reading\tBức tranh cho thấy một người đàn ông đang đọc sách\thttps://example.com/audio.mp3\thttps://example.com/image.jpg";
                const blob = new Blob([template], { type: "text/tab-separated-values" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = isDictation ? "template_dictation.tsv" : "template_questions.tsv";
                a.click();
              }}>📥 Tải template mẫu</Button>
            </div>
            <Textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={8} placeholder="Dán dữ liệu ở đây..." className="font-mono text-xs" />
            <Button onClick={() => importMutation.mutate()} disabled={importMutation.isPending || !importText.trim()}>
              {importMutation.isPending ? "Đang import..." : `Import (${(importText.trim().split("\n").length - 1)} câu)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== WIZARD DIALOG ===== */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Thiết lập bài thi
            </DialogTitle>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-4">
            {[
              { step: 1, label: "Sắp xếp câu hỏi" },
              { step: 2, label: "Chọn Audio" },
              { step: 3, label: "Gán ảnh cho câu hỏi" },
            ].map(({ step, label }) => (
              <button
                key={step}
                onClick={() => setWizardStep(step)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  wizardStep === step
                    ? "bg-primary text-primary-foreground shadow-md"
                    : wizardStep > step
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {wizardStep > step ? <Check className="w-4 h-4" /> : <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs">{step}</span>}
                {label}
              </button>
            ))}
          </div>

          {/* Step 1: Reorder questions */}
          {wizardStep === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Kéo thả để sắp xếp lại thứ tự câu hỏi.</p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleQuestionDragEnd}>
                <SortableContext items={questions.map((q: any) => `q-${q.id}`)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1 border rounded-lg p-2 max-h-[50vh] overflow-y-auto">
                    {questions.map((q: any, i: number) => (
                      <SortableQuestionItem
                        key={q.id}
                        q={q}
                        index={i}
                        openEdit={openEdit}
                        deleteQuestionMutation={deleteQuestionMutation}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <div className="flex justify-end">
                <Button onClick={() => setWizardStep(2)}>
                  Tiếp <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Choose audio for entire exam */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Chọn 1 file audio duy nhất cho cả bài thi.</p>
              
              <div className="space-y-2">
                <Label>Audio URL</Label>
                <div className="flex gap-2">
                  <Input value={wizardAudioUrl} onChange={(e) => setWizardAudioUrl(e.target.value)} placeholder="https://... hoặc chọn từ thư viện" className="flex-1" />
                  <Button variant="outline" size="sm" onClick={() => { setMediaPickerType("audio"); setMediaPickerTarget("quiz-audio"); setMediaPickerPath("/"); setMediaPickerOpen(true); }}>
                    <Library className="w-4 h-4 mr-1" /> Thư viện
                  </Button>
                  <Button variant="outline" size="sm" asChild disabled={uploadingMedia}>
                    <label className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-1" />
                      {uploadingMedia ? "..." : "Upload"}
                      <input type="file" className="hidden" accept="audio/*" onChange={handleUploadWizardAudio} />
                    </label>
                  </Button>
                </div>
              </div>

              {wizardAudioUrl && (
                <div className="p-3 bg-muted/30 rounded-lg border space-y-2">
                  <p className="text-sm font-medium text-foreground">🎵 Audio đã chọn:</p>
                  <audio controls src={wizardAudioUrl} className="w-full" />
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setWizardAudioUrl("")}>Xóa audio</Button>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setWizardStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
                </Button>
                <Button onClick={() => {
                  saveAudioMutation.mutate();
                  setWizardStep(3);
                }}>
                  Tiếp <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Assign images to questions */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Luồng gán ảnh</p>
                <p className="text-xs text-muted-foreground">
                  1. Mở folder ở thư viện rồi bấm ảnh để thêm vào danh sách đã chọn. Ảnh mới sẽ tự gán lần lượt vào câu còn trống theo thứ tự chọn.
                </p>
                <p className="text-xs text-muted-foreground">
                  2. Muốn đổi chỗ, bấm 1 ảnh ở dải ảnh đã chọn hoặc ở câu hỏi, rồi bấm ảnh thứ 2 để hoán đổi.
                </p>
                {pendingImageSwap && (
                  <p className="text-xs font-medium text-primary">
                    {pendingImageSwap.type === "pool"
                      ? `Đã chọn ảnh thư viện #${pendingImageSwap.index + 1}. Bấm ảnh của câu hoặc ảnh khác để đổi chỗ.`
                      : `Đã chọn ảnh của câu ${questions.findIndex((q: any) => q.id === pendingImageSwap.questionId) + 1}. Bấm ảnh thứ 2 để đổi chỗ.`}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <Label>Ảnh đã chọn</Label>
                  <span className="text-xs text-muted-foreground">
                    {assignedImageCount}/{questions.length} câu đã có ảnh
                  </span>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-5 xl:grid-cols-7 gap-3 rounded-xl border p-3 bg-muted/10">
                  {selectedImages.map((url, idx) => {
                    const assignedQuestionIndex = questions.findIndex((q: any) => wizardImageAssignments[q.id] === url);
                    const isActive = pendingImageSwap?.type === "pool" && pendingImageSwap.index === idx;

                    return (
                      <div
                        key={`${url}-${idx}`}
                        className={`relative overflow-hidden rounded-xl border-2 text-left transition-all ${
                          isActive ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-primary/40"
                        }`}
                      >
                        <button type="button" onClick={() => handlePoolImageClick(idx)} className="block w-full">
                          <img src={url} className="aspect-square w-full object-cover" alt="" loading="lazy" />
                          <div className="absolute inset-x-0 bottom-0 bg-black/65 px-2 py-1 text-[11px] text-white">
                            <div className="flex items-center justify-between gap-2">
                              <span>#{idx + 1}</span>
                              <span>{assignedQuestionIndex >= 0 ? `Q${assignedQuestionIndex + 1}` : "Chưa gán"}</span>
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImageFromSelection(url);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                  {selectedImages.length === 0 && (
                    <p className="col-span-full py-4 text-center text-xs text-muted-foreground">
                      Chưa có ảnh nào được chọn. Hãy mở folder ở thư viện bên dưới để thêm ảnh.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <Label>Thư viện ảnh theo folder</Label>
                    <span className="text-xs text-muted-foreground">{wizardLibraryPath}</span>
                  </div>
                  <div className="rounded-xl border p-3 space-y-3">
                    <div className="flex items-center gap-1 text-xs">
                      {wizardLibraryPath !== "/" && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setWizardLibraryPath(getParentPath(wizardLibraryPath))}>
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      )}
                      {wizardLibraryBreadcrumbs.map((crumb, index) => (
                        <span key={`${crumb}-${index}`} className="flex items-center">
                          {index > 0 && <ChevronRight className="mx-1 h-3 w-3 text-muted-foreground" />}
                          <button
                            type="button"
                            onClick={() => {
                              if (index === 0) {
                                setWizardLibraryPath("/");
                                return;
                              }
                              const parts = wizardLibraryPath.split("/").filter(Boolean);
                              setWizardLibraryPath(`/${parts.slice(0, index).join("/")}`);
                            }}
                            className={`transition-colors ${
                              index === wizardLibraryBreadcrumbs.length - 1 ? "font-semibold text-foreground" : "text-muted-foreground hover:text-primary"
                            }`}
                          >
                            {crumb === "/" ? "Gốc" : crumb}
                          </button>
                        </span>
                      ))}
                    </div>

                    {wizardImageSubFolders.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                        {wizardImageSubFolders.map((folderName) => (
                          <button
                            key={folderName}
                            type="button"
                            onClick={() => setWizardLibraryPath(joinFolderPath(wizardLibraryPath, folderName))}
                            className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-left text-sm hover:border-primary/40 hover:bg-primary/5"
                          >
                            <FolderOpen className="h-4 w-4 text-amber-500" />
                            <span className="truncate">{folderName}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
                      {wizardLibraryImages.map((m: any) => {
                        const selectedIndex = selectedImages.indexOf(m.file_url);
                        const isSelected = selectedIndex >= 0;

                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => isSelected ? handlePoolImageClick(selectedIndex) : addImageToSelection(m.file_url)}
                            className={`relative overflow-hidden rounded-xl border-2 transition-all ${
                              isSelected ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-primary/40"
                            }`}
                          >
                            <img src={m.file_url} className="aspect-square w-full object-cover" alt="" loading="lazy" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-left text-[11px] text-white">
                              {isSelected ? `Đã chọn #${selectedIndex + 1}` : "Bấm để thêm"}
                            </div>
                          </button>
                        );
                      })}
                      {wizardLibraryImages.length === 0 && (
                        <p className="col-span-full py-6 text-center text-xs text-muted-foreground">
                          {wizardImageSubFolders.length > 0
                            ? "Folder này chưa có ảnh trực tiếp. Bạn có thể mở folder con."
                            : "Chưa có ảnh trong folder này."}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ảnh theo câu hỏi</Label>
                  <div className="max-h-[55vh] space-y-2 overflow-y-auto rounded-xl border p-2">
                    {questions.map((q: any, i: number) => {
                      const imageUrl = wizardImageAssignments[q.id];
                      const isActive = pendingImageSwap?.type === "question" && pendingImageSwap.questionId === q.id;

                      return (
                        <div key={q.id} className="rounded-xl border bg-card p-3">
                          <div className="mb-2 flex items-start gap-3">
                            <span className="mt-0.5 w-9 shrink-0 rounded-full bg-muted px-2 py-1 text-center font-mono text-xs text-muted-foreground">
                              Q{i + 1}
                            </span>
                            <p className="min-w-0 flex-1 text-xs leading-5 text-foreground">{q.question_text}</p>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleQuestionImageClick(q.id)}
                              className={`relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 bg-muted/30 transition-all ${
                                isActive ? "border-primary ring-2 ring-primary/20" : "border-dashed border-muted-foreground/30 hover:border-primary/40"
                              }`}
                            >
                              {imageUrl ? (
                                <img src={imageUrl} className="h-full w-full object-cover" alt="" loading="lazy" />
                              ) : (
                                <span className="px-3 text-center text-[11px] text-muted-foreground">
                                  {pendingImageSwap?.type === "pool" ? "Bấm để gán ảnh này" : "Chưa có ảnh"}
                                </span>
                              )}
                            </button>

                            <div className="min-w-0 flex-1 space-y-2">
                              <p className="text-xs text-muted-foreground">
                                {imageUrl ? "Bấm ảnh để đổi chỗ với ảnh khác trong thư viện hoặc giữa 2 câu." : "Nếu đã chọn ảnh ở trên, bấm khung này để gán."}
                              </p>
                              <div className="flex gap-2">
                                {imageUrl && (
                                  <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive" onClick={() => removeImageFromQuestion(q.id)}>
                                    <Trash2 className="mr-1 h-3 w-3" /> Xóa ảnh
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setWizardStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
                </Button>
                <Button
                  onClick={() => saveImageAssignmentsMutation.mutate()}
                  disabled={saveImageAssignmentsMutation.isPending}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                >
                  {saveImageAssignmentsMutation.isPending ? "Đang lưu..." : "✅ Hoàn tất & Lưu"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Media Picker Dialog */}
      <Dialog open={mediaPickerOpen} onOpenChange={setMediaPickerOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chọn từ thư viện ({mediaPickerType === "image" ? "Hình ảnh" : "Audio"})</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-1 text-xs">
              {mediaPickerPath !== "/" && (
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMediaPickerPath(getParentPath(mediaPickerPath))}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              {mediaPickerBreadcrumbs.map((crumb, index) => (
                <span key={`${crumb}-${index}`} className="flex items-center">
                  {index > 0 && <ChevronRight className="mx-1 h-3 w-3 text-muted-foreground" />}
                  <button
                    type="button"
                    onClick={() => {
                      if (index === 0) {
                        setMediaPickerPath("/");
                        return;
                      }
                      const parts = mediaPickerPath.split("/").filter(Boolean);
                      setMediaPickerPath(`/${parts.slice(0, index).join("/")}`);
                    }}
                    className={`transition-colors ${
                      index === mediaPickerBreadcrumbs.length - 1 ? "font-semibold text-foreground" : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    {crumb === "/" ? "Gốc" : crumb}
                  </button>
                </span>
              ))}
            </div>

            {mediaPickerSubFolders.length > 0 && (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {mediaPickerSubFolders.map((folderName) => (
                  <button
                    key={folderName}
                    type="button"
                    onClick={() => setMediaPickerPath(joinFolderPath(mediaPickerPath, folderName))}
                    className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-left text-sm hover:border-primary/40 hover:bg-primary/5"
                  >
                    <Folder className="h-4 w-4 text-amber-500" />
                    <span className="truncate">{folderName}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {mediaPickerItems.map((m: any) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (mediaPickerTarget === "question") {
                      if (mediaPickerType === "image") setQImageUrl(m.file_url);
                      else setQAudioUrl(m.file_url);
                    } else if (mediaPickerTarget === "quiz-audio") {
                      setWizardAudioUrl(m.file_url);
                    }
                    setMediaPickerOpen(false);
                  }}
                  className="rounded-lg border bg-card p-3 text-center transition-colors hover:border-primary"
                >
                  {m.file_type === "image" ? (
                    <div className="h-24 w-full overflow-hidden rounded bg-muted">
                      <img src={m.file_url} className="h-full w-full object-cover" alt="" loading="lazy" />
                    </div>
                  ) : (
                    <div className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded bg-primary/10">
                      <Music className="h-8 w-8 text-primary" />
                      <audio controls src={m.file_url} className="mt-1 h-7 w-full" onClick={(e) => e.stopPropagation()} />
                    </div>
                  )}
                  <span className="mt-2 block w-full break-words text-xs font-medium leading-tight">{m.title}</span>
                  {m.folder_path && m.folder_path !== "/" && (
                    <span className="mt-1 block text-xs text-muted-foreground">{m.folder_path}</span>
                  )}
                </button>
              ))}
              {mediaPickerItems.length === 0 && (
                <p className="col-span-3 py-8 text-center text-sm text-muted-foreground">
                  {mediaPickerSubFolders.length > 0
                    ? "Folder này chưa có file trực tiếp. Hãy mở folder con."
                    : `Chưa có ${mediaPickerType === "image" ? "hình ảnh" : "audio"} nào trong folder này.`}
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={vocabDialogOpen} onOpenChange={setVocabDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quản lý từ vựng - Câu {questions.findIndex(q => q.id === vocabTargetQ?.id) + 1}</DialogTitle>
          </DialogHeader>
          {vocabTargetQ && (
            <AdminLessonVocab 
              lessonId={lessonId || 0} 
              lessonTitle={vocabTargetQ.question_text || `Câu ${vocabTargetQ.id}`}
              questionId={vocabTargetQ.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuizManager;
