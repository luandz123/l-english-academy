import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Upload, Trash2, FileText, Image, Music } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const typeIcon: Record<string, any> = { pdf: FileText, image: Image, audio: Music, jpg: Image, png: Image, mp3: Music };

const AdminMaterials = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["admin-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("*, courses(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-materials"] });
      toast({ title: "Đã xóa tài liệu" });
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `uploads/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("materials").upload(path, file);
    if (uploadErr) { toast({ title: "Lỗi upload", description: uploadErr.message, variant: "destructive" }); return; }
    const { data: urlData } = supabase.storage.from("materials").getPublicUrl(path);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const fileType = ["mp3", "wav"].includes(ext) ? "audio" : ["jpg", "jpeg", "png", "gif"].includes(ext) ? "image" : "pdf";
    const { error: insertErr } = await supabase.from("materials").insert({
      title: file.name, file_url: urlData.publicUrl, file_type: fileType,
    });
    if (insertErr) { toast({ title: "Lỗi", description: insertErr.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["admin-materials"] });
    toast({ title: "Đã upload tài liệu" });
  };

  const filtered = materials.filter((m: any) => m.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quản lý Tài Liệu</h1>
          <p className="text-sm text-muted-foreground">{materials.length} tài liệu</p>
        </div>

        <div className="bg-card rounded-xl border-2 border-dashed p-8 text-center space-y-3">
          <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Kéo thả file vào đây hoặc click để chọn</p>
          <p className="text-xs text-muted-foreground">PDF, JPG, PNG, MP3 · Tối đa 20MB/file</p>
          <Button variant="outline" asChild>
            <label className="cursor-pointer">
              Chọn file
              <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png,.mp3,.mp4" />
            </label>
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm tài liệu..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((m: any) => {
              const Icon = typeIcon[m.file_type as string] || FileText;
              return (
                <div key={m.id} className="bg-card rounded-xl border p-4 space-y-3 group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{(m.file_type ?? "").toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{m.created_at ? new Date(m.created_at).toLocaleDateString("vi-VN") : ""}</p>
                    </div>
                  </div>
                  {m.courses?.title && <p className="text-xs text-muted-foreground">📎 {m.courses.title}</p>}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" asChild>
                      <a href={m.file_url} target="_blank" rel="noopener noreferrer"><FileText className="w-3 h-3" /></a>
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(m.id)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground col-span-3 text-center py-8">Chưa có tài liệu</p>}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminMaterials;
