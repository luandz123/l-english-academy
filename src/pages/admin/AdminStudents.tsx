import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Search, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const AdminStudents = () => {
  const [search, setSearch] = useState("");

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
    (s.full_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quản lý Học Viên</h1>
            <p className="text-sm text-muted-foreground">{students.length} học viên</p>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm theo tên..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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
