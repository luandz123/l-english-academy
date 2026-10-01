import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const AdminSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*");
      const map: Record<string, string> = {};
      (data ?? []).forEach((s) => { map[s.key] = s.value; });
      return map;
    },
  });

  const [platformName, setPlatformName] = useState("");
  const [tagline, setTagline] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [accentColor, setAccentColor] = useState("");

  useEffect(() => {
    setPlatformName(settings["platform_name"] ?? "L-English");
    setTagline(settings["tagline"] ?? "Learn Smart. Score High.");
    setPrimaryColor(settings["primary_color"] ?? "#4f46e5");
    setAccentColor(settings["accent_color"] ?? "#10b981");
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = [
        { key: "platform_name", value: platformName },
        { key: "tagline", value: tagline },
        { key: "primary_color", value: primaryColor },
        { key: "accent_color", value: accentColor },
      ];
      for (const entry of entries) {
        const { data: existing } = await supabase.from("platform_settings").select("key").eq("key", entry.key).maybeSingle();
        if (existing) {
          await supabase.from("platform_settings").update({ value: entry.value }).eq("key", entry.key);
        } else {
          await supabase.from("platform_settings").insert(entry);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast({ title: "Đã lưu cài đặt" });
    },
    onError: (e) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const { data: admins = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (!roles?.length) return [];
      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", userIds);
      return profiles ?? [];
    },
  });

  if (isLoading) return <AdminLayout><div className="p-6"><Skeleton className="h-64 w-full" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-foreground">Cài đặt Hệ thống</h1>

        <Tabs defaultValue="platform">
          <TabsList className="bg-muted/60 p-1 rounded-2xl border border-border/60 h-auto">
            <TabsTrigger value="platform" className="rounded-xl font-bold py-2 px-4 data-[state=active]:bg-card data-[state=active]:shadow-soft-xs">
              Nền tảng
            </TabsTrigger>
            <TabsTrigger value="admins" className="rounded-xl font-bold py-2 px-4 data-[state=active]:bg-card data-[state=active]:shadow-soft-xs">
              Tài khoản Admin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="platform" className="mt-4">
            <div className="bg-card rounded-2xl border border-border/70 p-6 shadow-soft-sm space-y-4">
              <div className="space-y-2">
                <Label className="font-bold">Tên nền tảng</Label>
                <Input value={platformName} onChange={(e) => setPlatformName(e.target.value)} className="font-medium" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Tagline</Label>
                <Input value={tagline} onChange={(e) => setTagline(e.target.value)} className="font-medium" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">Màu chủ đạo</Label>
                  <div className="flex gap-2 items-center">
                    <div className="w-10 h-10 rounded-xl border border-border/80 shadow-soft-xs shrink-0" style={{ backgroundColor: primaryColor }} />
                    <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 font-mono text-sm" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Màu accent</Label>
                  <div className="flex gap-2 items-center">
                    <div className="w-10 h-10 rounded-xl border border-border/80 shadow-soft-xs shrink-0" style={{ backgroundColor: accentColor }} />
                    <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="flex-1 font-mono text-sm" />
                  </div>
                </div>
              </div>
              <div className="pt-2">
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-3d-green font-black rounded-xl active:scale-95 duration-120">
                  {saveMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="admins" className="mt-4">
            <div className="bg-card rounded-2xl border border-border/70 overflow-hidden shadow-soft-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/50 text-xs font-black uppercase text-muted-foreground">
                    <th className="text-left px-4 py-3">Tên</th>
                    <th className="text-center px-4 py-3">Vai trò</th>
                    <th className="text-center px-4 py-3">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a: any) => (
                    <tr key={a.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-foreground">{a.full_name ?? "—"}</td>
                      <td className="px-4 py-3.5 text-center font-bold text-primary">Admin</td>
                      <td className="px-4 py-3.5 text-center text-muted-foreground">{a.created_at ? new Date(a.created_at).toLocaleDateString("vi-VN") : ""}</td>
                    </tr>
                  ))}
                  {admins.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground font-semibold">Chưa có admin</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
