import AdminLayout from "@/components/AdminLayout";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Edit2, FileDown, UploadCloud, CheckCircle2, ClipboardList } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const AdminFullTestManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [editingTest, setEditingTest] = useState<any>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [courseId, setCourseId] = useState("");

  // JSON Import States
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedTestForImport, setSelectedTestForImport] = useState<any>(null);
  const [importJson, setImportJson] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatusText, setImportStatusText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [selectedTestIds, setSelectedTestIds] = useState<number[]>([]);

  // Fetch Full Tests
  const { data: fullTests = [], isLoading: loadingTests } = useQuery({
    queryKey: ["admin-fulltests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("full_tests")
        .select(`
          *,
          courses (title),
          full_test_sections (
            id,
            part_number,
            quiz_id,
            quizzes (
              total_questions
            )
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch Courses (Fetch all courses so admin can choose any course)
  const { data: courses = [] } = useQuery({
    queryKey: ["admin-fulltest-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, course_type");
      if (error) throw error;
      return data || [];
    },
  });

  // Create / Update Test Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !courseId) {
        throw new Error("Vui lòng điền đầy đủ Tên đề thi và chọn Khóa học liên kết.");
      }

      const payload = {
        title,
        description: description || null,
        audio_url: audioUrl || null,
        course_id: Number(courseId),
      };

      if (editingTest) {
        // Update
        const { error } = await supabase
          .from("full_tests")
          .update(payload)
          .eq("id", editingTest.id);
        if (error) throw error;
      } else {
        // Create
        const { data: newTest, error: createError } = await supabase
          .from("full_tests")
          .insert(payload)
          .select("id")
          .single();

        if (createError) throw createError;

        // Auto create 7 sections for 7 Parts of TOEIC
        const sectionsToInsert = [];
        for (let part = 1; part <= 7; part++) {
          // Create quiz for this part
          const { data: newQuiz, error: quizError } = await supabase
            .from("quizzes")
            .insert({
              title: `Part ${part} - ${title}`,
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
      }
    },
    onSuccess: () => {
      toast({
        title: editingTest ? "Đã cập nhật đề thi" : "Đã tạo đề thi mới",
        description: "Hệ thống tự động khởi tạo 7 section cho đề thi.",
      });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-fulltests"] });
    },
    onError: (err: any) => {
      toast({
        title: "Lỗi",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Delete Test Mutation
  const deleteMutation = useMutation({
    mutationFn: async (testId: number) => {
      // Get related quizzes to delete
      const { data: sections } = await supabase
        .from("full_test_sections")
        .select("quiz_id")
        .eq("test_id", testId);

      // Delete test (cascade will delete sections, but we should clean quizzes if needed)
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
      queryClient.invalidateQueries({ queryKey: ["admin-fulltests"] });
    },
    onError: (err: any) => {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
    },
  });

  // Bulk Delete Test Mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (testIds: number[]) => {
      // Get related quizzes to delete
      const { data: sections } = await supabase
        .from("full_test_sections")
        .select("quiz_id")
        .in("test_id", testIds);

      // Delete tests (cascade will delete sections, but we should clean quizzes if needed)
      const { error } = await supabase.from("full_tests").delete().in("id", testIds);
      if (error) throw error;

      if (sections && sections.length > 0) {
        const quizIds = sections.map((s) => s.quiz_id).filter(Boolean);
        if (quizIds.length > 0) {
          await supabase.from("quizzes").delete().in("id", quizIds);
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Đã xóa các đề thi thành công" });
      setSelectedTestIds([]);
      queryClient.invalidateQueries({ queryKey: ["admin-fulltests"] });
    },
    onError: (err: any) => {
      toast({ title: "Lỗi xóa nhiều đề thi", description: err.message, variant: "destructive" });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTestIds(fullTests.map((t: any) => t.id));
    } else {
      setSelectedTestIds([]);
    }
  };

  const handleSelectOne = (testId: number, checked: boolean) => {
    if (checked) {
      setSelectedTestIds((prev) => [...prev, testId]);
    } else {
      setSelectedTestIds((prev) => prev.filter((id) => id !== testId));
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAudioUrl("");
    setCourseId("");
    setEditingTest(null);
    setActiveTab("list");
  };

  const startEdit = (test: any) => {
    setEditingTest(test);
    setTitle(test.title);
    setDescription(test.description || "");
    setAudioUrl(test.audio_url || "");
    setCourseId(String(test.course_id));
    setActiveTab("create");
  };

  // 🚀 Logic import JSON có download & re-upload media lên Storage
  const handleBatchImportJSON = async () => {
    let jsonString = importJson.trim();
    if (importFile) {
      try {
        jsonString = await importFile.text();
      } catch (e: any) {
        toast({ title: "Lỗi đọc file", description: e.message, variant: "destructive" });
        return;
      }
    }

    if (!jsonString) {
      toast({ title: "Vui lòng nhập dữ liệu JSON hoặc chọn file", variant: "destructive" });
      return;
    }

    try {
      setIsImporting(true);
      setImportProgress(5);
      setImportStatusText("Đang phân tích cú pháp JSON...");

      const parsedData = JSON.parse(jsonString);

      // Determine if this is a course-level import or single-exam import
      if (parsedData.course_title && Array.isArray(parsedData.exams)) {
        // --- 1. COURSE-WIDE IMPORT ---
        setImportStatusText("Phát hiện dữ liệu Bộ Đề. Đang xử lý...");

        let targetCourseId: number;
        // Check if course already exists
        const { data: existingCourse } = await supabase
          .from("courses")
          .select("id")
          .eq("title", parsedData.course_title)
          .maybeSingle();

        if (existingCourse) {
          targetCourseId = existingCourse.id;
          setImportStatusText(`Sử dụng bộ đề hiện tại: "${parsedData.course_title}"...`);
        } else {
          setImportStatusText(`Đang tạo bộ đề mới: "${parsedData.course_title}"...`);
          const { data: newCourse, error: courseErr } = await supabase
            .from("courses")
            .insert({
              title: parsedData.course_title,
              subtitle: "Bộ đề thi thử TOEIC sát đề thi thật 2026",
              course_type: "fulltest",
              is_active: true,
              price: 0,
              duration_months: 12,
              instructor: "Cô Mai Phương",
            })
            .select("id")
            .single();

          if (courseErr) throw courseErr;
          targetCourseId = newCourse.id;
        }

        const exams = parsedData.exams;
        const totalExams = exams.length;

        for (let exIdx = 0; exIdx < totalExams; exIdx++) {
          const exam = exams[exIdx];
          const examTitle = exam.exam_title || exam.title || `Đề thi số ${exIdx + 1}`;

          const examProgressBase = Math.round((exIdx / totalExams) * 100);
          setImportProgress(examProgressBase);
          setImportStatusText(`[Đề ${exIdx + 1}/${totalExams}] Bắt đầu xử lý "${examTitle}"...`);

          let testId: number;
          // Check if exam already exists under this course
          const { data: existingTest } = await supabase
            .from("full_tests")
            .select("id")
            .eq("title", examTitle)
            .eq("course_id", targetCourseId)
            .maybeSingle();

          if (existingTest) {
            testId = existingTest.id;
            setImportStatusText(`[Đề ${exIdx + 1}/${totalExams}] Đã tồn tại đề "${examTitle}". Đang dọn dẹp câu hỏi cũ...`);

            // Clean up old questions for overwrite
            const { data: oldSections } = await supabase
              .from("full_test_sections")
              .select("quiz_id")
              .eq("test_id", testId);

            if (oldSections && oldSections.length > 0) {
              const quizIds = oldSections.map((s) => s.quiz_id);
              await supabase.from("questions").delete().in("quiz_id", quizIds);
            }
          } else {
            setImportStatusText(`[Đề ${exIdx + 1}/${totalExams}] Đang tạo đề thi "${examTitle}"...`);
            const { data: newTest, error: testErr } = await supabase
              .from("full_tests")
              .insert({
                title: examTitle,
                course_id: targetCourseId,
                audio_url: exam.audio_url || null,
              })
              .select("id")
              .single();

            if (testErr) throw testErr;
            testId = newTest.id;

            // Create 7 sections
            const sectionsToInsert = [];
            for (let part = 1; part <= 7; part++) {
              const { data: newQuiz, error: quizError } = await supabase
                .from("quizzes")
                .insert({
                  title: `Part ${part} - ${examTitle}`,
                  total_questions: 0,
                  display_order: part,
                })
                .select("id")
                .single();

              if (quizError) throw quizError;

              sectionsToInsert.push({
                test_id: testId,
                part_number: part,
                quiz_id: newQuiz.id,
              });
            }

            const { error: secErr } = await supabase.from("full_test_sections").insert(sectionsToInsert);
            if (secErr) throw secErr;
          }

          // Get sections mapping
          const { data: sections, error: secErr } = await supabase
            .from("full_test_sections")
            .select("part_number, quiz_id")
            .eq("test_id", testId);

          if (secErr || !sections || sections.length === 0) {
            throw new Error(`Không thể tìm thấy các Sections của đề "${examTitle}".`);
          }

          const quizMap: Record<number, number> = {};
          sections.forEach((s) => {
            quizMap[s.part_number] = s.quiz_id;
          });

          // Media upload helper cached locally
          const mediaCache: Record<string, string> = {};
          const uploadMedia = async (url: string, index: number, type: "audio" | "image") => {
            if (!url || !url.startsWith("http")) return url;
            if (mediaCache[url]) {
              return mediaCache[url];
            }
            if (url.includes("supabase.co") || url.includes("/storage/v1/object/public/materials")) {
              return url;
            }
            try {
              const res = await fetch(url);
              if (!res.ok) return url;
              const blob = await res.blob();
              const ext = url.split(".").pop()?.split("?")[0] || (type === "audio" ? "mp3" : "jpg");
              const path = `full_test_media/${testId}/part_${type}_${index}_${Date.now()}.${ext}`;
              const { error: uploadErr } = await supabase.storage.from("materials").upload(path, blob);
              if (uploadErr) throw uploadErr;
              const { data: urlData } = supabase.storage.from("materials").getPublicUrl(path);
              const publicUrl = urlData.publicUrl;
              mediaCache[url] = publicUrl;
              return publicUrl;
            } catch (e) {
              console.error(`Lỗi upload media: ${url}`, e);
              return url;
            }
          };

          // Audio nghe chung
          if (exam.audio_url) {
            setImportStatusText(`[Đề ${exIdx + 1}/${totalExams}] Đang tải Audio nghe chung...`);
            const finalMainAudio = await uploadMedia(exam.audio_url, 0, "audio");
            await supabase
              .from("full_tests")
              .update({ audio_url: finalMainAudio })
              .eq("id", testId);
          }

          const questionsArray = exam.questions || [];
          const totalQs = questionsArray.length;
          const parsedQuestions: any[] = [];
          const allAnswers: any[] = [];

          for (let i = 0; i < totalQs; i++) {
            const q = questionsArray[i];
            const part = q.part || q.part_number || 5;
            const quizId = quizMap[part];

            if (!quizId) continue;

            const currentStep = i + 1;
            const subPct = Math.round((currentStep / totalQs) * 8); // 8% out of 10%
            setImportProgress(examProgressBase + subPct);
            setImportStatusText(`[Đề ${exIdx + 1}/${totalExams}] Đang xử lý media câu ${currentStep}/${totalQs}...`);

            const finalAudioUrl = q.audio_url ? await uploadMedia(q.audio_url, currentStep, "audio") : null;
            const finalImageUrl = q.image_url ? await uploadMedia(q.image_url, currentStep, "image") : null;

            let questionText = q.question_text || "";
            if (q.passage_text) {
              questionText = `[PASSAGE]${q.passage_text}[ENDPASSAGE]${questionText}`;
            }

            parsedQuestions.push({
              quiz_id: quizId,
              question_text: questionText,
              question_type: `part${part}`,
              display_order: q.display_order || currentStep,
              translation: q.translation || q.translation_text || null,
              audio_url: finalAudioUrl,
              image_url: finalImageUrl,
              group_id: q.group_id ? String(q.group_id) : null,
              transcript: q.transcript || null,
              answers: q.answers || [],
            });
          }

          setImportProgress(examProgressBase + 8);
          setImportStatusText(`[Đề ${exIdx + 1}/${totalExams}] Đang lưu câu hỏi...`);

          // Bulk insert questions
          const insertedQs: any[] = [];
          for (let i = 0; i < parsedQuestions.length; i += 20) {
            const chunk = parsedQuestions.slice(i, i + 20);
            const { data: inserted, error: qInsertErr } = await supabase
              .from("questions")
              .insert(
                chunk.map((pq) => ({
                  quiz_id: pq.quiz_id,
                  question_text: pq.question_text,
                  question_type: pq.question_type,
                  display_order: pq.display_order,
                  translation: pq.translation,
                  audio_url: pq.audio_url,
                  image_url: pq.image_url,
                  group_id: pq.group_id,
                  transcript: pq.transcript,
                }))
              )
              .select("id");

            if (qInsertErr) throw qInsertErr;
            if (inserted) insertedQs.push(...inserted);
          }

          setImportProgress(examProgressBase + 9);
          setImportStatusText(`[Đề ${exIdx + 1}/${totalExams}] Đang lưu đáp án giải thích...`);

          // Bulk insert answers
          parsedQuestions.forEach((pq, idx) => {
            const questionId = insertedQs[idx]?.id;
            if (!questionId) return;

            pq.answers.forEach((ans: any, aIdx: number) => {
              allAnswers.push({
                question_id: questionId,
                answer_text: ans.answer_text || ans.text || "",
                is_correct: !!ans.is_correct || !!ans.correct,
                explanation: ans.explanation || null,
                display_order: ans.display_order !== undefined ? ans.display_order : aIdx,
              });
            });
          });

          for (let i = 0; i < allAnswers.length; i += 50) {
            const chunk = allAnswers.slice(i, i + 50);
            const { error: ansInsertErr } = await supabase.from("answers").insert(chunk);
            if (ansInsertErr) throw ansInsertErr;
          }

          // Update quiz totals
          setImportStatusText(`[Đề ${exIdx + 1}/${totalExams}] Đang cập nhật số câu hỏi...`);
          for (const part of Object.keys(quizMap)) {
            const partNum = Number(part);
            const quizId = quizMap[partNum];

            const { count } = await supabase
              .from("questions")
              .select("id", { count: "exact", head: true })
              .eq("quiz_id", quizId);

            await supabase
              .from("quizzes")
              .update({ total_questions: count || 0 })
              .eq("id", quizId);
          }
        }

        setImportProgress(100);
        setImportStatusText("Import trọn bộ đề thi thành công!");
        toast({ title: "Thành công!", description: `Đã import trọn bộ ${totalExams} đề thi.` });

      } else {
        // --- 2. SINGLE EXAM IMPORT ---
        if (!selectedTestForImport) {
          throw new Error("Vui lòng chọn đề thi để import hoặc dán file JSON chứa trọn bộ đề.");
        }

        const questionsArray = parsedData.questions || [];
        if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
          throw new Error("Không tìm thấy danh sách câu hỏi hợp lệ trong JSON.");
        }

        const totalQs = questionsArray.length;
        setImportStatusText(`Đã tìm thấy ${totalQs} câu hỏi. Bắt đầu xử lý...`);

        // Get sections mapping
        const { data: sections, error: secErr } = await supabase
          .from("full_test_sections")
          .select("part_number, quiz_id")
          .eq("test_id", selectedTestForImport.id);

        if (secErr || !sections || sections.length === 0) {
          throw new Error("Không thể tìm thấy các Sections của đề thi này. Hãy thử tạo lại đề.");
        }

        const quizMap: Record<number, number> = {};
        sections.forEach((s) => {
          quizMap[s.part_number] = s.quiz_id;
        });

        // Media upload helper cached locally
        const mediaCache: Record<string, string> = {};
        const uploadMedia = async (url: string, index: number, type: "audio" | "image") => {
          if (!url || !url.startsWith("http")) return url;
          if (mediaCache[url]) {
            return mediaCache[url];
          }
          if (url.includes("supabase.co") || url.includes("/storage/v1/object/public/materials")) {
            return url;
          }
          try {
            const res = await fetch(url);
            if (!res.ok) return url;
            const blob = await res.blob();
            const ext = url.split(".").pop()?.split("?")[0] || (type === "audio" ? "mp3" : "jpg");
            const path = `full_test_media/${selectedTestForImport.id}/part_${type}_${index}_${Date.now()}.${ext}`;
            const { error: uploadErr } = await supabase.storage.from("materials").upload(path, blob);
            if (uploadErr) throw uploadErr;
            const { data: urlData } = supabase.storage.from("materials").getPublicUrl(path);
            const publicUrl = urlData.publicUrl;
            mediaCache[url] = publicUrl;
            return publicUrl;
          } catch (e) {
            console.error(`Lỗi upload media: ${url}`, e);
            return url;
          }
        };

        if (parsedData.audio_url && parsedData.audio_url !== selectedTestForImport.audio_url) {
          setImportStatusText("Đang tải và upload Audio nghe chung...");
          const finalMainAudio = await uploadMedia(parsedData.audio_url, 0, "audio");
          await supabase
            .from("full_tests")
            .update({ audio_url: finalMainAudio })
            .eq("id", selectedTestForImport.id);
        }

        const parsedQuestions: any[] = [];
        const allAnswers: any[] = [];

        for (let i = 0; i < totalQs; i++) {
          const q = questionsArray[i];
          const part = q.part || q.part_number || 5;
          const quizId = quizMap[part];

          if (!quizId) continue;

          const currentStep = i + 1;
          const pct = Math.round((currentStep / totalQs) * 80) + 5;
          setImportProgress(pct);
          setImportStatusText(`[${currentStep}/${totalQs}] Đang xử lý file phương tiện của câu ${currentStep}...`);

          const finalAudioUrl = q.audio_url ? await uploadMedia(q.audio_url, currentStep, "audio") : null;
          const finalImageUrl = q.image_url ? await uploadMedia(q.image_url, currentStep, "image") : null;

          let questionText = q.question_text || "";
          if (q.passage_text) {
            questionText = `[PASSAGE]${q.passage_text}[ENDPASSAGE]${questionText}`;
          }

          parsedQuestions.push({
            quiz_id: quizId,
            question_text: questionText,
            question_type: `part${part}`,
            display_order: q.display_order || currentStep,
            translation: q.translation || q.translation_text || null,
            audio_url: finalAudioUrl,
            image_url: finalImageUrl,
            group_id: q.group_id ? String(q.group_id) : null,
            transcript: q.transcript || null,
            answers: q.answers || [],
          });
        }

        setImportProgress(90);
        setImportStatusText("Đang tạo các câu hỏi trên database...");

        const insertedQs: any[] = [];
        for (let i = 0; i < parsedQuestions.length; i += 20) {
          const chunk = parsedQuestions.slice(i, i + 20);
          const { data: inserted, error: qInsertErr } = await supabase
            .from("questions")
            .insert(
              chunk.map((pq) => ({
                quiz_id: pq.quiz_id,
                question_text: pq.question_text,
                question_type: pq.question_type,
                display_order: pq.display_order,
                translation: pq.translation,
                audio_url: pq.audio_url,
                image_url: pq.image_url,
                group_id: pq.group_id,
                transcript: pq.transcript,
              }))
            )
            .select("id");

          if (qInsertErr) throw qInsertErr;
          if (inserted) insertedQs.push(...inserted);
        }

        setImportStatusText("Đang liên kết các đáp án giải thích...");

        parsedQuestions.forEach((pq, idx) => {
          const questionId = insertedQs[idx]?.id;
          if (!questionId) return;

          pq.answers.forEach((ans: any, aIdx: number) => {
            allAnswers.push({
              question_id: questionId,
              answer_text: ans.answer_text || ans.text || "",
              is_correct: !!ans.is_correct || !!ans.correct,
              explanation: ans.explanation || null,
              display_order: ans.display_order !== undefined ? ans.display_order : aIdx,
            });
          });
        });

        for (let i = 0; i < allAnswers.length; i += 50) {
          const chunk = allAnswers.slice(i, i + 50);
          const { error: ansInsertErr } = await supabase.from("answers").insert(chunk);
          if (ansInsertErr) throw ansInsertErr;
        }

        setImportStatusText("Cập nhật lại số câu hỏi cho từng phần...");
        for (const part of Object.keys(quizMap)) {
          const partNum = Number(part);
          const quizId = quizMap[partNum];

          const { count } = await supabase
            .from("questions")
            .select("id", { count: "exact", head: true })
            .eq("quiz_id", quizId);

          await supabase
            .from("quizzes")
            .update({ total_questions: count || 0 })
            .eq("id", quizId);
        }

        setImportProgress(100);
        setImportStatusText("Import hoàn tất thành công!");
        toast({ title: "Thành công!", description: `Đã import trọn bộ ${totalQs} câu hỏi cho đề thi.` });
      }

      setTimeout(() => {
        setImportDialogOpen(false);
        setImportJson("");
        setImportFile(null);
        setIsImporting(false);
        queryClient.invalidateQueries({ queryKey: ["admin-fulltests"] });
      }, 1000);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Lỗi import", description: e.message, variant: "destructive" });
      setIsImporting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">Quản lý Đề thi Full Test TOEIC</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Khởi tạo cấu trúc đề 7 section và import trọn bộ 200 câu hỏi nhanh chóng.
            </p>
          </div>

          <div className="flex gap-2">
            {activeTab === "list" && selectedTestIds.length > 0 && (
              <Button
                onClick={() => {
                  if (confirm(`Bạn có chắc chắn muốn xóa ${selectedTestIds.length} đề thi đã chọn? Hành động này sẽ xóa sạch toàn bộ câu hỏi và section liên quan!`)) {
                    bulkDeleteMutation.mutate(selectedTestIds);
                  }
                }}
                variant="destructive"
                className="font-bold flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Xóa {selectedTestIds.length} đề đã chọn
              </Button>
            )}
            {activeTab === "list" && (
              <Button
                onClick={() => {
                  setSelectedTestForImport(null);
                  setImportDialogOpen(true);
                }}
                variant="outline"
                className="border-2 border-[var(--duo-gray)] font-bold flex items-center gap-2 hover:bg-slate-50"
              >
                <UploadCloud className="w-4 h-4 text-[var(--duo-blue)]" />
                Import Bộ Đề (JSON)
              </Button>
            )}
            <Button
              onClick={() => {
                if (activeTab === "list") {
                  resetForm();
                  setActiveTab("create");
                } else {
                  setActiveTab("list");
                }
              }}
              className="btn-3d btn-3d-primary"
            >
              {activeTab === "list" ? (
                <>
                  <Plus className="w-4 h-4 mr-2" /> Tạo đề thi mới
                </>
              ) : (
                "Quay lại danh sách"
              )}
            </Button>
          </div>
        </div>

        {activeTab === "list" ? (
          <div className="bg-card rounded-2xl border-2 border-[var(--duo-gray)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--duo-gray)] bg-slate-50">
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={fullTests.length > 0 && selectedTestIds.length === fullTests.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-2 border-[var(--duo-gray)] text-[var(--duo-blue)] focus:ring-[var(--duo-blue)] cursor-pointer"
                    />
                  </th>
                  <th className="text-left p-4 font-black text-foreground">Tên đề thi</th>
                  <th className="text-left p-4 font-black text-foreground">Khóa học liên kết</th>
                  <th className="text-center p-4 font-black text-foreground">Số câu đã import</th>
                  <th className="text-left p-4 font-black text-foreground">Audio tổng</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {fullTests.map((test: any) => {
                  const totalQuestionsImported = test.full_test_sections?.reduce(
                    (sum: number, s: any) => sum + (s.quizzes?.total_questions || 0),
                    0
                  );

                  return (
                    <tr key={test.id} className="border-b-2 border-[var(--duo-gray)] last:border-0 hover:bg-slate-50/50">
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedTestIds.includes(test.id)}
                          onChange={(e) => handleSelectOne(test.id, e.target.checked)}
                          className="w-4 h-4 rounded border-2 border-[var(--duo-gray)] text-[var(--duo-blue)] focus:ring-[var(--duo-blue)] cursor-pointer"
                        />
                      </td>
                      <td className="p-4">
                        <p className="font-extrabold text-foreground">{test.title}</p>
                        {test.description && <p className="text-xs text-muted-foreground mt-0.5">{test.description}</p>}
                      </td>
                      <td className="p-4 font-bold text-muted-foreground">
                        {test.courses?.title || "Chưa gắn khóa học"}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`badge-duo font-black ${totalQuestionsImported === 200 ? "badge-green" : "badge-orange"}`}>
                          {totalQuestionsImported} / 200 câu
                        </span>
                      </td>
                      <td className="p-4 text-xs font-mono text-muted-foreground max-w-[200px] truncate">
                        {test.audio_url ? "Có audio" : "Không có"}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Link to={`/admin/fulltests/${test.id}/questions`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-2 border-[var(--duo-gray)] hover:bg-slate-50 font-bold"
                            >
                              <ClipboardList className="w-4 h-4 mr-1.5 text-primary" />
                              Quản lý câu hỏi
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-2 border-[var(--duo-gray)] hover:bg-slate-50 font-bold"
                            onClick={() => {
                              setSelectedTestForImport(test);
                              setImportDialogOpen(true);
                            }}
                          >
                            <UploadCloud className="w-4 h-4 mr-1.5 text-[var(--duo-blue)]" />
                            Import JSON
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(test)}
                            className="hover:bg-slate-100 text-foreground font-bold"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Bạn có chắc chắn muốn xóa đề thi này? Hành động này sẽ xóa sạch tất cả câu hỏi thuộc 7 sections!")) {
                                deleteMutation.mutate(test.id);
                              }
                            }}
                            className="text-destructive hover:bg-red-50 hover:text-red-600 font-bold"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {fullTests.length === 0 && !loadingTests && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground font-bold">
                      Chưa có đề thi Full Test nào được tạo.
                    </td>
                  </tr>
                )}
                {loadingTests && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-card border-2 border-[var(--duo-gray)] rounded-2xl p-6 max-w-xl space-y-4">
            <h3 className="font-black text-lg text-foreground">
              {editingTest ? "Chỉnh sửa thông tin đề thi" : "Khởi tạo đề thi thử mới"}
            </h3>

            <div className="space-y-2">
              <Label className="font-bold">Tên đề thi</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: TOEIC ETS 2026 Test 1"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Khóa học liên kết</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn khóa học Full Test..." />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c: any) => {
                    const typeLabels: Record<string, string> = {
                      fulltest: "Full Test",
                      listening: "Listening",
                      video_quiz: "TOEIC Nghe-Đọc",
                      grammar: "Ngữ pháp",
                      vocabulary: "Từ vựng",
                    };
                    const label = typeLabels[c.course_type] || c.course_type || "Khác";
                    return (
                      <SelectItem key={c.id} value={String(c.id)}>
                        [{label}] {c.title}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Audio nghe tổng Listening (Không bắt buộc)</Label>
              <Input
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Mô tả ngắn</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả cho đề thi thử này..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="border-2 border-[var(--duo-gray)] font-bold"
                onClick={resetForm}
              >
                Hủy
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="btn-3d btn-3d-primary font-black"
              >
                {saveMutation.isPending ? "Đang lưu..." : editingTest ? "Lưu thay đổi" : "Khởi tạo Đề & 7 Section"}
              </Button>
            </div>
          </div>
        )}

        {/* JSON Import Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={(open) => {
          if (!isImporting) {
            setImportDialogOpen(open);
            if (!open) {
              setImportJson("");
              setImportFile(null);
            }
          }
        }}>
          <DialogContent className="max-w-2xl font-sans">
            <DialogHeader>
              <DialogTitle className="font-black text-xl">
                {selectedTestForImport ? `Import câu hỏi cho đề: "${selectedTestForImport.title}"` : "Import trọn bộ đề thi (nhiều đề)"}
              </DialogTitle>
              <DialogDescription className="text-sm font-semibold">
                {selectedTestForImport
                  ? "Dán mã JSON chứa 200 câu hỏi. Hệ thống sẽ tự tải ảnh/audio về và reupload lên Supabase Storage của bạn."
                  : "Dán mã JSON chứa toàn bộ các đề thi của bộ đề. Hệ thống sẽ tự động tạo Khóa học/Bộ đề mới và import tất cả đề thi cùng toàn bộ câu hỏi tương ứng."}
              </DialogDescription>
            </DialogHeader>

            {isImporting ? (
              <div className="space-y-4 py-4 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-[var(--duo-blue)] mx-auto" />
                <div className="space-y-2">
                  <p className="text-sm font-bold text-foreground">{importStatusText}</p>
                  <Progress value={importProgress} className="w-full h-3" />
                  <span className="text-xs text-muted-foreground font-black">{importProgress}%</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold">Cách 1: Chọn file JSON từ máy tính (Khuyên dùng cho file dung lượng lớn)</Label>
                  <Input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setImportFile(file);
                      if (file) {
                        setImportJson("");
                      }
                    }}
                    className="border-2 border-[var(--duo-gray)] bg-slate-50 cursor-pointer"
                  />
                  {importFile && (
                    <p className="text-xs font-bold text-[var(--duo-green)] mt-1">
                      ✓ Đã chọn file: {importFile.name} ({(importFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[var(--duo-gray)]" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground font-black">Hoặc cách 2</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold flex items-center justify-between">
                    <span>Dán mã JSON trực tiếp</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-black">Format NgoaiNgu24h Crawler</span>
                  </Label>
                  <Textarea
                    value={importJson}
                    onChange={(e) => {
                      setImportJson(e.target.value);
                      if (e.target.value) {
                        setImportFile(null);
                      }
                    }}
                    disabled={!!importFile}
                    rows={6}
                    placeholder={selectedTestForImport 
                      ? '{"title": "ETS 2026 Test 1", "questions": [...]}' 
                      : '{"course_title": "Bộ đề thi thử 2026", "exams": [{"exam_title": "Đề số 01", "questions": [...]}, ...]}'
                    }
                    className="font-mono text-[11px] bg-slate-50 border-2 border-[var(--duo-gray)]"
                  />
                  {importFile && (
                    <p className="text-xs text-muted-foreground italic">
                      Vui lòng bỏ chọn file phía trên nếu muốn dán JSON trực tiếp.
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" className="font-bold border-2" onClick={() => setImportDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button
                    onClick={handleBatchImportJSON}
                    className="btn-3d btn-3d-primary font-black flex items-center gap-2"
                  >
                    <UploadCloud className="w-4 h-4" /> Bắt đầu Import
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

const partShortNames = [
  "Part 1: Photo",
  "Part 2: Q&A",
  "Part 3: Conversation",
  "Part 4: Short Talk",
  "Part 5: Incomplete Sentences",
  "Part 6: Text Completion",
  "Part 7: Reading Comprehension",
];

export default AdminFullTestManager;
