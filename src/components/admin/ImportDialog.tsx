import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseQuotesCSV, PART_CONFIGS, DICTATION_PROMPT, DICTATION_TEMPLATE_HEADER, DICTATION_TEMPLATE_EXAMPLE, type PartKey } from "./quiz-manager/utils";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: number;
  courseId: number;
  isDictation: boolean;
  effectiveLessonId: number | null | undefined;
  existingCount: number;
  courseTitle: string;
  quizTitle: string;
}

// ── Media import with cache (dedup: same URL → reuse) ──────
const createMediaImporter = (quizId: number, courseId: number) => {
  const cache = new Map<string, string | null>();
  return async (
    externalUrl: string,
    folderPath: string,
    title: string,
    type: "audio" | "image",
    filePrefix?: string
  ): Promise<string | null> => {
    if (!externalUrl?.trim()) return null;
    if (
      externalUrl.includes("supabase.co") ||
      externalUrl.includes("/storage/v1/object/public/materials")
    )
      return externalUrl;

    // Return cached result if same URL already processed
    if (cache.has(externalUrl)) return cache.get(externalUrl) as string | null;

    try {
      const res = await fetch(externalUrl);
      if (!res.ok) throw new Error(`Không thể tải ${type}`);
      const blob = await res.blob();
      const fileName =
        externalUrl.split("/").pop()?.split("?")[0] || `${type}_${Date.now()}`;
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "");
      const storagePath = `quiz_media/${Date.now()}_${filePrefix ? filePrefix + "_" : ""}${sanitizedName}`;

      const { error: uploadErr } = await supabase.storage
        .from("materials")
        .upload(storagePath, blob);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("materials")
        .getPublicUrl(storagePath);

      await supabase.from("materials").insert({
        title: title || sanitizedName,
        file_url: urlData.publicUrl,
        file_type: type,
        folder_path: folderPath || (type === "audio" ? "/Quiz Audios" : "/Quiz Images"),
        quiz_id: quizId,
        course_id: courseId,
      });

      cache.set(externalUrl, urlData.publicUrl);
      return urlData.publicUrl;
    } catch (err) {
      console.error(`Auto import ${type} failed:`, err);
      cache.set(externalUrl, externalUrl); // cache the original to avoid retry
      return externalUrl;
    }
  };
};

// ── Vocab helper ───────────────────────────────────────────
const insertVocab = async (
  vocabText: string,
  lessonId: number,
  questionId: number,
  quizTitle: string
) => {
  if (!vocabText || !lessonId) return;
  let vQuiz = (
    await supabase
      .from("vocab_quizzes")
      .select("id")
      .eq("lesson_id", lessonId)
      .maybeSingle()
  ).data;

  if (!vQuiz) {
    const { data: newVQ } = await supabase
      .from("vocab_quizzes")
      .insert({ title: `Từ vựng - ${quizTitle}`, lesson_id: lessonId, display_order: 0, total_questions: 0 })
      .select("id")
      .single();
    vQuiz = newVQ;
  }
  if (!vQuiz) return;

  const words = vocabText.split(";").map((v) => v.trim()).filter(Boolean);
  const vocabEntries = words
    .map((v, vIdx) => {
      const [word, def, phonetic, example] = v.split("|").map((s) => s.trim());
      return {
        vocab_quiz_id: vQuiz!.id,
        question_id: questionId,
        word: word || "",
        definition_vi: def || "",
        phonetic: phonetic || null,
        audio_male_url: null,
        example_sentence: example || null,
        display_order: vIdx,
      };
    })
    .filter((v) => v.word);

  if (vocabEntries.length > 0) {
    await supabase.from("vocab_questions").insert(vocabEntries);
  }
};

// ── Main ImportDialog ──────────────────────────────────────
const ImportDialog = ({
  open,
  onOpenChange,
  quizId,
  courseId,
  isDictation,
  effectiveLessonId,
  existingCount,
  courseTitle,
  quizTitle,
}: ImportDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPart, setImportPart] = useState("auto");
  const [importText, setImportText] = useState("");

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImportText(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    let header = "";
    let example = "";
    if (isDictation) {
      header = DICTATION_TEMPLATE_HEADER;
      example = DICTATION_TEMPLATE_EXAMPLE;
    } else {
      const cfg = PART_CONFIGS[importPart as PartKey] || PART_CONFIGS.auto;
      header = cfg.templateHeader;
      example = cfg.templateExample;
    }
    const template = `${header}\n${example}`;
    const blob = new Blob([template], { type: "text/tab-separated-values" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `template_${isDictation ? "dictation" : importPart || "quiz"}.tsv`;
    a.click();
  };

  const handleCopyPrompt = () => {
    const key = isDictation
      ? "dictation"
      : importPart === "part3" || importPart === "part4"
      ? "part34"
      : importPart;
    let prompt = DICTATION_PROMPT;
    if (!isDictation) {
      const partKey = (importPart === "part3" || importPart === "part4") ? "part3" : importPart as PartKey;
      prompt = (PART_CONFIGS[partKey] || PART_CONFIGS.auto).prompt;
    }
    navigator.clipboard.writeText(prompt);
    toast({ title: "Đã sao chép prompt cho ChatGPT" });
  };

  // ── Batch Import Mutation ──────────────────────────────────
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importText.trim()) throw new Error("Chưa có dữ liệu.");
      const parsedRows = parseQuotesCSV(importText);
      if (parsedRows.length < 2) throw new Error("Cần ít nhất header + 1 dòng dữ liệu");

      const headerColNames = parsedRows[0].map((h: string) => h.toLowerCase().trim());
      const rows = parsedRows.slice(1);
      const quizFolder = `/${courseTitle}/${quizTitle}`;

      // Create media importer with per-import cache (dedup uploads)
      const importMedia = createMediaImporter(quizId, courseId);

      // ── Phase 1: Parse rows + process media ──
      type ParsedQ = {
        qOrder: number;
        questionText: string;
        qType: string;
        translation: string | null;
        dictationKeywords: string | null;
        finalAudioUrl: string | null;
        finalImageUrl: string | null;
        answers: { text: string; isCorrect: boolean; explanation: string | null }[];
        vocabText: string;
      };

      const parsedQuestions: ParsedQ[] = [];

      for (let i = 0; i < rows.length; i++) {
        const cols = rows[i];
        const qOrder = existingCount + i;

        if (isDictation) {
          let questionText = "", translation = "", audioUrl = "", imageUrl = "", vocabText = "", dictationKeywords = "";
          let answersArr: string[] = [];

          if (headerColNames.includes("answers")) {
            questionText = cols[headerColNames.indexOf("question_text")]?.trim() || "";
            const ansStr = cols[headerColNames.indexOf("answers")]?.trim() || "";
            answersArr = ansStr.split("|").map((s) => s.trim()).filter(Boolean);
            translation = cols[headerColNames.indexOf("translation")]?.trim() || "";
            audioUrl = cols[headerColNames.indexOf("audio_url")]?.trim() || "";
            imageUrl = cols[headerColNames.indexOf("image_url")]?.trim() || "";
            vocabText = cols[headerColNames.indexOf("vocabulary")]?.trim() || "";
            if (headerColNames.includes("dictation_keywords")) {
              dictationKeywords = cols[headerColNames.indexOf("dictation_keywords")]?.trim() || "";
            }
          } else {
            const [q, a, b, c, d, tr, au, im, vo, dk] = cols.map((s) => s?.trim());
            questionText = q; answersArr = [a, b, c, d].filter(Boolean) as string[];
            translation = tr; audioUrl = au; imageUrl = im; vocabText = vo; dictationKeywords = dk;
          }

          if (questionText && questionText !== "Audio dictation") answersArr.unshift(questionText);

          const finalAudioUrl = await importMedia(audioUrl, quizFolder, `Q${qOrder + 1} - Audio`, "audio", `Q${qOrder + 1}`);
          const finalImageUrl = await importMedia(imageUrl, quizFolder, `Q${qOrder + 1} - Image`, "image", `Q${qOrder + 1}`);

          parsedQuestions.push({
            qOrder,
            questionText: "Audio dictation",
            qType: "multiple_choice",
            translation: translation || null,
            dictationKeywords: dictationKeywords || null,
            finalAudioUrl: finalAudioUrl || null,
            finalImageUrl: finalImageUrl || null,
            answers: answersArr.map((text) => ({ text, isCorrect: true, explanation: null })),
            vocabText,
          });
        } else {
          let questionText = "", a = "", b = "", c = "", d = "", correct = "", explanation = "", translation = "", audioUrl = "", imageUrl = "", vocabText = "", passage = "";
          let qType = "multiple_choice";

          if (importPart === "part1") {
            [imageUrl, audioUrl, a, b, c, d, correct, translation, vocabText] = cols.map((s) => s?.trim());
            questionText = ""; qType = "part1";
          } else if (importPart === "part2") {
            if (cols.length === 7) {
              [questionText, a, b, c, correct, translation, vocabText] = cols.map((s) => s?.trim()); audioUrl = "";
            } else {
              [questionText, audioUrl, a, b, c, correct, translation, vocabText] = cols.map((s) => s?.trim());
            }
            d = ""; qType = "part2";
          } else if (importPart === "part3" || importPart === "part4") {
            [audioUrl, questionText, a, b, c, d, correct, translation, vocabText] = cols.map((s) => s?.trim());
            qType = importPart;
          } else if (importPart === "part6") {
            [passage, questionText, a, b, c, d, correct, explanation, translation, vocabText] = cols.map((s) => s?.trim());
            if (passage) questionText = `[PASSAGE]${passage}[ENDPASSAGE]${questionText}`;
            qType = "part6";
          } else if (importPart === "part7") {
            [passage, imageUrl, questionText, a, b, c, d, correct, explanation, translation, vocabText] = cols.map((s) => s?.trim());
            if (passage) questionText = `[PASSAGE]${passage}[ENDPASSAGE]${questionText}`;
            qType = "part7";
          } else {
            if (cols.length < 6) continue;
            [questionText, a, b, c, d, correct, explanation, translation, audioUrl, imageUrl, vocabText] = cols.map((s) => s?.trim());
          }

          const correctIdx = "ABCD".indexOf(correct?.toUpperCase() || "");
          const finalAudioUrl = await importMedia(audioUrl, quizFolder, `Q${qOrder + 1} - Audio`, "audio", `Q${qOrder + 1}`);
          const finalImageUrl = await importMedia(imageUrl, quizFolder, `Q${qOrder + 1} - Image`, "image", `Q${qOrder + 1}`);

          parsedQuestions.push({
            qOrder,
            questionText: questionText || "",
            qType,
            translation: translation || null,
            dictationKeywords: null,
            finalAudioUrl: finalAudioUrl || null,
            finalImageUrl: finalImageUrl || null,
            answers: [a, b, c, d]
              .filter(Boolean)
              .map((text, idx) => ({
                text,
                isCorrect: idx === correctIdx,
                explanation: idx === correctIdx ? (explanation || null) : null,
              })),
            vocabText,
          });
        }
      }

      // ── Phase 2: Batch insert ALL questions ───────────────
      const questionsPayload = parsedQuestions.map((pq) => ({
        quiz_id: quizId,
        question_text: pq.questionText,
        question_type: pq.qType,
        display_order: pq.qOrder,
        translation: pq.translation,
        dictation_keywords: pq.dictationKeywords,
        audio_url: pq.finalAudioUrl,
        image_url: pq.finalImageUrl,
      }));

      const { data: insertedQs, error: qError } = await supabase
        .from("questions")
        .insert(questionsPayload)
        .select("id");
      if (qError) throw qError;

      // ── Phase 3: Batch insert ALL answers ────────────────
      const allAnswers: any[] = [];
      parsedQuestions.forEach((pq, idx) => {
        const qId = insertedQs![idx].id;
        pq.answers.forEach((ans, aIdx) => {
          allAnswers.push({
            question_id: qId,
            answer_text: ans.text,
            is_correct: ans.isCorrect,
            explanation: ans.explanation,
            display_order: aIdx,
          });
        });
      });
      if (allAnswers.length > 0) {
        await supabase.from("answers").insert(allAnswers);
      }

      // ── Phase 4: Vocab (per question, sequential ok since usually few) ──
      if (effectiveLessonId) {
        for (let i = 0; i < parsedQuestions.length; i++) {
          if (parsedQuestions[i].vocabText) {
            await insertVocab(parsedQuestions[i].vocabText, effectiveLessonId, insertedQs![i].id, quizTitle);
          }
        }
      }

      // ── Phase 5: Update counters ──────────────────────────
      const { count } = await supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("quiz_id", quizId);
      await supabase.from("quizzes").update({ total_questions: count ?? 0 }).eq("id", quizId);

      if (effectiveLessonId) {
        const { data: vq } = await supabase
          .from("vocab_quizzes")
          .select("id")
          .eq("lesson_id", effectiveLessonId)
          .maybeSingle();
        if (vq) {
          const { count: vCount } = await supabase
            .from("vocab_questions")
            .select("id", { count: "exact", head: true })
            .eq("vocab_quiz_id", vq.id);
          await supabase.from("vocab_quizzes").update({ total_questions: vCount ?? 0 }).eq("id", vq.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions-admin", quizId] });
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      queryClient.invalidateQueries({ queryKey: ["lesson-vocab-words"] });
      queryClient.invalidateQueries({ queryKey: ["lesson-vocab-quiz"] });
      onOpenChange(false);
      setImportText("");
      toast({ title: "Import thành công!" });
    },
    onError: (e: any) =>
      toast({ title: "Lỗi import", description: e.message, variant: "destructive" }),
  });

  // ── Format description for active part ────────────────────
  const renderDescription = () => {
    if (isDictation) {
      return (
        <>
          <b>Luyện nghe điền từ (1 audio - N câu):</b>
          <br />• Cột <code>answers</code> chứa Full Transcript, nhiều câu ngăn cách bằng <code> | </code>
          <br />• <b>Format:</b> <code>question_text, answers, translation, audio_url, vocabulary, dictation_keywords</code>
        </>
      );
    }
    const cfg = PART_CONFIGS[importPart as PartKey];
    if (!cfg) return null;
    const colStr = cfg.colOrder.join(", ");
    const notes: Record<string, string> = {
      part1: "• Đáp án A, B, C, D nên để trống (chỉ hiện nút chọn).",
      part2: "• ⚠️ Phần Nghe: nội dung câu hỏi và đáp án bị ẩn khi làm bài.",
      part3: "• Các câu cùng Audio sẽ tự động được nhóm lại.",
      part4: "• Các câu cùng Audio sẽ tự động được nhóm lại.",
      part6: "• Điền nội dung passage vào cột đầu tiên của câu đầu nhóm.",
      part7: "• passage và image_url chỉ điền ở câu đầu của nhóm.",
    };
    return (
      <>
        <b>Format:</b> <code>{colStr}</code>
        {notes[importPart] && <><br />{notes[importPart]}</>}
      </>
    );
  };

  const rowCount = Math.max(0, importText.trim().split("\n").length - 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import câu hỏi từ CSV/TSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Part selector */}
          {!isDictation && (
            <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg">
              <Label className="shrink-0">Chọn Part:</Label>
              <Select value={importPart} onValueChange={setImportPart}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn Part để xem hướng dẫn..." />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PART_CONFIGS) as [PartKey, typeof PART_CONFIGS[PartKey]][]).map(
                    ([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        {cfg.label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Guide + prompt copy */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                💡 Hướng dẫn &amp; Prompt ChatGPT
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[10px] text-blue-600"
                onClick={handleCopyPrompt}
              >
                📋 Copy Prompt
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {renderDescription()}
              <br />
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                • Cột vocabulary: <code>từ|nghĩa|phiên âm|ví dụ</code> (nhiều từ cách nhau bằng <code>;</code>)
              </span>
            </p>
          </div>

          {/* File + template */}
          <div className="flex gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileImport}
              className="text-sm"
            />
            <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
              📥 Tải template mẫu
            </Button>
          </div>

          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
            placeholder="Dán dữ liệu CSV/TSV ở đây..."
            className="font-mono text-xs"
          />

          <Button
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending || !importText.trim()}
            className="w-full"
          >
            {importMutation.isPending
              ? "Đang import (batch)..."
              : `Bắt đầu Import (${rowCount} câu)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;
