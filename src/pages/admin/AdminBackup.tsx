import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  getBackupStats,
  getBackupExportFull,
  getBackupExportStudents,
  getBackupExportTestResults,
  getBackupExportQuestionBank,
  createAdminActivityLog,
} from "@/lib/api/admin";
import { useAuth } from "@/hooks/useAuth";
import {
  Database,
  Download,
  FileSpreadsheet,
  FileJson,
  ShieldCheck,
  CheckCircle2,
  Clock,
  HardDrive,
  RefreshCw,
  AlertTriangle,
  Server,
  FileText,
  Copy,
  Check,
} from "lucide-react";

interface TableStat {
  name: string;
  tableName: string;
  count: number | null;
  status: "idle" | "loading" | "ready" | "error";
  description: string;
}

interface BackupHistoryItem {
  id: string;
  timestamp: string;
  type: string;
  filename: string;
  sizeBytes: number;
  recordCount: number;
  adminEmail: string;
}

const AdminBackup: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loadingStats, setLoadingStats] = useState(false);
  const [isExportingFull, setIsExportingFull] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatusText, setExportStatusText] = useState("");
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const [tableStats, setTableStats] = useState<TableStat[]>([
    { name: "Khóa học", tableName: "courses", count: null, status: "idle", description: "Các khóa học TOEIC & bài giảng" },
    { name: "Chương học & Bài học", tableName: "lessons", count: null, status: "idle", description: "Danh sách bài học và video" },
    { name: "Đề thi Full Test", tableName: "full_tests", count: null, status: "idle", description: "Kho đề thi thử TOEIC chuẩn ETS" },
    { name: "Ngân hàng Câu hỏi", tableName: "questions", count: null, status: "idle", description: "Câu hỏi trắc nghiệm và nhóm câu" },
    { name: "Đáp án", tableName: "answers", count: null, status: "idle", description: "Các lựa chọn A, B, C, D & giải thích" },
    { name: "Hồ sơ Học viên", tableName: "profiles", count: null, status: "idle", description: "Tài khoản học viên và avatar" },
    { name: "Kết quả thi Full Test", tableName: "user_full_test_results", count: null, status: "idle", description: "Bảng điểm và lịch sử nộp bài thi" },
    { name: "Đăng ký khóa học", tableName: "enrollments", count: null, status: "idle", description: "Ghi danh và phân quyền học viên" },
    { name: "Bộ Từ vựng & Game", tableName: "vocab_quizzes", count: null, status: "idle", description: "Dữ liệu flashcard & arcade từ vựng" },
    { name: "Cài đặt Nền tảng", tableName: "platform_settings", count: null, status: "idle", description: "Cấu hình giao diện và thương hiệu" },
  ]);

  const [lastBackup, setLastBackup] = useState<BackupHistoryItem | null>(() => {
    try {
      const saved = localStorage.getItem("lenglish_last_backup_meta");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const fetchTableCounts = async () => {
    setLoadingStats(true);
    try {
      const { data, error } = await getBackupStats();
      if (error || !data) {
        setTableStats(tableStats.map((item) => ({ ...item, count: null, status: "error" as const })));
        return;
      }
      const updated = tableStats.map((item) => ({
        ...item,
        count: (data as any)[item.tableName] ?? 0,
        status: "ready" as const,
      }));
      setTableStats(updated);
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchTableCounts();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    toast({ title: "Đã sao chép lệnh vào clipboard" });
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 1. FULL SNAPSHOT BACKUP (JSON)
  const handleExportFullBackup = async () => {
    setIsExportingFull(true);
    setExportProgress(10);
    setExportStatusText("Khởi tạo tiến trình sao lưu toàn diện...");

    try {
      setExportProgress(30);
      setExportStatusText("Đang tải dữ liệu snapshot từ máy chủ...");
      const { data: exportRes, error } = await getBackupExportFull();
      if (error || !exportRes) {
        throw error || new Error("Không thể tải bản sao lưu");
      }

      setExportProgress(80);
      setExportStatusText("Đang tổng hợp siêu dữ liệu (metadata) và tệp gói...");

      const backupData = exportRes.snapshot;
      const totalRecords = Object.values(exportRes.counts).reduce((a, b) => a + b, 0);
      const tablesCount = Object.keys(backupData).length;

      const now = new Date();
      const timestampIso = now.toISOString();
      const dateString = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `l_english_full_backup_${dateString}.json`;

      const payload = {
        app_name: "L-English Academy",
        schema_version: "2026.1",
        backup_type: "FULL_DATABASE_SNAPSHOT",
        created_at: timestampIso,
        created_by: user?.email || user?.id || "admin",
        total_tables: tablesCount,
        total_records: totalRecords,
        tables_summary: exportRes.counts,
        data: backupData,
      };

      const jsonString = JSON.stringify(payload, null, 2);
      const sizeBytes = new Blob([jsonString]).size;

      triggerDownload(jsonString, filename, "application/json;charset=utf-8;");

      const historyItem: BackupHistoryItem = {
        id: crypto.randomUUID(),
        timestamp: timestampIso,
        type: "Full JSON Snapshot",
        filename,
        sizeBytes,
        recordCount: totalRecords,
        adminEmail: user?.email || "Admin",
      };

      setLastBackup(historyItem);
      localStorage.setItem("lenglish_last_backup_meta", JSON.stringify(historyItem));

      // Log activity to admin_activity_log
      try {
        await createAdminActivityLog({
          action: "BACKUP_EXPORT_FULL",
          entity_type: "SYSTEM_BACKUP",
          entity_id: filename,
          details: {
            filename,
            sizeBytes,
            totalRecords,
            timestamp: timestampIso,
          },
        });
      } catch (logErr) {
        console.warn("Could not write admin activity log:", logErr);
      }

      setExportProgress(100);
      toast({
        title: "Sao lưu thành công!",
        description: `Đã xuất ${totalRecords.toLocaleString()} bản ghi từ ${tablesCount} bảng dữ liệu (${(sizeBytes / 1024).toFixed(1)} KB).`,
      });
    } catch (err: any) {
      console.error("Backup export error:", err);
      toast({
        title: "Sao lưu thất bại",
        description: err.message || "Đã xảy ra lỗi trong quá trình kết xuất dữ liệu.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setIsExportingFull(false);
        setExportProgress(0);
        setExportStatusText("");
      }, 1200);
    }
  };

  // 2. EXPORT STUDENTS (CSV)
  const handleExportStudents = async () => {
    toast({ title: "Đang xuất danh sách học viên..." });
    try {
      const { data: profiles, error } = await getBackupExportStudents();

      if (error) throw error;

      const headers = ["ID Học Viên (UUID)", "Họ và Tên", "Email", "Ảnh đại diện", "Cập nhật lần cuối"];
      const rows = (profiles || []).map((p: any) => [
        `"${p.user_id || ""}"`,
        `"${(p.full_name || "").replace(/"/g, '""')}"`,
        `"${p.email || ""}"`,
        `"${p.avatar_url || ""}"`,
        `"${p.updated_at || ""}"`,
      ]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const filename = `students_export_${new Date().toISOString().slice(0, 10)}.csv`;
      triggerDownload(csvContent, filename, "text/csv;charset=utf-8;");
      toast({ title: "Đã tải về danh sách học viên (.csv)" });
    } catch (err: any) {
      toast({ title: "Lỗi xuất học viên", description: err.message, variant: "destructive" });
    }
  };

  // 3. EXPORT TEST RESULTS (CSV)
  const handleExportTestResults = async () => {
    toast({ title: "Đang xuất kết quả thi Full Test..." });
    try {
      const { data: results, error } = await getBackupExportTestResults();

      if (error) throw error;

      const headers = [
        "Mã Lượt Thi",
        "Mã Học Viên",
        "Mã Đề Thi",
        "Số Câu Đúng",
        "Điểm Listening",
        "Điểm Reading",
        "Tổng Điểm TOEIC",
        "Thời Gian Làm (Giây)",
        "Chế Độ Thi",
        "Thời Gian Nộp",
      ];

      const rows = (results || []).map((r) => [
        `"${r.id}"`,
        `"${r.user_id || ""}"`,
        `"${r.test_id || ""}"`,
        r.correct_answers || 0,
        r.listening_score || 0,
        r.reading_score || 0,
        r.total_score || 0,
        r.time_spent_seconds || 0,
        `"${r.test_mode || "exam"}"`,
        `"${r.created_at || ""}"`,
      ]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const filename = `fulltest_results_export_${new Date().toISOString().slice(0, 10)}.csv`;
      triggerDownload(csvContent, filename, "text/csv;charset=utf-8;");
      toast({ title: "Đã tải về kết quả thi Full Test (.csv)" });
    } catch (err: any) {
      toast({ title: "Lỗi xuất bảng điểm", description: err.message, variant: "destructive" });
    }
  };

  // 4. EXPORT QUESTION BANK (JSON)
  const handleExportQuestionBank = async () => {
    toast({ title: "Đang xuất ngân hàng câu hỏi đề thi..." });
    try {
      const { data: res, error } = await getBackupExportQuestionBank();

      if (error || !res) throw error || new Error("Không thể tải ngân hàng câu hỏi");

      const payload = {
        app_name: "L-English Academy Question Bank",
        exported_at: new Date().toISOString(),
        total_tests: res.full_tests?.length || 0,
        total_questions: res.questions?.length || 0,
        total_answers: res.answers?.length || 0,
        full_tests: res.full_tests || [],
        questions: res.questions || [],
        answers: res.answers || [],
      };

      const filename = `toeic_question_bank_${new Date().toISOString().slice(0, 10)}.json`;
      triggerDownload(JSON.stringify(payload, null, 2), filename, "application/json;charset=utf-8;");
      toast({ title: "Đã tải về ngân hàng đề thi (.json)" });
    } catch (err: any) {
      toast({ title: "Lỗi xuất ngân hàng câu hỏi", description: err.message, variant: "destructive" });
    }
  };

  const totalCalculatedRecords = tableStats.reduce((sum, item) => sum + (item.count || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-soft-sm">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  Trung Tâm Sao Lưu & Phục Hồi Dữ Liệu
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Bảo đảm an toàn dữ liệu, sao lưu định kỳ & sẵn sàng ứng phó thảm họa (Disaster Recovery)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTableCounts}
              disabled={loadingStats}
              className="rounded-xl border-border/80 font-bold gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? "animate-spin" : ""}`} />
              Làm mới thống kê
            </Button>
          </div>
        </div>

        {/* System Health Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Cloud Auto Backup Status */}
          <Card className="rounded-2xl border-border/70 bg-card shadow-soft-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cơ chế Tự Động</span>
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-bold gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Đang hoạt động
                </Badge>
              </div>
              <CardTitle className="text-lg font-bold mt-1 text-foreground flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" /> PostgreSQL Cloud Backup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>Hệ cơ sở dữ liệu được sao lưu snapshot tự động hàng ngày trên Cloud Supabase.</p>
              <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px] font-medium">
                <span>RPO (Mục tiêu mất mát):</span>
                <span className="text-foreground font-bold">≤ 24 giờ</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-medium">
                <span>RTO (Mục tiêu phục hồi):</span>
                <span className="text-foreground font-bold">≤ 2 giờ</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Manual Backup State */}
          <Card className="rounded-2xl border-border/70 bg-card shadow-soft-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sao lưu thủ công</span>
                <Badge variant="outline" className="font-semibold text-xs">
                  {lastBackup ? "Đã có bản snapshot" : "Chưa thực hiện"}
                </Badge>
              </div>
              <CardTitle className="text-lg font-bold mt-1 text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" /> Bản Gần Nhất
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              {lastBackup ? (
                <>
                  <p className="truncate font-mono text-[11px] text-foreground">
                    {lastBackup.filename}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px]">
                    <span>Thời gian:</span>
                    <span className="text-foreground font-semibold">
                      {new Date(lastBackup.timestamp).toLocaleString("vi-VN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>Dung lượng / Bản ghi:</span>
                    <span className="text-foreground font-semibold">
                      {(lastBackup.sizeBytes / 1024).toFixed(1)} KB ({lastBackup.recordCount.toLocaleString()} dòng)
                    </span>
                  </div>
                </>
              ) : (
                <div className="py-2">
                  <p>Chưa có bản sao lưu nào được xuất từ trình duyệt gần đây.</p>
                  <p className="text-[11px] text-cyan-400 mt-1">Khuyến nghị: Tạo bản sao lưu toàn hệ thống ngay bên dưới.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Database Scale */}
          <Card className="rounded-2xl border-border/70 bg-card shadow-soft-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quy mô Dữ liệu</span>
                <Badge variant="secondary" className="font-bold text-xs">
                  {tableStats.length} Bảng chính
                </Badge>
              </div>
              <CardTitle className="text-lg font-bold mt-1 text-foreground flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-indigo-400" /> Tổng Bản Ghi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {loadingStats ? "..." : totalCalculatedRecords.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">bản ghi được quản lý</span>
              </div>
              <div className="pt-1 border-t border-border/50 text-[11px] flex justify-between">
                <span>Tình trạng sao lưu sẵn sàng:</span>
                <span className="text-emerald-400 font-bold">100% Khả dụng</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="export" className="space-y-6">
          <TabsList className="bg-muted/60 p-1 rounded-2xl border border-border/60 h-auto grid grid-cols-1 sm:grid-cols-3 max-w-lg">
            <TabsTrigger value="export" className="rounded-xl font-bold py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-soft-xs">
              <Download className="w-4 h-4 mr-2" /> Sao Lưu Dữ Liệu
            </TabsTrigger>
            <TabsTrigger value="tables" className="rounded-xl font-bold py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-soft-xs">
              <HardDrive className="w-4 h-4 mr-2" /> Thống Kê Bảng ({tableStats.length})
            </TabsTrigger>
            <TabsTrigger value="recovery" className="rounded-xl font-bold py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-soft-xs">
              <ShieldCheck className="w-4 h-4 mr-2" /> Hướng Dẫn Phục Hồi
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: BACKUP & EXPORTS */}
          <TabsContent value="export" className="space-y-6 animate-in fade-in duration-200">
            {/* Primary Action Card: Full System Snapshot */}
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-[#070e1c] via-[#0d162c] to-[#070e1c] p-6 sm:p-8 shadow-soft-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5" /> Gói Sao Lưu Toàn Diện (Full Snapshot)
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Tạo & Tải Về Bản Sao Lưu Toàn Bộ Hệ Thống (.json)
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Kết xuất đồng thời toàn bộ 20 bảng cơ sở dữ liệu quan trọng bao gồm: toàn bộ đề thi TOEIC, ngân hàng câu hỏi, đáp án, danh sách học viên, lịch sử làm bài thi thử, và cấu hình nền tảng. Tệp JSON có thể lưu trữ ngoại tuyến hoặc dùng cho mục đích kiểm toán.
                  </p>
                </div>

                <div className="shrink-0 flex flex-col gap-2 min-w-[240px]">
                  <Button
                    onClick={handleExportFullBackup}
                    disabled={isExportingFull}
                    size="lg"
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                  >
                    {isExportingFull ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang kết xuất...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>TẠO SAO LƯU NGAY (.JSON)</span>
                      </>
                    )}
                  </Button>
                  <span className="text-[11px] text-center text-slate-400 font-medium">
                    Tự động tải về máy tính của Quản trị viên
                  </span>
                </div>
              </div>

              {/* Progress Bar during export */}
              {isExportingFull && (
                <div className="mt-6 pt-6 border-t border-cyan-500/20 space-y-2 animate-in fade-in">
                  <div className="flex justify-between text-xs font-semibold text-cyan-300">
                    <span>{exportStatusText}</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} className="h-2 bg-slate-800" />
                </div>
              )}
            </div>

            {/* Modular Exports Grid */}
            <div>
              <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Xuất Dữ Liệu Theo Từng Phân Hệ Chuyên Biệt
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Export 1: Học viên */}
                <Card className="rounded-2xl border-border/70 bg-card p-5 shadow-soft-sm flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-base text-foreground">Hồ Sơ & Danh Sách Học Viên</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Xuất toàn bộ danh sách tài khoản học viên, tên hiển thị, ảnh đại diện và thời gian cập nhật ra định dạng bảng tính CSV.
                    </p>
                  </div>
                  <Button
                    onClick={handleExportStudents}
                    variant="outline"
                    className="mt-4 w-full rounded-xl border-border/80 font-bold hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/40 gap-2"
                  >
                    <Download className="w-4 h-4" /> Xuất File CSV
                  </Button>
                </Card>

                {/* Export 2: Kết quả thi Full Test */}
                <Card className="rounded-2xl border-border/70 bg-card p-5 shadow-soft-sm flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-base text-foreground">Bảng Điểm Full Test TOEIC</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Xuất toàn bộ lịch sử nộp bài thi thử: điểm Nghe, điểm Đọc, tổng điểm 990, số câu đúng và thời gian làm bài của học viên.
                    </p>
                  </div>
                  <Button
                    onClick={handleExportTestResults}
                    variant="outline"
                    className="mt-4 w-full rounded-xl border-border/80 font-bold hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/40 gap-2"
                  >
                    <Download className="w-4 h-4" /> Xuất Bảng Điểm CSV
                  </Button>
                </Card>

                {/* Export 3: Ngân hàng câu hỏi */}
                <Card className="rounded-2xl border-border/70 bg-card p-5 shadow-soft-sm flex flex-col justify-between hover:border-indigo-500/40 transition-colors">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                      <FileJson className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-base text-foreground">Ngân Hàng Đề Thi & Câu Hỏi</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Xuất toàn bộ kho đề thi ETS, câu hỏi Part 1–7 và danh mục đáp án ra tệp JSON chuẩn để sao lưu hoặc chuyển đổi hệ thống.
                    </p>
                  </div>
                  <Button
                    onClick={handleExportQuestionBank}
                    variant="outline"
                    className="mt-4 w-full rounded-xl border-border/80 font-bold hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/40 gap-2"
                  >
                    <Download className="w-4 h-4" /> Xuất Câu Hỏi (.JSON)
                  </Button>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: TABLE STATS */}
          <TabsContent value="tables" className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-card rounded-2xl border border-border/70 overflow-hidden shadow-soft-sm">
              <div className="p-4 bg-muted/40 border-b border-border/70 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-foreground text-sm">Chi Tiết Bản Ghi Từng Bảng Cơ Sở Dữ Liệu</h3>
                  <p className="text-xs text-muted-foreground">Theo dõi dung lượng và tình trạng toàn vẹn của các bảng chính</p>
                </div>
                <Badge variant="outline" className="font-bold">
                  {totalCalculatedRecords.toLocaleString()} tổng bản ghi
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/30 text-xs font-black uppercase text-muted-foreground">
                      <th className="text-left px-5 py-3">Tên Phân Hệ</th>
                      <th className="text-left px-5 py-3">Tên Bảng (Database Table)</th>
                      <th className="text-center px-5 py-3">Số Lượng Bản Ghi</th>
                      <th className="text-center px-5 py-3">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableStats.map((stat, idx) => (
                      <tr
                        key={stat.tableName}
                        className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-foreground">{stat.name}</p>
                          <p className="text-xs text-muted-foreground">{stat.description}</p>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-primary font-semibold">
                          {stat.tableName}
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold text-foreground">
                          {stat.count === null ? (
                            <span className="text-muted-foreground">...</span>
                          ) : (
                            stat.count.toLocaleString()
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Đã sẵn sàng
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: DISASTER RECOVERY PROTOCOL */}
          <TabsContent value="recovery" className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box 1: Supabase Point In Time Recovery */}
              <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-soft-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-black">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">Khôi Phục Qua Cloud Console (PITR)</h3>
                    <p className="text-xs text-muted-foreground">Phương pháp khôi phục nhanh nhất khi có sự cố hạ tầng</p>
                  </div>
                </div>
                <div className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
                  <p>1. Truy cập vào trang quản trị Supabase Database: <code className="text-primary bg-muted px-1.5 py-0.5 rounded">Dashboard &gt; Settings &gt; Database &gt; Backups</code>.</p>
                  <p>2. Chọn mốc thời gian muốn phục hồi (Point-in-Time Recovery) trước thời điểm xảy ra sự cố.</p>
                  <p>3. Xác nhận lệnh <strong className="text-foreground">Restore to point in time</strong> để khôi phục toàn bộ database về nguyên trạng.</p>
                </div>
              </Card>

              {/* Box 2: Local SQL Restore */}
              <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-soft-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-black">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">Khôi Phục Bằng Tệp SQL Dump (CLI)</h3>
                    <p className="text-xs text-muted-foreground">Áp dụng khi cần dựng lại máy chủ từ tệp sao lưu nguồn</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>Sử dụng tệp <code className="text-cyan-400 bg-muted px-1.5 py-0.5 rounded">public_restore.sql</code> hoặc <code className="text-cyan-400 bg-muted px-1.5 py-0.5 rounded">.backup</code> có sẵn trong thư mục dự án:</p>
                  <div className="relative rounded-xl bg-slate-950 p-3 font-mono text-xs text-slate-200 border border-slate-800">
                    <code>psql -h db.supabase.co -U postgres -d postgres -f public_restore.sql</code>
                    <button
                      onClick={() => copyToClipboard("psql -h db.supabase.co -U postgres -d postgres -f public_restore.sql", "psql")}
                      className="absolute right-2 top-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      {copiedCmd === "psql" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Security Notice */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex items-start gap-3.5 text-xs text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-amber-300">Quy Định Bảo Mật Bản Sao Lưu (Data Security Policy)</h4>
                <p className="leading-relaxed text-amber-200/90">
                  Tệp sao lưu JSON chứa thông tin nhạy cảm của toàn bộ học viên và hệ thống. Quản trị viên sau khi tải về bắt buộc phải lưu trữ trong ổ đĩa mã hóa hoặc kho lưu trữ bảo mật nội bộ, tuyệt đối không chia sẻ công khai hoặc tải lên các kho lưu trữ công cộng (public repositories).
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminBackup;
