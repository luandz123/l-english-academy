import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Upload, Trash2, FileText, Image, Music, FolderPlus, Folder, FolderOpen, ChevronRight, Copy, ArrowLeft, Home, Edit } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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

const typeIcon: Record<string, any> = { pdf: FileText, image: Image, audio: Music, jpg: Image, png: Image, mp3: Music, video: FileText };

const AdminMaterials = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [currentPath, setCurrentPath] = useState("/");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<{ oldName: string; oldPath: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");

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
      toast({ title: "Đã xóa tài liệu thành công" });
    },
    onError: (error: any) => {
      toast({ title: "Không thể xóa tài liệu", description: getFriendlyErrorMessage(error), variant: "destructive" });
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: async ({ oldPath, newPath }: { oldPath: string; newPath: string }) => {
      const { data: toUpdate } = await supabase.from("materials").select("id, folder_path");
      if (!toUpdate) return;

      for (const item of toUpdate) {
        const fp = item.folder_path || "";
        if (fp === oldPath || fp.startsWith(oldPath + "/")) {
          const updatedPath = fp.replace(oldPath, newPath);
          await supabase.from("materials").update({ folder_path: updatedPath }).eq("id", item.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-materials"] });
      toast({ title: "Đã đổi tên thư mục" });
    },
    onError: (error: any) => {
      toast({ title: "Không thể đổi tên thư mục", description: getFriendlyErrorMessage(error), variant: "destructive" });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderPath: string) => {
      const { data: toDelete } = await supabase.from("materials").select("id, folder_path");
      if (!toDelete) return;

      const idsToDelete = toDelete
        .filter(item => {
          const fp = item.folder_path || "";
          return fp === folderPath || fp.startsWith(folderPath + "/");
        })
        .map(item => item.id);

      if (idsToDelete.length > 0) {
        await supabase.from("materials").delete().in("id", idsToDelete);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-materials"] });
      toast({ title: "Đã xóa thư mục và các file bên trong" });
    },
    onError: (error: any) => {
      toast({ title: "Không thể xóa thư mục", description: getFriendlyErrorMessage(error), variant: "destructive" });
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    let successCount = 0;
    toast({ title: "Đang tải lên...", description: `Đang tải ${files.length} file lên server` });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Try to get relative path from webkitRelativePath (folder upload)
      const relativePath = (file as any).webkitRelativePath || "";
      let folderPath = currentPath;
      
      if (relativePath) {
        // Extract folder structure from relative path
        const parts = relativePath.split("/");
        if (parts.length > 1) {
          const folderParts = parts.slice(0, -1);
          folderPath = currentPath === "/" ? `/${folderParts.join("/")}` : `${currentPath}/${folderParts.join("/")}`;
        }
      }

      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
      const path = `uploads/${Date.now()}_${i}_${sanitizedName}`;
      const { error: uploadErr } = await supabase.storage.from("materials").upload(path, file);
      if (uploadErr) {
        toast({ title: "Lỗi upload", description: uploadErr.message, variant: "destructive" });
        continue;
      }
      
      const { data: urlData } = supabase.storage.from("materials").getPublicUrl(path);
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
      const fileType = ["mp3", "wav", "ogg", "m4a"].includes(ext) ? "audio" : ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext) ? "image" : ["mp4", "webm", "mov"].includes(ext) ? "video" : "pdf";
      
      const { error: insertErr } = await supabase.from("materials").insert({
        title: file.name, file_url: urlData.publicUrl, file_type: fileType,
        folder_path: folderPath,
      });
      
      if (!insertErr) successCount++;
    }
    
    queryClient.invalidateQueries({ queryKey: ["admin-materials"] });
    toast({ title: "Đã tải xong", description: `Upload thành công ${successCount}/${files.length} tài liệu` });
    e.target.value = '';
  };

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    // We don't need to persist folders as rows - they're virtual, derived from folder_path
    setCurrentPath(currentPath === "/" ? `/${newFolderName.trim()}` : `${currentPath}/${newFolderName.trim()}`);
    setNewFolderOpen(false);
    setNewFolderName("");
    toast({ title: "Đã tạo thư mục", description: `Upload file vào thư mục này để lưu.` });
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Đã copy link", description: "Bạn có thể dán link này vào file CSV Excel." });
  };

  // Compute folder structure
  const allFolders = useMemo(() => {
    const folders = new Set<string>();
    materials.forEach((m: any) => {
      const fp = m.folder_path || "/";
      if (fp !== "/") {
        // Add all parent paths
        const parts = fp.split("/").filter(Boolean);
        let acc = "";
        for (const part of parts) {
          acc += `/${part}`;
          folders.add(acc);
        }
      }
    });
    return folders;
  }, [materials]);

  // Get subfolders of current path
  const subFolders = useMemo(() => {
    const subs = new Set<string>();
    allFolders.forEach(f => {
      if (currentPath === "/") {
        // Direct children of root
        const match = f.match(/^\/([^/]+)$/);
        if (match) subs.add(match[1]);
      } else {
        const prefix = currentPath + "/";
        if (f.startsWith(prefix)) {
          const remaining = f.slice(prefix.length);
          const firstPart = remaining.split("/")[0];
          if (firstPart) subs.add(firstPart);
        }
      }
    });
    return Array.from(subs).sort();
  }, [allFolders, currentPath]);

  // Filter materials in current folder
  const currentFolderMaterials = useMemo(() => {
    return materials.filter((m: any) => {
      const fp = m.folder_path || "/";
      return fp === currentPath;
    });
  }, [materials, currentPath]);

  const filtered = search
    ? materials.filter((m: any) => m.title.toLowerCase().includes(search.toLowerCase()))
    : currentFolderMaterials;

  const breadcrumbs = currentPath === "/" ? ["/"] : ["/", ...currentPath.split("/").filter(Boolean)];

  const navigateToFolder = (folderName: string) => {
    setCurrentPath(currentPath === "/" ? `/${folderName}` : `${currentPath}/${folderName}`);
  };

  const navigateUp = () => {
    if (currentPath === "/") return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length === 0 ? "/" : `/${parts.join("/")}`);
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === 0) {
      setCurrentPath("/");
    } else {
      const parts = currentPath.split("/").filter(Boolean);
      setCurrentPath(`/${parts.slice(0, index).join("/")}`);
    }
  };

  const folderFileCount = (folderName: string) => {
    const prefix = currentPath === "/" ? `/${folderName}` : `${currentPath}/${folderName}`;
    return materials.filter((m: any) => {
      const fp = m.folder_path || "/";
      return fp === prefix || fp.startsWith(prefix + "/");
    }).length;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quản lý Kho Tài Liệu / Media</h1>
          <p className="text-sm text-muted-foreground">{materials.length} tài liệu</p>
        </div>

        {/* Upload area */}
        <div className="bg-card rounded-2xl border border-dashed border-border/80 p-8 text-center space-y-3 relative overflow-hidden shadow-soft-xs hover:border-primary/50 transition-colors">
          <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold text-foreground">Kéo thả TẤT CẢ TẬP TIN ảnh / audio vào đây hoặc click để chọn hàng loạt</p>
          <p className="text-xs text-muted-foreground">
            Đang upload vào: <strong className="text-foreground">{currentPath}</strong> · PDF, JPG, PNG, MP3, MP4
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button variant="outline" className="font-bold rounded-xl active:scale-95 duration-120 shadow-soft-xs" asChild>
              <label className="cursor-pointer">
                Chọn nhiều file
                <input type="file" multiple className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png,.gif,.mp3,.wav,.mp4,.webm,.svg,.ogg,.m4a,.webp" />
              </label>
            </Button>
            <Button variant="outline" className="font-bold rounded-xl active:scale-95 duration-120 shadow-soft-xs" asChild>
              <label className="cursor-pointer">
                <Folder className="w-4 h-4 mr-1" />
                Upload thư mục
                <input type="file" className="hidden" onChange={handleUpload} {...{ webkitdirectory: "", directory: "", multiple: true } as any} />
              </label>
            </Button>
            <Button variant="outline" className="font-bold rounded-xl active:scale-95 duration-120 shadow-soft-xs" onClick={() => setNewFolderOpen(true)}>
              <FolderPlus className="w-4 h-4 mr-1" /> Tạo thư mục
            </Button>
          </div>
        </div>

        {/* Breadcrumb + Search */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1 text-sm">
            {currentPath !== "/" && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={navigateUp}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center">
                {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground mx-1" />}
                <button
                  onClick={() => navigateToBreadcrumb(i)}
                  className={`hover:text-primary transition-colors ${
                    i === breadcrumbs.length - 1 ? "font-semibold text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {crumb === "/" ? <Home className="w-4 h-4 inline" /> : crumb}
                </button>
              </span>
            ))}
          </div>
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Tìm tài liệu..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>
        ) : (
          <>
            {/* Folders */}
            {!search && subFolders.length > 0 && (
              <div className="grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {subFolders.map((folder) => {
                  const fullPath = currentPath === "/" ? `/${folder}` : `${currentPath}/${folder}`;
                  return (
                    <div key={folder} className="group relative">
                      <button
                        onClick={() => navigateToFolder(folder)}
                        className="w-full bg-card rounded-2xl border border-border/70 p-4 flex items-center gap-3 hover:border-primary/50 hover:bg-muted/40 transition-all text-left shadow-soft-xs hover:shadow-soft-sm active:scale-[0.98] duration-120"
                      >
                        <FolderOpen className="w-8 h-8 text-amber-500 shrink-0 transition-transform" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{folder}</p>
                          <p className="text-xs text-muted-foreground">{folderFileCount(folder)} file</p>
                        </div>
                      </button>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-card/90 p-1 rounded-xl backdrop-blur shadow-soft-xs border border-border/70">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-primary active:scale-95 duration-120 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolder({ oldName: folder, oldPath: fullPath });
                            setRenameValue(folder);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10 active:scale-95 duration-120 rounded-lg"
                              onClick={(e) => e.stopPropagation()}
                              disabled={deleteFolderMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border border-border/80 shadow-soft-xl rounded-2xl" onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-black text-lg">Xác nhận xóa thư mục?</AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground">
                                Bạn có chắc chắn muốn xóa thư mục <strong>"{folder}"</strong>? Toàn bộ file và tài liệu nằm trong thư mục này sẽ bị xóa hoàn toàn khỏi hệ thống.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl font-bold">Hủy bỏ</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteFolderMutation.mutate(fullPath)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold active:scale-95 duration-120"
                              >
                                {deleteFolderMutation.isPending ? "Đang xóa..." : "Xóa vĩnh viễn"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Files */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((m: any) => {
                const Icon = typeIcon[m.file_type as string] || FileText;
                return (
                  <div key={m.id} className="bg-card rounded-2xl border border-border/70 p-4 space-y-3 group relative hover:border-primary/50 shadow-soft-xs hover:shadow-soft-sm transition-all">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {m.file_type === "image" ? (
                           <img src={m.file_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                           <Icon className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground truncate">{m.title}</p>
                        <p className="text-xs text-muted-foreground">{(m.file_type ?? "").toUpperCase()} · {m.created_at ? new Date(m.created_at).toLocaleDateString("vi-VN") : ""}</p>
                      </div>
                    </div>
                    {m.folder_path && m.folder_path !== "/" && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Folder className="w-3 h-3 text-muted-foreground" /> {m.folder_path}
                      </p>
                    )}
                    {m.courses?.title && <p className="text-xs text-muted-foreground">📎 {m.courses.title}</p>}
                    
                    <div className="flex justify-between items-center bg-muted/40 p-2 rounded-xl border border-border/60">
                       <span className="text-xs text-muted-foreground truncate flex-1 block max-w-[150px]">{m.file_url}</span>
                       <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="secondary" className="h-7 text-xs font-bold rounded-lg active:scale-95 duration-120" onClick={() => copyUrl(m.file_url)}>
                            <Copy className="w-3 h-3 mr-1" /> Copy
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10 active:scale-95 duration-120 rounded-lg" disabled={deleteMutation.isPending}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="border border-border/80 shadow-soft-xl rounded-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="font-black text-lg">Xác nhận xóa tài liệu?</AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground">
                                  Bạn có chắc muốn xóa tài liệu <strong>"{m.title}"</strong> không?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl font-bold">Hủy bỏ</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(m.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold active:scale-95 duration-120"
                                >
                                  {deleteMutation.isPending ? "Đang xóa..." : "Xóa"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                       </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <p className="text-sm text-muted-foreground col-span-3 text-center py-8">{search ? "Không tìm thấy" : "Chưa có tài liệu trong thư mục này"}</p>}
            </div>
          </>
        )}
      </div>

      {/* New Folder Dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="max-w-sm border border-border/80 shadow-soft-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Tạo thư mục mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-bold">Vị trí hiện tại</Label>
              <p className="text-sm text-muted-foreground font-mono bg-muted/50 p-2 rounded-lg border border-border/60">{currentPath}</p>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Tên thư mục</Label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="VD: Part1, Audio, Images..."
                className="font-medium"
                onKeyDown={(e) => e.key === "Enter" && createFolder()}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="font-bold rounded-xl active:scale-95 duration-120" onClick={() => setNewFolderOpen(false)}>Hủy</Button>
              <Button onClick={createFolder} disabled={!newFolderName.trim()} className="btn-3d-green font-black rounded-xl active:scale-95 duration-120">Tạo & Mở</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={!!editingFolder} onOpenChange={(open) => !open && setEditingFolder(null)}>
        <DialogContent className="max-w-sm border border-border/80 shadow-soft-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Đổi tên thư mục</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-bold">Tên mới</Label>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="font-medium"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editingFolder && renameValue.trim() && renameValue !== editingFolder.oldName) {
                    const newPath = editingFolder.oldPath.substring(0, editingFolder.oldPath.lastIndexOf("/")) + "/" + renameValue.trim();
                    renameFolderMutation.mutate({ oldPath: editingFolder.oldPath, newPath });
                    setEditingFolder(null);
                  }
                }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="font-bold rounded-xl active:scale-95 duration-120" onClick={() => setEditingFolder(null)}>Hủy</Button>
              <Button
                onClick={() => {
                  if (editingFolder && renameValue.trim() && renameValue !== editingFolder.oldName) {
                    const newPath = editingFolder.oldPath.substring(0, editingFolder.oldPath.lastIndexOf("/")) + "/" + renameValue.trim();
                    renameFolderMutation.mutate({ oldPath: editingFolder.oldPath, newPath });
                    setEditingFolder(null);
                  }
                }}
                disabled={!renameValue.trim() || renameValue === editingFolder?.oldName || renameFolderMutation.isPending}
                className="btn-3d-green font-black rounded-xl active:scale-95 duration-120"
              >
                Lưu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminMaterials;
