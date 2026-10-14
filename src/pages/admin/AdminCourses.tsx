import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search, Edit, Eye, Trash2, EyeOff, Unlock, Lock, Loader2, BookOpen, Layers, Filter } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect } from "react";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam || "all");

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [categoryParam]);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("display_order", { ascending: true })
        .order("id", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-course-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_categories")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-active-courses"] });
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
      queryClient.invalidateQueries({ queryKey: ["homepage-active-courses"] });
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
      queryClient.invalidateQueries({ queryKey: ["homepage-active-courses"] });
      toast({ title: "Đã cập nhật chế độ học thử" });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const filtered = courses.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      (selectedCategory === "uncategorized" && !c.category_id) ||
      String(c.category_id) === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const typeLabels: Record<string, string> = {
    video_quiz: "🎬 Video + Quiz",
    flashcard: "🃏 Flashcard",
    listening: "🎧 Dictation / Nghe",
    speaking: "🗣️ Speaking & Writing",
    fulltest: "📋 Full Test 200 câu",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Quản lý Khóa Học"
          description="Danh sách khóa học trên hệ thống. Khóa học được phân nhóm theo danh mục hiển thị ngoài trang chủ."
          icon={BookOpen}
          badge={`${courses.length} Khóa học`}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-xl font-bold shadow-soft-xs" asChild>
                <Link to="/admin/categories">
                  <Layers className="w-4 h-4 mr-2" /> Quản lý danh mục
                </Link>
              </Button>
              <Button className="rounded-xl shadow-soft-sm transition-all duration-120 active:scale-95" asChild>
                <Link to="/admin/courses/new">
                  <Plus className="w-4 h-4 mr-2" /> Tạo khóa học mới
                </Link>
              </Button>
            </div>
          }
        />

        {/* BỘ LỌC TÌM KIẾM VÀ DANH MỤC */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm khóa học..."
              className="pl-9 rounded-xl border-border/70 shadow-soft-xs text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-64">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="rounded-xl border-border/70 font-semibold bg-card shadow-soft-xs">
                <div className="flex items-center gap-2 truncate">
                  <Filter className="w-3.5 h-3.5 text-primary shrink-0" />
                  <SelectValue placeholder="Lọc theo danh mục" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Tất cả danh mục ({courses.length})</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
                <SelectItem value="uncategorized">Chưa phân danh mục</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/70 shadow-soft-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40">
                    <th className="text-left p-3.5 font-bold text-foreground">TT</th>
                    <th className="text-left p-3.5 font-bold text-foreground">Tên khóa học &amp; Mô tả</th>
                    <th className="text-left p-3.5 font-bold text-foreground">Danh mục (Trang chủ)</th>
                    <th className="text-center p-3.5 font-bold text-foreground">Giá</th>
                    <th className="text-center p-3.5 font-bold text-foreground">Thời hạn</th>
                    <th className="text-center p-3.5 font-bold text-foreground">Học thử</th>
                    <th className="text-center p-3.5 font-bold text-foreground">Trạng thái</th>
                    <th className="text-center p-3.5 font-bold text-foreground">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground font-bold">
                        Không tìm thấy khóa học nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c: any, i) => {
                      const cat = c.category_id ? categoryMap.get(c.category_id) : null;
                      return (
                        <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors">
                          <td className="p-3.5 text-muted-foreground font-semibold">{i + 1}</td>
                          <td className="p-3.5 font-bold text-foreground max-w-xs">
                            <div className="truncate text-base">{c.title}</div>
                            {c.subtitle && (
                              <div className="text-xs text-muted-foreground font-normal line-clamp-1 mt-0.5">
                                {c.subtitle}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            {cat ? (
                              <div className="space-y-1">
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold text-xs py-0.5 px-2.5 rounded-lg">
                                  {cat.name}
                                </Badge>
                                <div className="text-[11px] text-muted-foreground font-medium pl-0.5">
                                  {typeLabels[c.course_type] ?? c.course_type}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <Badge variant="secondary" className="text-xs">
                                  Chưa gắn danh mục
                                </Badge>
                                <div className="text-[11px] text-muted-foreground pl-0.5">
                                  {typeLabels[c.course_type] ?? c.course_type}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-center font-bold text-foreground whitespace-nowrap">
                            {c.is_free ? (
                              <span className="text-emerald-500 font-extrabold text-xs">Miễn phí</span>
                            ) : c.price ? (
                              `${c.price.toLocaleString("vi-VN")} đ`
                            ) : (
                              "0 đ"
                            )}
                          </td>
                          <td className="p-3.5 text-center text-muted-foreground whitespace-nowrap">
                            {c.duration_months ? `${c.duration_months} tháng` : "Vĩnh viễn"}
                          </td>
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
                  );
                }))}
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
