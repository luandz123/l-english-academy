import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Plus, Search, Edit, Eye, Trash2, EyeOff, Unlock, Lock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const AdminCourses = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Đã xóa khóa học" });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const { error } = await supabase.from("courses").update({ is_active: isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Đã cập nhật trạng thái khóa học" });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const toggleFreeMutation = useMutation({
    mutationFn: async ({ id, isFree }: { id: number; isFree: boolean }) => {
      const { error } = await (supabase.from("courses") as any).update({ is_free: isFree }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Đã cập nhật chế độ học thử" });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const typeEmoji: Record<string, string> = {
    video_quiz: "🎬 Video", flashcard: "🃏 Flashcard", listening: "🎧 Listening",
    speaking: "🗣️ Speaking", fulltest: "📋 Full Test",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quản lý Khóa Học</h1>
            <p className="text-sm text-muted-foreground">{courses.length} khóa học</p>
          </div>
          <Button asChild><Link to="/admin/courses/new"><Plus className="w-4 h-4 mr-2" /> Tạo khóa học mới</Link></Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm khóa học..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                    <th className="text-left p-3 font-semibold text-foreground">Tên khóa học</th>
                    <th className="text-left p-3 font-semibold text-foreground">Loại</th>
                    <th className="text-center p-3 font-semibold text-foreground">Giá</th>
                    <th className="text-center p-3 font-semibold text-foreground">Thời hạn</th>
                    <th className="text-center p-3 font-semibold text-foreground">Học thử</th>
                    <th className="text-center p-3 font-semibold text-foreground">Trạng thái</th>
                    <th className="text-center p-3 font-semibold text-foreground">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c: any, i) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 text-muted-foreground">{i + 1}</td>
                      <td className="p-3 font-medium text-foreground">{c.title}</td>
                      <td className="p-3 text-muted-foreground">{typeEmoji[c.course_type] ?? c.course_type}</td>
                      <td className="p-3 text-center text-foreground">{c.price ? `${c.price.toLocaleString()}đ` : "Miễn phí"}</td>
                      <td className="p-3 text-center text-muted-foreground">{c.duration_months ? `${c.duration_months} tháng` : "Vĩnh viễn"}</td>
                      <td className="p-3 text-center">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className={`h-8 w-8 ${c.is_free ? 'text-emerald-600' : 'text-muted-foreground'}`}
                          onClick={() => toggleFreeMutation.mutate({ id: c.id, isFree: !c.is_free })}
                          title={c.is_free ? "Khóa học miễn phí" : "Khóa học trả phí"}
                        >
                          {c.is_free ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </Button>
                      </td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => toggleActiveMutation.mutate({ id: c.id, isActive: !c.is_active })}
                          className="hover:scale-105 transition-transform"
                        >
                          <Badge variant={c.is_active ? "default" : "secondary"} className={c.is_active ? "bg-emerald-500 text-white" : ""}>
                            {c.is_active ? "Hoạt động" : "Tạm dừng"}
                          </Badge>
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="icon" variant="ghost" asChild>
                            <Link to={`/admin/courses/${c.id}`}><Edit className="w-4 h-4" /></Link>
                          </Button>
                          <Button size="icon" variant="ghost" asChild>
                            <Link to={`/courses/${c.id}`}><Eye className="w-4 h-4" /></Link>
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(c.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
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

export default AdminCourses;
