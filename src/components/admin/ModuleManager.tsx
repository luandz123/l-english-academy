import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, GripVertical, ChevronDown, ChevronRight, Eye, EyeOff, Unlock, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LessonManager from "./LessonManager";
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ModuleManagerProps {
  courseId: number;
  modules: any[];
}

const SortableModuleItem = ({
  mod,
  expandedModules,
  toggleExpand,
  openEdit,
  deleteMutation,
  courseId,
  queryClient,
  toast,
}: {
  mod: any;
  expandedModules: Set<number>;
  toggleExpand: (id: number) => void;
  openEdit: (mod: any) => void;
  deleteMutation: any;
  courseId: number;
  queryClient: any;
  toast: any;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: mod.id,
  });

  const [isUpdatingFree, setIsUpdatingFree] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const handleToggleFree = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUpdatingFree(true);
    const newStatus = !mod.is_free;
    try {
      const { error } = await (supabase.from("modules") as any).update({ is_free: newStatus }).eq("id", mod.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      toast({
        title: newStatus ? "🟢 Đã mở học thử cho module" : "🔒 Đã khóa module (Yêu cầu PRO)",
        description: `Module "${mod.title}" hiện ${newStatus ? "cho phép học viên học thử miễn phí" : "yêu cầu học viên đăng ký PRO"}.`
      });
    } catch (error: any) {
      toast({ title: "Lỗi cập nhật", description: error.message, variant: "destructive" });
    } finally {
      setIsUpdatingFree(false);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-card rounded-2xl border border-border/70 shadow-soft-xs hover:border-border/90 transition-all">
      <div className="p-3.5 sm:p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1.5 hover:bg-muted rounded-lg active:scale-95 duration-120">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={() => toggleExpand(mod.id)} className="flex items-center gap-2 text-left flex-1 min-w-0 active:scale-[0.99] duration-120">
            {expandedModules.has(mod.id) ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
            <span className={`font-bold text-sm truncate ${mod.is_published === false ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {mod.title}
            </span>
            <span className="text-xs text-muted-foreground font-medium shrink-0 ml-1">
              ({(mod.lessons ?? []).length} bài · {(mod.quizzes ?? []).length} quiz)
            </span>
          </button>
        </div>

        <div className="flex items-center flex-wrap gap-2 shrink-0 justify-end">
          {/* Badge trạng thái rõ ràng */}
          {mod.is_free ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <Unlock className="w-3.5 h-3.5" /> FREE (Học thử)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              <Lock className="w-3.5 h-3.5" /> PRO (Khóa)
            </span>
          )}

          {/* Nút Toggle Free/Pro trực tiếp có label */}
          <Button
            size="sm"
            variant="outline"
            disabled={isUpdatingFree}
            className={`h-8 px-2.5 text-xs font-bold rounded-xl active:scale-95 duration-120 ${
              mod.is_free
                ? "border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                : "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
            }`}
            onClick={handleToggleFree}
            title={mod.is_free ? "Bấm để khóa lại (yêu cầu PRO)" : "Bấm để mở học thử miễn phí"}
          >
            {isUpdatingFree ? (
              "..."
            ) : mod.is_free ? (
              <>
                <Lock className="w-3.5 h-3.5 mr-1 text-amber-500" /> Khóa PRO
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Mở FREE
              </>
            )}
          </Button>

          {/* Nút Ẩn/Hiện */}
          <Button 
            size="icon" 
            variant="ghost" 
            className={`h-8 w-8 rounded-xl active:scale-95 duration-120 ${mod.is_published === false ? 'text-muted-foreground hover:bg-muted/60' : 'text-primary bg-primary/10'}`}
            onClick={(e) => {
              e.stopPropagation();
              const newStatus = mod.is_published === false ? true : false;
              supabase.from("modules").update({ is_published: newStatus } as any).eq("id", mod.id).then(({ error }: any) => {
                if (error) {
                  toast({ title: "Lỗi", description: error.message, variant: "destructive" });
                  return;
                }
                queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
                toast({ title: newStatus ? "Đã hiện module" : "Đã ẩn module" });
              });
            }}
            title={mod.is_published === false ? "Hiện module" : "Ẩn module"}
          >
            {mod.is_published === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>

          {/* Sửa thông tin module */}
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl active:scale-95 duration-120 hover:bg-muted/60" onClick={() => openEdit(mod)} title="Chỉnh sửa module">
            <Edit className="w-4 h-4 text-foreground" />
          </Button>

          {/* Xóa module */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl active:scale-95 duration-120 text-destructive hover:bg-destructive/10" disabled={deleteMutation.isPending} title="Xóa module">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl border-border/80 shadow-soft-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg font-bold">Xác nhận xóa module?</AlertDialogTitle>
                <AlertDialogDescription>
                  Bạn có chắc muốn xóa module <strong>"{mod.title}"</strong>? Toàn bộ bài học, video và câu hỏi trắc nghiệm bên trong module này cũng sẽ bị xóa vĩnh viễn.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel className="rounded-xl font-semibold">Hủy bỏ</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate(mod.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold active:scale-95 duration-120"
                >
                  {deleteMutation.isPending ? "Đang xóa..." : "Xóa vĩnh viễn"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {expandedModules.has(mod.id) && (
        <div className="p-3.5 sm:p-4">
          <LessonManager moduleId={mod.id} courseId={courseId} lessons={mod.lessons ?? []} quizzes={mod.quizzes ?? []} />
        </div>
      )}
    </div>
  );
};

const ModuleManager = ({ courseId, modules }: ModuleManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingModule, setEditingModule] = useState<any>(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDesc, setModuleDesc] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleExpand = (id: number) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = modules.findIndex((m: any) => m.id === active.id);
    const newIndex = modules.findIndex((m: any) => m.id === over.id);
    const reordered = arrayMove(modules, oldIndex, newIndex);

    // Optimistic update
    queryClient.setQueryData(["admin-course-modules", courseId], reordered);

    // Save to DB
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from("modules").update({ display_order: i }).eq("id", reordered[i].id);
    }
    queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
    toast({ title: "Đã sắp xếp lại" });
  };

  // Preset 1 chạm: Mở Part 1 miễn phí, khóa toàn bộ các Part còn lại yêu cầu PRO
  const quickConfigMutation = useMutation({
    mutationFn: async () => {
      if (!modules || modules.length === 0) throw new Error("Chưa có module nào để cấu hình");

      // Tìm module Part 1 (theo title hoặc display_order nhỏ nhất)
      const part1Module = modules.find((m: any) => {
        const title = (m.title || "").toLowerCase();
        return (
          title.includes("part 1") ||
          title.includes("part1") ||
          title.includes("mô tả tranh")
        );
      }) || modules[0];

      for (const m of modules) {
        const shouldBeFree = m.id === part1Module.id;
        const { error } = await (supabase.from("modules") as any)
          .update({ is_free: shouldBeFree })
          .eq("id", m.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      toast({
        title: "⚡ Đã cấu hình phân quyền thành công! 🎉",
        description: "Chỉ Part 1 (Mô tả tranh) mở học thử miễn phí. Tất cả các Part 2, 3, 4, 5, 6, 7 đã được khóa yêu cầu gói PRO.",
      });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi cấu hình", description: getFriendlyErrorMessage(error), variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingModule) {
        const { error } = await (supabase.from("modules") as any).update({
          title: moduleTitle,
          description: moduleDesc,
          is_free: isFree,
        }).eq("id", editingModule.id);
        if (error) throw error;
      } else {
        const maxOrder = modules.length > 0 ? Math.max(...modules.map((m: any) => m.display_order)) + 1 : 0;
        const { error } = await (supabase.from("modules") as any).insert({
          course_id: courseId,
          title: moduleTitle,
          description: moduleDesc,
          is_free: isFree,
          display_order: maxOrder,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      setDialogOpen(false);
      setEditingModule(null);
      setModuleTitle("");
      setModuleDesc("");
      setIsFree(false);
      toast({ title: editingModule ? "Đã cập nhật module" : "Đã tạo module" });
    },
    onError: (error: any) => {
      toast({ title: "Không thể lưu module", description: getFriendlyErrorMessage(error), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      toast({ title: "Đã xóa module thành công" });
    },
    onError: (error: any) => {
      toast({ title: "Không thể xóa module", description: getFriendlyErrorMessage(error), variant: "destructive" });
    },
  });

  const openEdit = (mod: any) => {
    setEditingModule(mod);
    setModuleTitle(mod.title);
    setModuleDesc(mod.description || "");
    setIsFree(Boolean(mod.is_free));
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingModule(null);
    setModuleTitle("");
    setModuleDesc("");
    setIsFree(false);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Banner cấu hình nhanh học phí */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-cyan-500/10 to-indigo-500/10 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-soft-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-extrabold text-foreground">
              Phân quyền học phí: Miễn Phí (Free) vs Trả Phí (PRO)
            </h4>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            Bạn có thể bật/tắt từng Part riêng lẻ ở danh sách bên dưới, hoặc bấm nút bên cạnh để tự động cấu hình chuẩn.
          </p>
        </div>

        <Button
          size="sm"
          disabled={quickConfigMutation.isPending || modules.length === 0}
          onClick={() => quickConfigMutation.mutate()}
          className="btn-3d bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs h-9 px-4 shrink-0 active:scale-95 shadow-md shadow-orange-500/15"
        >
          {quickConfigMutation.isPending ? (
            "Đang áp dụng..."
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-white" />
              Thiết Lập Chuẩn: Chỉ Mở Part 1, Khóa Part 2-7 (PRO)
            </>
          )}
        </Button>
      </div>

      <div className="flex items-center justify-between pt-1">
        <h3 className="text-base font-bold text-foreground">Danh sách Modules / Parts ({modules.length})</h3>
        <Button size="sm" onClick={openNew} className="btn-3d btn-3d-primary font-bold rounded-xl active:scale-95 duration-120">
          <Plus className="w-4 h-4 mr-1.5" /> Thêm Part Mới
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={modules.map((m: any) => m.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {modules.map((mod: any) => (
              <SortableModuleItem
                key={mod.id}
                mod={mod}
                expandedModules={expandedModules}
                toggleExpand={toggleExpand}
                openEdit={openEdit}
                deleteMutation={deleteMutation}
                courseId={courseId}
                queryClient={queryClient}
                toast={toast}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {modules.length === 0 && (
        <div className="p-8 text-center text-muted-foreground border border-dashed border-border/70 rounded-2xl bg-muted/10">
          <p className="font-semibold text-foreground">Chưa có module nào</p>
          <p className="text-xs text-muted-foreground mt-1">Hãy tạo Part đầu tiên để thêm bài học và bài tập trắc nghiệm.</p>
        </div>
      )}

      {/* Modal Thêm & Sửa Module */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl border-border/80 shadow-soft-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {editingModule ? "Sửa Thông Tin Module" : "Tạo Module Mới"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-foreground">Tên module (Part) (*)</Label>
              <Input
                className="rounded-xl border-border/80 font-bold"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                placeholder="VD: PART 1: Mô tả tranh (6 câu)"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-foreground">Mô tả ngắn</Label>
              <Input
                className="rounded-xl border-border/80"
                value={moduleDesc}
                onChange={(e) => setModuleDesc(e.target.value)}
                placeholder="Mô tả nội dung kiến thức..."
              />
            </div>

            {/* Phân quyền học phí: Miễn phí hay PRO */}
            <div className="space-y-2 p-3.5 rounded-xl border border-border/80 bg-muted/20">
              <Label className="text-sm font-bold text-foreground flex items-center justify-between">
                <span>Chế độ học phí</span>
                {isFree ? (
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                    🟢 Học thử (Free)
                  </span>
                ) : (
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                    🔒 Yêu cầu gói PRO
                  </span>
                )}
              </Label>
              <Select value={isFree ? "free" : "pro"} onValueChange={(v) => setIsFree(v === "free")}>
                <SelectTrigger className="rounded-xl border-border/80 font-semibold bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="pro" className="font-semibold text-amber-600 dark:text-amber-400">
                    🔒 Khóa trả phí — Học viên phải đăng ký gói PRO mới được học
                  </SelectItem>
                  <SelectItem value="free" className="font-semibold text-emerald-600 dark:text-emerald-400">
                    🟢 Học thử miễn phí — Mọi học viên đều được vào học & làm bài
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isFree
                  ? "Tất cả học viên (kể cả chưa mua khóa học) đều được xem video, đọc PDF và làm bài tập của Part này."
                  : "Chỉ học viên đã ghi danh hoặc có gói PRO mới mở được nội dung. Học viên chưa mua sẽ thấy màn hình Khóa PRO."}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl font-semibold active:scale-95 duration-120" onClick={() => setDialogOpen(false)}>
                Hủy
              </Button>
              <Button className="flex-1 btn-3d btn-3d-primary font-bold rounded-xl active:scale-95 duration-120" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !moduleTitle.trim()}>
                {saveMutation.isPending ? "Đang lưu..." : "Lưu Thay Đổi"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModuleManager;
