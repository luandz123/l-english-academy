import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  Check, 
  ShieldCheck, 
  ArrowRight, 
  X, 
  Copy, 
  CheckCircle2, 
  ChevronLeft, 
  Zap, 
  Crown,
  MessageCircle,
  ExternalLink,
  Loader2,
  Sparkles,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { 
  generateSepayQrUrl,
  getHomepageShowcaseConfig, 
  DEFAULT_HOMEPAGE_CONFIG,
  calculateSavings,
  type HomepageShowcaseConfig 
} from "@/services/homepageShowcaseService";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export interface UpgradeProCardProps {
  className?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  vipCombo?: HomepageShowcaseConfig["vip_combo"];
  initialStep?: "details" | "checkout";
  isEmbedded?: boolean;
}

export const UpgradeProCard: React.FC<UpgradeProCardProps> = ({
  className,
  onClose,
  showCloseButton = false,
  vipCombo,
  initialStep = "details",
  isEmbedded = false,
}) => {
  const [data, setData] = useState<HomepageShowcaseConfig["vip_combo"]>(
    vipCombo || DEFAULT_HOMEPAGE_CONFIG.vip_combo
  );
  const [step, setStep] = useState<"details" | "checkout">(initialStep);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Quản lý đơn hàng SePay & Realtime (Khởi tạo sẵn mã đơn ngay lập tức)
  const [orderCode, setOrderCode] = useState<string>(() => {
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    return `LEA${randomDigits}`;
  });
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState<boolean>(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState<boolean>(false);
  const [isPaymentSuccess, setIsPaymentSuccess] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const { user, isAdmin, refreshUserData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const channelRef = useRef<any>(null);

  // Tự động nạp dữ liệu động từ database / config hệ thống nếu props chưa truyền
  useEffect(() => {
    if (vipCombo) {
      setData(vipCombo);
    } else {
      getHomepageShowcaseConfig().then((cfg) => {
        if (cfg?.vip_combo) {
          setData(cfg.vip_combo);
        }
      });
    }
  }, [vipCombo]);

  // Tạo hoặc lấy đơn hàng PENDING khi chuyển sang bước checkout
  useEffect(() => {
    if (step !== "checkout" || !user) return;

    let isMounted = true;

    async function initOrder() {
      setIsCreatingOrder(true);
      try {
        // 1. Kiểm tra xem user đã có đơn pending nào mới tạo trong 30 phút qua không
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data: existingOrders } = await supabase
          .from("payment_orders")
          .select("id, order_code, amount, status")
          .eq("user_id", user!.id)
          .eq("status", "pending")
          .gte("created_at", thirtyMinsAgo)
          .order("created_at", { ascending: false })
          .limit(1);

        if (existingOrders && existingOrders.length > 0 && isMounted) {
          const current = existingOrders[0];
          setOrderCode(current.order_code);
          setOrderId(current.id);
          setIsCreatingOrder(false);
          return;
        }

        // 2. Nếu chưa có, dùng mã orderCode đã khởi tạo sẵn hoặc sinh mới
        const targetCode = orderCode || `LEA${Math.floor(10000 + Math.random() * 90000)}`;

        const { data: created, error } = await supabase
          .from("payment_orders")
          .insert({
            user_id: user!.id,
            order_code: targetCode,
            amount: data.price,
            plan_type: "vip_combo",
            status: "pending",
          })
          .select()
          .single();

        if (error) {
          console.warn("[UpgradeProModal] Could not insert order into Supabase:", error.message);
          if (isMounted) setOrderCode(targetCode);
        } else if (created && isMounted) {
          setOrderCode(created.order_code);
          setOrderId(created.id);
        }
      } catch (err) {
        console.error("[UpgradeProModal] Order init error:", err);
      } finally {
        if (isMounted) setIsCreatingOrder(false);
      }
    }

    initOrder();

    return () => {
      isMounted = false;
    };
  }, [step, user, data.price]);

  // Lắng nghe Realtime trạng thái đơn hàng từ Supabase
  useEffect(() => {
    if (!orderCode) return;

    // Hủy channel cũ nếu có
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `realtime-order-${orderCode}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "payment_orders",
          filter: `order_code=eq.${orderCode}`,
        },
        async (payload: any) => {
          if (payload.new && payload.new.status === "completed") {
            setIsPaymentSuccess(true);
            await refreshUserData();
            toast({
              title: "🎉 Thanh toán thành công!",
              description: "Tài khoản của bạn đã được nâng cấp lên VIP PRO trọn đời!",
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [orderCode, refreshUserData, toast]);

  // Nội dung chuyển khoản chuẩn cho SePay (chỉ chứa chữ và số, không khoảng trắng, không ký tự lạ)
  const transferSyntax = (orderCode || "LEAPRO").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  // Tính toán số tiền tiết kiệm và badge giảm giá
  const savings = calculateSavings(data.original_price, data.price);
  const discountBadge =
    data.discount_badge ||
    savings.badgeText ||
    (savings.percent > 0 ? `TIẾT KIỆM -${savings.percent}%` : "ƯU ĐÃI VIP");

  const zaloNumber = data.zalo_hotline || "0334729066";

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast({
      title: `Đã sao chép ${label}`,
      description: text,
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Nút kiểm tra trạng thái thủ công (đối soát trực tiếp với Supabase)
  const handleManualCheck = async () => {
    if (!orderCode) return;
    setIsCheckingPayment(true);
    try {
      // 1. Kiểm tra trực tiếp qua RPC (bypasses RLS hoàn toàn 100%)
      try {
        const { data: rpcData } = await supabase.rpc("check_payment_order_status", {
          p_order_code: orderCode,
        });
        if (rpcData && (rpcData as any).completed) {
          setIsPaymentSuccess(true);
          await refreshUserData();
          toast({
            title: "🎉 Xác nhận thành công!",
            description: "Đơn hàng đã được thanh toán và kích hoạt VIP PRO!",
          });
          return;
        }
      } catch {}

      // 2. Kiểm tra trực tiếp từ bảng payment_orders
      const { data: orderData } = await supabase
        .from("payment_orders")
        .select("status")
        .eq("order_code", orderCode)
        .maybeSingle();

      if (orderData && orderData.status === "completed") {
        setIsPaymentSuccess(true);
        await refreshUserData();
        toast({
          title: "🎉 Xác nhận thành công!",
          description: "Đơn hàng đã được thanh toán và kích hoạt VIP PRO!",
        });
        return;
      }

      // 2. Thử gọi API endpoint nếu có
      try {
        const res = await fetch(`/api/check-payment?order_code=${orderCode}`);
        if (res.ok) {
          const result = await res.json();
          if (result.completed) {
            setIsPaymentSuccess(true);
            await refreshUserData();
            toast({
              title: "🎉 Xác nhận thành công!",
              description: "Đơn hàng đã được thanh toán và kích hoạt VIP PRO!",
            });
            return;
          }
        }
      } catch {}

      toast({
        title: "Chưa ghi nhận biến động",
        description: `Hệ thống chưa thấy tiền vào cho mã ${orderCode}. Nếu bạn vừa chuyển khoản trên App MBBank, vui lòng đợi 5–15 giây rồi kiểm tra lại.`,
      });
    } catch {
      toast({
        title: "Đang kiểm tra...",
        description: "Hệ thống vẫn đang liên tục lắng nghe biến động tài khoản qua SePay.",
      });
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // Nút giả lập thanh toán (Gọi thẳng stored procedure complete_payment_order trong Supabase)
  // Giúp người dùng/Admin kiểm chứng tận mắt luồng tự động nâng VIP 100% mà không cần chuyển tiền thật!
  const handleSimulatePayment = async () => {
    if (!orderCode) return;
    if (!user) {
      toast({
        title: "Cần đăng nhập",
        description: "Vui lòng đăng nhập tài khoản trước khi thử nghiệm nâng VIP.",
        variant: "destructive",
      });
      return;
    }

    setIsSimulating(true);
    try {
      // Gọi trực tiếp Stored Procedure của Supabase
      const { data: rpcResult, error: rpcError } = await supabase.rpc("complete_payment_order", {
        p_order_code: orderCode,
        p_transfer_amount: data.price,
        p_bank_tx_id: `SEPAY_SIM_${Date.now()}`,
        p_transaction_content: `TEST_SIMULATE ${orderCode}`,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setIsPaymentSuccess(true);
      await refreshUserData();
      toast({
        title: "🎉 Giả lập thành công 100%!",
        description: "Tài khoản của bạn đã được nâng cấp lên VIP PRO trọn đời và mở khóa toàn bộ khóa học!",
      });
    } catch (err: any) {
      console.error("[Simulate Payment] Error:", err);
      toast({
        title: "Lỗi giả lập",
        description: err?.message || "Kiểm tra kết nối Supabase",
        variant: "destructive",
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleFinishSuccess = () => {
    if (onClose) onClose();
    navigate("/dashboard");
  };

  return (
    <div
      className={cn(
        "relative w-full rounded-[28px] sm:rounded-[32px] bg-gradient-to-b from-[#181938] via-[#121327] to-[#0c0d1d] border border-[#2d2f5e]/90 text-white shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_40px_rgba(88,86,214,0.2)] overflow-hidden",
        isEmbedded ? "p-6 sm:p-8 md:p-10" : "p-6 sm:p-7",
        className
      )}
    >
      {/* Subtle Ambient Radial Glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-44 bg-[#5452ee]/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-0 w-64 h-40 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Close Button (nếu hiển thị trong modal) */}
      {showCloseButton && onClose && (
        <div className="relative z-20 flex items-center justify-end mb-2">
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TRƯỜNG HỢP: THANH TOÁN THÀNH CÔNG (TỰ ĐỘNG KÍCH HOẠT PRO)                 */}
      {/* ========================================================================= */}
      {isPaymentSuccess ? (
        <div className="relative z-10 space-y-6 py-4 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="relative mx-auto w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-green-400 p-0.5 shadow-[0_0_40px_rgba(16,185,129,0.5)]">
            <div className="w-full h-full rounded-full bg-[#121327] flex items-center justify-center">
              <Crown className="w-10 h-10 text-amber-300 animate-bounce" />
            </div>
            <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Nâng Cấp Thành Công!</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-serif tracking-tight">
              Chào Mừng Bạn Đến Với VIP PRO!
            </h2>
            <p className="text-xs sm:text-sm text-[#9597be] max-w-sm mx-auto leading-relaxed">
              Tài khoản của bạn đã được kích hoạt trọn đời. Toàn bộ kho đề ETS 200 câu, video bài giảng và lộ trình độc quyền đã được mở khóa.
            </p>
          </div>

          {/* Quick list of unlocked perks */}
          <div className="p-4 rounded-2xl bg-[#171833] border border-emerald-500/30 text-left space-y-2 text-xs">
            <div className="flex items-center gap-2.5 text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Mở khóa toàn bộ khóa học & đề thi Full Test 200 câu</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Luyện nghe Dictation 8 bước không giới hạn</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Hỗ trợ cố vấn 1-1 qua Zalo độc quyền ({zaloNumber})</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinishSuccess}
            className="w-full py-4 rounded-xl text-sm sm:text-base font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 active:scale-[0.98] shadow-[0_4px_25px_rgba(16,185,129,0.45)] flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Bắt Đầu Trải Nghiệm Ngay</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : step === "details" ? (
        /* ========================================================================= */
        /* MÀN HÌNH 1: CHI TIẾT GÓI VIP & QUYỀN LỢI                                  */
        /* ========================================================================= */
        <div className="relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Header Title in classic serif font */}
          <div className="space-y-2">
            {data.badge && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5452ee]/20 text-[#a2a4f6] border border-[#5452ee]/35 text-[11px] font-bold uppercase tracking-wider">
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                <span>{data.badge}</span>
              </div>
            )}
            <h2 className="text-2xl sm:text-[30px] font-bold text-white tracking-tight font-serif leading-tight">
              {data.title || "NÂNG CẤP VIP TRỌN ĐỜI"}
            </h2>
            {data.subtitle && (
              <p className="text-xs sm:text-sm text-[#9597be] leading-relaxed">
                {data.subtitle}
              </p>
            )}
          </div>

          {/* Feature Checklist */}
          <div className="space-y-3.5 sm:space-y-4 pt-1">
            {data.features && data.features.length > 0 ? (
              data.features.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-3 group">
                  <div className="w-5 h-5 rounded-full bg-white text-[#121327] flex items-center justify-center shrink-0 mt-0.5 shadow-sm group-hover:scale-105 transition-transform">
                    <Check className="w-3.5 h-3.5 stroke-[3] text-[#121327]" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <h3 className="text-sm sm:text-[15px] font-bold text-white leading-snug">
                      {feat.title}
                    </h3>
                    {feat.desc && (
                      <p className="text-xs sm:text-[13px] text-[#9597be] font-normal leading-relaxed">
                        {feat.desc}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400">Đang tải thông tin quyền lợi...</div>
            )}
          </div>

          {/* Pricing Ticket Card */}
          <div className="rounded-2xl bg-[#161732]/95 border-2 border-[#5452ee] p-4 sm:p-5 flex flex-col items-center text-center space-y-2 relative shadow-[0_0_25px_rgba(84,82,238,0.25)]">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-36 h-12 bg-[#5452ee]/30 rounded-full blur-xl pointer-events-none" />

            {discountBadge && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5452ee] text-white text-[11px] font-bold uppercase tracking-wide shadow-sm">
                <Zap className="w-3 h-3 fill-white text-white" />
                <span>{discountBadge}</span>
              </div>
            )}

            <div className="space-y-0.5">
              {data.original_price > data.price && (
                <span className="text-xs text-[#797b9e] line-through font-medium block">
                  Giá gốc: {data.original_price.toLocaleString("vi-VN")} đ
                </span>
              )}
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
                {data.price.toLocaleString("vi-VN")} đ
              </div>
              {data.price_note && (
                <p className="text-xs text-[#9597be] font-normal">
                  {data.price_note}
                </p>
              )}
            </div>
          </div>

          {/* Nút Kêu Gọi Hành Động (CTA Button) */}
          <button
            type="button"
            onClick={() => setStep("checkout")}
            className="w-full py-3.5 sm:py-4 rounded-xl text-sm sm:text-base font-bold text-white bg-[#5452ee] hover:bg-[#4745dc] active:scale-[0.98] shadow-[0_4px_25px_rgba(84,82,238,0.45)] flex items-center justify-center gap-2 transition-all hover:scale-[1.01] cursor-pointer"
          >
            <Crown className="w-4 h-4 text-amber-300" />
            <span>{data.cta_text || "NÂNG CẤP VIP TRỌN ĐỜI"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Cam kết / Bảo mật thanh toán */}
          {data.security_note && (
            <div className="text-center text-xs text-[#9597be] flex items-center justify-center gap-1.5 font-normal">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{data.security_note}</span>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* MÀN HÌNH 2: QUÉT MÃ QR SEPAY THANH TOÁN (KÍCH HOẠT PRO TỰ ĐỘNG)           */
        /* ========================================================================= */
        <div className="relative z-10 space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
          {/* Back button */}
          <button
            type="button"
            onClick={() => setStep("details")}
            className="inline-flex items-center gap-1.5 text-xs text-[#9597be] hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Quay lại xem quyền lợi</span>
          </button>

          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold uppercase tracking-wider mb-0.5">
              <Zap className="w-3 h-3 fill-cyan-400 text-cyan-400" />
              <span>Cổng SePay Tự Động 24/7</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white font-serif">
              Quét Mã QR Chuyển Khoản
            </h3>
            <p className="text-xs text-[#9597be]">
              Hệ thống SePay tự động ghi nhận giao dịch &amp; nâng cấp VIP PRO ngay tức thì
            </p>
          </div>

          {/* Xác thực tài khoản người dùng */}
          {user ? (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300">Kích hoạt cho tài khoản:</span>
                <span className="font-bold text-white font-mono">{user.email}</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 font-semibold uppercase">
                Đã kết nối
              </span>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <p className="font-bold text-white">Bạn chưa đăng nhập tài khoản</p>
                  <p className="text-amber-200/80 mt-0.5 leading-relaxed">
                    Vui lòng đăng nhập trước khi quét mã để hệ thống tự động gán gói VIP PRO vào đúng tài khoản của bạn ngay khi tiền về.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/auth")}
                className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Đăng Nhập / Đăng Ký Tài Khoản Ngay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Trạng thái Realtime Radar SePay */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span>Đang lắng nghe biến động tài khoản qua SePay...</span>
            </div>
          </div>

          {/* Selected Plan Summary Banner */}
          <div className="p-3.5 rounded-2xl bg-[#1c1d38] border border-[#5452ee]/40 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#a2a4f6] block">
                {discountBadge}
              </span>
              <h4 className="text-sm font-bold text-white leading-tight">
                {data.title || "Gói VIP Toàn Diện TOEIC"}
              </h4>
              <span className="text-xs text-[#797b9e] block">
                Mã đơn: <span className="font-mono text-cyan-300 font-bold">{orderCode}</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg sm:text-xl font-black text-amber-300 font-mono">
                {data.price.toLocaleString("vi-VN")} đ
              </span>
            </div>
          </div>

          {/* SePay QR Code Box */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-700 shadow-md relative min-h-[220px]">
            {isCreatingOrder ? (
              <div className="flex flex-col items-center justify-center space-y-2 py-8 text-slate-600">
                <Loader2 className="w-8 h-8 animate-spin text-[#5452ee]" />
                <span className="text-xs font-medium">Đang tạo mã thanh toán SePay...</span>
              </div>
            ) : (
              <>
                <img
                  src={generateSepayQrUrl(
                    data.bank_name || "MBBank",
                    data.bank_account || "0334729066",
                    data.price,
                    transferSyntax
                  )}
                  alt="Mã QR SePay Chuyển Khoản Nâng Cấp VIP"
                  className="w-56 h-56 object-contain"
                />
                <div className="mt-2 text-center space-y-0.5">
                  <span className="text-[11px] text-slate-700 font-bold block">
                    Mở App Ngân hàng bất kỳ (MB, VCB, Techcombank, BIDV...) quét mã
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold block">
                    ✓ SePay tự động điền Số Tiền &amp; Mã Đơn Hàng vào app của bạn
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Bank Details Table with 1-Click Copy */}
          <div className="p-3.5 rounded-xl bg-[#171833] border border-white/10 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Ngân hàng:</span>
              <span className="font-bold text-white">{data.bank_name || "MBBank (Quân Đội)"}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Số tài khoản:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-cyan-400 text-sm">
                  {data.bank_account || "0334729066"}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(data.bank_account || "0334729066", "STK")}
                  className="p-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer transition-colors"
                  title="Sao chép STK"
                >
                  {copiedField === "STK" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Chủ tài khoản:</span>
              <span className="font-bold text-white">{data.account_holder || "HOANG CONG LUAN"}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Số tiền:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {data.price.toLocaleString("vi-VN")} đ
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(data.price.toString(), "Số tiền")}
                  className="p-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer transition-colors"
                  title="Sao chép số tiền"
                >
                  {copiedField === "Số tiền" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <div className="space-y-0.5">
                <span className="text-slate-400 block font-semibold">Nội dung CK:</span>
                <span className="text-[10px] text-amber-400/80 block">(Mã định danh SePay riêng của bạn)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-amber-300 text-sm bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {transferSyntax}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(transferSyntax, "Nội dung")}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer transition-colors"
                  title="Sao chép nội dung"
                >
                  {copiedField === "Nội dung" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Chú thích quan trọng cho khách hàng */}
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
              💡 <span className="font-bold text-amber-300">Lưu ý:</span> Khi quét mã, App ngân hàng sẽ tự điền nội dung. Nếu App để trống, bạn vui lòng dán đúng mã <span className="font-mono font-bold text-white bg-black/40 px-1 py-0.5 rounded">{transferSyntax}</span> vào ô Lời nhắn chuyển tiền để SePay tự động kích hoạt VIP trong 3–10 giây.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleManualCheck}
              disabled={isCheckingPayment}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all cursor-pointer disabled:opacity-60"
            >
              {isCheckingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang kiểm tra giao dịch qua SePay...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Tôi Đã Chuyển Khoản (Kiểm Tra Ngay)</span>
                </>
              )}
            </button>

            {/* Test Simulation Button (Dành cho Admin hoặc Kiểm chứng tính năng) */}
            {user && (
              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={isSimulating}
                className="w-full py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                {isSimulating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>[Thử Nghiệm] Giả Lập Thanh Toán Tự Động (Xem Nâng VIP Thật 100%)</span>
              </button>
            )}

            <a
              href={`https://zalo.me/${zaloNumber}?text=${encodeURIComponent(
                `Chào Thầy Luận, em vừa chuyển khoản SePay gói VIP: ${transferSyntax} (${data.price.toLocaleString("vi-VN")}đ)`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Nhắn Tin Zalo Hỗ Trợ 24/7 ({zaloNumber})</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export interface UpgradeProModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vipCombo?: HomepageShowcaseConfig["vip_combo"];
  initialStep?: "details" | "checkout";
}

export const UpgradeProModal: React.FC<UpgradeProModalProps> = ({
  open,
  onOpenChange,
  vipCombo,
  initialStep = "details",
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton
        className={cn(
          "p-0 border-0 bg-transparent shadow-none max-w-[460px] sm:max-w-[480px] w-full overflow-visible",
          "focus:outline-none focus-visible:outline-none",
          "[&>button:last-child]:hidden"
        )}
      >
        <UpgradeProCard
          onClose={() => onOpenChange(false)}
          showCloseButton={true}
          vipCombo={vipCombo}
          initialStep={initialStep}
        />
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeProModal;
