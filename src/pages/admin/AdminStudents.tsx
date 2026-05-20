import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Search, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
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
      // Create a temporary client that doesn't persist session
      // This allows the Admin to register a user without being logged out themselves
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
      });

      const { data, error } = await tempSupabase.auth.signUp({
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
              <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" /> Tạo học viên
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tạo tài khoản học viên mới</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Họ và tên</Label>
                  <Input placeholder="Nguyễn Văn A" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="student@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Mật khẩu</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button 
                  className="w-full" 
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
          <Input placeholder="Tìm theo tên hoặc email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold text-foreground">#</th>
                    <th className="text-left p-3 font-semibold text-foreground">Họ tên</th>
                    <th className="text-left p-3 font-semibold text-foreground">Email</th>
                    <th className="text-center p-3 font-semibold text-foreground">Khóa</th>
                    <th className="text-center p-3 font-semibold text-foreground">Ngày ĐK</th>
                    <th className="text-center p-3 font-semibold text-foreground">Trạng thái</th>
                    <th className="text-center p-3 font-semibold text-foreground">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 text-muted-foreground">{i + 1}</td>
                      <td className="p-3 font-medium text-foreground">{s.full_name ?? "—"}</td>
                      <td className="p-3 text-foreground font-mono text-xs">{s.email ?? "—"}</td>
                      <td className="p-3 text-center text-foreground">{s.courseCount} khóa</td>
                      <td className="p-3 text-center text-muted-foreground">{s.created_at ? new Date(s.created_at).toLocaleDateString("vi-VN") : ""}</td>
                      <td className="p-3 text-center">
                        <Badge className={statusMap[s.status]?.color}>{statusMap[s.status]?.label}</Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button size="icon" variant="ghost" asChild>
                          <Link to={`/admin/students/${s.user_id}`}><Eye className="w-4 h-4" /></Link>
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
