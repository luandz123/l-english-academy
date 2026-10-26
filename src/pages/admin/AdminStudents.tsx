import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Search, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateStudent } from "@/lib/api/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const AdminStudents = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const createStudentMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await adminCreateStudent({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });
      
      if (error) throw error;
      if (!data.user) throw new Error("Không thể tạo tài khoản.");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã tạo tài khoản học viên." });
      setOpen(false);
      setEmail("");
      setPassword("");
      setFullName("");
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
    },
    onError: (err: any) => {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
    },
  });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (!profiles) return [];

      const { data: enrollments } = await supabase.from("enrollments").select("user_id, expires_at");
      const enrollMap: Record<string, { count: number; hasActive: boolean; hasExpired: boolean }> = {};
      (enrollments ?? []).forEach((e) => {
        if (!enrollMap[e.user_id]) enrollMap[e.user_id] = { count: 0, hasActive: false, hasExpired: false };
        enrollMap[e.user_id].count++;
        const expired = e.expires_at && new Date(e.expires_at) < new Date();
        if (expired) enrollMap[e.user_id].hasExpired = true;
        else enrollMap[e.user_id].hasActive = true;
      });

      return profiles.map((p) => {
        const e = enrollMap[p.user_id] ?? { count: 0, hasActive: false, hasExpired: false };
        const status = e.hasActive ? "active" : e.hasExpired ? "expired" : "inactive";
        return { ...p, courseCount: e.count, status };
      });
    },
  });

  const statusMap: Record<string, { label: string; color: string }> = {
    active: { label: "Đang học", color: "bg-success text-success-foreground" },
    expired: { label: "Hết hạn", color: "bg-warning text-warning-foreground" },
    inactive: { label: "Chưa đăng ký", color: "bg-muted text-muted-foreground" },
  };

  const filtered = students.filter((s) =>
    (s.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (s.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quản lý Học Viên</h1>
            <p className="text-sm text-muted-foreground">{students.length} học viên</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 rounded-xl shadow-soft-sm transition-all duration-120 active:scale-95">
                <Plus className="w-4 h-4 mr-2" /> Tạo học viên
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl border border-border/70 shadow-soft-2xl bg-card">
              <DialogHeader>
                <DialogTitle className="font-bold text-foreground">Tạo tài khoản học viên mới</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Họ và tên</Label>
                  <Input placeholder="Nguyễn Văn A" value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-xl border-border/70 text-base" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input type="email" placeholder="student@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl border-border/70 text-base" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Mật khẩu</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl border-border/70 text-base" />
                </div>
                <Button 
                  className="w-full rounded-xl shadow-soft-sm transition-all duration-120 active:scale-95 font-bold" 
                  onClick={() => createStudentMutation.mutate()} 
                  disabled={createStudentMutation.isPending || !email || !password || !fullName}
                >
                  {createStudentMutation.isPending ? "Đang xử lý..." : "Tạo tài khoản"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm theo tên hoặc email..." className="pl-9 rounded-xl border-border/70 shadow-soft-xs text-base" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/70 shadow-soft-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40">
                    <th className="text-left p-3.5 font-bold text-foreground">#</th>
                    <th className="text-left p-3.5 font-bold text-foreground">Họ tên</th>
                    <th className="text-left p-3.5 font-bold text-foreground">Email</th>
                    <th className="text-center p-3.5 font-bold text-foreground">Khóa</th>
                    <th className="text-center p-3.5 font-bold text-foreground">Ngày ĐK</th>
                    <th className="text-center p-3.5 font-bold text-foreground">Trạng thái</th>
                    <th className="text-center p-3.5 font-bold text-foreground">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="p-3.5 text-muted-foreground font-semibold">{i + 1}</td>
                      <td className="p-3.5 font-bold text-foreground">{s.full_name ?? "—"}</td>
                      <td className="p-3.5 text-foreground font-mono text-xs">{s.email ?? "—"}</td>
                      <td className="p-3.5 text-center font-bold text-foreground">{s.courseCount} khóa</td>
                      <td className="p-3.5 text-center text-muted-foreground text-xs">{s.created_at ? new Date(s.created_at).toLocaleDateString("vi-VN") : ""}</td>
                      <td className="p-3.5 text-center">
                        <Badge className={statusMap[s.status]?.color}>{statusMap[s.status]?.label}</Badge>
                      </td>
                      <td className="p-3.5 text-center">
                        <Button size="icon" variant="ghost" className="rounded-xl h-8 w-8 hover:bg-muted transition-all duration-120 active:scale-95" asChild>
                          <Link to={`/admin/students/${s.user_id}`}><Eye className="w-4 h-4 text-primary" /></Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminStudents;
