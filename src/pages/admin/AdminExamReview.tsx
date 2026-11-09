import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ShieldCheck, Tags } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import {
  DIFFICULTY_LABELS,
  EXAM_TYPE_LABELS,
  REPORT_REASON_LABELS,
  adminListExams,
  adminListQuestionTags,
  adminListReports,
  adminRetag,
  adminSetVerification,
  adminUpdateExamMeta,
  adminUpdateQuestionTags,
  adminUpdateReport,
  getPracticeCatalog,
  type AdminExam,
  type ExamType,
} from "@/lib/api/practice";

const NONE = "__none";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  verified: { label: "Đã xác minh", variant: "default" },
  needs_review: { label: "Cần duyệt lại", variant: "destructive" },
  unverified: { label: "Chưa xác minh", variant: "secondary" },
};

const ExamEditor: React.FC<{ exam: AdminExam; onClose: () => void }> = ({ exam, onClose }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [checklist, setChecklist] = useState<boolean[]>(exam.checklist);
  const [year, setYear] = useState(exam.year ? String(exam.year) : "");
  const [difficulty, setDifficulty] = useState<string>(exam.difficulty ?? NONE);
  const [topics, setTopics] = useState(exam.topics.join(", "));
  const [testType, setTestType] = useState<ExamType>(exam.test_type);
  const [duration, setDuration] = useState(String(exam.duration_minutes));
  const [part, setPart] = useState<number>(1);

  const { data: catalog } = useQuery({ queryKey: ["practice-catalog-admin"], queryFn: getPracticeCatalog });
  const { data: tags, isLoading: tagsLoading } = useQuery({
    queryKey: ["admin-question-tags", exam.id, part],
    queryFn: () => adminListQuestionTags(exam.id, part),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
    void queryClient.invalidateQueries({ queryKey: ["exam-library"] });
  };
  const fail = (err: unknown) => toast({ title: "Lỗi", description: getFriendlyErrorMessage(err), variant: "destructive" });

  const saveMeta = useMutation({
    mutationFn: () =>
      adminUpdateExamMeta(exam.id, {
        year: year ? Number(year) : null,
        difficulty: difficulty === NONE ? null : difficulty,
        topics: topics.split(",").map((t) => t.trim()).filter(Boolean),
        test_type: testType,
        duration_minutes: duration ? Number(duration) : null,
      }),
    onSuccess: () => {
      refresh();
      toast({ title: "Đã lưu thông tin đề" });
    },
    onError: fail,
  });

  const verify = useMutation({
    mutationFn: (verified: boolean) => adminSetVerification(exam.id, checklist, verified),
    onSuccess: (_d, verified) => {
      refresh();
      toast({ title: verified ? "Đã xác minh đề" : "Đã lưu checklist / bỏ xác minh" });
      if (verified) onClose();
    },
    onError: fail,
  });

  const updateTag = useMutation({
    mutationFn: (v: { id: number; body: Parameters<typeof adminUpdateQuestionTags>[1] }) => adminUpdateQuestionTags(v.id, v.body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-question-tags", exam.id, part] }),
    onError: fail,
  });

  const retag = useMutation({
    mutationFn: () => adminRetag(exam.id),
    onSuccess: (r) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-question-tags", exam.id] });
      refresh();
      toast({ title: `Đã gắn nhãn lại ${r.tagged} câu (giữ nhãn đã sửa tay)` });
    },
    onError: fail,
  });

  const categories = catalog?.parts.find((p) => p.part === part)?.categories ?? [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{exam.title}</DialogTitle>
          <DialogDescription>
            {exam.code} · {exam.tagged_questions} câu đã gắn nhãn · {exam.eligible_questions} câu luyện riêng được
            {exam.content_changed_at && ` · nội dung sửa lần cuối ${new Date(exam.content_changed_at).toLocaleString("vi-VN")}`}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="verify">
          <TabsList>
            <TabsTrigger value="verify">Kiểm duyệt</TabsTrigger>
            <TabsTrigger value="meta">Thông tin đề</TabsTrigger>
            <TabsTrigger value="tags">Nhãn câu hỏi</TabsTrigger>
          </TabsList>

          <TabsContent value="verify" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Verified chỉ chứng nhận nội dung đã kiểm duyệt, không phải đề chính thức của ETS. Sửa câu hỏi/đáp án sau khi xác minh sẽ tự chuyển đề về "Cần duyệt lại".
            </p>
            <div className="text-sm font-bold">
              Checklist {checklist.filter(Boolean).length}/{exam.checklist_labels.length}
            </div>
            {exam.checklist_labels.map((label, i) => (
              <label key={label} className="flex items-start gap-3 text-sm min-h-[36px] cursor-pointer">
                <Checkbox
                  checked={checklist[i]}
                  onCheckedChange={(v) => setChecklist(checklist.map((c, j) => (j === i ? v === true : c)))}
                  className="mt-0.5"
                />
                {label}
              </label>
            ))}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => verify.mutate(false)} disabled={verify.isPending}>
                Lưu checklist{exam.verification_status === "verified" ? " & bỏ xác minh" : ""}
              </Button>
              <Button onClick={() => verify.mutate(true)} disabled={verify.isPending || !checklist.every(Boolean)}>
                <ShieldCheck className="w-4 h-4 mr-1" /> Xác minh đề
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="meta" className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm space-y-1">
                <span>Năm</span>
                <Input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} />
              </label>
              <label className="text-sm space-y-1">
                <span>Độ khó</span>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Chưa đánh giá</SelectItem>
                    {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="text-sm space-y-1">
                <span>Loại đề</span>
                <Select value={testType} onValueChange={(v) => setTestType(v as ExamType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXAM_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="text-sm space-y-1">
                <span>Thời lượng (phút)</span>
                <Input value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, "").slice(0, 3))} />
              </label>
              <label className="text-sm space-y-1 sm:col-span-2">
                <span>Chủ đề (cách nhau bởi dấu phẩy, vd. Office, Business, Travel)</span>
                <Input value={topics} onChange={(e) => setTopics(e.target.value)} />
              </label>
            </div>
            <DialogFooter>
              <Button onClick={() => saveMeta.mutate()} disabled={saveMeta.isPending}>Lưu thông tin</Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="tags" className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                <Button key={p} size="sm" variant={part === p ? "default" : "outline"} onClick={() => setPart(p)}>
                  Part {p}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => retag.mutate()} disabled={retag.isPending}>
                <RefreshCw className="w-4 h-4 mr-1" /> Gắn nhãn tự động lại
              </Button>
            </div>
            {tagsLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : !tags || tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">Part này chưa có câu đã gắn nhãn.</p>
            ) : (
              <div className="space-y-2">
                {tags.map((t) => (
                  <div key={t.id} className="p-3 rounded-lg border flex flex-col md:flex-row md:items-center gap-2">
                    <div className="flex-1 min-w-0 text-sm">
                      <span className="font-mono text-xs text-muted-foreground mr-2">#{(t.part_index ?? 0) + 1}</span>
                      {t.text ?? "(không có chữ)"}
                      {!t.practice_eligible && <Badge variant="outline" className="ml-2">Không luyện riêng</Badge>}
                      {t.tag_source === "admin" && <Badge variant="secondary" className="ml-2">Sửa tay</Badge>}
                    </div>
                    <Select value={t.category ?? NONE} onValueChange={(v) => updateTag.mutate({ id: t.id, body: { category: v } })}>
                      <SelectTrigger className="md:w-52 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {t.category === null && <SelectItem value={NONE}>—</SelectItem>}
                        {categories.map((c) => (
                          <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {part === 7 && (
                      <Select value={t.passage_type ?? NONE} onValueChange={(v) => updateTag.mutate({ id: t.id, body: { passage_type: v === NONE ? null : v } })}>
                        <SelectTrigger className="md:w-44 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>—</SelectItem>
                          {(catalog?.passage_types ?? []).map((c) => (
                            <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Select value={t.difficulty ?? "medium"} onValueChange={(v) => updateTag.mutate({ id: t.id, body: { difficulty: v } })}>
                      <SelectTrigger className="md:w-36 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const ReportsTab: React.FC = () => {
  const [status, setStatus] = useState("open");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-exam-reports", status],
    queryFn: () => adminListReports(status === "all" ? undefined : status),
  });
  const update = useMutation({
    mutationFn: (v: { id: number; status: string }) => adminUpdateReport(v.id, { status: v.status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-exam-reports"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
    },
    onError: (err) => toast({ title: "Lỗi", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[
          ["open", "Đang mở"],
          ["resolved", "Đã xử lý"],
          ["dismissed", "Bỏ qua"],
          ["all", "Tất cả"],
        ].map(([k, l]) => (
          <Button key={k} size="sm" variant={status === k ? "default" : "outline"} onClick={() => setStatus(k)}>
            {l}
          </Button>
        ))}
      </div>
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Không có báo lỗi nào.</p>
      ) : (
        data.map((r) => (
          <div key={r.id} className="p-4 rounded-lg border space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={r.status === "open" ? "destructive" : "secondary"}>{REPORT_REASON_LABELS[r.reason] ?? r.reason}</Badge>
              <span className="font-semibold">{r.test_title ?? `Đề #${r.test_id}`}</span>
              {r.question_id && <span className="text-muted-foreground">· câu #{r.question_id}</span>}
              <span className="text-xs text-muted-foreground ml-auto">
                {r.reporter_email} · {new Date(r.created_at).toLocaleString("vi-VN")}
              </span>
            </div>
            {r.message && <p className="text-sm">{r.message}</p>}
            {r.status === "open" && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={() => update.mutate({ id: r.id, status: "resolved" })}>Đã xử lý</Button>
                <Button size="sm" variant="outline" onClick={() => update.mutate({ id: r.id, status: "dismissed" })}>Bỏ qua</Button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

/** Kiểm duyệt đề (E06): xác minh theo checklist, thông tin thư viện, nhãn dạng câu, báo lỗi học viên. */
const AdminExamReview: React.FC = () => {
  const { data, isLoading } = useQuery({ queryKey: ["admin-exams"], queryFn: adminListExams });
  const [editing, setEditing] = useState<AdminExam | null>(null);
  const [q, setQ] = useState("");

  // Sau khi lưu, cập nhật đề đang mở bằng dữ liệu mới
  useEffect(() => {
    if (editing && data) setEditing(data.find((e) => e.id === editing.id) ?? null);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = (data ?? []).filter((e) => !q || e.title.toLowerCase().includes(q.toLowerCase()) || e.code.toLowerCase() === q.toLowerCase());
  const openReports = (data ?? []).reduce((n, e) => n + e.open_reports, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Tags className="w-6 h-6" /> Kiểm duyệt đề & luyện tập
        </h1>
        <Tabs defaultValue="exams">
          <TabsList>
            <TabsTrigger value="exams">Đề thi</TabsTrigger>
            <TabsTrigger value="reports">Báo lỗi {openReports > 0 ? `(${openReports})` : ""}</TabsTrigger>
          </TabsList>
          <TabsContent value="exams" className="space-y-3">
            <Input placeholder="Tìm theo tên hoặc mã đề" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="rounded-lg border divide-y">
                {shown.map((e) => {
                  const badge = STATUS_BADGE[e.verification_status];
                  return (
                    <div key={e.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{e.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {e.code} · {e.year ?? "chưa có năm"} · {e.difficulty ? DIFFICULTY_LABELS[e.difficulty] : "chưa đánh giá độ khó"} ·{" "}
                          {EXAM_TYPE_LABELS[e.test_type]} · {e.attempts} lượt làm · checklist {e.checklist.filter(Boolean).length}/9
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {e.open_reports > 0 && <Badge variant="destructive">{e.open_reports} báo lỗi</Badge>}
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <Button size="sm" variant="outline" onClick={() => setEditing(e)}>
                          Mở
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
          <TabsContent value="reports">
            <ReportsTab />
          </TabsContent>
        </Tabs>
      </div>
      {editing && <ExamEditor key={editing.id} exam={editing} onClose={() => setEditing(null)} />}
    </AdminLayout>
  );
};

export default AdminExamReview;
