import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import {
  createPaymentOrder,
  getPaymentOrder,
  simulatePayment,
  watchPaymentOrder,
  type PaymentOrderRow,
} from "@/lib/api/payments";
import {
  DEFAULT_HOMEPAGE_CONFIG,
  generateSepayQrUrl,
  getHomepageShowcaseConfig,
  type HomepageShowcaseConfig,
} from "@/services/homepageShowcaseService";

/** Khóa học cần mua (giá chỉ để hiển thị trước; số tiền thật do server trả về trong đơn). */
export interface PurchasableCourse {
  id: number;
  title: string;
  price?: number | null;
  course_type?: string | null;
}

export interface CoursePurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: PurchasableCourse | null;
}

const formatVnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;

/** Trang vào học đúng loại khóa (CourseDetailRedirect cũng làm vậy). */
export const courseEntryPath = (course: PurchasableCourse) =>
  course.course_type === "fulltest"
    ? `/courses/${course.id}/fulltest`
    : course.course_type === "flashcard"
    ? `/courses/${course.id}/vocab`
    : `/courses/${course.id}/learn`;

/**
 * Mua một khóa học qua chuyển khoản SePay (thay popup nâng cấp VIP — UX_REVIEW D6).
 * Server tạo đơn với giá của khóa; tiền về đúng mã đơn → ghi danh khóa đó.
 */
export const CoursePurchaseModal: React.FC<CoursePurchaseModalProps> = ({ open, onOpenChange, course }) => {
  const { user, refreshUserData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [order, setOrder] = useState<PaymentOrderRow | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [alreadyOwned, setAlreadyOwned] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const stopWatchRef = useRef<(() => void) | null>(null);

  // Thông tin tài khoản nhận tiền do admin cấu hình (dùng chung cài đặt trang chủ)
  const { data: showcase = DEFAULT_HOMEPAGE_CONFIG } = useQuery<HomepageShowcaseConfig>({
    queryKey: ["homepage-showcase-config"],
    queryFn: () => getHomepageShowcaseConfig(),
  });
  const bank = showcase.vip_combo || DEFAULT_HOMEPAGE_CONFIG.vip_combo;
  const zaloNumber = bank.zalo_hotline || "0334729066";

  const onPaid = async () => {
    setIsPaid(true);
    await refreshUserData();
    // Làm mới quyền học và danh sách khóa của tôi
    await queryClient.invalidateQueries();
    toast({ title: "🎉 Thanh toán thành công!", description: `Bạn đã sở hữu khóa "${course?.title}".` });
  };

  // Mở popup (đã đăng nhập) → tạo hoặc dùng lại đơn của khóa này
  useEffect(() => {
    if (!open || !user || !course) return;
    let alive = true;
    setOrder(null);
    setOrderError(null);
    setAlreadyOwned(false);
    setIsPaid(false);
    setIsCreating(true);
    createPaymentOrder(course.id).then(({ data, error }) => {
      if (!alive) return;
      setIsCreating(false);
      if (error) {
        if (error.code === "ALREADY_ENROLLED") setAlreadyOwned(true);
        else setOrderError(getFriendlyErrorMessage(error) || error.message);
        return;
      }
      setOrder(data);
    });
    return () => {
      alive = false;
    };
    // Chỉ chạy lại khi mở popup, đổi người dùng hoặc đổi khóa (không chạy lại khi làm mới hồ sơ sau thanh toán)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id, course?.id]);

  // Theo dõi đơn tới khi tiền về
  useEffect(() => {
    stopWatchRef.current?.();
    stopWatchRef.current = null;
    if (!open || !order || isPaid) return;
    stopWatchRef.current = watchPaymentOrder(order.order_code, onPaid);
    return () => {
      stopWatchRef.current?.();
      stopWatchRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order, isPaid]);

  if (!course) return null;

  const transferSyntax = (order?.order_code || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const amount = order?.amount ?? Number(course.price || 0);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedField(label);
    toast({ title: `Đã sao chép ${label}`, description: text });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleManualCheck = async () => {
    if (!order) return;
    setIsChecking(true);
    const { data } = await getPaymentOrder(order.order_code);
    setIsChecking(false);
    if (data?.completed) {
      await onPaid();
      return;
    }
    toast({
      title: "Chưa ghi nhận tiền vào",
      description: `Hệ thống chưa thấy giao dịch cho mã ${order.order_code}. Nếu bạn vừa chuyển khoản, đợi 5–15 giây rồi kiểm tra lại.`,
    });
  };

  const handleSimulate = async () => {
    if (!order) return;
    setIsSimulating(true);
    const { error } = await simulatePayment(order.order_code);
    setIsSimulating(false);
    if (error) {
      toast({ title: "Lỗi giả lập", description: error.message, variant: "destructive" });
      return;
    }
    await onPaid();
  };

  const goLearn = () => {
    onOpenChange(false);
    navigate(courseEntryPath(course));
  };

  const card = "p-3.5 rounded-2xl bg-[#171833] border border-white/10";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-1.5rem)] max-h-[92vh] overflow-y-auto p-0 border-0 bg-transparent shadow-none [&>button]:right-5 [&>button]:top-5 [&>button]:text-slate-300">
        <div className="relative w-full rounded-[28px] bg-gradient-to-b from-[#181938] via-[#121327] to-[#0c0d1d] border border-[#2d2f5e]/90 text-white shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] p-6 sm:p-7 space-y-4">
          <div className="text-center space-y-1.5 pr-6 pl-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold uppercase tracking-wider">
              <Zap className="w-3 h-3 fill-cyan-400 text-cyan-400" />
              <span>Mua khóa học</span>
            </div>
            <DialogTitle className="text-xl font-bold text-white leading-snug">{course.title}</DialogTitle>
            <DialogDescription className="text-xs text-[#9597be]">
              Thanh toán một lần bằng chuyển khoản. Khóa học được mở ngay khi tiền về.
            </DialogDescription>
          </div>

          {isPaid || alreadyOwned ? (
            <div className="space-y-4 py-2 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-300 stroke-[3]" />
              </div>
              <p className="text-sm text-slate-200">
                {isPaid ? "Thanh toán thành công. Khóa học đã được mở cho tài khoản của bạn." : "Bạn đã sở hữu khóa học này."}
              </p>
              <button
                type="button"
                onClick={goLearn}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 font-bold text-sm flex items-center justify-center gap-2"
              >
                <span>Vào học ngay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : !user ? (
            <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <p className="leading-relaxed">
                  <span className="font-bold text-white block">Bạn chưa đăng nhập</span>
                  Đăng nhập để nhận mã chuyển khoản riêng. Hệ thống dùng mã này để mở khóa học cho đúng tài khoản của bạn.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/login", { state: { from: location } })}
                  className="h-10 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  Đăng nhập <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/register", { state: { from: location } })}
                  className="h-10 rounded-lg bg-white/10 hover:bg-white/15 border border-amber-500/40 font-bold text-xs"
                >
                  Tạo tài khoản
                </button>
              </div>
            </div>
          ) : isCreating ? (
            <div className="py-10 flex flex-col items-center gap-3 text-sm text-slate-300">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              Đang tạo mã thanh toán...
            </div>
          ) : orderError || !order ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-sm text-center">
              {orderError || "Không tạo được đơn thanh toán. Vui lòng thử lại."}
            </div>
          ) : (
            <>
              <div className={`${card} flex items-center justify-between`}>
                <span className="text-xs text-slate-400">Số tiền</span>
                <span className="font-mono font-bold text-xl text-amber-300">{formatVnd(amount)}</span>
              </div>

              <div className="p-4 rounded-2xl bg-white flex flex-col items-center gap-2">
                <img
                  src={generateSepayQrUrl(bank.bank_name, bank.bank_account, amount, transferSyntax)}
                  alt={`Mã QR chuyển khoản ${formatVnd(amount)} cho đơn ${order.order_code}`}
                  className="w-52 h-52 object-contain"
                />
                <p className="text-[11px] text-slate-600 text-center">Mở app ngân hàng bất kỳ và quét mã. Số tiền và nội dung được điền sẵn.</p>
              </div>

              <div className={`${card} space-y-2.5 text-xs`}>
                {[
                  { label: "Ngân hàng", value: bank.bank_name || "MBBank", copy: false },
                  { label: "Số tài khoản", value: bank.bank_account || "0334729066", copy: true },
                  { label: "Chủ tài khoản", value: bank.account_holder || "HOANG CONG LUAN", copy: false },
                  { label: "Nội dung CK", value: transferSyntax, copy: true },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">{row.label}</span>
                    <span className="flex items-center gap-1.5">
                      <span className={row.label === "Nội dung CK" ? "font-mono font-bold text-amber-300" : "font-bold text-white"}>{row.value}</span>
                      {row.copy && (
                        <button
                          type="button"
                          onClick={() => handleCopy(row.value, row.label)}
                          aria-label={`Sao chép ${row.label}`}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center"
                        >
                          {copiedField === row.label ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </span>
                  </div>
                ))}
                <p className="pt-2 border-t border-white/5 text-[11px] text-amber-200/90 leading-relaxed">
                  Nếu app ngân hàng không tự điền, hãy ghi đúng nội dung <span className="font-mono font-bold text-white">{transferSyntax}</span> để hệ thống tự mở khóa học trong vài giây.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-cyan-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang chờ tiền về...
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleManualCheck}
                  disabled={isChecking}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  <span>Tôi đã chuyển khoản, kiểm tra ngay</span>
                </button>
                {import.meta.env.VITE_PAYMENT_SIMULATION === "true" && (
                  <button
                    type="button"
                    onClick={handleSimulate}
                    disabled={isSimulating}
                    className="w-full h-10 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-300 font-bold text-xs flex items-center justify-center gap-2"
                  >
                    {isSimulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    [Thử nghiệm] Giả lập thanh toán
                  </button>
                )}
                <a
                  href={`https://zalo.me/${zaloNumber}?text=${encodeURIComponent(`Chào thầy, em vừa chuyển khoản mua khóa "${course.title}", mã ${transferSyntax}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
                  Cần hỗ trợ? Nhắn Zalo 0334 729 066
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CoursePurchaseModal;
