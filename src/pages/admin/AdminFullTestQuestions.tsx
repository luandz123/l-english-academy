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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Search, ArrowLeft, Edit, Trash2, Plus, Volume2, Image, FileText, CheckCircle2, AlertTriangle, Eye, HelpCircle } from "lucide-react";
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

const AdminFullTestQuestions = () => {
  const { testId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [activePartTab, setActivePartTab] = useState<string>("all");
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);

  // Modal Editing States
  const [isEditQuestionOpen, setIsEditQuestionOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [selectedGroupQuestions, setSelectedGroupQuestions] = useState<Question[]>([]);
  const [groupPassageText, setGroupPassageText] = useState("");
  const [groupAudioUrl, setGroupAudioUrl] = useState("");
  const [groupImageUrl, setGroupImageUrl] = useState("");
  const [groupIdString, setGroupIdString] = useState("");

  // Individual Question Edit Form States
  const [editDisplayOrder, setEditDisplayOrder] = useState<number>(1);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editAudioUrl, setEditAudioUrl] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editPassageText, setEditPassageText] = useState("");
  const [editGroupId, setEditGroupId] = useState("");
  const [editTranscript, setEditTranscript] = useState("");
  const [editTranslation, setEditTranslation] = useState("");
  const [editAnswers, setEditAnswers] = useState<Answer[]>([]);

  // Fetch Test Detail
  const { data: testDetail, isLoading: loadingTestDetail } = useQuery({
    queryKey: ["admin-fulltest-detail", testId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("full_tests")
        .select("id, title, description, audio_url")
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

  // Individual Question Mutation
  const updateQuestionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedQuestion) return;

      // Update question table
      const { error: qErr } = await supabase
        .from("questions")
        .update({
          display_order: editDisplayOrder,
          question_text: editQuestionText,
          audio_url: editAudioUrl || null,
          image_url: editImageUrl || null,
          passage_text: editPassageText || null,
          group_id: editGroupId || null,
          transcript: editTranscript || null,
          translation: editTranslation || null,
        })
        .eq("id", selectedQuestion.id);

      if (qErr) throw qErr;

      // Update answers table
      for (const ans of editAnswers) {
        if (ans.id) {
          // Update existing
          const { error: aErr } = await supabase
            .from("answers")
            .update({
              answer_text: ans.answer_text,
              is_correct: ans.is_correct,
              explanation: ans.explanation || null,
              display_order: ans.display_order,
            })
            .eq("id", ans.id);
          if (aErr) throw aErr;
        } else {
          // Insert new answer if somehow not exist
          const { error: aErr } = await supabase
            .from("answers")
            .insert({
              question_id: selectedQuestion.id,
              answer_text: ans.answer_text,
              is_correct: ans.is_correct,
              explanation: ans.explanation || null,
              display_order: ans.display_order,
            });
          if (aErr) throw aErr;
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

  // Group Questions Mutation
  const updateGroupMutation = useMutation({
    mutationFn: async () => {
      if (selectedGroupQuestions.length === 0) return;

      const ids = selectedGroupQuestions.map((q) => q.id);

      // Update public.questions for all questions in this group
      const { error } = await supabase
        .from("questions")
        .update({
          passage_text: groupPassageText || null,
          audio_url: groupAudioUrl || null,
          image_url: groupImageUrl || null,
          group_id: groupIdString || null,
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

  // Handle click on Edit Question
  const handleEditQuestionClick = (q: Question) => {
    setSelectedQuestion(q);
    setEditDisplayOrder(q.display_order);
    setEditQuestionText(q.question_text);
    setEditAudioUrl(q.audio_url || "");
    setEditImageUrl(q.image_url || "");
    setEditPassageText(q.passage_text || "");
    setEditGroupId(q.group_id || "");
    setEditTranscript(q.transcript || "");
    setEditTranslation(q.translation || "");
    setEditAnswers(JSON.parse(JSON.stringify(q.answers))); // deep clone
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
      issues.push("Thiếu file nghe (audio)");
    }

    if (q.part_number === 1 && !q.image_url) {
      issues.push("Thiếu hình ảnh");
    }

    if ([6, 7].includes(q.part_number) && !q.passage_text) {
      issues.push("Thiếu đoạn văn (passage)");
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

      // Group keys:
      // Part 3/4: group_id or audio_url
      // Part 6/7: group_id or passage_text
      let key = `single-${q.id}`;
      if (q.group_id) {
        key = `group-id-${q.group_id}`;
      } else if (isPart34 && q.audio_url) {
        key = `audio-${q.audio_url}`;
      } else if (isPart67 && q.passage_text) {
        // use snippet of passage text as key
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
    // 1. Part Tab Filter
    if (activePartTab !== "all" && q.part_number.toString() !== activePartTab) {
      return false;
    }

    // 2. Incomplete status filter
    if (showIncompleteOnly && getQuestionIssues(q).length === 0) {
      return false;
    }

    // 3. Search query
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
    <AdminLayout title="Chi tiết & Chỉnh sửa Câu hỏi">
      <div className="space-y-6">
        {/* Header Breadcrumb */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/admin/fulltests" className="hover:text-primary flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Quay lại Đề thi
              </Link>
              <span>/</span>
              <span>{testDetail?.title || "Loading..."}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Quản lý câu hỏi chi tiết
            </h1>
          </div>
        </div>

        {/* Loading placeholder */}
        {loadingTestDetail || loadingQuestions ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Đang tải danh sách câu hỏi...</span>
          </div>
        ) : (
          <>
            {/* Quick stats dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card/50 backdrop-blur-md border border-border/60 hover:shadow-lg transition-all duration-300">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tổng số câu hỏi</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-3xl font-extrabold">{totalCount} / 200</div>
                  <p className="text-xs text-muted-foreground mt-1">Câu hỏi đã được đồng bộ.</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-md border border-border/60 hover:shadow-lg transition-all duration-300">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Thiếu file nghe</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className={cn("text-3xl font-extrabold", missingAudio > 0 ? "text-amber-500" : "text-emerald-500")}>
                    {missingAudio}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Phần Listening (Part 1 - 4).</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-md border border-border/60 hover:shadow-lg transition-all duration-300">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Chưa chọn đáp án đúng</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className={cn("text-3xl font-extrabold", missingCorrect > 0 ? "text-rose-500" : "text-emerald-500")}>
                    {missingCorrect}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Gây lỗi chấm điểm học viên.</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-md border border-border/60 hover:shadow-lg transition-all duration-300">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Chưa có giải thích đáp án</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className={cn("text-3xl font-extrabold", missingExplanation > 0 ? "text-amber-500" : "text-emerald-500")}>
                    {missingExplanation}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Rất quan trọng cho việc học tập.</p>
                </CardContent>
              </Card>
            </div>

            {/* Filter and search bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/60 shadow-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm câu hỏi, đoạn văn, bản dịch, thứ tự số..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background/50 border-border/60 focus-visible:ring-primary"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                  <Checkbox
                    checked={showIncompleteOnly}
                    onCheckedChange={(checked) => setShowIncompleteOnly(!!checked)}
                  />
                  <span className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> Chỉ hiện câu thiếu dữ liệu
                  </span>
                </label>
              </div>
            </div>

            {/* Part Tabs Selector */}
            <Tabs value={activePartTab} onValueChange={setActivePartTab} className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-muted/50 border border-border/60">
                <TabsTrigger value="all" className="py-2 px-4 rounded-md">Tất cả</TabsTrigger>
                {[1, 2, 3, 4, 5, 6, 7].map((part) => (
                  <TabsTrigger key={part} value={part.toString()} className="py-2 px-4 rounded-md">
                    Part {part}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Questions Render Area */}
              <div className="mt-6 space-y-6">
                {groupedList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 bg-card rounded-xl border border-dashed border-border/80">
                    <HelpCircle className="h-10 w-10 text-muted-foreground/60" />
                    <span className="text-sm text-muted-foreground font-medium">Không tìm thấy câu hỏi nào phù hợp với bộ lọc.</span>
                  </div>
                ) : (
                  groupedList.map(({ key, questions }) => {
                    const firstQ = questions[0];
                    const isGroup = questions.length > 1;

                    return (
                      <Card key={key} className={cn(
                        "overflow-hidden border shadow-sm transition-all duration-200 hover:shadow-md bg-card/40 backdrop-blur-sm",
                        isGroup ? "border-primary/20 ring-1 ring-primary/5" : "border-border/60"
                      )}>
                        {/* Group Header / Metadata */}
                        {isGroup && (
                          <div className="bg-primary/5 px-6 py-4 border-b border-primary/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                  Part {firstQ.part_number} Group ({questions.length} câu)
                                </Badge>
                                {firstQ.group_id && (
                                  <span className="text-xs font-mono text-muted-foreground">ID: {firstQ.group_id}</span>
                                )}
                              </div>
                              {firstQ.passage_text && (
                                <div className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                                  <FileText className="h-3 w-3" /> Đoạn văn: {firstQ.passage_text.replace(/<[^>]*>/g, "").slice(0, 100)}...
                                </div>
                              )}
                              {firstQ.audio_url && (
                                <div className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                                  <Volume2 className="h-3 w-3" /> Audio: {firstQ.audio_url.split("/").pop()}
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditGroupClick(questions)}
                              className="text-xs flex items-center gap-1.5 border-primary/20 hover:bg-primary/10 hover:text-primary transition-all duration-200"
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
                                  <div className="space-y-1.5 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-lg font-bold text-primary">Câu {q.display_order}</span>
                                      {!isGroup && (
                                        <Badge variant="secondary">Part {q.part_number}</Badge>
                                      )}
                                      {issues.map((issue) => (
                                        <Badge key={issue} variant="destructive" className="text-[10px] py-0.5 px-2 font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20">
                                          {issue}
                                        </Badge>
                                      ))}
                                    </div>
                                    <p className="text-sm font-medium mt-1">
                                      {q.question_text || <span className="text-muted-foreground italic">(Không có tiêu đề câu hỏi)</span>}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {!isGroup && (q.passage_text || q.audio_url || q.image_url) && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleEditGroupClick([q])}
                                        title="Sửa media đơn lẻ"
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditQuestionClick(q)}
                                      className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                                    >
                                      <Edit className="h-3.5 w-3.5 mr-1" /> Chi tiết & Đáp án
                                    </Button>
                                  </div>
                                </div>

                                {/* Answers rendering */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2 sm:pl-4">
                                  {q.answers.map((ans) => (
                                    <div
                                      key={ans.id}
                                      className={cn(
                                        "flex items-start gap-3 p-3 rounded-lg border text-sm transition-all duration-200",
                                        ans.is_correct
                                          ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold"
                                          : "bg-muted/30 border-border/50 text-muted-foreground"
                                      )}
                                    >
                                      <span className={cn(
                                        "h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border",
                                        ans.is_correct
                                          ? "bg-emerald-500 text-white border-emerald-500"
                                          : "bg-background border-border text-foreground"
                                      )}>
                                        {String.fromCharCode(65 + ans.display_order)}
                                      </span>
                                      <div className="space-y-1">
                                        <div>{ans.answer_text}</div>
                                        {ans.explanation && ans.is_correct && (
                                          <div className="text-[11px] text-muted-foreground/80 font-normal leading-relaxed border-t border-emerald-500/10 pt-1 mt-1 bg-background/30 p-1 rounded">
                                            <strong>Lời giải:</strong> {ans.explanation}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Question Metadata Fallbacks */}
                                {!isGroup && (
                                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-2 bg-muted/20 p-2.5 rounded-lg border border-border/40">
                                    {q.audio_url && (
                                      <span className="flex items-center gap-1"><Volume2 className="h-3.5 w-3.5 text-primary" /> Audio: {q.audio_url.split("/").pop()}</span>
                                    )}
                                    {q.image_url && (
                                      <span className="flex items-center gap-1"><Image className="h-3.5 w-3.5 text-primary" /> Hình ảnh đính kèm</span>
                                    )}
                                    {q.passage_text && (
                                      <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-primary" /> Có đoạn văn đọc</span>
                                    )}
                                    {q.transcript && (
                                      <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Có Transcript</span>
                                    )}
                                    {q.translation && (
                                      <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Có Bản dịch</span>
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

      {/* ================= EDIT INDIVIDUAL QUESTION DIALOG ================= */}
      <Dialog open={isEditQuestionOpen} onOpenChange={setIsEditQuestionOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa Chi tiết Câu hỏi {editDisplayOrder}</DialogTitle>
            <DialogDescription>
              Thay đổi nội dung, âm thanh, bản dịch và chi tiết từng đáp án của câu hỏi.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display-order">Thứ tự hiển thị (1-200)</Label>
                <Input
                  id="display-order"
                  type="number"
                  value={editDisplayOrder}
                  onChange={(e) => setEditDisplayOrder(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="question-text">Nội dung câu hỏi</Label>
                <Textarea
                  id="question-text"
                  rows={2}
                  value={editQuestionText}
                  onChange={(e) => setEditQuestionText(e.target.value)}
                  placeholder="Ví dụ: What is the main purpose of the meeting?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audio-url">Audio URL (Không nhập nếu dùng audio nhóm)</Label>
                <Input
                  id="audio-url"
                  value={editAudioUrl}
                  onChange={(e) => setEditAudioUrl(e.target.value)}
                  placeholder="https://storage.googleapis.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image-url">Image URL</Label>
                <Input
                  id="image-url"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  placeholder="https://storage.googleapis.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-id">Group ID (Liên kết nhóm câu hỏi)</Label>
                <Input
                  id="group-id"
                  value={editGroupId}
                  onChange={(e) => setEditGroupId(e.target.value)}
                  placeholder="group_passage_p7_..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="passage-text">Đoạn văn đọc (Nếu có)</Label>
                <Textarea
                  id="passage-text"
                  rows={4}
                  value={editPassageText}
                  onChange={(e) => setEditPassageText(e.target.value)}
                  placeholder="Hỗ trợ các thẻ HTML: <p>, <strong>, etc."
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transcript">Transcript (Bản ghi nghe)</Label>
                <Textarea
                  id="transcript"
                  rows={3}
                  value={editTranscript}
                  onChange={(e) => setEditTranscript(e.target.value)}
                  placeholder="Bản ghi tiếng Anh..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="translation">Bản dịch giải thích</Label>
                <Textarea
                  id="translation"
                  rows={3}
                  value={editTranslation}
                  onChange={(e) => setEditTranslation(e.target.value)}
                  placeholder="Bản dịch tiếng Việt..."
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h4 className="font-semibold text-sm">Đáp án & Lời giải thích</h4>
            <div className="space-y-4">
              {editAnswers.map((ans, idx) => (
                <div key={idx} className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <Input
                        value={ans.answer_text}
                        onChange={(e) => {
                          const updated = [...editAnswers];
                          updated[idx].answer_text = e.target.value;
                          setEditAnswers(updated);
                        }}
                        className="h-8 max-w-xs bg-background"
                        placeholder="Nội dung đáp án"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
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
                      <span>Đáp án đúng</span>
                    </label>
                  </div>
                  {ans.is_correct && (
                    <div className="space-y-1.5 mt-2">
                      <Label className="text-xs text-muted-foreground">Lời giải chi tiết</Label>
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

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsEditQuestionOpen(false)}>
              Hủy
            </Button>
            <Button onClick={() => updateQuestionMutation.mutate()} disabled={updateQuestionMutation.isPending}>
              {updateQuestionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= EDIT GROUP DETAILS DIALOG ================= */}
      <Dialog open={isEditGroupOpen} onOpenChange={setIsEditGroupOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sửa thông tin Nhóm câu hỏi ({selectedGroupQuestions.length} câu)</DialogTitle>
            <DialogDescription>
              Các thay đổi sẽ được áp dụng đồng bộ cho tất cả các câu hỏi thuộc nhóm này.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-id-string">Mã nhóm (Group ID)</Label>
              <Input
                id="group-id-string"
                value={groupIdString}
                onChange={(e) => setGroupIdString(e.target.value)}
                placeholder="Ví dụ: group_passage_p7_abc123"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-audio-url">Audio URL chung</Label>
              <Input
                id="group-audio-url"
                value={groupAudioUrl}
                onChange={(e) => setGroupAudioUrl(e.target.value)}
                placeholder="https://storage.googleapis.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-image-url">Image URL chung (Nếu có)</Label>
              <Input
                id="group-image-url"
                value={groupImageUrl}
                onChange={(e) => setGroupImageUrl(e.target.value)}
                placeholder="https://storage.googleapis.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-passage-text">Đoạn văn chung (HTML)</Label>
              <Textarea
                id="group-passage-text"
                rows={10}
                value={groupPassageText}
                onChange={(e) => setGroupPassageText(e.target.value)}
                placeholder="Nội dung đoạn văn đọc hỗ trợ các thẻ HTML..."
                className="font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsEditGroupOpen(false)}>
              Hủy
            </Button>
            <Button onClick={() => updateGroupMutation.mutate()} disabled={updateGroupMutation.isPending}>
              {updateGroupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cập nhật đồng bộ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminFullTestQuestions;
