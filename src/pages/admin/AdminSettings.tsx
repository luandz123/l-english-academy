import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import {
  Database,
  Download,
  ShieldCheck,
  ArrowRight,
  LayoutTemplate,
  QrCode,
  Sparkles,
  Zap,
  Gamepad2,
  Headphones,
  Award,
  Layers,
  Save,
  Phone,
  Mail,
  MessageSquare,
  HelpCircle,
  Trophy,
} from "lucide-react";
import {
  getHomepageShowcaseConfig,
  saveHomepageShowcaseConfig,
  calculateSavings,
  DEFAULT_HOMEPAGE_CONFIG,
  HomepageShowcaseConfig,
  generateVietQrUrl,
} from "@/services/homepageShowcaseService";

const AdminSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Cài đặt hệ thống chung
  const { data: settings = {}, isLoading: isLoadingPlatform } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*");
      const map: Record<string, string> = {};
      (data ?? []).forEach((s) => {
        map[s.key] = s.value;
      });
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
        const { data: existing } = await supabase
          .from("platform_settings")
          .select("key")
          .eq("key", entry.key)
          .maybeSingle();
        if (existing) {
          await supabase.from("platform_settings").update({ value: entry.value }).eq("key", entry.key);
        } else {
          await supabase.from("platform_settings").insert(entry);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast({ title: "Đã lưu cài đặt nền tảng" });
    },
    onError: (e) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  // 2. Cài đặt các mục trưng bày trang chủ
  const { data: showcaseConfigData, isLoading: isLoadingShowcase } = useQuery({
    queryKey: ["admin-homepage-showcase-config"],
    queryFn: () => getHomepageShowcaseConfig(),
  });

  const [showcaseConfig, setShowcaseConfig] = useState<HomepageShowcaseConfig>(DEFAULT_HOMEPAGE_CONFIG);

  useEffect(() => {
    if (showcaseConfigData) {
      setShowcaseConfig(showcaseConfigData);
    }
  }, [showcaseConfigData]);

  const saveShowcaseMutation = useMutation({
    mutationFn: async () => {
      await saveHomepageShowcaseConfig(showcaseConfig);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-homepage-showcase-config"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-showcase-config"] });
      toast({ title: "Đã lưu cấu hình Kệ Trang Chủ thành công!" });
    },
    onError: (e: any) => {
      toast({ title: "Lỗi lưu cấu hình", description: e.message, variant: "destructive" });
    },
  });

  // 3. Danh sách tài khoản Admin
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

  if (isLoadingPlatform || isLoadingShowcase) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-black text-foreground">Cài Đặt Hệ Thống &amp; Trang Chủ</h1>
            <p className="text-sm text-muted-foreground font-semibold">
              Quản lý thương hiệu, bật/tắt các khối và cấu hình gói VIP, mã QR thanh toán trên trang chủ.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-xl font-bold">
            <Link to="/" target="_blank">
              Xem trang chủ <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="showcase">
          <TabsList className="bg-muted/60 p-1 rounded-2xl border border-border/60 h-auto grid grid-cols-2 sm:grid-cols-4 max-w-2xl">
            <TabsTrigger
              value="showcase"
              className="rounded-xl font-bold py-2 px-3 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-soft-xs"
            >
              Kệ Trang Chủ
            </TabsTrigger>
            <TabsTrigger
              value="platform"
              className="rounded-xl font-bold py-2 px-3 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-soft-xs"
            >
              Nền tảng
            </TabsTrigger>
            <TabsTrigger
              value="admins"
              className="rounded-xl font-bold py-2 px-3 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-soft-xs"
            >
              Admin ({admins.length})
            </TabsTrigger>
            <TabsTrigger
              value="backup"
              className="rounded-xl font-bold py-2 px-3 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-soft-xs"
            >
              Sao lưu
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: KỆ TRANG CHỦ & CÁC MỤC TRƯNG BÀY (DYNAMIC) */}
          <TabsContent value="showcase" className="mt-4 space-y-6">
            {/* KHỐI 1: BẬT / TẮT CÁC SECTION TRÊN TRANG CHỦ */}
            <div className="bg-card rounded-2xl border border-border/70 p-6 shadow-soft-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
                <LayoutTemplate className="w-5 h-5 text-primary" />
                <h3 className="text-base font-black text-foreground">Bật / Tắt Các Khối Trên Trang Chủ</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Tùy chọn hiển thị hoặc ẩn các khối nội dung ngoài trang chủ theo nhu cầu kinh doanh.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/60">
                  <div className="space-y-0.5">
                    <Label className="font-bold text-xs cursor-pointer">Kệ Danh Mục Khóa Học</Label>
                    <p className="text-[11px] text-muted-foreground">Các nhóm khóa học phân theo danh mục</p>
                  </div>
                  <Switch
                    checked={showcaseConfig.section_toggles.show_categories}
                    onCheckedChange={(val) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        section_toggles: { ...showcaseConfig.section_toggles, show_categories: val },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/60">
                  <div className="space-y-0.5">
                    <Label className="font-bold text-xs cursor-pointer">Banner Luyện Nghe 8 Bước</Label>
                    <p className="text-[11px] text-muted-foreground">Banner phản xạ 8 bước Part 2</p>
                  </div>
                  <Switch
                    checked={showcaseConfig.section_toggles.show_part2_banner}
                    onCheckedChange={(val) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        section_toggles: { ...showcaseConfig.section_toggles, show_part2_banner: val },
                      })
                    }
                  />
                </div>

                <div className="flex flex-col justify-between p-3.5 rounded-xl bg-muted/40 border border-border/60 gap-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-bold text-xs cursor-pointer">Đấu Trường Arcade Game</Label>
                      <p className="text-[11px] text-muted-foreground">Word Defense, Word Shooter &amp; Từ vựng</p>
                    </div>
                    <Switch
                      checked={showcaseConfig.section_toggles.show_games}
                      onCheckedChange={(val) =>
                        setShowcaseConfig({
                          ...showcaseConfig,
                          section_toggles: { ...showcaseConfig.section_toggles, show_games: val },
                        })
                      }
                    />
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs font-bold border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10">
                    <Link to="/admin/games">
                      <Gamepad2 className="w-3.5 h-3.5 mr-1.5" />
                      Cấu hình Vị trí, Bật/Tắt, Tiêu đề, Mô tả &amp; Avt Game ➜
                    </Link>
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/60">
                  <div className="space-y-0.5">
                    <Label className="font-bold text-xs cursor-pointer">Khối Combo VIP &amp; Thanh Toán QR</Label>
                    <p className="text-[11px] text-muted-foreground">Gói ưu đãi toàn diện &amp; mã VietQR</p>
                  </div>
                  <Switch
                    checked={showcaseConfig.section_toggles.show_vip_combo}
                    onCheckedChange={(val) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        section_toggles: { ...showcaseConfig.section_toggles, show_vip_combo: val },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/60">
                  <div className="space-y-0.5">
                    <Label className="font-bold text-xs cursor-pointer">Bảng Vàng & Cảm Nhận Học Viên</Label>
                    <p className="text-[11px] text-muted-foreground">Thành tích điểm cao 850+, 920+ TOEIC</p>
                  </div>
                  <Switch
                    checked={showcaseConfig.section_toggles.show_testimonials ?? true}
                    onCheckedChange={(val) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        section_toggles: { ...showcaseConfig.section_toggles, show_testimonials: val },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/60">
                  <div className="space-y-0.5">
                    <Label className="font-bold text-xs cursor-pointer">Câu Hỏi Thường Gặp (FAQ)</Label>
                    <p className="text-[11px] text-muted-foreground">Giải đáp thắc mắc về khóa học & kích hoạt</p>
                  </div>
                  <Switch
                    checked={showcaseConfig.section_toggles.show_faq ?? true}
                    onCheckedChange={(val) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        section_toggles: { ...showcaseConfig.section_toggles, show_faq: val },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/60 sm:col-span-2">
                  <div className="space-y-0.5">
                    <Label className="font-bold text-xs cursor-pointer">4 Cam Kết Chuẩn Khảo Thí ETS</Label>
                    <p className="text-[11px] text-muted-foreground">Khối 4 huy hiệu bảo đảm uy tín cuối trang</p>
                  </div>
                  <Switch
                    checked={showcaseConfig.section_toggles.show_ets_commitments}
                    onCheckedChange={(val) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        section_toggles: { ...showcaseConfig.section_toggles, show_ets_commitments: val },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* KHỐI 2: CẤU HÌNH COMBO VIP & THANH TOÁN VIETQR */}
            <div className="bg-card rounded-2xl border border-border/70 p-6 shadow-soft-sm space-y-5">
              <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
                <QrCode className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-foreground">
                  Cấu Hình Gói Combo VIP &amp; Chuyển Khoản VietQR
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Toàn bộ giá tiền, ưu đãi, tài khoản ngân hàng và mã VietQR trên trang chủ sẽ tự động cập nhật theo thông tin này.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="font-bold text-xs">Huy hiệu tag trên đầu gói</Label>
                  <Input
                    value={showcaseConfig.vip_combo.badge}
                    onChange={(e) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        vip_combo: { ...showcaseConfig.vip_combo, badge: e.target.value },
                      })
                    }
                    placeholder="VD: GÓI VIP TOÀN DIỆN TOEIC · ƯU ĐÃI ĐỢT 1 TIẾT KIỆM 50%"
                    className="font-medium text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">Tiêu đề chính gói VIP</Label>
                  <Input
                    value={showcaseConfig.vip_combo.title}
                    onChange={(e) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        vip_combo: { ...showcaseConfig.vip_combo, title: e.target.value },
                      })
                    }
                    placeholder="VD: NÂNG CẤP VIP TRỌN ĐỜI"
                    className="font-bold text-sm rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-xs">Tag Tiết Kiệm (Tự động tính từ 2 mức giá)</Label>
                    {(() => {
                      const auto = calculateSavings(showcaseConfig.vip_combo.original_price, showcaseConfig.vip_combo.price);
                      return auto.badgeText ? (
                        <span className="text-[10px] bg-red-500/15 text-red-500 px-2 py-0.5 rounded-full font-bold">
                          {auto.badgeText}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <Input
                    value={showcaseConfig.vip_combo.discount_badge || ""}
                    onChange={(e) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        vip_combo: { ...showcaseConfig.vip_combo, discount_badge: e.target.value },
                      })
                    }
                    placeholder={`Để trống sẽ tự động hiển thị: ${calculateSavings(showcaseConfig.vip_combo.original_price, showcaseConfig.vip_combo.price).badgeText || "TIẾT KIỆM..."}`}
                    className="font-bold text-xs rounded-xl text-red-500"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Để trống: Tự động tính = Giá gốc - Giá bán. Hoặc gõ chữ nếu muốn ghi đè.
                  </p>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="font-bold text-xs">Mô tả tóm tắt gói VIP</Label>
                  <Textarea
                    value={showcaseConfig.vip_combo.subtitle}
                    onChange={(e) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        vip_combo: { ...showcaseConfig.vip_combo, subtitle: e.target.value },
                      })
                    }
                    placeholder="Mô tả quyền lợi nổi bật khi mở khóa gói..."
                    rows={2}
                    className="text-xs font-medium rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">Giá bán khuyến mãi (VNĐ) *</Label>
                  <Input
                    type="number"
                    value={showcaseConfig.vip_combo.price}
                    onChange={(e) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        vip_combo: { ...showcaseConfig.vip_combo, price: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="font-bold text-base rounded-xl text-emerald-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">Giá gốc trước giảm (VNĐ)</Label>
                  <Input
                    type="number"
                    value={showcaseConfig.vip_combo.original_price}
                    onChange={(e) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        vip_combo: { ...showcaseConfig.vip_combo, original_price: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="font-medium text-xs rounded-xl text-muted-foreground"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="font-bold text-xs">Ghi chú thanh toán dưới giá</Label>
                  <Input
                    value={showcaseConfig.vip_combo.price_note}
                    onChange={(e) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        vip_combo: { ...showcaseConfig.vip_combo, price_note: e.target.value },
                      })
                    }
                    placeholder="VD: Thanh toán 1 lần duy nhất để học trọn đời"
                    className="text-xs rounded-xl font-medium"
                  />
                </div>
              </div>

              {/* THÔNG TIN TÀI KHOẢN NGÂN HÀNG & MÃ QR */}
              <div className="pt-3 border-t border-border/60 space-y-4">
                <h4 className="text-xs font-black uppercase text-muted-foreground tracking-wider">
                  Thông tin Chuyển khoản &amp; Sinh mã VietQR
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs">Tên Ngân hàng</Label>
                    <Input
                      value={showcaseConfig.vip_combo.bank_name}
                      onChange={(e) =>
                        setShowcaseConfig({
                          ...showcaseConfig,
                          vip_combo: { ...showcaseConfig.vip_combo, bank_name: e.target.value },
                        })
                      }
                      placeholder="VD: MBBank, Techcombank, Vietcombank..."
                      className="text-xs font-bold rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs">Mã BIN Ngân hàng (MB: 970422)</Label>
                    <Input
                      value={showcaseConfig.vip_combo.bank_bin}
                      onChange={(e) =>
                        setShowcaseConfig({
                          ...showcaseConfig,
                          vip_combo: { ...showcaseConfig.vip_combo, bank_bin: e.target.value },
                        })
                      }
                      placeholder="VD: 970422"
                      className="text-xs font-mono rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs">Số Tài Khoản</Label>
                    <Input
                      value={showcaseConfig.vip_combo.bank_account}
                      onChange={(e) =>
                        setShowcaseConfig({
                          ...showcaseConfig,
                          vip_combo: { ...showcaseConfig.vip_combo, bank_account: e.target.value },
                        })
                      }
                      placeholder="VD: 0334729066"
                      className="text-xs font-mono font-bold rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs">Chủ Tài Khoản (Không dấu in hoa)</Label>
                    <Input
                      value={showcaseConfig.vip_combo.account_holder}
                      onChange={(e) =>
                        setShowcaseConfig({
                          ...showcaseConfig,
                          vip_combo: { ...showcaseConfig.vip_combo, account_holder: e.target.value },
                        })
                      }
                      placeholder="VD: HOANG CONG LUAN"
                      className="text-xs font-bold uppercase rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs">Cú pháp chuyển khoản mẫu</Label>
                    <Input
                      value={showcaseConfig.vip_combo.transfer_syntax}
                      onChange={(e) =>
                        setShowcaseConfig({
                          ...showcaseConfig,
                          vip_combo: { ...showcaseConfig.vip_combo, transfer_syntax: e.target.value },
                        })
                      }
                      placeholder="VD: VIP [SĐT Của Bạn]"
                      className="text-xs font-mono rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs">Hotline / Zalo hỗ trợ kích hoạt</Label>
                    <Input
                      value={showcaseConfig.vip_combo.zalo_hotline}
                      onChange={(e) =>
                        setShowcaseConfig({
                          ...showcaseConfig,
                          vip_combo: { ...showcaseConfig.vip_combo, zalo_hotline: e.target.value },
                        })
                      }
                      placeholder="VD: 0334729066"
                      className="text-xs font-mono rounded-xl"
                    />
                  </div>
                </div>

                {/* PREVIEW MÃ VIETQR TỰ ĐỘNG */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border/70 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-28 h-28 bg-white p-2 rounded-lg border border-slate-300 flex items-center justify-center shrink-0">
                    <img
                      src={generateVietQrUrl(
                        showcaseConfig.vip_combo.bank_bin,
                        showcaseConfig.vip_combo.bank_account,
                        showcaseConfig.vip_combo.account_holder,
                        showcaseConfig.vip_combo.price,
                        showcaseConfig.vip_combo.transfer_syntax
                      )}
                      alt="VietQR Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="text-xs font-bold text-foreground">
                      Mã VietQR Tự Động Tạo Hợp Lệ
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Mã QR được tự động tạo theo chuẩn VietQR NAPAS 24/7 với số tiền{" "}
                      <strong className="text-emerald-500 font-mono">
                        {showcaseConfig.vip_combo.price.toLocaleString("vi-VN")} đ
                      </strong>{" "}
                      và cú pháp nạp tiền. Học viên quét là chuyển khoản đúng ngay lập tức.
                    </p>
                  </div>
                </div>
              </div>

              {/* 4 QUYỀN LỢI VIP */}
              <div className="pt-3 border-t border-border/60 space-y-3">
                <h4 className="text-xs font-black uppercase text-muted-foreground tracking-wider">
                  4 Quyền Lợi Cốt Lõi Của Gói VIP
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {showcaseConfig.vip_combo.features.map((feat, index) => (
                    <div key={index} className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-black shrink-0">
                          {index + 1}
                        </span>
                        <Input
                          value={feat.title}
                          onChange={(e) => {
                            const newFeats = [...showcaseConfig.vip_combo.features];
                            newFeats[index] = { ...feat, title: e.target.value };
                            setShowcaseConfig({
                              ...showcaseConfig,
                              vip_combo: { ...showcaseConfig.vip_combo, features: newFeats },
                            });
                          }}
                          placeholder={`Quyền lợi ${index + 1}`}
                          className="h-7 text-xs font-bold rounded-lg"
                        />
                      </div>
                      <Input
                        value={feat.desc}
                        onChange={(e) => {
                          const newFeats = [...showcaseConfig.vip_combo.features];
                          newFeats[index] = { ...feat, desc: e.target.value };
                          setShowcaseConfig({
                            ...showcaseConfig,
                            vip_combo: { ...showcaseConfig.vip_combo, features: newFeats },
                          });
                        }}
                        placeholder="Mô tả chi tiết quyền lợi..."
                        className="h-7 text-[11px] rounded-lg text-muted-foreground"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* KHỐI 3: BANNER 8 BƯỚC PART 2 & CAM KẾT ETS */}
            <div className="bg-card rounded-2xl border border-border/70 p-6 shadow-soft-sm space-y-5">
              <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
                <Headphones className="w-5 h-5 text-purple-500" />
                <h3 className="text-base font-black text-foreground">
                  Cấu Hình Banner Luyện Nghe Phản Xạ 8 Bước Part 2
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="font-bold text-xs">Tag huy hiệu</Label>
                  <Input
                    value={showcaseConfig.part2_banner.badge}
                    onChange={(e) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        part2_banner: { ...showcaseConfig.part2_banner, badge: e.target.value },
                      })
                    }
                    className="text-xs rounded-xl font-medium"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="font-bold text-xs">Tiêu đề Banner</Label>
                  <Input
                    value={showcaseConfig.part2_banner.title}
                    onChange={(e) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        part2_banner: { ...showcaseConfig.part2_banner, title: e.target.value },
                      })
                    }
                    className="text-sm font-bold rounded-xl"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="font-bold text-xs">Mô tả quy trình 8 bước</Label>
                  <Textarea
                    value={showcaseConfig.part2_banner.description}
                    onChange={(e) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        part2_banner: { ...showcaseConfig.part2_banner, description: e.target.value },
                      })
                    }
                    rows={2}
                    className="text-xs rounded-xl font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">Text nút bấm</Label>
                  <Input
                    value={showcaseConfig.part2_banner.button_text}
                    onChange={(e) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        part2_banner: { ...showcaseConfig.part2_banner, button_text: e.target.value },
                      })
                    }
                    className="text-xs font-bold rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">Đường dẫn khi bấm nút</Label>
                  <Input
                    value={showcaseConfig.part2_banner.button_link}
                    onChange={(e) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        part2_banner: { ...showcaseConfig.part2_banner, button_link: e.target.value },
                      })
                    }
                    className="text-xs font-mono rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* KHỐI 4: THÔNG TIN LIÊN HỆ & KÊNH KẾT NỐI (SINGLE SOURCE OF TRUTH) */}
            <div className="bg-card rounded-2xl border border-border/70 p-6 shadow-soft-sm space-y-5">
              <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
                <Phone className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-black text-foreground">
                  Thông Tin Liên Hệ & Kênh Kết Nối (Single Source of Truth)
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Thông tin này sẽ được đồng bộ cùng lúc tới: Hero Banner, Chân trang (Footer), Nút Zalo nổi góc màn hình và Hộp thoại thanh toán gói VIP.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">Hotline Cố Vấn Học Tập (Hiển thị văn bản)</Label>
                  <Input
                    value={showcaseConfig.contact_info?.hotline ?? DEFAULT_HOMEPAGE_CONFIG.contact_info.hotline}
                    onChange={(e) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        contact_info: {
                          ...(showcaseConfig.contact_info || DEFAULT_HOMEPAGE_CONFIG.contact_info),
                          hotline: e.target.value,
                        },
                      })
                    }
                    placeholder="VD: 0334 729 066"
                    className="font-bold text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">Số điện thoại Zalo (Tạo link https://zalo.me/...)</Label>
                  <Input
                    value={showcaseConfig.contact_info?.zalo_number ?? DEFAULT_HOMEPAGE_CONFIG.contact_info.zalo_number}
                    onChange={(e) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        contact_info: {
                          ...(showcaseConfig.contact_info || DEFAULT_HOMEPAGE_CONFIG.contact_info),
                          zalo_number: e.target.value,
                        },
                      })
                    }
                    placeholder="VD: 0334729066"
                    className="font-mono text-xs rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">Email Hỗ Trợ Học Viên</Label>
                  <Input
                    value={showcaseConfig.contact_info?.email ?? DEFAULT_HOMEPAGE_CONFIG.contact_info.email}
                    onChange={(e) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        contact_info: {
                          ...(showcaseConfig.contact_info || DEFAULT_HOMEPAGE_CONFIG.contact_info),
                          email: e.target.value,
                        },
                      })
                    }
                    placeholder="VD: hotro@l-english.vn"
                    className="text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">Khung Giờ Làm Việc & Hỗ Trợ</Label>
                  <Input
                    value={showcaseConfig.contact_info?.working_hours ?? DEFAULT_HOMEPAGE_CONFIG.contact_info.working_hours}
                    onChange={(e) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        contact_info: {
                          ...(showcaseConfig.contact_info || DEFAULT_HOMEPAGE_CONFIG.contact_info),
                          working_hours: e.target.value,
                        },
                      })
                    }
                    placeholder="VD: 8:00 - 22:00 hàng ngày (kể cả Thứ 7 & CN)"
                    className="text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">Đường dẫn Facebook Fanpage</Label>
                  <Input
                    value={showcaseConfig.contact_info?.facebook_url ?? DEFAULT_HOMEPAGE_CONFIG.contact_info.facebook_url}
                    onChange={(e) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        contact_info: {
                          ...(showcaseConfig.contact_info || DEFAULT_HOMEPAGE_CONFIG.contact_info),
                          facebook_url: e.target.value,
                        },
                      })
                    }
                    placeholder="VD: https://www.facebook.com/lenglish"
                    className="text-xs font-mono rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">Đường dẫn Kênh TikTok</Label>
                  <Input
                    value={showcaseConfig.contact_info?.tiktok_url ?? DEFAULT_HOMEPAGE_CONFIG.contact_info.tiktok_url}
                    onChange={(e) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        contact_info: {
                          ...(showcaseConfig.contact_info || DEFAULT_HOMEPAGE_CONFIG.contact_info),
                          tiktok_url: e.target.value,
                        },
                      })
                    }
                    placeholder="VD: https://www.tiktok.com/@lenglish"
                    className="text-xs font-mono rounded-xl"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="font-bold text-xs">Đường dẫn Kênh YouTube</Label>
                  <Input
                    value={showcaseConfig.contact_info?.youtube_url ?? DEFAULT_HOMEPAGE_CONFIG.contact_info.youtube_url}
                    onChange={(e) =>
                      setShowcaseConfig({
                        ...showcaseConfig,
                        contact_info: {
                          ...(showcaseConfig.contact_info || DEFAULT_HOMEPAGE_CONFIG.contact_info),
                          youtube_url: e.target.value,
                        },
                      })
                    }
                    placeholder="VD: https://www.youtube.com/@lenglish"
                    className="text-xs font-mono rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* NÚT LƯU CẤU HÌNH TRANG CHỦ */}
            <div className="p-4 bg-muted/30 rounded-2xl border border-border/70 flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-foreground">Lưu Toàn Bộ Cấu Hình Kệ Trang Chủ</div>
                <p className="text-xs text-muted-foreground">Các thay đổi sẽ được cập nhật ngay tức thì ra ngoài trang chủ.</p>
              </div>
              <Button
                onClick={() => saveShowcaseMutation.mutate()}
                disabled={saveShowcaseMutation.isPending}
                className="btn-3d-green font-black rounded-xl gap-2 active:scale-95 duration-120"
              >
                <Save className="w-4 h-4" />
                {saveShowcaseMutation.isPending ? "Đang lưu..." : "Lưu Cấu Hình Trang Chủ"}
              </Button>
            </div>
          </TabsContent>

          {/* TAB 2: NỀN TẢNG (THƯƠNG HIỆU & MÀU SẮC) */}
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

          {/* TAB 3: ADMIN USERS */}
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

          {/* TAB 4: SAO LƯU */}
          <TabsContent value="backup" className="mt-4">
            <div className="bg-card rounded-2xl border border-border/70 p-6 shadow-soft-sm space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0">
                  <Database className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-foreground text-base">Trung Tâm Sao Lưu & Phục Hồi Dữ Liệu</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Hệ thống cung cấp công cụ sao lưu toàn diện cho Quản trị viên: xuất snapshot toàn bộ cơ sở dữ liệu (JSON), xuất danh sách học viên & bảng điểm (CSV), và hướng dẫn phục hồi dữ liệu thảm họa.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Link to="/admin/backup" className="flex-1">
                  <Button className="w-full btn-3d-blue font-bold rounded-xl gap-2 active:scale-95 duration-120">
                    <Download className="w-4 h-4" /> Đi tới Trung Tâm Sao Lưu
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </Button>
                </Link>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
