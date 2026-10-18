import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import {
  Gamepad2,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  Sparkles,
  Upload,
  Link as LinkIcon,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Palette,
  ExternalLink,
  Layers,
  HelpCircle,
} from "lucide-react";
import {
  getHomepageShowcaseConfig,
  saveHomepageShowcaseConfig,
  HomepageShowcaseConfig,
} from "@/services/homepageShowcaseService";
import {
  ArcadeGameItem,
  ArcadeSectionConfig,
  ArcadeThemeColor,
  DEFAULT_ARCADE_SECTION,
  DEFAULT_ARCADE_GAMES,
  AVATAR_PRESETS,
  resolveGameAvatar,
  ARCADE_THEME_STYLES,
} from "@/services/arcadeGamesService";
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
import { cn } from "@/lib/utils";

const THEME_OPTIONS: { value: ArcadeThemeColor; label: string; colorClass: string }[] = [
  { value: "emerald", label: "Xanh Lục (Emerald)", colorClass: "bg-emerald-500" },
  { value: "cyan", label: "Xanh Ngọc (Cyan)", colorClass: "bg-cyan-500" },
  { value: "purple", label: "Tím Huyền Ảo (Purple)", colorClass: "bg-purple-500" },
  { value: "amber", label: "Vàng Hổ Phách (Amber)", colorClass: "bg-amber-500" },
  { value: "rose", label: "Hồng Đỏ (Rose)", colorClass: "bg-rose-500" },
  { value: "blue", label: "Xanh Biển (Blue)", colorClass: "bg-blue-500" },
];

export default function AdminGamesConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load config
  const { data: fullConfig, isLoading } = useQuery<HomepageShowcaseConfig>({
    queryKey: ["admin-homepage-showcase-config"],
    queryFn: () => getHomepageShowcaseConfig(),
  });

  const [arcadeConfig, setArcadeConfig] = useState<ArcadeSectionConfig>(DEFAULT_ARCADE_SECTION);
  const [activeTab, setActiveTab] = useState<string>("games");
  const [isUploading, setIsUploading] = useState<string | null>(null); // game id being uploaded
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);

  useEffect(() => {
    if (fullConfig?.arcade_section) {
      // Sort games by order
      const sortedGames = [...fullConfig.arcade_section.games].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setArcadeConfig({
        ...fullConfig.arcade_section,
        games: sortedGames,
      });
      if (sortedGames.length > 0 && !expandedGameId) {
        setExpandedGameId(sortedGames[0].id);
      }
    }
  }, [fullConfig]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!fullConfig) return;
      const updatedConfig: HomepageShowcaseConfig = {
        ...fullConfig,
        arcade_section: {
          ...arcadeConfig,
          games: arcadeConfig.games.map((g, idx) => ({ ...g, order: idx })),
        },
      };
      await saveHomepageShowcaseConfig(updatedConfig);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-homepage-showcase-config"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-showcase-config"] });
      toast({
        title: "✅ Đã lưu cấu hình trò chơi thành công!",
        description: "Các thay đổi về vị trí, trạng thái bật/tắt, ảnh và mô tả đã được cập nhật.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "❌ Lỗi khi lưu cấu hình",
        description: err.message || "Không thể lưu vào cơ sở dữ liệu.",
        variant: "destructive",
      });
    },
  });

  // Reorder up
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newGames = [...arcadeConfig.games];
    const temp = newGames[index];
    newGames[index] = newGames[index - 1];
    newGames[index - 1] = temp;
    // Re-index order
    const updated = newGames.map((g, idx) => ({ ...g, order: idx }));
    setArcadeConfig({ ...arcadeConfig, games: updated });
    toast({ title: `Đã di chuyển "${temp.title}" lên vị trí #${index}` });
  };

  // Reorder down
  const handleMoveDown = (index: number) => {
    if (index >= arcadeConfig.games.length - 1) return;
    const newGames = [...arcadeConfig.games];
    const temp = newGames[index];
    newGames[index] = newGames[index + 1];
    newGames[index + 1] = temp;
    // Re-index order
    const updated = newGames.map((g, idx) => ({ ...g, order: idx }));
    setArcadeConfig({ ...arcadeConfig, games: updated });
    toast({ title: `Đã di chuyển "${temp.title}" xuống vị trí #${index + 2}` });
  };

  // Update specific game
  const handleUpdateGame = (id: string, partial: Partial<ArcadeGameItem>) => {
    setArcadeConfig((prev) => ({
      ...prev,
      games: prev.games.map((g) => (g.id === id ? { ...g, ...partial } : g)),
    }));
  };

  // Add new game
  const handleAddNewGame = () => {
    const newId = `game-custom-${Date.now()}`;
    const newOrder = arcadeConfig.games.length;
    const newGame: ArcadeGameItem = {
      id: newId,
      title: "Trò Chơi Học Từ Vựng Mới",
      description: "Mô tả ngắn gọn cách chơi và lợi ích học từ vựng cho học viên khi tham gia trò chơi này.",
      badge: "MỚI RA MẮT",
      avatar_url: "preset:arcade",
      action_url: "/games",
      action_text: "🎮 Chơi Ngay",
      footer_tag: "Trải nghiệm mới",
      is_active: true,
      order: newOrder,
      theme_color: "cyan",
      hide_when_inactive: false,
    };
    setArcadeConfig((prev) => ({
      ...prev,
      games: [...prev.games, newGame],
    }));
    setExpandedGameId(newId);
    toast({ title: "Đã thêm trò chơi mới! Hãy cấu hình tiêu đề, mô tả và avatar." });
  };

  // Delete game
  const handleDeleteGame = (id: string) => {
    const target = arcadeConfig.games.find((g) => g.id === id);
    const updated = arcadeConfig.games.filter((g) => g.id !== id).map((g, idx) => ({ ...g, order: idx }));
    setArcadeConfig({ ...arcadeConfig, games: updated });
    toast({ title: `Đã xóa trò chơi "${target?.title || id}"` });
  };

  // Reset to default
  const handleResetToDefault = () => {
    setArcadeConfig(DEFAULT_ARCADE_SECTION);
    toast({ title: "Đã khôi phục danh sách trò chơi về mặc định ban đầu" });
  };

  // Upload image handler
  const handleImageUpload = async (gameId: string, file: File) => {
    setIsUploading(gameId);
    try {
      const fileExt = file.name.split(".").pop() || "png";
      const fileName = `game-avatar-${gameId}-${Date.now()}.${fileExt}`;
      const filePath = `game-avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("materials").upload(filePath, file, {
        upsert: true,
      });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("materials").getPublicUrl(filePath);
        if (urlData?.publicUrl) {
          handleUpdateGame(gameId, { avatar_url: urlData.publicUrl });
          toast({ title: "Tải lên ảnh đại diện thành công!" });
          return;
        }
      }

      // Fallback: Read as base64 data URL
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          handleUpdateGame(gameId, { avatar_url: reader.result });
          toast({
            title: "Đã chuyển ảnh sang lưu trữ Data URL",
            description: "Ảnh đã được nhúng trực tiếp thành công.",
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast({
        title: "Lỗi tải ảnh",
        description: err.message || "Không thể tải ảnh lên.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(null);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl pb-16 font-sans">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                Cấu Hình Trò Chơi Học Từ Vựng
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Quản lý vị trí hiển thị, bật/tắt cho phép chơi, mô tả, tiêu đề và ảnh đại diện (avatar) của các game Arcade.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold">
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Khôi phục gốc
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Khôi phục cấu hình trò chơi mặc định?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Toàn bộ danh sách 3 game chủ lực (Word Defense, Sky Strike 2.0, Kho Bộ Từ Vựng) sẽ được khôi phục về trạng thái nguyên bản.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetToDefault}>
                    Đồng ý khôi phục
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs px-5 py-2.5 rounded-xl shadow-soft-sm active:scale-95 transition-all"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {saveMutation.isPending ? "Đang lưu..." : "Lưu Cấu Hình Game"}
            </Button>
          </div>
        </div>

        {/* Tab Selection */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/60 p-1 rounded-2xl border border-border/60 h-auto grid grid-cols-3 max-w-md">
            <TabsTrigger
              value="games"
              className="rounded-xl font-bold py-2 px-3 text-xs data-[state=active]:bg-card data-[state=active]:shadow-soft-xs"
            >
              🎮 Danh sách Game ({arcadeConfig.games.length})
            </TabsTrigger>
            <TabsTrigger
              value="section"
              className="rounded-xl font-bold py-2 px-3 text-xs data-[state=active]:bg-card data-[state=active]:shadow-soft-xs"
            >
              🏷️ Tiêu đề Khối
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="rounded-xl font-bold py-2 px-3 text-xs data-[state=active]:bg-card data-[state=active]:shadow-soft-xs"
            >
              👁️ Xem Trước Thực Tế
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: DANH SÁCH GAME CHI TIẾT */}
          <TabsContent value="games" className="mt-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 shrink-0" />
                <p className="text-xs font-semibold text-slate-200">
                  Dùng nút <strong className="text-cyan-300">⬆ Lên / ⬇ Xuống</strong> để sắp xếp vị trí hiển thị ngoài trang chủ.
                  Bật/tắt công tắc để mở cho chơi hoặc tạm tắt bảo trì game.
                </p>
              </div>
              <Button
                onClick={handleAddNewGame}
                size="sm"
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-xl shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Thêm Trò Chơi Mới
              </Button>
            </div>

            {/* List of Game Cards */}
            <div className="space-y-4">
              {arcadeConfig.games.map((game, index) => {
                const isExpanded = expandedGameId === game.id;
                const avatarSrc = resolveGameAvatar(game.avatar_url);
                const theme = ARCADE_THEME_STYLES[game.theme_color || "cyan"];

                return (
                  <div
                    key={game.id}
                    className={cn(
                      "rounded-3xl border transition-all duration-200 bg-card overflow-hidden shadow-soft-xs",
                      game.is_active ? "border-border/80" : "border-rose-500/30 bg-rose-950/10 opacity-90",
                      isExpanded && "ring-2 ring-primary/30"
                    )}
                  >
                    {/* Collapsed Header / Summary Bar */}
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/20 border-b border-border/40">
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Position Badge */}
                        <div className="flex flex-col items-center justify-center w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400 font-black text-xs shrink-0 shadow-inner">
                          #{index + 1}
                        </div>

                        {/* Avatar Thumbnail */}
                        <div className="w-12 h-12 rounded-2xl bg-slate-900/80 border border-border/70 p-1 flex items-center justify-center shrink-0 shadow-soft-xs overflow-hidden">
                          <img
                            src={avatarSrc}
                            alt={game.title}
                            className="w-full h-full object-contain drop-shadow"
                            onError={(e) => {
                              // fallback
                              (e.target as HTMLImageElement).src = resolveGameAvatar("preset:arcade");
                            }}
                          />
                        </div>

                        {/* Title & Description Preview */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-black text-foreground truncate">
                              {game.title || "Chưa đặt tiêu đề"}
                            </h3>
                            <span
                              className={cn(
                                "text-[10px] font-black uppercase px-2 py-0.5 rounded-full border",
                                game.is_active
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                  : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                              )}
                            >
                              {game.is_active ? "🟢 Đang mở" : "🔴 Đang tắt"}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                              {game.badge || "Không có tag"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {game.description || "Chưa có mô tả"}
                          </p>
                        </div>
                      </div>

                      {/* Quick Position Controls & Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {/* Move Up Button */}
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => handleMoveUp(index)}
                          title="Di chuyển lên trên"
                          className="w-8 h-8 rounded-xl"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>

                        {/* Move Down Button */}
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={index === arcadeConfig.games.length - 1}
                          onClick={() => handleMoveDown(index)}
                          title="Di chuyển xuống dưới"
                          className="w-8 h-8 rounded-xl"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>

                        {/* Quick Switch for Active/Inactive */}
                        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-background border border-border/60">
                          <Switch
                            checked={game.is_active}
                            onCheckedChange={(val) => handleUpdateGame(game.id, { is_active: val })}
                          />
                          <span className="text-[11px] font-bold hidden md:inline">
                            {game.is_active ? "Cho chơi" : "Tắt"}
                          </span>
                        </div>

                        {/* Expand / Collapse toggle */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedGameId(isExpanded ? null : game.id)}
                          className="rounded-xl text-xs font-bold"
                        >
                          {isExpanded ? "Thu gọn" : "Chỉnh sửa ✏️"}
                        </Button>

                        {/* Delete game */}
                        {arcadeConfig.games.length > 1 && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 rounded-xl text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Xóa trò chơi "{game.title}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Trò chơi này sẽ bị xóa khỏi danh sách và giao diện ngoài trang chủ. Bạn vẫn có thể khôi phục lại sau.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Hủy</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteGame(game.id)}
                                  className="bg-rose-600 hover:bg-rose-500"
                                >
                                  Xóa Game
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>

                    {/* Detailed Edit Panel */}
                    {isExpanded && (
                      <div className="p-5 sm:p-6 space-y-6 bg-card">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* 1. Tiêu đề game */}
                          <div className="space-y-1.5 md:col-span-2">
                            <Label className="font-bold text-xs flex items-center justify-between">
                              <span>1. Tiêu Đề Trò Chơi (Title)</span>
                              <span className="text-[10px] text-muted-foreground">Hiển thị nổi bật trên thẻ</span>
                            </Label>
                            <Input
                              value={game.title}
                              onChange={(e) => handleUpdateGame(game.id, { title: e.target.value })}
                              placeholder="VD: Word Defense: Cuộc Chiến Khu Vườn"
                              className="font-black text-sm rounded-xl"
                            />
                          </div>

                          {/* 2. Mô tả game */}
                          <div className="space-y-1.5 md:col-span-2">
                            <Label className="font-bold text-xs flex items-center justify-between">
                              <span>2. Mô Tả Chi Tiết (Description)</span>
                              <span className="text-[10px] text-muted-foreground">Tóm tắt cách chơi & giá trị</span>
                            </Label>
                            <Textarea
                              rows={3}
                              value={game.description}
                              onChange={(e) => handleUpdateGame(game.id, { description: e.target.value })}
                              placeholder="VD: Bảo vệ khu vườn bằng cách gõ từ vựng triệu hồi Đậu Thần, Băng Tiễn..."
                              className="text-xs font-medium rounded-xl leading-relaxed"
                            />
                          </div>

                          {/* 3. Cấu hình Ảnh Đại Diện / Avatar (avt) */}
                          <div className="space-y-3 md:col-span-2 p-4 rounded-2xl bg-muted/30 border border-border/70">
                            <div className="flex items-center justify-between">
                              <Label className="font-black text-xs flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                3. Ảnh Đại Diện / Icon (Avatar)
                              </Label>
                              <span className="text-[11px] text-muted-foreground">
                                Chọn icon 3D có sẵn hoặc tải ảnh riêng từ máy
                              </span>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start gap-4">
                              {/* Avatar Preview Box */}
                              <div className="flex flex-col items-center gap-1.5 shrink-0">
                                <div className="w-20 h-20 rounded-2xl bg-slate-900 border-2 border-primary/40 p-2 flex items-center justify-center shadow-lg shadow-primary/10 overflow-hidden">
                                  <img
                                    src={avatarSrc}
                                    alt="Preview"
                                    className="w-full h-full object-contain drop-shadow"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = resolveGameAvatar("preset:arcade");
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground">Xem trước</span>
                              </div>

                              <div className="space-y-3 flex-1 min-w-0 w-full">
                                {/* Preset Icon Grid */}
                                <div>
                                  <span className="text-[11px] font-bold text-foreground block mb-2">
                                    Kho Icon 3D Cao Cấp Có Sẵn (Click chọn nhanh):
                                  </span>
                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    {AVATAR_PRESETS.map((preset) => {
                                      const isSelected = game.avatar_url === preset.key;
                                      return (
                                        <button
                                          type="button"
                                          key={preset.key}
                                          onClick={() => handleUpdateGame(game.id, { avatar_url: preset.key })}
                                          className={cn(
                                            "p-2 rounded-xl border flex flex-col items-center gap-1 transition-all text-center group cursor-pointer",
                                            isSelected
                                              ? "bg-primary/15 border-primary shadow-soft-xs ring-2 ring-primary/40"
                                              : "bg-background/80 hover:bg-muted/70 border-border/60"
                                          )}
                                        >
                                          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                                            <img
                                              src={preset.src}
                                              alt={preset.label}
                                              className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                                            />
                                          </div>
                                          <span className="text-[10px] font-bold text-foreground truncate max-w-full">
                                            {preset.label.split("/")[0]}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Custom Upload & Custom URL */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
                                  {/* Upload from machine */}
                                  <div className="space-y-1">
                                    <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                                      <Upload className="w-3.5 h-3.5" /> Tải ảnh từ máy tính (PNG, WEBP, JPG)
                                    </Label>
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      disabled={isUploading === game.id}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleImageUpload(game.id, file);
                                      }}
                                      className="text-xs rounded-xl cursor-pointer file:cursor-pointer file:text-xs file:font-bold file:rounded-lg"
                                    />
                                    {isUploading === game.id && (
                                      <p className="text-[10px] text-cyan-400 font-bold animate-pulse">
                                        Đang tải ảnh lên hệ thống...
                                      </p>
                                    )}
                                  </div>

                                  {/* Direct URL input */}
                                  <div className="space-y-1">
                                    <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                                      <LinkIcon className="w-3.5 h-3.5" /> Hoặc dán link ảnh trực tiếp (URL)
                                    </Label>
                                    <Input
                                      value={game.avatar_url.startsWith("preset:") ? "" : game.avatar_url}
                                      onChange={(e) => handleUpdateGame(game.id, { avatar_url: e.target.value })}
                                      placeholder="https://example.com/avatar.png"
                                      className="text-xs rounded-xl font-mono"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 4. Trạng thái & Quyền cho chơi */}
                          <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                            <Label className="font-black text-xs flex items-center gap-2">
                              <ShieldAlert className="w-4 h-4 text-amber-500" />
                              4. Trạng Thái Cho Chơi / Tắt Bảo Trì
                            </Label>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/60">
                              <div className="space-y-0.5">
                                <span className="font-bold text-xs text-foreground block">
                                  {game.is_active ? "🟢 Đang Mở Cho Học Viên Chơi" : "🔴 Tạm Tắt / Đang Nâng Cấp"}
                                </span>
                                <p className="text-[11px] text-muted-foreground">
                                  {game.is_active
                                    ? "Học viên được tự do vào chơi và tính điểm bình thường."
                                    : "Khóa nút chơi và hiển thị thông báo tạm bảo trì khi học viên truy cập."}
                                </p>
                              </div>
                              <Switch
                                checked={game.is_active}
                                onCheckedChange={(val) => handleUpdateGame(game.id, { is_active: val })}
                              />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/60">
                              <div className="space-y-0.5">
                                <span className="font-bold text-xs text-foreground block">
                                  Ẩn hẳn khỏi trang chủ khi tắt
                                </span>
                                <p className="text-[11px] text-muted-foreground">
                                  Nếu không bật: Thẻ vẫn hiển thị kèm nhãn "🔒 Tạm bảo trì".
                                </p>
                              </div>
                              <Switch
                                checked={game.hide_when_inactive ?? false}
                                onCheckedChange={(val) => handleUpdateGame(game.id, { hide_when_inactive: val })}
                              />
                            </div>
                          </div>

                          {/* 5. Nhãn Badge, Màu sắc & Nút bấm */}
                          <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                            <Label className="font-black text-xs flex items-center gap-2">
                              <Palette className="w-4 h-4 text-purple-400" />
                              5. Giao Diện Nút Bấm & Thẻ Tag
                            </Label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Badge Tag */}
                              <div className="space-y-1">
                                <Label className="text-[11px] font-bold">Huy hiệu tag</Label>
                                <Input
                                  value={game.badge}
                                  onChange={(e) => handleUpdateGame(game.id, { badge: e.target.value })}
                                  placeholder="VD: MỚI • PVZ STYLE"
                                  className="text-xs font-bold rounded-xl"
                                />
                              </div>

                              {/* Action text */}
                              <div className="space-y-1">
                                <Label className="text-[11px] font-bold">Chữ trên nút</Label>
                                <Input
                                  value={game.action_text}
                                  onChange={(e) => handleUpdateGame(game.id, { action_text: e.target.value })}
                                  placeholder="VD: ⚔️ Chơi Ngay"
                                  className="text-xs font-bold rounded-xl"
                                />
                              </div>

                              {/* Action URL */}
                              <div className="space-y-1">
                                <Label className="text-[11px] font-bold">Đường dẫn liên kết</Label>
                                <Input
                                  value={game.action_url}
                                  onChange={(e) => handleUpdateGame(game.id, { action_url: e.target.value })}
                                  placeholder="/games/word-defense"
                                  className="text-xs font-mono rounded-xl"
                                />
                              </div>

                              {/* Footer note */}
                              <div className="space-y-1">
                                <Label className="text-[11px] font-bold">Ghi chú chân thẻ</Label>
                                <Input
                                  value={game.footer_tag}
                                  onChange={(e) => handleUpdateGame(game.id, { footer_tag: e.target.value })}
                                  placeholder="VD: Chọn mọi bộ từ vựng"
                                  className="text-xs font-medium rounded-xl"
                                />
                              </div>

                              {/* Theme Color Selector */}
                              <div className="space-y-1 sm:col-span-2">
                                <Label className="text-[11px] font-bold">Tông màu ánh sáng & nút bấm</Label>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                  {THEME_OPTIONS.map((opt) => (
                                    <button
                                      type="button"
                                      key={opt.value}
                                      onClick={() => handleUpdateGame(game.id, { theme_color: opt.value })}
                                      className={cn(
                                        "p-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer",
                                        game.theme_color === opt.value
                                          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                                          : "border-border/60 bg-card hover:bg-muted/60"
                                      )}
                                    >
                                      <span className={cn("w-3 h-3 rounded-full shrink-0", opt.colorClass)} />
                                      <span className="truncate text-[10px]">{opt.label.split(" ")[0]}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Preview footer inside editor */}
                        <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-semibold">
                            Vị trí hiển thị: Thẻ #{index + 1} ({index === 0 ? "Đầu tiên" : index === arcadeConfig.games.length - 1 ? "Cuối cùng" : `Giữa`})
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandedGameId(null)}
                            className="rounded-xl text-xs font-bold"
                          >
                            Đóng chỉnh sửa
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 2: CẤU HÌNH TIÊU ĐỀ KHỐI */}
          <TabsContent value="section" className="mt-6 space-y-5">
            <div className="bg-card rounded-2xl border border-border/70 p-6 space-y-4 shadow-soft-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                <Layers className="w-5 h-5 text-primary" />
                <h3 className="text-base font-black text-foreground">
                  Tiêu Đề & Huy Hiệu Khu Vực Trò Chơi Ngoài Trang Chủ
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="font-bold text-xs">Huy hiệu trên đầu khối (Badge)</Label>
                  <Input
                    value={arcadeConfig.badge}
                    onChange={(e) => setArcadeConfig({ ...arcadeConfig, badge: e.target.value })}
                    placeholder="VD: ARCADE GAMIFICATION · VỪA HỌC VỪA CHƠI"
                    className="font-bold text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="font-bold text-xs">Tiêu đề lớn của khối (Heading)</Label>
                  <Input
                    value={arcadeConfig.title}
                    onChange={(e) => setArcadeConfig({ ...arcadeConfig, title: e.target.value })}
                    placeholder="VD: KHU VỰC TRÒ CHƠI HỌC TỪ VỰNG THEO BỘ TỪ VỰNG TÙY CHỌN"
                    className="font-black text-sm rounded-xl"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="font-bold text-xs">Mô tả phụ bên dưới tiêu đề</Label>
                  <Input
                    value={arcadeConfig.description}
                    onChange={(e) => setArcadeConfig({ ...arcadeConfig, description: e.target.value })}
                    placeholder="VD: Chọn bộ từ vựng yêu thích (TOEIC 600 từ, Giao tiếp, Công nghệ...) và chiến game ngay!"
                    className="text-xs font-medium rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">Chữ trên nút xem tất cả</Label>
                  <Input
                    value={arcadeConfig.view_all_text}
                    onChange={(e) => setArcadeConfig({ ...arcadeConfig, view_all_text: e.target.value })}
                    placeholder="VD: Vào đấu trường Game"
                    className="text-xs font-bold rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">Đường dẫn nút xem tất cả</Label>
                  <Input
                    value={arcadeConfig.view_all_url}
                    onChange={(e) => setArcadeConfig({ ...arcadeConfig, view_all_url: e.target.value })}
                    placeholder="/games"
                    className="text-xs font-mono rounded-xl"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: XEM TRƯỚC BENTO THỜI GIAN THỰC */}
          <TabsContent value="preview" className="mt-6 space-y-6">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-2 text-xs font-semibold">
              <Eye className="w-4 h-4 shrink-0" />
              <span>
                Đây là bản xem trước trực tiếp theo đúng thiết kế và thứ tự bạn đang cấu hình ở trên.
              </span>
            </div>

            {/* Simulated Homepage Section Container */}
            <div className="rounded-3xl border border-cyan-500/30 bg-[#081226]/95 p-6 sm:p-8 md:p-10 space-y-8 shadow-[0_10px_35px_rgba(0,0,0,0.6)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Section Header */}
              <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-cyan-500/20">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-black uppercase tracking-wider">
                    <Gamepad2 className="w-4 h-4 text-cyan-400" />
                    <span>{arcadeConfig.badge}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-display tracking-wide">
                    {arcadeConfig.title}
                  </h2>
                  <p className="text-slate-300 text-xs sm:text-sm font-medium">
                    {arcadeConfig.description}
                  </p>
                </div>

                <div className="py-2.5 px-5 rounded-xl font-black text-xs text-cyan-300 bg-cyan-500/15 border border-cyan-500/40 inline-flex items-center gap-2 shrink-0 self-start md:self-auto">
                  <span>{arcadeConfig.view_all_text}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Bento Grid */}
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                {arcadeConfig.games
                  .filter((g) => g.is_active || !g.hide_when_inactive)
                  .map((game, idx) => {
                    const avatarSrc = resolveGameAvatar(game.avatar_url);
                    const theme = ARCADE_THEME_STYLES[game.theme_color || "cyan"];

                    return (
                      <div
                        key={game.id}
                        className={cn(
                          "rounded-2xl border bg-[#071329]/90 p-6 flex flex-col justify-between space-y-5 transition-all duration-300 shadow-[0_4px_25px_rgba(0,0,0,0.5)] relative overflow-hidden",
                          game.is_active ? theme.border : "border-slate-700/80 opacity-75 grayscale-[20%]"
                        )}
                      >
                        {/* Order Ribbon */}
                        <div className="absolute top-2 right-2 text-[10px] font-bold text-slate-500">
                          #{idx + 1}
                        </div>

                        <div className="space-y-3.5">
                          <div className="flex items-center justify-between">
                            <div
                              className={cn(
                                "w-14 h-14 rounded-2xl p-1 flex items-center justify-center shadow-lg shrink-0 border",
                                game.is_active ? cn(theme.avatarBg, theme.avatarBorder, theme.avatarShadow) : "bg-slate-800 border-slate-700"
                              )}
                            >
                              <img
                                src={avatarSrc}
                                alt={game.title}
                                className="w-full h-full object-contain drop-shadow"
                              />
                            </div>
                            <span
                              className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                game.is_active
                                  ? cn(theme.badgeBg, theme.badgeText, theme.badgeBorder)
                                  : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                              )}
                            >
                              {game.is_active ? game.badge : "🔒 TẠM BẢO TRÌ"}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <h3 className="text-lg font-black text-white font-display">
                              {game.title}
                            </h3>
                            <p className="text-xs text-slate-300 font-medium leading-relaxed">
                              {game.description}
                            </p>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400">
                            {game.footer_tag}
                          </span>
                          <div
                            className={cn(
                              "py-2 px-4 rounded-xl font-black text-xs inline-flex items-center gap-1.5 shadow-md",
                              game.is_active
                                ? cn("text-white bg-gradient-to-r", theme.buttonGradient, theme.buttonShadow)
                                : "bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed"
                            )}
                          >
                            <span>{game.is_active ? game.action_text : "🔒 Tạm Khóa"}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
