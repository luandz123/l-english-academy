import React, { useState, useEffect } from "react";
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
  ExternalLink
} from "lucide-react";
import { 
  generateVietQrUrl, 
  getHomepageShowcaseConfig, 
  DEFAULT_HOMEPAGE_CONFIG,
  calculateSavings,
  type HomepageShowcaseConfig 
} from "@/services/homepageShowcaseService";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

  const { user } = useAuth();
  const { toast } = useToast();

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

  // Cú pháp chuyển khoản tự động kèm định danh học viên
  const userIdentifier = user?.phone || user?.email?.split("@")[0] || "HOCVIEN";
  const rawSyntax = data.transfer_syntax || "VIP [SĐT]";
  const transferSyntax = rawSyntax.replace(/\[.*?\]/g, userIdentifier.toUpperCase());

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

  const handleTransferDone = () => {
    toast({
      title: "Cảm ơn bạn đã đăng ký VIP!",
      description: "Hệ thống đang đối soát và sẽ kích hoạt tài khoản trong ít phút. Bạn cũng có thể nhắn Zalo để được duyệt tức thì.",
    });
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

      {step === "details" ? (
        /* ========================================================================= */
        /* MÀN HÌNH 1: CHI TIẾT GÓI VIP & QUYỀN LỢI (CHUẨN THIẾT KẾ MẪU MỚI)        */
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

          {/* Feature Checklist (Dấu check tròn trắng `● ✓` thanh lịch theo mẫu) */}
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

          {/* Pricing Ticket Card (Thẻ giá nổi bật theo mẫu Good Deal) */}
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
        /* MÀN HÌNH 2: QUÉT MÃ VIETQR THANH TOÁN (KÍCH HOẠT TỰ ĐỘNG)                 */
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
            <h3 className="text-xl sm:text-2xl font-bold text-white font-serif">
              Quét Mã VietQR Thanh Toán
            </h3>
            <p className="text-xs text-[#9597be]">
              Hệ thống tự động kích hoạt tài khoản ngay khi nhận được chuyển khoản
            </p>
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
                {data.price_note || "Học trọn đời"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg sm:text-xl font-black text-amber-300 font-mono">
                {data.price.toLocaleString("vi-VN")} đ
              </span>
            </div>
          </div>

          {/* VietQR Code Box */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-700 shadow-md">
            <img
              src={generateVietQrUrl(
                data.bank_bin || "970422",
                data.bank_account || "0334729066",
                data.account_holder || "HOANG CONG LUAN",
                data.price,
                transferSyntax
              )}
              alt="VietQR Chuyển Khoản Nâng Cấp VIP"
              className="w-44 h-44 object-contain"
            />
            <span className="text-[11px] text-slate-600 font-medium mt-1 text-center">
              Mở App Ngân hàng bất kỳ (MB, VCB, BIDV, Techcombank...) để quét mã
            </span>
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
              <span className="text-slate-400">Nội dung CK:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-amber-300">{transferSyntax}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(transferSyntax, "Nội dung")}
                  className="p-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer transition-colors"
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
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleTransferDone}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Tôi Đã Chuyển Khoản Thành Công</span>
            </button>

            <a
              href={`https://zalo.me/${zaloNumber}?text=${encodeURIComponent(
                `Chào Thầy Luận, em vừa chuyển khoản đăng ký gói VIP: ${transferSyntax} (${data.price.toLocaleString("vi-VN")}đ)`
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
