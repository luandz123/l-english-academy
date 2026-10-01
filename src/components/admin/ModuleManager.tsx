
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, GripVertical, ChevronDown, ChevronRight, Eye, EyeOff, Unlock, Lock } from "lucide-react";
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-card rounded-2xl border border-border/70 shadow-soft-xs hover:border-border/90 transition-all">
      <div className="p-3.5 sm:p-4 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1.5 hover:bg-muted rounded-lg active:scale-95 duration-120">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={() => toggleExpand(mod.id)} className="flex items-center gap-2 text-left flex-1 active:scale-[0.99] duration-120">
            {expandedModules.has(mod.id) ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <span className={`font-bold text-sm ${mod.is_published === false ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {mod.title}
            </span>
            <span className="text-xs text-muted-foreground font-medium ml-2">
              ({(mod.lessons ?? []).length} bài · {(mod.quizzes ?? []).length} quiz)
            </span>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            size="icon" 
            variant="ghost" 
            className={`h-8 w-8 rounded-xl active:scale-95 duration-120 ${mod.is_free ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-muted-foreground hover:bg-muted/60'}`}
            onClick={(e) => {
              e.stopPropagation();
              const newStatus = !mod.is_free;
              (supabase.from("modules") as any).update({ is_free: newStatus }).eq("id", mod.id).then(({ error }: any) => {
                if (error) {
                  toast({ title: "Lỗi", description: error.message, variant: "destructive" });
                  return;
                }
                queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
                toast({ title: newStatus ? "Đã bật học thử cho module" : "Đã tắt học thử cho module" });
              });
            }}
            title={mod.is_free ? "Module miễn phí (Học viên học thử được)" : "Module trả phí"}
          >
            {mod.is_free ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </Button>
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
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl active:scale-95 duration-120 hover:bg-muted/60" onClick={() => openEdit(mod)}>
            <Edit className="w-4 h-4 text-foreground" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl active:scale-95 duration-120 text-destructive hover:bg-destructive/10" disabled={deleteMutation.isPending}>
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingModule) {
        const { error } = await supabase.from("modules").update({ title: moduleTitle, description: moduleDesc }).eq("id", editingModule.id);
        if (error) throw error;
      } else {
        const maxOrder = modules.length > 0 ? Math.max(...modules.map((m: any) => m.display_order)) + 1 : 0;
        const { error } = await supabase.from("modules").insert({ course_id: courseId, title: moduleTitle, description: moduleDesc, display_order: maxOrder });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      setDialogOpen(false);
      setEditingModule(null);
      setModuleTitle("");
      setModuleDesc("");
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
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingModule(null);
    setModuleTitle("");
    setModuleDesc("");
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-foreground">Modules / Parts</h3>
        <Button size="sm" onClick={openNew} className="btn-3d btn-3d-primary font-bold rounded-xl active:scale-95 duration-120">
          <Plus className="w-4 h-4 mr-1.5" /> Thêm Part
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl border-border/80 shadow-soft-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">{editingModule ? "Sửa Module" : "Tạo Module mới"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-foreground">Tên module (Part) (*)</Label>
              <Input className="rounded-xl border-border/80" value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} placeholder="VD: Part 1 - Photographs" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-foreground">Mô tả</Label>
              <Input className="rounded-xl border-border/80" value={moduleDesc} onChange={(e) => setModuleDesc(e.target.value)} placeholder="Mô tả ngắn..." />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl font-semibold active:scale-95 duration-120" onClick={() => setDialogOpen(false)}>
                Hủy
              </Button>
              <Button className="flex-1 btn-3d btn-3d-primary font-bold rounded-xl active:scale-95 duration-120" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !moduleTitle.trim()}>
                {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModuleManager;
