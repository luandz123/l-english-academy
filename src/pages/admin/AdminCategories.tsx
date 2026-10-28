import AdminLayout from "@/components/AdminLayout";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCategory,
  deleteCategory,
  listAdminCategories,
  listAdminCourses,
  updateCategory,
} from "@/lib/api/catalog";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Layers,
  GraduationCap,
  Headphones,
  FileCheck2,
  Sparkles,
  Compass,
  Award,
  Video,
  Flame,
  Trophy,
  Gamepad2,
  FolderOpen,
  GripVertical,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  parseCategoryIconAndDesc,
  formatCategoryIconAndDesc,
  getCategoryCourseStats,
} from "@/services/homepageShowcaseService";

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  display_order: number | null;
  is_active: boolean | null;
  created_at?: string | null;
}

const PRESET_ICONS = [
  { name: "FileCheck2", label: "Đề thi Full Test", icon: FileCheck2 },
  { name: "Headphones", label: "Luyện nghe / Dictation", icon: Headphones },
  { name: "BookOpen", label: "Sách / Giáo trình", icon: BookOpen },
  { name: "Video", label: "Video bài giảng", icon: Video },
  { name: "Layers", label: "Combo / Đa kỹ năng", icon: Layers },
  { name: "GraduationCap", label: "Lấy gốc / Khóa học", icon: GraduationCap },
  { name: "Sparkles", label: "Từ vựng / Flashcard", icon: Sparkles },
  { name: "Award", label: "Chứng chỉ / Bảng vàng", icon: Award },
  { name: "Compass", label: "Lộ trình học", icon: Compass },
  { name: "Gamepad2", label: "Trò chơi Game", icon: Gamepad2 },
  { name: "Flame", label: "Nổi bật / Cấp tốc", icon: Flame },
  { name: "Trophy", label: "Mục tiêu điểm cao", icon: Trophy },
];

const renderCategoryIcon = (iconRaw?: string | null, className = "w-4 h-4") => {
  const { icon: iconName } = parseCategoryIconAndDesc(iconRaw);
  const match = PRESET_ICONS.find((p) => p.name.toLowerCase() === (iconName || "").toLowerCase());
  if (match) {
    const IconComponent = match.icon;
    return <IconComponent className={className} />;
  }
  return <FolderOpen className={className} />;
};

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

const AdminCategories = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Partial<Category> | null>(null);
  const [categoryDescription, setCategoryDescription] = useState("");
  const [autoSlug, setAutoSlug] = useState(false);

  // Lấy danh sách danh mục
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-course-categories"],
    queryFn: async () => {
      const { data, error } = await listAdminCategories();
      if (error) throw error;
      return (data || []) as Category[];
    },
  });

  // Lấy danh sách khóa học để đếm số lượng khóa học trong từng danh mục (category_id là nguồn sự thật duy nhất)
  const { data: courses = [] } = useQuery({
    queryKey: ["admin-courses-category-count"],
    queryFn: async () => {
      const { data, error } = await listAdminCourses();
      if (error) throw error;
      return data || [];
    },
  });

  const courseCountByCat = getCategoryCourseStats(courses);

  const saveMutation = useMutation({
    mutationFn: async (cat: Partial<Category>) => {
      if (cat.id) {
        const { error } = await updateCategory(cat.id, {
          name: cat.name || "",
          slug: cat.slug || "",
          icon: cat.icon || "BookOpen",
          display_order: cat.display_order ?? 0,
          is_active: cat.is_active ?? true,
        });
        if (error) throw error;
      } else {
        const { error } = await createCategory({
          name: cat.name || "",
          slug: cat.slug || "",
          icon: cat.icon || "BookOpen",
          display_order: cat.display_order ?? (categories.length + 1),
          is_active: cat.is_active ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-categories"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-categories"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-course-categories"] });
      toast({ title: "Đã lưu danh mục thành công" });
      setIsDialogOpen(false);
      setEditingCat(null);
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await deleteCategory(id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-categories"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-categories"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-course-categories"] });
      toast({ title: "Đã xóa danh mục" });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      const cat = categories.find((c) => c.id === id);
      if (!cat) return;
      const { error } = await updateCategory(id, {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon || "BookOpen",
        display_order: cat.display_order ?? 0,
        is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-categories"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-categories"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-course-categories"] });
      toast({ title: "Đã cập nhật trạng thái hiển thị" });
    },
  });

  const handleSave = () => {
    if (!editingCat?.name?.trim()) {
      toast({ title: "Vui lòng nhập tên danh mục", variant: "destructive" });
      return;
    }
    const finalSlug = (editingCat?.slug?.trim() || slugify(editingCat.name)).toLowerCase();
    const rawIcon = editingCat?.icon || "BookOpen";
    const finalIcon = formatCategoryIconAndDesc(rawIcon, categoryDescription);
    saveMutation.mutate({ ...editingCat, slug: finalSlug, icon: finalIcon });
  };

  const openNewDialog = () => {
    setAutoSlug(true);
    setCategoryDescription("");
    setEditingCat({
      name: "",
      slug: "",
      icon: "BookOpen",
      display_order: categories.length + 1,
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (cat: Category) => {
    setAutoSlug(false);
    const { icon, description } = parseCategoryIconAndDesc(cat.icon);
    setEditingCat({ ...cat, icon });
    setCategoryDescription(description);
    setIsDialogOpen(true);
  };

  const handleNameChange = (val: string) => {
    if (!editingCat) return;
    if (autoSlug) {
      setEditingCat({
        ...editingCat,
        name: val,
        slug: slugify(val),
      });
    } else {
      setEditingCat({ ...editingCat, name: val });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground">Quản Lý Danh Mục Khóa Học</h1>
            <p className="text-muted-foreground font-semibold text-sm">
              Các cụm khóa học ngoài trang chủ và loại khóa học khi tạo mới sẽ lấy tự động từ danh mục này.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-xl font-bold">
              <Link to="/" target="_blank">
                <ExternalLink className="w-4 h-4 mr-1.5" /> Xem ngoài trang chủ
              </Link>
            </Button>
            <Button onClick={openNewDialog} className="btn-3d-green font-black rounded-xl active:scale-95 duration-120">
              <Plus className="w-4 h-4 mr-1.5" /> Thêm Danh Mục
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-soft-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs font-black uppercase bg-muted/50 text-muted-foreground border-b border-border/70">
                <tr>
                  <th className="px-4 py-3.5 w-16">Thứ tự</th>
                  <th className="px-4 py-3.5">Tên Danh Mục & Biểu Tượng</th>
                  <th className="px-4 py-3.5">Mã định danh (Slug / Anchor)</th>
                  <th className="px-4 py-3.5 text-center">Số khóa học</th>
                  <th className="px-4 py-3.5 text-center">Hiển thị trang chủ</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <Skeleton className="h-10 w-full mb-2" />
                      <Skeleton className="h-10 w-full" />
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground font-bold">
                      Chưa có danh mục nào. Hãy tạo danh mục đầu tiên!
                    </td>
                  </tr>
                ) : (
                  categories.map((cat, index) => {
                    const stats = courseCountByCat[cat.id] || { total: 0, active: 0 };
                    const { icon: catIcon, description: catDesc } = parseCategoryIconAndDesc(cat.icon);
                    return (
                      <tr
                        key={cat.id}
                        className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-4 font-black text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                            <span>{cat.display_order ?? index + 1}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                              {renderCategoryIcon(catIcon, "w-5 h-5")}
                            </div>
                            <div>
                              <div className="font-black text-foreground text-base">{cat.name}</div>
                              {catDesc ? (
                                <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs mt-0.5" title={catDesc}>
                                  {catDesc}
                                </div>
                              ) : (
                                <div className="text-[11px] text-muted-foreground/70">Icon: {catIcon}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs font-mono font-bold bg-muted px-2.5 py-1 rounded-md text-foreground border border-border/60 inline-block">
                            #{cat.slug}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Link
                            to={`/admin/courses?category=${cat.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-colors"
                          >
                            <span>{stats.total} khóa học</span>
                            {stats.active > 0 && (
                              <span className="text-[10px] text-emerald-500 font-extrabold">({stats.active} bật)</span>
                            )}
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Switch
                              checked={cat.is_active || false}
                              onCheckedChange={(checked) =>
                                toggleStatusMutation.mutate({ id: cat.id, is_active: checked })
                              }
                            />
                            {cat.is_active && stats.active === 0 && (
                              <span className="text-[10px] text-amber-500 dark:text-amber-400 font-semibold leading-tight max-w-[130px] text-center">
                                Ẩn ngoài trang chủ vì chưa có khóa học
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="font-bold h-8 active:scale-95 duration-120 rounded-lg"
                              onClick={() => openEditDialog(cat)}
                            >
                              <Pencil className="w-3.5 h-3.5 mr-1" /> Sửa
                            </Button>
                            {stats.total > 0 ? (
                              <span title="Chuyển các khóa học sang danh mục khác trước khi xóa" className="inline-block">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled
                                  className="font-bold h-8 bg-muted text-muted-foreground/50 opacity-50 cursor-not-allowed rounded-lg border-none"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </span>
                            ) : (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="font-bold h-8 bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-95 duration-120 rounded-lg border-none cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="border border-border/80 shadow-soft-xl rounded-2xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="font-black text-lg">
                                      Xác nhận xóa danh mục?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-muted-foreground">
                                      Bạn có chắc muốn xóa danh mục <strong>"{cat.name}"</strong>?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl font-bold">Hủy</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(cat.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold active:scale-95 duration-120"
                                    >
                                      Xóa danh mục
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DIALOG THÊM / SỬA DANH MỤC */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[520px] border border-border/80 shadow-soft-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">
                {editingCat?.id ? "Sửa Danh Mục Khóa Học" : "Thêm Danh Mục Khóa Học Mới"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-3">
              <div className="grid gap-2">
                <Label className="font-bold text-sm">Tên Danh Mục *</Label>
                <Input
                  value={editingCat?.name || ""}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="VD: Phòng Thi Thử Full Test, Nghe Chép Chính Tả, Combo TOEIC..."
                  className="font-bold text-base rounded-xl"
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-sm">Mã định danh (Slug URL &amp; Anchor) *</Label>
                  <button
                    type="button"
                    onClick={() => setAutoSlug(!autoSlug)}
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    {autoSlug ? "✓ Tự tạo từ tên" : "Nhập thủ công"}
                  </button>
                </div>
                <Input
                  value={editingCat?.slug || ""}
                  onChange={(e) => {
                    setAutoSlug(false);
                    setEditingCat({ ...editingCat, slug: slugify(e.target.value) });
                  }}
                  placeholder="VD: fulltest, listening, toeic-2kn"
                  className="font-mono text-sm rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  Dùng để liên kết cuộn trang ngoài trang chủ: <code className="bg-muted px-1.5 py-0.5 rounded">#section-&#123;slug&#125;</code>
                </p>
              </div>

              {/* CHỌN BIỂU TƯỢNG (ICON PRESETS) */}
              <div className="grid gap-2">
                <Label className="font-bold text-sm">Biểu tượng (Icon)</Label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-2 bg-muted/40 rounded-xl border border-border/70 max-h-36 overflow-y-auto">
                  {PRESET_ICONS.map((preset) => {
                    const isSelected = editingCat?.icon?.toLowerCase() === preset.name.toLowerCase();
                    const IconComp = preset.icon;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setEditingCat({ ...editingCat, icon: preset.name })}
                        className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground font-black shadow-soft-xs scale-105"
                            : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                        }`}
                        title={preset.label}
                      >
                        <IconComp className="w-5 h-5" />
                        <span className="text-[10px] truncate max-w-full">{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Tên icon tuỳ chỉnh:</span>
                  <Input
                    value={editingCat?.icon || ""}
                    onChange={(e) => setEditingCat({ ...editingCat, icon: e.target.value })}
                    placeholder="VD: BookOpen, Video..."
                    className="h-8 font-mono text-xs w-48 rounded-lg"
                  />
                </div>
              </div>

              {/* MÔ TẢ CỤM HIỂN THỊ NGOÀI TRANG CHỦ */}
              <div className="grid gap-2">
                <Label className="font-bold text-sm">Mô tả cụm ngoài trang chủ</Label>
                <Textarea
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  placeholder="VD: 200 câu • 120 phút • Bấm giờ thật • Chấm điểm tự động kèm lời giải chi tiết."
                  rows={2}
                  className="text-xs rounded-xl font-medium"
                />
                <p className="text-[11px] text-muted-foreground">
                  Dòng mô tả hiển thị ngay dưới tiêu đề danh mục trên trang chủ. Nếu để trống sẽ không hiển thị.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="font-bold text-sm">Thứ tự hiển thị</Label>
                  <Input
                    type="number"
                    value={editingCat?.display_order ?? 0}
                    onChange={(e) =>
                      setEditingCat({ ...editingCat, display_order: parseInt(e.target.value) || 0 })
                    }
                    className="font-bold rounded-xl"
                  />
                  <p className="text-[11px] text-muted-foreground">Số nhỏ hơn xếp trước ngoài trang chủ</p>
                </div>

                <div className="flex flex-col justify-between p-3 bg-muted/40 rounded-xl border border-border/70">
                  <Label className="font-bold text-sm cursor-pointer">Trạng thái hiển thị</Label>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {editingCat?.is_active ? "Đang bật" : "Đang ẩn"}
                    </span>
                    <Switch
                      checked={editingCat?.is_active ?? true}
                      onCheckedChange={(c) => setEditingCat({ ...editingCat, is_active: c })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                className="font-bold rounded-xl active:scale-95 duration-120"
                onClick={() => setIsDialogOpen(false)}
              >
                Hủy
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="btn-3d-green font-black rounded-xl active:scale-95 duration-120"
              >
                {saveMutation.isPending ? "Đang lưu..." : "Lưu Danh Mục"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminCategories;

