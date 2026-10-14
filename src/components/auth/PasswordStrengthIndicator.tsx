import React from "react";
import { Check, X, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export interface PasswordAnalysis {
  score: number; // 0 to 4
  hasMinLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  hasSpecialOrUpper: boolean;
  label: string;
  colorClass: string;
  bgColorClass: string;
  isAcceptable: boolean;
}

export function analyzePassword(password: string): PasswordAnalysis {
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialOrUpper = /[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (hasMinLength) score++;
  if (hasLetter) score++;
  if (hasNumber) score++;
  if (hasSpecialOrUpper) score++;

  if (password.length === 0) {
    return {
      score: 0,
      hasMinLength: false,
      hasLetter: false,
      hasNumber: false,
      hasSpecialOrUpper: false,
      label: "Chưa nhập",
      colorClass: "text-slate-500",
      bgColorClass: "bg-slate-700",
      isAcceptable: false,
    };
  }

  if (score <= 1) {
    return {
      score: 1,
      hasMinLength,
      hasLetter,
      hasNumber,
      hasSpecialOrUpper,
      label: "Rất yếu",
      colorClass: "text-rose-400",
      bgColorClass: "bg-rose-500",
      isAcceptable: false,
    };
  }

  if (score === 2) {
    return {
      score: 2,
      hasMinLength,
      hasLetter,
      hasNumber,
      hasSpecialOrUpper,
      label: "Yếu",
      colorClass: "text-amber-400",
      bgColorClass: "bg-amber-500",
      isAcceptable: false,
    };
  }

  if (score === 3) {
    return {
      score: 3,
      hasMinLength,
      hasLetter,
      hasNumber,
      hasSpecialOrUpper,
      label: "Khá",
      colorClass: "text-cyan-400",
      bgColorClass: "bg-cyan-500",
      isAcceptable: hasMinLength && hasLetter && hasNumber,
    };
  }

  return {
    score: 4,
    hasMinLength,
    hasLetter,
    hasNumber,
    hasSpecialOrUpper,
    label: "Rất mạnh",
    colorClass: "text-emerald-400",
    bgColorClass: "bg-emerald-500",
    isAcceptable: true,
  };
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  className,
}) => {
  if (!password) return null;

  const analysis = analyzePassword(password);

  return (
    <div className={cn("space-y-2 mt-2 pt-1 animate-in fade-in duration-200", className)}>
      {/* Visual Multi-Segment Bar */}
      <div className="flex items-center justify-between gap-1.5">
        {[1, 2, 3, 4].map((step) => {
          const isActive = analysis.score >= step;
          return (
            <div
              key={step}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-300",
                isActive ? analysis.bgColorClass : "bg-slate-800"
              )}
            />
          );
        })}
      </div>

      {/* Label & Status */}
      <div className="flex items-center justify-between text-[11px] font-semibold">
        <span className="text-slate-400 flex items-center gap-1">
          Độ bảo mật:
          <span className={cn("font-bold", analysis.colorClass)}>{analysis.label}</span>
        </span>
        {analysis.isAcceptable ? (
          <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" /> Đạt chuẩn an toàn
          </span>
        ) : (
          <span className="text-amber-400 flex items-center gap-1 text-[11px]">
            <ShieldAlert className="w-3.5 h-3.5" /> Cần tối thiểu 8 ký tự, có chữ & số
          </span>
        )}
      </div>

      {/* Checklist criteria */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-400 pt-0.5">
        <div className="flex items-center gap-1.5">
          {analysis.hasMinLength ? (
            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
          ) : (
            <X className="w-3 h-3 text-slate-600 shrink-0" />
          )}
          <span className={analysis.hasMinLength ? "text-slate-200" : ""}>Tối thiểu 8 ký tự</span>
        </div>
        <div className="flex items-center gap-1.5">
          {analysis.hasLetter ? (
            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
          ) : (
            <X className="w-3 h-3 text-slate-600 shrink-0" />
          )}
          <span className={analysis.hasLetter ? "text-slate-200" : ""}>Có chứa chữ cái</span>
        </div>
        <div className="flex items-center gap-1.5">
          {analysis.hasNumber ? (
            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
          ) : (
            <X className="w-3 h-3 text-slate-600 shrink-0" />
          )}
          <span className={analysis.hasNumber ? "text-slate-200" : ""}>Có chứa chữ số (0-9)</span>
        </div>
        <div className="flex items-center gap-1.5">
          {analysis.hasSpecialOrUpper ? (
            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
          ) : (
            <X className="w-3 h-3 text-slate-600 shrink-0" />
          )}
          <span className={analysis.hasSpecialOrUpper ? "text-slate-200" : ""}>Chữ hoa / ký tự đặc biệt</span>
        </div>
      </div>
    </div>
  );
};
