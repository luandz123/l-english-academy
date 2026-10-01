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
        .select("*, courses(title)")
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      
      const enrollmentsData = data ?? [];
      const userIds = [...new Set(enrollmentsData.map(e => e.user_id))];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      return enrollmentsData.map((e: any) => {
        const now = new Date();
        const expires = e.expires_at ? new Date(e.expires_at) : null;
        const remaining = expires ? Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / 86400000)) : null;
        let status = "active";
        if (expires && remaining === 0) status = "expired";
        else if (expires && remaining !== null && remaining <= 7) status = "expiring";
        
        return { 
          ...e, 
          remaining, 
          status,
          profiles: profiles?.find(p => p.id === e.user_id) || null
        };
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
          <div className="bg-card rounded-2xl border border-border/70 overflow-hidden shadow-soft-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/50 text-xs font-black uppercase text-muted-foreground">
                    <th className="text-left px-4 py-3">Học viên</th>
                    <th className="text-left px-4 py-3">Khóa học</th>
                    <th className="text-center px-4 py-3">Bắt đầu</th>
                    <th className="text-center px-4 py-3">Hết hạn</th>
                    <th className="text-center px-4 py-3">Còn lại</th>
                    <th className="text-center px-4 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e: any) => (
                    <tr key={e.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-foreground">{e.profiles?.full_name ?? "—"}</td>
                      <td className="px-4 py-3.5 text-foreground font-medium">{e.courses?.title ?? "—"}</td>
                      <td className="px-4 py-3.5 text-center text-muted-foreground">{e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString("vi-VN") : ""}</td>
                      <td className="px-4 py-3.5 text-center text-muted-foreground">{e.expires_at ? new Date(e.expires_at).toLocaleDateString("vi-VN") : "Vĩnh viễn"}</td>
                      <td className="px-4 py-3.5 text-center font-bold text-foreground">{e.remaining !== null ? `${e.remaining} ngày` : "∞"}</td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge className={`${statusMap[e.status]?.color} font-bold rounded-lg px-2.5 py-0.5`}>{statusMap[e.status]?.label}</Badge>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground font-semibold">
                        Không có dữ liệu đăng ký nào phù hợp
                      </td>
                    </tr>
                  )}
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
