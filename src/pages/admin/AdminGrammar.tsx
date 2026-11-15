import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import {
  KIND_LABELS,
  LEVELS,
  LEVEL_LABELS,
  SECTION_LABELS,
  adminCreateExercise,
  adminCreateFormula,
  adminCreateTopic,
  adminDeleteFormula,
  adminImportGrammar,
  adminListExercises,
  adminListFormulas,
  adminListQuestions,
  adminListTopics,
  adminRemoveExercise,
  adminRetagGrammar,
  adminSetQuestionTopic,
  adminUpdateExercise,
  adminUpdateFormula,
  adminUpdateTopic,
  type AdminExercise,
  type AdminTopic,
  type ExerciseInput,
  type ExerciseKind,
  type Formula,
  type GrammarLevel,
  type Lesson,
  type LessonSection,
} from "@/lib/api/grammar";

const NONE = "__none";
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

// ---------- Soạn chủ điểm + bài học ----------

const TopicEditor: React.FC<{ topic: AdminTopic | null; onClose: () => void }> = ({ topic, onClose }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const l: Lesson = topic?.lesson ?? {};
  const [name, setName] = useState(topic?.name ?? "");
  const [slug, setSlug] = useState(topic?.slug ?? "");
  const [group, setGroup] = useState(topic?.group_name ?? "");
  const [level, setLevel] = useState<GrammarLevel>(topic?.level ?? "intermediate");
  const [order, setOrder] = useState(String(topic?.sort_order ?? 0));
  const [summary, setSummary] = useState(topic?.summary ?? "");
  const [video, setVideo] = useState(topic?.video_url ?? "");
  const [cats, setCats] = useState((topic?.toeic_categories ?? []).join(", "));
  const [labels, setLabels] = useState((topic?.roadmap_labels ?? []).join("\n"));
  const [when, setWhen] = useState(l.when_to_use ?? "");
  const [structure, setStructure] = useState(l.structure ?? "");
  const [examples, setExamples] = useState((l.examples ?? []).map((e) => `${e.en} | ${e.vi ?? ""}`).join("\n"));
  const [mistakes, setMistakes] = useState((l.mistakes ?? []).map((m) => `${m.wrong} | ${m.right} | ${m.note ?? ""}`).join("\n"));
  const [signals, setSignals] = useState((l.signals ?? []).join("\n"));

  const save = useMutation({
    mutationFn: () => {
      const hasLesson = when.trim() || structure.trim() || examples.trim() || mistakes.trim() || signals.trim();
      const body = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        group_name: group.trim(),
        level,
        sort_order: Number(order) || 0,
        summary: summary.trim() || null,
        video_url: video.trim() || null,
        toeic_categories: cats.split(",").map((x) => x.trim()).filter(Boolean),
        roadmap_labels: lines(labels),
        lesson: hasLesson
          ? {
              when_to_use: when.trim(),
              structure: structure.trim(),
              examples: lines(examples).map((x) => {
                const [en, vi] = x.split("|").map((s) => s.trim());
                return { en, vi };
              }),
              mistakes: lines(mistakes).map((x) => {
                const [wrong, right, note] = x.split("|").map((s) => s.trim());
                return { wrong, right, note };
              }),
              signals: lines(signals),
            }
          : null,
      };
      return topic ? adminUpdateTopic(topic.id, body as Partial<AdminTopic>) : adminCreateTopic(body as Parameters<typeof adminCreateTopic>[0]);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] });
      toast({ title: "Đã lưu chủ điểm" });
      onClose();
    },
    onError: (err) => toast({ title: "Chưa lưu được", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="space-y-1 text-sm">
          Tên chủ điểm
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          Đường dẫn (bỏ trống thì tạo từ tên)
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          Nhóm
          <Input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Động từ & thì" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-sm">
            Cấp độ
            <Select value={level} onValueChange={(v) => setLevel(v as GrammarLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((x) => (
                  <SelectItem key={x} value={x}>
                    {LEVEL_LABELS[x]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            Thứ tự
            <Input value={order} onChange={(e) => setOrder(e.target.value)} inputMode="numeric" />
          </label>
        </div>
      </div>
      <label className="space-y-1 text-sm block">
        Mô tả ngắn
        <Input value={summary} onChange={(e) => setSummary(e.target.value)} />
      </label>
      <label className="space-y-1 text-sm block">
        Video (đường dẫn nhúng, không bắt buộc)
        <Input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://www.youtube.com/embed/…" />
      </label>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="space-y-1 text-sm">
          Nhãn dạng câu TOEIC (cách nhau dấu phẩy)
          <Input value={cats} onChange={(e) => setCats(e.target.value)} placeholder="verb_tense, word_form" />
        </label>
        <label className="space-y-1 text-sm">
          Chữ chủ điểm trong Lộ trình (mỗi dòng một chuỗi)
          <Textarea value={labels} onChange={(e) => setLabels(e.target.value)} rows={2} />
        </label>
      </div>
      <p className="text-sm font-bold pt-2">Bài học</p>
      <label className="space-y-1 text-sm block">
        {SECTION_LABELS.when_to_use}
        <Textarea value={when} onChange={(e) => setWhen(e.target.value)} rows={3} />
      </label>
      <label className="space-y-1 text-sm block">
        {SECTION_LABELS.structure}
        <Textarea value={structure} onChange={(e) => setStructure(e.target.value)} rows={5} />
      </label>
      <label className="space-y-1 text-sm block">
        {SECTION_LABELS.examples} (mỗi dòng: câu tiếng Anh | nghĩa)
        <Textarea value={examples} onChange={(e) => setExamples(e.target.value)} rows={4} />
      </label>
      <label className="space-y-1 text-sm block">
        {SECTION_LABELS.mistakes} (mỗi dòng: câu sai | câu đúng | ghi chú)
        <Textarea value={mistakes} onChange={(e) => setMistakes(e.target.value)} rows={3} />
      </label>
      <label className="space-y-1 text-sm block">
        {SECTION_LABELS.signals} (mỗi dòng một dấu hiệu)
        <Textarea value={signals} onChange={(e) => setSignals(e.target.value)} rows={3} />
      </label>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button disabled={save.isPending || !name.trim() || !group.trim()} onClick={() => save.mutate()}>
          Lưu
        </Button>
      </DialogFooter>
    </div>
  );
};

// ---------- Công thức ----------

const FormulaEditor: React.FC<{ topic: AdminTopic }> = ({ topic }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-grammar-formulas", topic.id], queryFn: () => adminListFormulas(topic.id) });
  const [draft, setDraft] = useState<{ id: number | null; pattern: string; usage: string; examples: string } | null>(null);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-grammar-formulas", topic.id] });
    void queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] });
  };
  const save = useMutation({
    mutationFn: () => {
      const body = {
        pattern: draft!.pattern,
        usage: draft!.usage,
        examples: lines(draft!.examples).map((x) => {
          const [en, vi] = x.split("|").map((s) => s.trim());
          return { en, vi };
        }),
      };
      return draft!.id ? adminUpdateFormula(draft!.id, body) : adminCreateFormula(topic.id, { ...body, sort_order: (data?.length ?? 0) + 1 });
    },
    onSuccess: () => {
      setDraft(null);
      refresh();
    },
    onError: (err) => toast({ title: "Chưa lưu được", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });
  const del = useMutation({ mutationFn: (id: number) => adminDeleteFormula(id), onSuccess: refresh });
  const edit = (f: Formula) => setDraft({ id: f.id, pattern: f.pattern, usage: f.usage, examples: f.examples.map((e) => `${e.en} | ${e.vi ?? ""}`).join("\n") });

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  return (
    <div className="space-y-3">
      {(data ?? []).map((f) => (
        <div key={f.id} className="p-3 rounded-lg border border-border flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-sm font-bold">{f.pattern}</p>
            <p className="text-xs text-muted-foreground">{f.usage}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button size="sm" variant="outline" onClick={() => edit(f)}>
              Sửa
            </Button>
            <Button size="sm" variant="ghost" onClick={() => del.mutate(f.id)} aria-label="Xóa công thức">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
      {draft ? (
        <div className="p-3 rounded-lg border border-border space-y-2">
          <Input value={draft.pattern} onChange={(e) => setDraft({ ...draft, pattern: e.target.value })} placeholder="S + have/has + V3" />
          <Input value={draft.usage} onChange={(e) => setDraft({ ...draft, usage: e.target.value })} placeholder="Khi dùng" />
          <Textarea value={draft.examples} onChange={(e) => setDraft({ ...draft, examples: e.target.value })} rows={2} placeholder="Ví dụ | nghĩa (mỗi dòng một ví dụ)" />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setDraft(null)}>
              Hủy
            </Button>
            <Button size="sm" disabled={!draft.pattern.trim() || !draft.usage.trim() || save.isPending} onClick={() => save.mutate()}>
              Lưu
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setDraft({ id: null, pattern: "", usage: "", examples: "" })}>
          <Plus className="w-4 h-4 mr-1" /> Thêm công thức
        </Button>
      )}
    </div>
  );
};

// ---------- Bài tập ----------

const emptyExercise = (): ExerciseInput => ({
  kind: "choice",
  level: "intermediate",
  prompt: "",
  options: ["", "", "", ""],
  answer_index: 0,
  accepted_answers: [],
  explanation: "",
  lesson_section: "structure",
  active: true,
});

const ExerciseEditor: React.FC<{ topic: AdminTopic }> = ({ topic }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-grammar-exercises", topic.id], queryFn: () => adminListExercises(topic.id) });
  const [draft, setDraft] = useState<(ExerciseInput & { id: number | null; acceptedText: string }) | null>(null);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-grammar-exercises", topic.id] });
    void queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] });
  };
  const save = useMutation({
    mutationFn: () => {
      const { id, acceptedText, ...rest } = draft!;
      const body: ExerciseInput = {
        ...rest,
        options: rest.kind === "choice" ? rest.options.filter((o) => o.trim()) : [],
        accepted_answers: rest.kind === "fill" ? acceptedText.split("/").map((s) => s.trim()).filter(Boolean) : [],
        answer_index: rest.kind === "fill" ? null : rest.answer_index,
      };
      return id ? adminUpdateExercise(id, body) : adminCreateExercise(topic.id, body);
    },
    onSuccess: () => {
      setDraft(null);
      refresh();
      toast({ title: "Đã lưu câu bài tập" });
    },
    onError: (err) => toast({ title: "Chưa lưu được", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });
  const remove = useMutation({ mutationFn: (id: number) => adminRemoveExercise(id), onSuccess: refresh });
  const edit = (e: AdminExercise) =>
    setDraft({
      id: e.id,
      kind: e.kind,
      level: e.level,
      prompt: e.prompt,
      options: e.kind === "choice" ? [...e.options, "", "", "", ""].slice(0, 4) : ["", "", "", ""],
      answer_index: e.answer_index,
      accepted_answers: e.accepted_answers,
      explanation: e.explanation ?? "",
      lesson_section: e.lesson_section,
      active: e.active,
      acceptedText: e.accepted_answers.join(" / "),
    });

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  return (
    <div className="space-y-3">
      {draft ? (
        <div className="p-3 rounded-lg border border-border space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Select value={draft.kind} onValueChange={(v) => setDraft({ ...draft, kind: v as ExerciseKind })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(KIND_LABELS) as ExerciseKind[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {KIND_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={draft.level} onValueChange={(v) => setDraft({ ...draft, level: v as GrammarLevel })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((x) => (
                  <SelectItem key={x} value={x}>
                    {LEVEL_LABELS[x]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={draft.lesson_section ?? NONE} onValueChange={(v) => setDraft({ ...draft, lesson_section: v === NONE ? null : (v as LessonSection) })}>
              <SelectTrigger>
                <SelectValue placeholder="Phần bài học" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Không gắn phần bài học</SelectItem>
                {(Object.keys(SECTION_LABELS) as LessonSection[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {SECTION_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={draft.prompt}
            onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
            rows={2}
            placeholder={
              draft.kind === "fill"
                ? "Câu có chỗ trống ___ và từ gốc trong ngoặc, vd. She ___ (go) home."
                : draft.kind === "error"
                  ? "Đánh dấu đúng 4 phần bằng [[...]], vd. The [[report]] [[were]] [[sent]] [[late]]."
                  : "Câu có chỗ trống ___"
            }
          />
          {draft.kind === "choice" &&
            draft.options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" checked={draft.answer_index === i} onChange={() => setDraft({ ...draft, answer_index: i })} aria-label={`Đáp án ${i + 1} đúng`} />
                <Input value={o} onChange={(e) => setDraft({ ...draft, options: draft.options.map((x, j) => (j === i ? e.target.value : x)) })} placeholder={`Lựa chọn ${"ABCD"[i]}`} />
              </div>
            ))}
          {draft.kind === "error" && (
            <Select value={String(draft.answer_index ?? 0)} onValueChange={(v) => setDraft({ ...draft, answer_index: Number(v) })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3].map((i) => (
                  <SelectItem key={i} value={String(i)}>
                    Phần sai: {"ABCD"[i]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {draft.kind === "fill" && (
            <Input value={draft.acceptedText} onChange={(e) => setDraft({ ...draft, acceptedText: e.target.value })} placeholder="Đáp án đúng (nhiều đáp án cách nhau bằng /)" />
          )}
          <Textarea value={draft.explanation ?? ""} onChange={(e) => setDraft({ ...draft, explanation: e.target.value })} rows={2} placeholder="Giải thích ngắn" />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setDraft(null)}>
              Hủy
            </Button>
            <Button size="sm" disabled={!draft.prompt.trim() || save.isPending} onClick={() => save.mutate()}>
              Lưu
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setDraft({ ...emptyExercise(), id: null, acceptedText: "" })}>
          <Plus className="w-4 h-4 mr-1" /> Thêm câu
        </Button>
      )}
      <div className="space-y-2">
        {(data ?? []).map((e) => (
          <div key={e.id} className={`p-3 rounded-lg border border-border flex items-start justify-between gap-3 ${e.active ? "" : "opacity-50"}`}>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary">{KIND_LABELS[e.kind]}</Badge>
                <Badge variant="outline">{LEVEL_LABELS[e.level]}</Badge>
                {!e.active && <Badge variant="destructive">Đã gỡ</Badge>}
              </div>
              <p className="text-sm">{e.prompt}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="sm" variant="outline" onClick={() => edit(e)}>
                Sửa
              </Button>
              {e.active && (
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(e.id)} aria-label="Gỡ câu">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- Câu TOEIC ----------

const QuestionTopics: React.FC<{ topics: AdminTopic[] }> = ({ topics }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [topicId, setTopicId] = useState<string>("untagged");
  const [testId, setTestId] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [topicId, testId]);
  const query = {
    topic_id: topicId !== "untagged" && topicId !== "all" ? Number(topicId) : undefined,
    untagged: topicId === "untagged",
    test_id: testId ? Number(testId) : undefined,
    page,
  };
  const { data, isLoading } = useQuery({ queryKey: ["admin-grammar-questions", query], queryFn: () => adminListQuestions(query) });
  const set = useMutation({
    mutationFn: ({ id, topic }: { id: number; topic: number | null }) => adminSetQuestionTopic(id, topic),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-grammar-questions"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] });
    },
    onError: (err) => toast({ title: "Chưa lưu được", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });
  const retag = useMutation({
    mutationFn: adminRetagGrammar,
    onSuccess: (r) => {
      toast({ title: `Đã gắn lại ${r.tagged} câu (bỏ qua câu admin đã sửa)` });
      void queryClient.invalidateQueries({ queryKey: ["admin-grammar-questions"] });
    },
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / 50)) : 1;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Mỗi câu Part 5/6 có một chủ điểm chính, gắn tự động từ nhãn dạng câu và 4 lựa chọn. Câu admin đã sửa không bị gắn lại đè lên. Nên rà các đề thật trước khi học viên dùng nhiều.
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={topicId} onValueChange={setTopicId}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="untagged">Chưa có chủ điểm</SelectItem>
            <SelectItem value="all">Tất cả</SelectItem>
            {topics.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input className="w-32" value={testId} onChange={(e) => setTestId(e.target.value.replace(/\D/g, ""))} placeholder="Mã đề" />
        <Button variant="outline" size="sm" disabled={retag.isPending} onClick={() => retag.mutate()}>
          <RefreshCw className="w-4 h-4 mr-1" /> Gắn lại tự động
        </Button>
        {data && <span className="text-sm text-muted-foreground">{data.total} câu</span>}
      </div>
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="space-y-2">
          {(data?.items ?? []).map((q) => (
            <div key={q.id} className="p-3 rounded-lg border border-border grid md:grid-cols-[1fr_260px] gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-xs text-muted-foreground">
                  Đề {q.source_test_id ?? "—"} · Part {q.part} {q.part_index ? `· câu ${q.part_index}` : ""} · dạng {q.category ?? "chưa có"}
                  {q.tag_source === "admin" && " · admin đã sửa"}
                </p>
                <p className="text-sm">{q.question_text}</p>
                <p className="text-xs text-muted-foreground">{q.options.join(" · ")}</p>
              </div>
              <Select value={q.topic_id ? String(q.topic_id) : NONE} onValueChange={(v) => set.mutate({ id: q.id, topic: v === NONE ? null : Number(v) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Không có chủ điểm ngữ pháp</SelectItem>
                  {topics.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          {pages > 1 && (
            <div className="flex items-center gap-2 justify-end">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Trước
              </Button>
              <span className="text-sm">
                {page}/{pages}
              </span>
              <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Sau
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------- Nhập JSON ----------

const ImportBox: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [replace, setReplace] = useState(false);
  const run = useMutation({
    mutationFn: () => {
      const parsed = JSON.parse(text) as { topics?: unknown[] } | unknown[];
      const topics = Array.isArray(parsed) ? parsed : parsed.topics ?? [];
      return adminImportGrammar({ topics, replace });
    },
    onSuccess: (r) => {
      toast({ title: `Đã nhập ${r.topics} chủ điểm, ${r.formulas} công thức, ${r.exercises} câu bài tập` });
      void queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] });
      setText("");
    },
    onError: (err) =>
      toast({ title: "Không nhập được", description: err instanceof SyntaxError ? "File không phải JSON hợp lệ" : getFriendlyErrorMessage(err), variant: "destructive" }),
  });
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Dán JSON dạng {"{ topics: [{ name, slug, group_name, level, lesson, formulas: [...], exercises: [...] }] }"}. Toàn bộ nội dung được kiểm tra trước khi ghi; có lỗi thì báo đúng chủ điểm và câu.
      </p>
      <input
        type="file"
        accept="application/json,.json"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void f.text().then(setText);
        }}
        className="text-sm"
      />
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className="font-mono text-xs" placeholder='{"topics": [...]}' />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} /> Thay công thức và ngừng dùng bài tập cũ của các chủ điểm trong file
      </label>
      <Button disabled={!text.trim() || run.isPending} onClick={() => run.mutate()}>
        <Upload className="w-4 h-4 mr-1" /> Nhập
      </Button>
    </div>
  );
};

/** Quản trị Ngữ pháp (D16). */
const AdminGrammar: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-grammar-topics"], queryFn: adminListTopics });
  const [editing, setEditing] = useState<AdminTopic | "new" | null>(null);
  const [content, setContent] = useState<{ topic: AdminTopic; tab: "formulas" | "exercises" } | null>(null);
  const toggle = useMutation({
    mutationFn: (t: AdminTopic) => adminUpdateTopic(t.id, { hidden: !t.hidden }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] }),
  });

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Ngữ pháp</h1>
          <p className="text-sm text-muted-foreground">Chủ điểm chỉ hiện với học viên khi không ẩn và có bài học hoặc bài tập.</p>
        </div>
        <Tabs defaultValue="topics">
          <TabsList>
            <TabsTrigger value="topics">Chủ điểm</TabsTrigger>
            <TabsTrigger value="questions">Chủ điểm câu TOEIC</TabsTrigger>
            <TabsTrigger value="import">Nhập JSON</TabsTrigger>
          </TabsList>
          <TabsContent value="topics" className="space-y-3">
            <Button onClick={() => setEditing("new")}>
              <Plus className="w-4 h-4 mr-1" /> Thêm chủ điểm
            </Button>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="space-y-2">
                {(data ?? []).map((t) => (
                  <div key={t.id} className="p-3 rounded-lg border border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold">
                        {t.name} <span className="text-xs text-muted-foreground">/{t.slug}</span>
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline">{t.group_name}</Badge>
                        <Badge variant="outline">{LEVEL_LABELS[t.level]}</Badge>
                        <Badge variant={t.visible ? "default" : "secondary"}>{t.hidden ? "Đang ẩn" : t.visible ? "Đang hiện" : "Chưa có nội dung"}</Badge>
                        <Badge variant="secondary">{t.lesson ? "Có bài học" : "Chưa có bài học"}</Badge>
                        <Badge variant="secondary">{t.formula_count} công thức</Badge>
                        <Badge variant="secondary">{t.exercise_count} câu bài tập</Badge>
                        <Badge variant="secondary">{t.toeic_count} câu TOEIC</Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                        Sửa bài học
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setContent({ topic: t, tab: "formulas" })}>
                        Công thức
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setContent({ topic: t, tab: "exercises" })}>
                        Bài tập
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggle.mutate(t)} aria-label={t.hidden ? "Hiện chủ điểm" : "Ẩn chủ điểm"}>
                        {t.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="questions">
            <QuestionTopics topics={data ?? []} />
          </TabsContent>
          <TabsContent value="import">
            <ImportBox />
          </TabsContent>
        </Tabs>
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Thêm chủ điểm" : `Sửa: ${editing?.name ?? ""}`}</DialogTitle>
          </DialogHeader>
          {editing && <TopicEditor topic={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!content} onOpenChange={(o) => !o && setContent(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {content?.tab === "formulas" ? "Công thức" : "Bài tập"} · {content?.topic.name}
            </DialogTitle>
          </DialogHeader>
          {content?.tab === "formulas" && <FormulaEditor topic={content.topic} />}
          {content?.tab === "exercises" && <ExerciseEditor topic={content.topic} />}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminGrammar;
