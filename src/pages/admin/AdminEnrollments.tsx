import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const AdminEnrollments = () => {
  const [search, setSearch] = useState("");

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["admin-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(title), profiles!inner(full_name)")
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((e: any) => {
        const now = new Date();
        const expires = e.expires_at ? new Date(e.expires_at) : null;
        const remaining = expires ? Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / 86400000)) : null;
        let status = "active";
        if (expires && remaining === 0) status = "expired";
        else if (expires && remaining !== null && remaining <= 7) status = "expiring";
        return { ...e, remaining, status };
      });
    },
  });

  const statusMap: Record<string, { label: string; color: string }> = {
    active: { label: "Còn hạn", color: "bg-success text-success-foreground" },
    expired: { label: "Hết hạn", color: "bg-destructive text-destructive-foreground" },
    expiring: { label: "Sắp hết", color: "bg-warning text-warning-foreground" },
  };

  const filtered = enrollments.filter((e: any) =>
    ((e as any).profiles?.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    ((e as any).courses?.title ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quản lý Đăng Ký</h1>
            <p className="text-sm text-muted-foreground">{enrollments.length} đăng ký</p>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold text-foreground">Học viên</th>
                    <th className="text-left p-3 font-semibold text-foreground">Khóa học</th>
                    <th className="text-center p-3 font-semibold text-foreground">Bắt đầu</th>
                    <th className="text-center p-3 font-semibold text-foreground">Hết hạn</th>
                    <th className="text-center p-3 font-semibold text-foreground">Còn lại</th>
                    <th className="text-center p-3 font-semibold text-foreground">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e: any) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-medium text-foreground">{e.profiles?.full_name ?? "—"}</td>
                      <td className="p-3 text-foreground">{e.courses?.title ?? "—"}</td>
                      <td className="p-3 text-center text-muted-foreground">{e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString("vi-VN") : ""}</td>
                      <td className="p-3 text-center text-muted-foreground">{e.expires_at ? new Date(e.expires_at).toLocaleDateString("vi-VN") : "Vĩnh viễn"}</td>
                      <td className="p-3 text-center text-foreground">{e.remaining !== null ? `${e.remaining} ngày` : "∞"}</td>
                      <td className="p-3 text-center">
                        <Badge className={statusMap[e.status]?.color}>{statusMap[e.status]?.label}</Badge>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Không có dữ liệu</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminEnrollments;
