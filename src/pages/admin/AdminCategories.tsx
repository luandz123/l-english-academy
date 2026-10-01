import AdminLayout from "@/components/AdminLayout";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Save, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  display_order: number | null;
  is_active: boolean | null;
}

const AdminCategories = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Partial<Category> | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-course-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_categories")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (cat: Partial<Category>) => {
      if (cat.id) {
        const { error } = await supabase
          .from("course_categories")
          .update({
            name: cat.name,
            slug: cat.slug,
            icon: cat.icon,
            display_order: cat.display_order,
            is_active: cat.is_active,
          })
          .eq("id", cat.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("course_categories").insert([
          {
            name: cat.name,
            slug: cat.slug,
            icon: cat.icon,
            display_order: cat.display_order,
            is_active: cat.is_active,
          },
        ]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-categories"] });
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
      const { error } = await supabase.from("course_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-categories"] });
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
      const { error } = await supabase
        .from("course_categories")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-categories"] });
      toast({ title: "Đã cập nhật trạng thái" });
    },
  });

  const handleSave = () => {
    if (!editingCat?.name || !editingCat?.slug) {
      toast({ title: "Vui lòng nhập tên và slug", variant: "destructive" });
      return;
    }
    saveMutation.mutate(editingCat);
  };

  const openNewDialog = () => {
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
    setEditingCat(cat);
    setIsDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Quản Lý Danh Mục</h1>
          <p className="text-muted-foreground font-semibold text-sm">
            Quản lý các loại khóa học hiển thị trên trang chủ
          </p>
        </div>
        <Button onClick={openNewDialog} className="btn-3d-green font-black rounded-xl active:scale-95 duration-120">
          <Plus className="w-4 h-4 mr-2" /> Thêm Danh Mục
        </Button>
      </div>

      <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-soft-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs font-black uppercase bg-muted/50 text-muted-foreground border-b border-border/70">
              <tr>
                <th className="px-4 py-3">TT</th>
                <th className="px-4 py-3">Tên Danh Mục</th>
                <th className="px-4 py-3">Slug / Icon</th>
                <th className="px-4 py-3 text-center">Hiển thị</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <Skeleton className="h-10 w-full mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground font-bold">
                    Chưa có danh mục nào. Hãy tạo danh mục đầu tiên!
                  </td>
                </tr>
              ) : (
                categories.map((cat, index) => (
                  <tr
                    key={cat.id}
                    className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-4 font-black text-muted-foreground w-16">
                      <div className="flex items-center gap-1">
                        <GripVertical className="w-4 h-4 text-zinc-300" />
                        {cat.display_order || index + 1}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-black text-foreground">{cat.name}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs font-bold bg-muted px-2 py-1 rounded inline-block text-muted-foreground">
                        {cat.slug}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Icon: {cat.icon || "N/A"}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Switch
                        checked={cat.is_active || false}
                        onCheckedChange={(checked) => toggleStatusMutation.mutate({ id: cat.id, is_active: checked })}
                      />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-bold h-8 active:scale-95 duration-120 rounded-lg"
                          onClick={() => openEditDialog(cat)}
                        >
                          <Pencil className="w-3 h-3 mr-1" /> Sửa
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="font-bold h-8 bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-95 duration-120 rounded-lg border-none cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border border-border/80 shadow-soft-xl rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-black text-lg">Xác nhận xóa danh mục?</AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground">
                                Bạn có chắc muốn xóa danh mục <strong>"{cat.name}"</strong>? Các khóa học thuộc danh mục này sẽ bị mất liên kết phân loại.
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] border border-border/80 shadow-soft-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              {editingCat?.id ? "Sửa Danh Mục" : "Thêm Danh Mục Mới"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="font-bold">Tên Danh Mục</Label>
              <Input
                value={editingCat?.name || ""}
                onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                placeholder="VD: Luyện thi TOEIC"
                className="font-bold"
              />
            </div>
            <div className="grid gap-2">
              <Label className="font-bold">Slug (URL)</Label>
              <Input
                value={editingCat?.slug || ""}
                onChange={(e) => setEditingCat({ ...editingCat, slug: e.target.value })}
                placeholder="VD: toeic"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Phải là duy nhất, viết thường, không dấu, không khoảng trắng.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="font-bold">Icon (Tên Lucide)</Label>
                <Input
                  value={editingCat?.icon || ""}
                  onChange={(e) => setEditingCat({ ...editingCat, icon: e.target.value })}
                  placeholder="VD: BookOpen"
                />
              </div>
              <div className="grid gap-2">
                <Label className="font-bold">Thứ tự</Label>
                <Input
                  type="number"
                  value={editingCat?.display_order || 0}
                  onChange={(e) => setEditingCat({ ...editingCat, display_order: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 p-3 bg-muted rounded-xl border border-border/70">
              <Label className="font-bold cursor-pointer">Trạng thái hiển thị</Label>
              <Switch
                checked={editingCat?.is_active || false}
                onCheckedChange={(c) => setEditingCat({ ...editingCat, is_active: c })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="font-bold rounded-xl active:scale-95 duration-120" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="btn-3d-green font-black rounded-xl active:scale-95 duration-120">
              {saveMutation.isPending ? "Đang lưu..." : "Lưu Thay Đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminCategories;
