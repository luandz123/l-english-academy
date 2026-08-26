
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, GripVertical, ChevronDown, ChevronRight, Eye, EyeOff, Unlock, Lock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LessonManager from "./LessonManager";
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
    <div ref={setNodeRef} style={style} className="bg-card rounded-xl border">
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={() => toggleExpand(mod.id)} className="flex items-center gap-2 text-left flex-1">
            {expandedModules.has(mod.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className={`font-semibold text-sm ${mod.is_published === false ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {mod.title}
            </span>
            <span className="text-xs text-muted-foreground ml-2">
              ({(mod.lessons ?? []).length} bài · {(mod.quizzes ?? []).length} quiz)
            </span>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            size="icon" 
            variant="ghost" 
            className={`h-8 w-8 ${mod.is_free ? 'text-emerald-600' : 'text-muted-foreground'}`}
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
            title={mod.is_free ? "Module miễn phí" : "Module trả phí"}
          >
            {mod.is_free ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className={`h-8 w-8 ${mod.is_published === false ? 'text-muted-foreground' : 'text-primary'}`}
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
          <Button size="icon" variant="ghost" onClick={() => openEdit(mod)}><Edit className="w-4 h-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Xóa module này?")) deleteMutation.mutate(mod.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
        </div>
      </div>
      {expandedModules.has(mod.id) && (
        <div className="p-3">
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
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      toast({ title: "Đã xóa module" });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
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
        <h3 className="text-sm font-semibold text-foreground">Modules / Parts</h3>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Thêm Part</Button>
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

      {modules.length === 0 && <p className="text-sm text-muted-foreground">Chưa có module nào. Hãy tạo Part đầu tiên.</p>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModule ? "Sửa Module" : "Tạo Module mới"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tên module (Part)</Label>
              <Input value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} placeholder="VD: Part 1 - Photographs" />
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Input value={moduleDesc} onChange={(e) => setModuleDesc(e.target.value)} placeholder="Mô tả ngắn..." />
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !moduleTitle.trim()}>
              {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModuleManager;
