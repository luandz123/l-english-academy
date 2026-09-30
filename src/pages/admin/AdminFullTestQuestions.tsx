import AdminLayout from "@/components/AdminLayout";
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, 
  Search, 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Plus, 
  Volume2, 
  Image as ImageIcon, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  HelpCircle,
  Copy,
  Upload,
  ExternalLink,
  Settings,
  Sparkles,
  Layers,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Answer {
  id?: number;
  question_id?: number;
  answer_text: string;
  is_correct: boolean;
  explanation: string | null;
  display_order: number;
}

interface Question {
  id: number;
  quiz_id: number;
  question_text: string;
  display_order: number;
  audio_url: string | null;
  image_url: string | null;
  transcript: string | null;
  translation: string | null;
  passage_text: string | null;
  group_id: string | null;
  part_number: number;
  answers: Answer[];
}

const defaultAnswers = (part: number): Answer[] => {
  const count = part === 2 ? 3 : 4;
  return Array.from({ length: count }, (_, i) => ({
    answer_text: "",
    is_correct: i === 0,
    explanation: "",
    display_order: i,
  }));
};

const AdminFullTestQuestions = () => {
  const { testId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [activePartTab, setActivePartTab] = useState<string>("all");
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);

  // Modals
  const [isEditTestInfoOpen, setIsEditTestInfoOpen] = useState(false);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [isEditQuestionOpen, setIsEditQuestionOpen] = useState(false);
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  // Upload States
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Test Info Edit Form
  const [testTitle, setTestTitle] = useState("");
  const [testDescription, setTestDescription] = useState("");
  const [testAudioUrl, setTestAudioUrl] = useState("");
  const [testCategory, setTestCategory] = useState("2026");
  const [testReleaseDate, setTestReleaseDate] = useState("");

  // Add Question Form
  const [addPart, setAddPart] = useState<number>(5);
  const [addDisplayOrder, setAddDisplayOrder] = useState<number>(1);
  const [addQuestionText, setAddQuestionText] = useState("");
  const [addAudioUrl, setAddAudioUrl] = useState("");
  const [addImageUrl, setAddImageUrl] = useState("");
  const [addPassageText, setAddPassageText] = useState("");
  const [addGroupId, setAddGroupId] = useState("");
  const [addTranscript, setAddTranscript] = useState("");
  const [addTranslation, setAddTranslation] = useState("");
  const [addAnswers, setAddAnswers] = useState<Answer[]>(defaultAnswers(5));

  // Edit Question Form
  const [editDisplayOrder, setEditDisplayOrder] = useState<number>(1);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editAudioUrl, setEditAudioUrl] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editPassageText, setEditPassageText] = useState("");
  const [editGroupId, setEditGroupId] = useState("");
  const [editTranscript, setEditTranscript] = useState("");
  const [editTranslation, setEditTranslation] = useState("");
  const [editAnswers, setEditAnswers] = useState<Answer[]>([]);

  // Group Edit Form
  const [selectedGroupQuestions, setSelectedGroupQuestions] = useState<Question[]>([]);
  const [groupPassageText, setGroupPassageText] = useState("");
  const [groupAudioUrl, setGroupAudioUrl] = useState("");
  const [groupImageUrl, setGroupImageUrl] = useState("");
  const [groupIdString, setGroupIdString] = useState("");

  // Fetch Test Detail
  const { data: testDetail, isLoading: loadingTestDetail } = useQuery({
    queryKey: ["admin-fulltest-detail", testId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("full_tests")
        .select(`
          *,
          courses (
            id,
            title
          )
        `)
        .eq("id", Number(testId))
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!testId,
  });

  // Fetch Sections and Questions
  const { data: allQuestions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ["admin-fulltest-questions", testId],
    queryFn: async () => {
      // 1. Get sections and quizzes
      const { data: sections, error: secErr } = await supabase
        .from("full_test_sections")
        .select("part_number, quiz_id")
        .eq("test_id", Number(testId));

      if (secErr || !sections || sections.length === 0) return [];

      const quizIds = sections.map((s) => s.quiz_id).filter(Boolean) as number[];
      if (quizIds.length === 0) return [];

      // 2. Fetch questions and answers
      const { data: questions, error: qErr } = await supabase
        .from("questions")
        .select("*, answers(*)")
        .in("quiz_id", quizIds);

      if (qErr || !questions) return [];

      // Sort and map questions
      const mapped: Question[] = questions.map((q: any) => {
        const sec = sections.find((s) => s.quiz_id === q.quiz_id);
        const part = sec ? sec.part_number : 5;
        return {
          ...q,
          part_number: part,
          answers: (q.answers || []).sort((a: any, b: any) => a.display_order - b.display_order),
        };
      });

      // Sort globally: by part_number, then by display_order
      mapped.sort((a, b) => {
        if (a.part_number !== b.part_number) return a.part_number - b.part_number;
        return a.display_order - b.display_order;
      });

      return mapped;
    },
    enabled: !!testId,
  });

  // Generic Media Upload Helper
  const handleUploadFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "audio" | "image",
    onSuccess: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingMedia(true);
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "");
      const folder = type === "audio" ? "fulltests/audio" : "fulltests/images";
      const path = `${folder}/${Date.now()}_${sanitizedName}`;

      const { error: uploadErr } = await supabase.storage
        .from("materials")
        .upload(path, file);

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("materials")
        .getPublicUrl(path);

      onSuccess(urlData.publicUrl);
      toast({
        title: "Tải file lên thành công",
        description: `Đã lưu file ${file.name} vào hệ thống.`,
      });
    } catch (err: any) {
      toast({
        title: "Lỗi tải file",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // 1. Update Test Info Mutation
  const updateTestInfoMutation = useMutation({
    mutationFn: async () => {
      if (!testTitle.trim()) throw new Error("Vui lòng nhập tên đề thi.");

      const { error } = await supabase
        .from("full_tests")
        .update({
          title: testTitle.trim(),
          description: testDescription.trim() || null,
          audio_url: testAudioUrl.trim() || null,
          category: testCategory || "2026",
          release_date: testReleaseDate ? new Date(testReleaseDate).toISOString() : null,
        })
        .eq("id", Number(testId));

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Đã cập nhật thông tin đề thi thành công" });
      setIsEditTestInfoOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-fulltest-detail", testId] });
      queryClient.invalidateQueries({ queryKey: ["admin-fulltests"] });
    },
    onError: (err: any) => {
      toast({ title: "Lỗi cập nhật", description: err.message, variant: "destructive" });
    },
  });

  // 2. Add New Question Mutation
  const addQuestionMutation = useMutation({
    mutationFn: async () => {
      // Find or create quiz_id for this part
      const { data: section } = await supabase
        .from("full_test_sections")
        .select("id, quiz_id")
        .eq("test_id", Number(testId))
        .eq("part_number", addPart)
        .maybeSingle();

      let targetQuizId = section?.quiz_id;

      if (!targetQuizId) {
        // Create quiz for this part
        const { data: newQuiz, error: qzErr } = await supabase
          .from("quizzes")
          .insert({
            title: `Part ${addPart} - ${testDetail?.title || "Test"}`,
            total_questions: 0,
            display_order: addPart,
          })
          .select("id")
          .single();

        if (qzErr || !newQuiz) throw qzErr;

        // Create section
        const { data: newSec, error: secErr } = await supabase
          .from("full_test_sections")
          .insert({
            test_id: Number(testId),
            part_number: addPart,
            quiz_id: newQuiz.id,
          })
          .select("id, quiz_id")
          .single();

        if (secErr || !newSec) throw secErr;
        targetQuizId = newQuiz.id;
      }

      // Insert question
      const { data: newQ, error: qErr } = await supabase
        .from("questions")
        .insert({
          quiz_id: targetQuizId,
          display_order: Number(addDisplayOrder) || (allQuestions.length + 1),
          question_text: addQuestionText.trim(),
          audio_url: addAudioUrl.trim() || null,
          image_url: addImageUrl.trim() || null,
          passage_text: addPassageText.trim() || null,
          group_id: addGroupId.trim() || null,
          transcript: addTranscript.trim() || null,
          translation: addTranslation.trim() || null,
        })
        .select("id")
        .single();

      if (qErr || !newQ) throw qErr;

      // Insert answers
      const answersToInsert = addAnswers.map((ans, idx) => ({
        question_id: newQ.id,
        answer_text: ans.answer_text.trim(),
        is_correct: ans.is_correct,
        explanation: ans.explanation?.trim() || null,
        display_order: idx,
      }));

      if (answersToInsert.length > 0) {
        const { error: aErr } = await supabase.from("answers").insert(answersToInsert);
        if (aErr) throw aErr;
      }

      // Update test total count
      await supabase
        .from("full_tests")
        .update({ total_questions: allQuestions.length + 1 })
        .eq("id", Number(testId));
    },
    onSuccess: () => {
      toast({
        title: "Đã thêm câu hỏi mới",
        description: `Đã thêm câu hỏi số ${addDisplayOrder} vào Part ${addPart}.`,
      });
      setIsAddQuestionOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-fulltest-questions", testId] });
    },
    onError: (err: any) => {
      toast({ title: "Lỗi thêm câu hỏi", description: err.message, variant: "destructive" });
    },
  });

  // 3. Update Existing Question Mutation
  const updateQuestionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedQuestion) return;

      // Update question
      const { error: qErr } = await supabase
        .from("questions")
        .update({
          display_order: Number(editDisplayOrder),
          question_text: editQuestionText.trim(),
          audio_url: editAudioUrl.trim() || null,
          image_url: editImageUrl.trim() || null,
          passage_text: editPassageText.trim() || null,
          group_id: editGroupId.trim() || null,
          transcript: editTranscript.trim() || null,
          translation: editTranslation.trim() || null,
        })
        .eq("id", selectedQuestion.id);

      if (qErr) throw qErr;

      // Clean up deleted answers if any were removed
      const currentAnsIds = editAnswers.map((a) => a.id).filter(Boolean) as number[];
      if (selectedQuestion.answers.length > 0) {
        const toDeleteIds = selectedQuestion.answers
          .map((a) => a.id)
          .filter((id): id is number => !!id && !currentAnsIds.includes(id));

        if (toDeleteIds.length > 0) {
          await supabase.from("answers").delete().in("id", toDeleteIds);
        }
      }

      // Update/Insert answers
      for (let idx = 0; idx < editAnswers.length; idx++) {
        const ans = editAnswers[idx];
        if (ans.id) {
          await supabase
            .from("answers")
            .update({
              answer_text: ans.answer_text.trim(),
              is_correct: ans.is_correct,
              explanation: ans.explanation?.trim() || null,
              display_order: idx,
            })
            .eq("id", ans.id);
        } else {
          await supabase.from("answers").insert({
            question_id: selectedQuestion.id,
            answer_text: ans.answer_text.trim(),
            is_correct: ans.is_correct,
            explanation: ans.explanation?.trim() || null,
            display_order: idx,
          });
        }
      }
    },
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: `Đã lưu cập nhật câu hỏi số ${editDisplayOrder}`,
      });
      setIsEditQuestionOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-fulltest-questions", testId] });
    },
    onError: (err: any) => {
      toast({
        title: "Lỗi",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // 4. Delete Question Mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      await supabase.from("answers").delete().eq("question_id", questionId);
      const { error } = await supabase.from("questions").delete().eq("id", questionId);
      if (error) throw error;

      await supabase
        .from("full_tests")
        .update({ total_questions: Math.max(0, allQuestions.length - 1) })
        .eq("id", Number(testId));
    },
    onSuccess: () => {
      toast({ title: "Đã xóa câu hỏi thành công" });
      queryClient.invalidateQueries({ queryKey: ["admin-fulltest-questions", testId] });
    },
    onError: (err: any) => {
      toast({ title: "Lỗi xóa câu hỏi", description: err.message, variant: "destructive" });
    },
  });

  // 5. Clone / Duplicate Question Mutation
  const duplicateQuestionMutation = useMutation({
    mutationFn: async (q: Question) => {
      // Insert duplicate question
      const { data: newQ, error: qErr } = await supabase
        .from("questions")
        .insert({
          quiz_id: q.quiz_id,
          display_order: q.display_order + 1,
          question_text: `${q.question_text} (Bản sao)`,
          audio_url: q.audio_url,
          image_url: q.image_url,
          passage_text: q.passage_text,
          group_id: q.group_id,
          transcript: q.transcript,
          translation: q.translation,
        })
        .select("id")
        .single();

      if (qErr || !newQ) throw qErr;

      // Insert cloned answers
      if (q.answers.length > 0) {
        const answersToInsert = q.answers.map((a) => ({
          question_id: newQ.id,
          answer_text: a.answer_text,
          is_correct: a.is_correct,
          explanation: a.explanation,
          display_order: a.display_order,
        }));
        await supabase.from("answers").insert(answersToInsert);
      }
    },
    onSuccess: () => {
      toast({ title: "Đã nhân bản câu hỏi thành công" });
      queryClient.invalidateQueries({ queryKey: ["admin-fulltest-questions", testId] });
    },
    onError: (err: any) => {
      toast({ title: "Lỗi nhân bản", description: err.message, variant: "destructive" });
    },
  });

  // 6. Group Questions Mutation
  const updateGroupMutation = useMutation({
    mutationFn: async () => {
      if (selectedGroupQuestions.length === 0) return;

      const ids = selectedGroupQuestions.map((q) => q.id);

      const { error } = await supabase
        .from("questions")
        .update({
          passage_text: groupPassageText.trim() || null,
          audio_url: groupAudioUrl.trim() || null,
          image_url: groupImageUrl.trim() || null,
          group_id: groupIdString.trim() || null,
        })
        .in("id", ids);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: `Đã cập nhật thông tin nhóm cho ${selectedGroupQuestions.length} câu hỏi`,
      });
      setIsEditGroupOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-fulltest-questions", testId] });
    },
    onError: (err: any) => {
      toast({
        title: "Lỗi",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Open Edit Test Info
  const openEditTestInfo = () => {
    if (!testDetail) return;
    setTestTitle(testDetail.title || "");
    setTestDescription(testDetail.description || "");
    setTestAudioUrl(testDetail.audio_url || "");
    setTestCategory(testDetail.category || "2026");
    setTestReleaseDate(testDetail.release_date ? testDetail.release_date.split("T")[0] : "");
    setIsEditTestInfoOpen(true);
  };

  // Open Add Question
  const openAddQuestion = (presetPart?: number) => {
    const part = presetPart || (activePartTab !== "all" ? Number(activePartTab) : 5);
    setAddPart(part);
    setAddDisplayOrder(allQuestions.length + 1);
    setAddQuestionText("");
    setAddAudioUrl("");
    setAddImageUrl("");
    setAddPassageText("");
    setAddGroupId("");
    setAddTranscript("");
    setAddTranslation("");
    setAddAnswers(defaultAnswers(part));
    setIsAddQuestionOpen(true);
  };

  // Handle click on Edit Question
  const handleEditQuestionClick = (q: Question) => {
    setSelectedQuestion(q);
    setEditDisplayOrder(q.display_order);
    setEditQuestionText(q.question_text || "");
    setEditAudioUrl(q.audio_url || "");
    setEditImageUrl(q.image_url || "");
    setEditPassageText(q.passage_text || "");
    setEditGroupId(q.group_id || "");
    setEditTranscript(q.transcript || "");
    setEditTranslation(q.translation || "");
    setEditAnswers(
      q.answers.length > 0
        ? JSON.parse(JSON.stringify(q.answers))
        : defaultAnswers(q.part_number)
    );
    setIsEditQuestionOpen(true);
  };

  // Handle edit group details
  const handleEditGroupClick = (groupQs: Question[]) => {
    setSelectedGroupQuestions(groupQs);
    const first = groupQs[0];
    if (first) {
      setGroupPassageText(first.passage_text || "");
      setGroupAudioUrl(first.audio_url || "");
      setGroupImageUrl(first.image_url || "");
      setGroupIdString(first.group_id || "");
    }
    setIsEditGroupOpen(true);
  };

  // Helper to check for missing/incomplete items in a question
  const getQuestionIssues = (q: Question) => {
    const issues: string[] = [];
    const correctCount = q.answers.filter((a) => a.is_correct).length;
    if (correctCount === 0) issues.push("Thiếu đáp án đúng");
    if (correctCount > 1 && q.part_number !== 1) issues.push("Nhiều hơn 1 đáp án đúng");
    
    const hasExplanation = q.answers.some((a) => a.is_correct && a.explanation && a.explanation.trim());
    if (!hasExplanation && [3, 4, 5, 6, 7].includes(q.part_number)) {
      issues.push("Thiếu giải thích");
    }

    if ([1, 2, 3, 4].includes(q.part_number) && !q.audio_url) {
      issues.push("Thiếu file nghe");
    }

    if (q.part_number === 1 && !q.image_url) {
      issues.push("Thiếu hình ảnh");
    }

    if ([6, 7].includes(q.part_number) && !q.passage_text) {
      issues.push("Thiếu đoạn văn");
    }

    return issues;
  };

  // Grouping logic for rendering
  const getGroupedQuestions = (filtered: Question[]) => {
    const groups: { key: string; questions: Question[] }[] = [];
    let currentGroupKey: string | null = null;
    let currentQuestions: Question[] = [];

    filtered.forEach((q) => {
      const isPart34 = q.part_number === 3 || q.part_number === 4;
      const isPart67 = q.part_number === 6 || q.part_number === 7;

      let key = `single-${q.id}`;
      if (q.group_id) {
        key = `group-id-${q.group_id}`;
      } else if (isPart34 && q.audio_url) {
        key = `audio-${q.audio_url}`;
      } else if (isPart67 && q.passage_text) {
        const cleanText = (q.passage_text || "").replace(/<[^>]*>/g, "").slice(0, 50).trim();
        key = `passage-${cleanText}`;
      }

      if (currentGroupKey === key && (isPart34 || isPart67)) {
        currentQuestions.push(q);
      } else {
        if (currentQuestions.length > 0) {
          groups.push({ key: currentGroupKey || "", questions: currentQuestions });
        }
        currentGroupKey = key;
        currentQuestions = [q];
      }
    });

    if (currentQuestions.length > 0) {
      groups.push({ key: currentGroupKey || "", questions: currentQuestions });
    }

    return groups;
  };

  // Filter and Search logic
  const filteredQuestions = allQuestions.filter((q) => {
    if (activePartTab !== "all" && q.part_number.toString() !== activePartTab) {
      return false;
    }

    if (showIncompleteOnly && getQuestionIssues(q).length === 0) {
      return false;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchText = q.question_text?.toLowerCase().includes(query);
      const matchPassage = q.passage_text?.toLowerCase().includes(query);
      const matchTranscript = q.transcript?.toLowerCase().includes(query);
      const matchTranslation = q.translation?.toLowerCase().includes(query);
      const matchOrder = q.display_order.toString() === query;
      const matchAnswers = q.answers.some((a) => a.answer_text?.toLowerCase().includes(query));

      return matchText || matchPassage || matchTranscript || matchTranslation || matchOrder || matchAnswers;
    }

    return true;
  });

  const groupedList = getGroupedQuestions(filteredQuestions);

  // Statistics
  const totalCount = allQuestions.length;
  const missingAudio = allQuestions.filter((q) => [1, 2, 3, 4].includes(q.part_number) && !q.audio_url).length;
  const missingCorrect = allQuestions.filter((q) => q.answers.filter((a) => a.is_correct).length === 0).length;
  const missingExplanation = allQuestions.filter((q) => [3, 4, 5, 6, 7].includes(q.part_number) && !q.answers.some((a) => a.is_correct && a.explanation)).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-5 rounded-2xl border border-border/70 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {testDetail?.course_id ? (
                <Link to={`/admin/courses/${testDetail.course_id}`} className="hover:text-primary flex items-center gap-1 font-medium">
                  <ArrowLeft className="h-3 w-3" /> Khóa học: {testDetail.courses?.title || "Chi tiết"}
                </Link>
              ) : (
                <Link to="/admin/fulltests" className="hover:text-primary flex items-center gap-1 font-medium">
                  <ArrowLeft className="h-3 w-3" /> Danh sách Đề thi
                </Link>
              )}
              <span>/</span>
              <span className="font-semibold text-foreground">{testDetail?.title || `Đề thi #${testId}`}</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
              <span>{testDetail?.title || "Chỉnh sửa câu hỏi Full Test"}</span>
              <Badge variant="secondary" className="text-xs font-bold">
                {testDetail?.category || "TOEIC"}
              </Badge>
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sửa thông tin đề thi */}
            <Button
              variant="outline"
              size="sm"
              onClick={openEditTestInfo}
              className="text-xs h-9 font-semibold"
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" /> Sửa thông tin đề
            </Button>

            {/* Thi thử */}
            {testDetail?.course_id && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs h-9 font-semibold"
              >
                <Link to={`/courses/${testDetail.course_id}/fulltest/${testId}`} target="_blank">
                  <Eye className="w-3.5 h-3.5 mr-1.5 text-primary" /> Thi thử (Student Mode) <ExternalLink className="w-2.5 h-2.5 ml-1 opacity-60" />
                </Link>
              </Button>
            )}

            {/* Thêm câu hỏi mới */}
            <Button
              size="sm"
              onClick={() => openAddQuestion()}
              className="text-xs h-9 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Thêm câu hỏi mới
            </Button>
          </div>
        </div>

        {/* Loading placeholder */}
        {loadingTestDetail || loadingQuestions ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground font-medium">Đang tải toàn bộ dữ liệu 200 câu hỏi...</span>
          </div>
        ) : (
          <>
            {/* Quick stats dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card border border-border/70 shadow-sm hover:shadow transition-all">
                <CardHeader className="p-4 pb-1.5">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Tổng số câu hỏi</span>
                    <Layers className="w-4 h-4 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-black text-foreground">{totalCount} / 200</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Số lượng câu trong đề thi.</p>
                </CardContent>
              </Card>

              <Card className="bg-card border border-border/70 shadow-sm hover:shadow transition-all">
                <CardHeader className="p-4 pb-1.5">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Thiếu Audio</span>
                    <Volume2 className={cn("w-4 h-4", missingAudio > 0 ? "text-amber-500" : "text-emerald-500")} />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className={cn("text-2xl font-black", missingAudio > 0 ? "text-amber-500" : "text-emerald-500")}>
                    {missingAudio} câu
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Phần Listening (Part 1 - 4).</p>
                </CardContent>
              </Card>

              <Card className="bg-card border border-border/70 shadow-sm hover:shadow transition-all">
                <CardHeader className="p-4 pb-1.5">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Chưa có đáp án đúng</span>
                    <AlertTriangle className={cn("w-4 h-4", missingCorrect > 0 ? "text-rose-500" : "text-emerald-500")} />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className={cn("text-2xl font-black", missingCorrect > 0 ? "text-rose-500" : "text-emerald-500")}>
                    {missingCorrect} câu
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Cần chọn đáp án đúng để chấm điểm.</p>
                </CardContent>
              </Card>

              <Card className="bg-card border border-border/70 shadow-sm hover:shadow transition-all">
                <CardHeader className="p-4 pb-1.5">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Chưa có Lời giải</span>
                    <Sparkles className={cn("w-4 h-4", missingExplanation > 0 ? "text-amber-500" : "text-emerald-500")} />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className={cn("text-2xl font-black", missingExplanation > 0 ? "text-amber-500" : "text-emerald-500")}>
                    {missingExplanation} câu
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Giúp học viên hiểu bài tốt hơn.</p>
                </CardContent>
              </Card>
            </div>

            {/* Filter and search bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/70 shadow-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo số câu, nội dung câu hỏi, đoạn văn, transcript, bản dịch, đáp án..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background/60 border-border/70 focus-visible:ring-primary text-sm"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                  <Checkbox
                    checked={showIncompleteOnly}
                    onCheckedChange={(checked) => setShowIncompleteOnly(!!checked)}
                  />
                  <span className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Chỉ hiện câu thiếu thông tin
                  </span>
                </label>
              </div>
            </div>

            {/* Part Tabs Selector */}
            <Tabs value={activePartTab} onValueChange={setActivePartTab} className="w-full">
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                <TabsList className="h-auto p-1 bg-muted/60 border border-border/60">
                  <TabsTrigger value="all" className="py-1.5 px-3.5 text-xs font-semibold rounded-md">Tất cả ({totalCount})</TabsTrigger>
                  {[1, 2, 3, 4, 5, 6, 7].map((part) => {
                    const countInPart = allQuestions.filter((q) => q.part_number === part).length;
                    return (
                      <TabsTrigger key={part} value={part.toString()} className="py-1.5 px-3 text-xs font-semibold rounded-md">
                        Part {part} ({countInPart})
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {activePartTab !== "all" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openAddQuestion(Number(activePartTab))}
                    className="text-xs h-8 font-semibold shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Thêm câu vào Part {activePartTab}
                  </Button>
                )}
              </div>

              {/* Questions Render Area */}
              <div className="mt-6 space-y-6">
                {groupedList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 bg-card rounded-2xl border border-dashed border-border">
                    <HelpCircle className="h-10 w-10 text-muted-foreground/50" />
                    <span className="text-sm text-muted-foreground font-semibold">
                      Không tìm thấy câu hỏi nào phù hợp với bộ lọc tìm kiếm.
                    </span>
                    <Button size="sm" onClick={() => openAddQuestion()} className="mt-2 text-xs">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Thêm câu hỏi đầu tiên
                    </Button>
                  </div>
                ) : (
                  groupedList.map(({ key, questions }) => {
                    const firstQ = questions[0];
                    const isGroup = questions.length > 1;

                    return (
                      <Card 
                        key={key} 
                        className={cn(
                          "overflow-hidden border shadow-sm transition-all duration-200 hover:shadow-md bg-card/70 backdrop-blur-sm rounded-2xl",
                          isGroup ? "border-primary/30 ring-1 ring-primary/10" : "border-border/70"
                        )}
                      >
                        {/* Group Header / Metadata */}
                        {isGroup && (
                          <div className="bg-primary/5 px-6 py-4 border-b border-primary/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-bold text-xs">
                                  Part {firstQ.part_number} Group ({questions.length} câu: Câu {questions[0].display_order} - {questions[questions.length - 1].display_order})
                                </Badge>
                                {firstQ.group_id && (
                                  <span className="text-xs font-mono text-muted-foreground bg-background/80 px-2 py-0.5 rounded border">
                                    ID: {firstQ.group_id}
                                  </span>
                                )}
                              </div>

                              {firstQ.audio_url && (
                                <div className="flex items-center gap-3 bg-background/80 p-2 rounded-lg border border-primary/10 max-w-md">
                                  <Volume2 className="h-4 w-4 text-primary shrink-0" />
                                  <audio controls src={firstQ.audio_url} className="w-full h-7" />
                                </div>
                              )}

                              {firstQ.image_url && (
                                <div className="mt-1">
                                  <img 
                                    src={firstQ.image_url} 
                                    alt="Group visual context" 
                                    className="max-h-48 rounded-lg border border-border/80 object-cover" 
                                  />
                                </div>
                              )}

                              {firstQ.passage_text && (
                                <div className="text-xs text-foreground/80 bg-background/60 p-3 rounded-lg border border-border/60 max-h-32 overflow-y-auto leading-relaxed font-sans">
                                  <div dangerouslySetInnerHTML={{ __html: firstQ.passage_text }} />
                                </div>
                              )}
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditGroupClick(questions)}
                              className="text-xs h-8 font-semibold flex items-center gap-1.5 border-primary/30 hover:bg-primary/10 hover:text-primary transition-all duration-200 shrink-0 self-start md:self-center"
                            >
                              <Edit className="h-3.5 w-3.5" /> Sửa thông tin nhóm
                            </Button>
                          </div>
                        )}

                        <CardContent className={cn("p-6 space-y-6", isGroup ? "divide-y divide-border/40" : "")}>
                          {questions.map((q, qIdx) => {
                            const issues = getQuestionIssues(q);

                            return (
                              <div key={q.id} className={cn("flex flex-col gap-4", qIdx > 0 ? "pt-6" : "")}>
                                {/* Question Title Row */}
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                  <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-base font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">
                                        Câu {q.display_order}
                                      </span>
                                      {!isGroup && (
                                        <Badge variant="secondary" className="text-xs font-semibold">
                                          Part {q.part_number}
                                        </Badge>
                                      )}
                                      {issues.map((issue) => (
                                        <Badge 
                                          key={issue} 
                                          variant="destructive" 
                                          className="text-xs py-0.5 px-2 font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20"
                                        >
                                          {issue}
                                        </Badge>
                                      ))}
                                    </div>
                                    <p className="text-sm font-semibold text-foreground mt-1">
                                      {q.question_text || <span className="text-muted-foreground italic">(Chưa có nội dung câu hỏi)</span>}
                                    </p>
                                  </div>

                                  {/* Individual Action Buttons */}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEditQuestionClick(q)}
                                      className="text-xs h-8 font-semibold bg-background hover:bg-muted"
                                    >
                                      <Edit className="h-3.5 w-3.5 mr-1" /> Sửa câu & Đáp án
                                    </Button>

                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => duplicateQuestionMutation.mutate(q)}
                                      disabled={duplicateQuestionMutation.isPending}
                                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                      title="Nhân bản câu hỏi này"
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>

                                     <AlertDialog>
                                       <AlertDialogTrigger asChild>
                                         <Button
                                           size="icon"
                                           variant="ghost"
                                           disabled={deleteQuestionMutation.isPending}
                                           className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                                           title="Xóa câu hỏi này"
                                         >
                                           <Trash2 className="h-3.5 w-3.5" />
                                         </Button>
                                       </AlertDialogTrigger>
                                       <AlertDialogContent className="rounded-2xl border-2 border-border">
                                         <AlertDialogHeader>
                                           <AlertDialogTitle>Xác nhận xóa Câu {q.display_order}?</AlertDialogTitle>
                                           <AlertDialogDescription>
                                             Bạn có chắc chắn muốn xóa câu hỏi này? Toàn bộ đáp án đi kèm sẽ bị xóa và không thể khôi phục.
                                           </AlertDialogDescription>
                                         </AlertDialogHeader>
                                         <AlertDialogFooter>
                                           <AlertDialogCancel>Hủy</AlertDialogCancel>
                                           <AlertDialogAction
                                             onClick={() => deleteQuestionMutation.mutate(q.id)}
                                             className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                           >
                                             Xóa câu hỏi
                                           </AlertDialogAction>
                                         </AlertDialogFooter>
                                       </AlertDialogContent>
                                     </AlertDialog>
                                  </div>
                                </div>

                                {/* Single Question Media Player */}
                                {!isGroup && (q.audio_url || q.image_url || q.passage_text) && (
                                  <div className="space-y-2 bg-muted/20 p-3 rounded-xl border border-border/50">
                                    {q.audio_url && (
                                      <div className="flex items-center gap-2 max-w-md">
                                        <Volume2 className="h-4 w-4 text-primary shrink-0" />
                                        <audio controls src={q.audio_url} className="w-full h-7" />
                                      </div>
                                    )}
                                    {q.image_url && (
                                      <img src={q.image_url} alt="Question context" className="max-h-44 rounded-lg border object-cover" />
                                    )}
                                    {q.passage_text && (
                                      <div 
                                        className="text-xs text-foreground/80 bg-background/80 p-2.5 rounded-lg border max-h-24 overflow-y-auto leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: q.passage_text }}
                                      />
                                    )}
                                  </div>
                                )}

                                {/* Answers rendering */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                  {q.answers.map((ans) => (
                                    <div
                                      key={ans.id || ans.display_order}
                                      className={cn(
                                        "flex items-start gap-2.5 p-3 rounded-xl border text-xs transition-all duration-200",
                                        ans.is_correct
                                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-semibold"
                                          : "bg-muted/30 border-border/60 text-muted-foreground"
                                      )}
                                    >
                                      <span className={cn(
                                        "h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border",
                                        ans.is_correct
                                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                          : "bg-background border-border text-foreground"
                                      )}>
                                        {String.fromCharCode(65 + ans.display_order)}
                                      </span>
                                      <div className="space-y-1 flex-1 min-w-0">
                                        <div className="text-foreground font-medium break-words">
                                          {ans.answer_text || <span className="italic text-muted-foreground">(Trống)</span>}
                                        </div>
                                        {ans.explanation && ans.is_correct && (
                                          <div className="text-xs text-muted-foreground font-normal leading-relaxed border-t border-emerald-500/20 pt-1 mt-1 bg-background/50 p-1.5 rounded">
                                            <strong className="text-emerald-700 dark:text-emerald-400">Giải thích:</strong> {ans.explanation}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Transcript / Translation metadata if present */}
                                {(q.transcript || q.translation) && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-muted/15 p-2.5 rounded-lg border border-border/40">
                                    {q.transcript && (
                                      <div>
                                        <span className="font-bold text-muted-foreground">Transcript:</span>{" "}
                                        <span className="text-foreground/80">{q.transcript}</span>
                                      </div>
                                    )}
                                    {q.translation && (
                                      <div>
                                        <span className="font-bold text-muted-foreground">Bản dịch:</span>{" "}
                                        <span className="text-foreground/80">{q.translation}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </Tabs>
          </>
        )}
      </div>

      {/* ================= EDIT TEST INFO DIALOG ================= */}
      <Dialog open={isEditTestInfoOpen} onOpenChange={setIsEditTestInfoOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Chỉnh sửa Thông tin Đề Thi</DialogTitle>
            <DialogDescription className="text-xs">
              Thay đổi tiêu đề, mô tả, file nghe tổng thể và ngày mở đề thi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tên đề thi *</Label>
              <Input
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="Ví dụ: TOEIC 2026 Practice Test 01"
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Bộ đề / Năm thi</Label>
                <Select value={testCategory} onValueChange={setTestCategory}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">Bộ Đề TOEIC 2026</SelectItem>
                    <SelectItem value="real_2024_2026">Đề Thi Thực Tế 2024 - 2026</SelectItem>
                    <SelectItem value="2025">Bộ Đề TOEIC 2025</SelectItem>
                    <SelectItem value="2024">Bộ Đề TOEIC 2024</SelectItem>
                    <SelectItem value="general">Bộ Đề Tổng Hợp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Ngày mở đề</Label>
                <Input
                  type="date"
                  value={testReleaseDate}
                  onChange={(e) => setTestReleaseDate(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mô tả đề thi</Label>
              <Textarea
                rows={2}
                value={testDescription}
                onChange={(e) => setTestDescription(e.target.value)}
                placeholder="Mô tả nội dung hoặc hướng dẫn làm bài..."
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>File nghe tổng thể (Audio Listening)</span>
                {testAudioUrl && <span className="text-emerald-600 font-normal">✓ Đã gắn link</span>}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={testAudioUrl}
                  onChange={(e) => setTestAudioUrl(e.target.value)}
                  placeholder="https://storage.googleapis.com/.../audio.mp3"
                  className="text-sm flex-1 font-mono text-xs"
                />
                <Button variant="outline" className="shrink-0 text-xs" asChild disabled={isUploadingMedia}>
                  <label className="cursor-pointer">
                    {isUploadingMedia ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                    Tải file lên
                    <input
                      type="file"
                      className="hidden"
                      accept="audio/*"
                      onChange={(e) => handleUploadFile(e, "audio", (url) => setTestAudioUrl(url))}
                      disabled={isUploadingMedia}
                    />
                  </label>
                </Button>
              </div>
              {testAudioUrl && (
                <div className="mt-2 p-2 bg-muted/40 rounded-lg border border-border/60">
                  <audio controls src={testAudioUrl} className="w-full h-8" />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setIsEditTestInfoOpen(false)}>Hủy</Button>
            <Button onClick={() => updateTestInfoMutation.mutate()} disabled={updateTestInfoMutation.isPending || !testTitle.trim()}>
              {updateTestInfoMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= ADD QUESTION DIALOG ================= */}
      <Dialog open={isAddQuestionOpen} onOpenChange={setIsAddQuestionOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Thêm Câu Hỏi Mới vào Đề Thi</DialogTitle>
            <DialogDescription className="text-xs">
              Nhập nội dung, âm thanh, hình ảnh và danh sách đáp án cho câu hỏi mới.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Chọn Phần thi (Part)</Label>
                <Select 
                  value={addPart.toString()} 
                  onValueChange={(v) => {
                    const p = Number(v);
                    setAddPart(p);
                    setAddAnswers(defaultAnswers(p));
                  }}
                >
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Part 1: Photo Description (6 câu)</SelectItem>
                    <SelectItem value="2">Part 2: Question & Response (25 câu, 3 đáp án)</SelectItem>
                    <SelectItem value="3">Part 3: Conversations (39 câu)</SelectItem>
                    <SelectItem value="4">Part 4: Short Talks (30 câu)</SelectItem>
                    <SelectItem value="5">Part 5: Incomplete Sentences (30 câu)</SelectItem>
                    <SelectItem value="6">Part 6: Text Completion (16 câu)</SelectItem>
                    <SelectItem value="7">Part 7: Reading Comprehension (54 câu)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Thứ tự câu hỏi (1 - 200)</Label>
                <Input
                  type="number"
                  value={addDisplayOrder}
                  onChange={(e) => setAddDisplayOrder(Number(e.target.value))}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nội dung câu hỏi</Label>
              <Textarea
                rows={2}
                value={addQuestionText}
                onChange={(e) => setAddQuestionText(e.target.value)}
                placeholder="Ví dụ: Where is the conference most likely taking place?"
                className="text-sm"
              />
            </div>

            {/* Audio URL + Upload */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Audio URL (Nghe câu hỏi)</Label>
              <div className="flex gap-2">
                <Input
                  value={addAudioUrl}
                  onChange={(e) => setAddAudioUrl(e.target.value)}
                  placeholder="https://.../audio.mp3"
                  className="text-sm flex-1 font-mono text-xs"
                />
                <Button variant="outline" className="shrink-0 text-xs" asChild disabled={isUploadingMedia}>
                  <label className="cursor-pointer">
                    <Upload className="w-3.5 h-3.5 mr-1" /> Tải Audio
                    <input
                      type="file"
                      className="hidden"
                      accept="audio/*"
                      onChange={(e) => handleUploadFile(e, "audio", (url) => setAddAudioUrl(url))}
                    />
                  </label>
                </Button>
              </div>
              {addAudioUrl && (
                <div className="mt-1 p-2 bg-muted/40 rounded border">
                  <audio controls src={addAudioUrl} className="w-full h-7" />
                </div>
              )}
            </div>

            {/* Image URL + Upload */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Image URL (Hình ảnh đính kèm)</Label>
              <div className="flex gap-2">
                <Input
                  value={addImageUrl}
                  onChange={(e) => setAddImageUrl(e.target.value)}
                  placeholder="https://.../image.png"
                  className="text-sm flex-1 font-mono text-xs"
                />
                <Button variant="outline" className="shrink-0 text-xs" asChild disabled={isUploadingMedia}>
                  <label className="cursor-pointer">
                    <Upload className="w-3.5 h-3.5 mr-1" /> Tải Ảnh
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleUploadFile(e, "image", (url) => setAddImageUrl(url))}
                    />
                  </label>
                </Button>
              </div>
              {addImageUrl && (
                <img src={addImageUrl} alt="Preview" className="max-h-36 rounded border mt-1 object-cover" />
              )}
            </div>

            {/* Passage Text */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Đoạn văn đọc (Passage - nếu có)</Label>
              <Textarea
                rows={3}
                value={addPassageText}
                onChange={(e) => setAddPassageText(e.target.value)}
                placeholder="Hỗ trợ HTML: <p>, <strong>, <em>..."
                className="font-mono text-xs"
              />
            </div>

            {/* Transcript & Translation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Transcript (Bản ghi nghe)</Label>
                <Textarea
                  rows={2}
                  value={addTranscript}
                  onChange={(e) => setAddTranscript(e.target.value)}
                  placeholder="Bản ghi tiếng Anh..."
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Bản dịch giải nghĩa</Label>
                <Textarea
                  rows={2}
                  value={addTranslation}
                  onChange={(e) => setAddTranslation(e.target.value)}
                  placeholder="Bản dịch tiếng Việt..."
                  className="text-xs"
                />
              </div>
            </div>

            {/* Answers Form */}
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Danh sách đáp án ({addAnswers.length} lựa chọn)
                </h4>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAddAnswers((prev) => [
                      ...prev,
                      { answer_text: "", is_correct: false, explanation: "", display_order: prev.length },
                    ]);
                  }}
                  className="text-xs h-7"
                >
                  <Plus className="w-3 h-3 mr-1" /> Thêm lựa chọn
                </Button>
              </div>

              <div className="space-y-3">
                {addAnswers.map((ans, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <Input
                          value={ans.answer_text}
                          onChange={(e) => {
                            const updated = [...addAnswers];
                            updated[idx].answer_text = e.target.value;
                            setAddAnswers(updated);
                          }}
                          placeholder={`Nội dung đáp án ${String.fromCharCode(65 + idx)}`}
                          className="text-xs h-8 bg-background"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold select-none">
                          <Checkbox
                            checked={ans.is_correct}
                            onCheckedChange={(checked) => {
                              const updated = addAnswers.map((a, aIdx) => ({
                                ...a,
                                is_correct: aIdx === idx ? !!checked : false,
                              }));
                              setAddAnswers(updated);
                            }}
                          />
                          <span className={ans.is_correct ? "text-emerald-600 font-bold" : "text-muted-foreground"}>
                            Đáp án đúng
                          </span>
                        </label>

                        {addAnswers.length > 2 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setAddAnswers(addAnswers.filter((_, aIdx) => aIdx !== idx));
                            }}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {ans.is_correct && (
                      <div className="space-y-1 pl-8">
                        <Label className="text-xs text-muted-foreground font-semibold">Lời giải chi tiết cho đáp án đúng</Label>
                        <Textarea
                          rows={2}
                          value={ans.explanation || ""}
                          onChange={(e) => {
                            const updated = [...addAnswers];
                            updated[idx].explanation = e.target.value;
                            setAddAnswers(updated);
                          }}
                          placeholder="Giải thích vì sao chọn đáp án này..."
                          className="text-xs bg-background"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setIsAddQuestionOpen(false)}>Hủy</Button>
            <Button onClick={() => addQuestionMutation.mutate()} disabled={addQuestionMutation.isPending}>
              {addQuestionMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Tạo câu hỏi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= EDIT INDIVIDUAL QUESTION DIALOG ================= */}
      <Dialog open={isEditQuestionOpen} onOpenChange={setIsEditQuestionOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Chỉnh sửa Câu Hỏi {editDisplayOrder}</DialogTitle>
            <DialogDescription className="text-xs">
              Thay đổi nội dung, âm thanh, hình ảnh, transcript, bản dịch và từng lựa chọn đáp án.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Thứ tự câu hỏi (1 - 200)</Label>
                <Input
                  type="number"
                  value={editDisplayOrder}
                  onChange={(e) => setEditDisplayOrder(Number(e.target.value))}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mã nhóm (Group ID)</Label>
                <Input
                  value={editGroupId}
                  onChange={(e) => setEditGroupId(e.target.value)}
                  placeholder="group_p7_..."
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nội dung câu hỏi</Label>
              <Textarea
                rows={2}
                value={editQuestionText}
                onChange={(e) => setEditQuestionText(e.target.value)}
                placeholder="Ví dụ: What is suggested about the company?"
                className="text-sm"
              />
            </div>

            {/* Audio URL + Upload */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Audio URL (Nghe riêng cho câu này)</span>
                {editAudioUrl && <span className="text-emerald-600 font-normal text-xs">✓ Đã có file</span>}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={editAudioUrl}
                  onChange={(e) => setEditAudioUrl(e.target.value)}
                  placeholder="https://.../audio.mp3"
                  className="text-sm flex-1 font-mono text-xs"
                />
                <Button variant="outline" className="shrink-0 text-xs" asChild disabled={isUploadingMedia}>
                  <label className="cursor-pointer">
                    <Upload className="w-3.5 h-3.5 mr-1" /> Tải Audio
                    <input
                      type="file"
                      className="hidden"
                      accept="audio/*"
                      onChange={(e) => handleUploadFile(e, "audio", (url) => setEditAudioUrl(url))}
                    />
                  </label>
                </Button>
              </div>
              {editAudioUrl && (
                <div className="mt-1 p-2 bg-muted/40 rounded border">
                  <audio controls src={editAudioUrl} className="w-full h-7" />
                </div>
              )}
            </div>

            {/* Image URL + Upload */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Image URL (Hình ảnh đính kèm)</span>
                {editImageUrl && <span className="text-emerald-600 font-normal text-xs">✓ Đã có ảnh</span>}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  placeholder="https://.../image.png"
                  className="text-sm flex-1 font-mono text-xs"
                />
                <Button variant="outline" className="shrink-0 text-xs" asChild disabled={isUploadingMedia}>
                  <label className="cursor-pointer">
                    <Upload className="w-3.5 h-3.5 mr-1" /> Tải Ảnh
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleUploadFile(e, "image", (url) => setEditImageUrl(url))}
                    />
                  </label>
                </Button>
              </div>
              {editImageUrl && (
                <img src={editImageUrl} alt="Preview" className="max-h-36 rounded border mt-1 object-cover" />
              )}
            </div>

            {/* Passage Text */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Đoạn văn đọc (Passage)</Label>
              <Textarea
                rows={3}
                value={editPassageText}
                onChange={(e) => setEditPassageText(e.target.value)}
                placeholder="Hỗ trợ các thẻ HTML..."
                className="font-mono text-xs"
              />
            </div>

            {/* Transcript & Translation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Transcript (Bản ghi nghe)</Label>
                <Textarea
                  rows={2}
                  value={editTranscript}
                  onChange={(e) => setEditTranscript(e.target.value)}
                  placeholder="Bản ghi tiếng Anh..."
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Bản dịch giải nghĩa</Label>
                <Textarea
                  rows={2}
                  value={editTranslation}
                  onChange={(e) => setEditTranslation(e.target.value)}
                  placeholder="Bản dịch tiếng Việt..."
                  className="text-xs"
                />
              </div>
            </div>

            {/* Answers Form */}
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Danh sách đáp án ({editAnswers.length} lựa chọn)
                </h4>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditAnswers((prev) => [
                      ...prev,
                      { answer_text: "", is_correct: false, explanation: "", display_order: prev.length },
                    ]);
                  }}
                  className="text-xs h-7"
                >
                  <Plus className="w-3 h-3 mr-1" /> Thêm lựa chọn
                </Button>
              </div>

              <div className="space-y-3">
                {editAnswers.map((ans, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <Input
                          value={ans.answer_text}
                          onChange={(e) => {
                            const updated = [...editAnswers];
                            updated[idx].answer_text = e.target.value;
                            setEditAnswers(updated);
                          }}
                          placeholder={`Nội dung đáp án ${String.fromCharCode(65 + idx)}`}
                          className="text-xs h-8 bg-background"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold select-none">
                          <Checkbox
                            checked={ans.is_correct}
                            onCheckedChange={(checked) => {
                              const updated = editAnswers.map((a, aIdx) => ({
                                ...a,
                                is_correct: aIdx === idx ? !!checked : (selectedQuestion?.part_number === 1 ? a.is_correct : false),
                              }));
                              setEditAnswers(updated);
                            }}
                          />
                          <span className={ans.is_correct ? "text-emerald-600 font-bold" : "text-muted-foreground"}>
                            Đáp án đúng
                          </span>
                        </label>

                        {editAnswers.length > 2 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditAnswers(editAnswers.filter((_, aIdx) => aIdx !== idx));
                            }}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {ans.is_correct && (
                      <div className="space-y-1 pl-8">
                        <Label className="text-xs text-muted-foreground font-semibold">Lời giải chi tiết cho đáp án đúng</Label>
                        <Textarea
                          rows={2}
                          value={ans.explanation || ""}
                          onChange={(e) => {
                            const updated = [...editAnswers];
                            updated[idx].explanation = e.target.value;
                            setEditAnswers(updated);
                          }}
                          placeholder="Giải thích vì sao chọn đáp án này..."
                          className="text-xs bg-background"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setIsEditQuestionOpen(false)}>Hủy</Button>
            <Button onClick={() => updateQuestionMutation.mutate()} disabled={updateQuestionMutation.isPending}>
              {updateQuestionMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= EDIT GROUP DETAILS DIALOG ================= */}
      <Dialog open={isEditGroupOpen} onOpenChange={setIsEditGroupOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Sửa Thông Tin Nhóm Câu Hỏi ({selectedGroupQuestions.length} câu)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Các thông tin sau sẽ được áp dụng đồng bộ cho tất cả các câu hỏi thuộc nhóm này.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mã nhóm (Group ID)</Label>
              <Input
                value={groupIdString}
                onChange={(e) => setGroupIdString(e.target.value)}
                placeholder="Ví dụ: group_passage_p7_abc123"
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Audio URL chung</Label>
              <div className="flex gap-2">
                <Input
                  value={groupAudioUrl}
                  onChange={(e) => setGroupAudioUrl(e.target.value)}
                  placeholder="https://.../audio.mp3"
                  className="text-sm flex-1 font-mono text-xs"
                />
                <Button variant="outline" className="shrink-0 text-xs" asChild disabled={isUploadingMedia}>
                  <label className="cursor-pointer">
                    <Upload className="w-3.5 h-3.5 mr-1" /> Tải Audio
                    <input
                      type="file"
                      className="hidden"
                      accept="audio/*"
                      onChange={(e) => handleUploadFile(e, "audio", (url) => setGroupAudioUrl(url))}
                    />
                  </label>
                </Button>
              </div>
              {groupAudioUrl && (
                <div className="mt-1 p-2 bg-muted/40 rounded border">
                  <audio controls src={groupAudioUrl} className="w-full h-7" />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Image URL chung (Nếu có)</Label>
              <div className="flex gap-2">
                <Input
                  value={groupImageUrl}
                  onChange={(e) => setGroupImageUrl(e.target.value)}
                  placeholder="https://.../image.png"
                  className="text-sm flex-1 font-mono text-xs"
                />
                <Button variant="outline" className="shrink-0 text-xs" asChild disabled={isUploadingMedia}>
                  <label className="cursor-pointer">
                    <Upload className="w-3.5 h-3.5 mr-1" /> Tải Ảnh
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleUploadFile(e, "image", (url) => setGroupImageUrl(url))}
                    />
                  </label>
                </Button>
              </div>
              {groupImageUrl && (
                <img src={groupImageUrl} alt="Group visual" className="max-h-40 rounded border mt-1 object-cover" />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Đoạn văn chung (HTML)</Label>
              <Textarea
                rows={8}
                value={groupPassageText}
                onChange={(e) => setGroupPassageText(e.target.value)}
                placeholder="Nội dung đoạn văn đọc hỗ trợ các thẻ HTML..."
                className="font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setIsEditGroupOpen(false)}>Hủy</Button>
            <Button onClick={() => updateGroupMutation.mutate()} disabled={updateGroupMutation.isPending}>
              {updateGroupMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Cập nhật đồng bộ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminFullTestQuestions;
