import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Plus, Search, Edit, Eye, Trash2, EyeOff, Unlock, Lock, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
      toast({ title: "Đã xóa khóa học thành công" });
    },
    onError: (error: any) => {
      toast({ title: "Không thể xóa khóa học", description: getFriendlyErrorMessage(error), variant: "destructive" });
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
          <Button className="rounded-xl shadow-soft-sm transition-all duration-120 active:scale-95" asChild>
            <Link to="/admin/courses/new"><Plus className="w-4 h-4 mr-2" /> Tạo khóa học mới</Link>
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm khóa học..." className="pl-9 rounded-xl border-border/70 shadow-soft-xs text-base" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                    <th className="text-left p-3.5 font-bold text-foreground">Tên khóa học</th>
                    <th className="text-left p-3.5 font-bold text-foreground">Loại</th>
                    <th className="text-center p-3.5 font-bold text-foreground">Giá</th>
                    <th className="text-center p-3.5 font-bold text-foreground">Thời hạn</th>
                    <th className="text-center p-3.5 font-bold text-foreground">Học thử</th>
                    <th className="text-center p-3.5 font-bold text-foreground">Trạng thái</th>
                    <th className="text-center p-3.5 font-bold text-foreground">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c: any, i) => (
                    <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="p-3.5 text-muted-foreground font-semibold">{i + 1}</td>
                      <td className="p-3.5 font-bold text-foreground">{c.title}</td>
                      <td className="p-3.5 text-muted-foreground">{typeEmoji[c.course_type] ?? c.course_type}</td>
                      <td className="p-3.5 text-center font-bold text-foreground">{c.price ? `${c.price.toLocaleString()}đ` : "Miễn phí"}</td>
                      <td className="p-3.5 text-center text-muted-foreground">{c.duration_months ? `${c.duration_months} tháng` : "Vĩnh viễn"}</td>
                      <td className="p-3.5 text-center">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className={`h-8 w-8 rounded-xl transition-all duration-120 active:scale-95 ${c.is_free ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-muted-foreground'}`}
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
                        <div className="flex items-center justify-center gap-1.5">
                          <Button size="icon" variant="ghost" className="rounded-xl h-8 w-8 hover:bg-muted transition-all duration-120 active:scale-95" asChild>
                            <Link to={`/admin/courses/${c.id}`}><Edit className="w-4 h-4 text-primary" /></Link>
                          </Button>
                          <Button size="icon" variant="ghost" className="rounded-xl h-8 w-8 hover:bg-muted transition-all duration-120 active:scale-95" asChild>
                            <Link to={c.course_type === 'fulltest' ? `/courses/${c.id}/fulltest` : c.course_type === 'flashcard' ? `/courses/${c.id}/vocab` : `/courses/${c.id}/learn`} target="_blank"><Eye className="w-4 h-4 text-muted-foreground" /></Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="rounded-xl h-8 w-8 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all duration-120 active:scale-95" disabled={deleteMutation.isPending}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Xác nhận xóa khóa học?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bạn có chắc chắn muốn xóa khóa học <strong>"{c.title}"</strong>? Toàn bộ các module, bài học và kết quả bài tập của học viên thuộc khóa học này sẽ bị gỡ bỏ vĩnh viễn.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(c.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deleteMutation.isPending ? "Đang xóa..." : "Xóa vĩnh viễn"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
