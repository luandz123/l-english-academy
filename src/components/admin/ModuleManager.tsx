
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import LessonManager from "./LessonManager";

interface ModuleManagerProps {
  courseId: number;
  modules: any[];
}

const ModuleManager = ({ courseId, modules }: ModuleManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingModule, setEditingModule] = useState<any>(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDesc, setModuleDesc] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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

      {modules.map((mod: any) => (
        <div key={mod.id} className="bg-card rounded-xl border">
          <div className="p-3 border-b flex items-center justify-between">
            <button onClick={() => toggleExpand(mod.id)} className="flex items-center gap-2 text-left flex-1">
              {expandedModules.has(mod.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-sm text-foreground">{mod.title}</span>
              <span className="text-xs text-muted-foreground ml-2">
                ({(mod.lessons ?? []).length} bài · {(mod.quizzes ?? []).length} quiz)
              </span>
            </button>
            <div className="flex gap-1">
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
      ))}

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
