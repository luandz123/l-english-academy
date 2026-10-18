import iconWordDefense from "@/assets/icons/icon-word-defense.webp";
import iconWordShooter from "@/assets/icons/icon-word-shooter.webp";
import iconVocabPacks from "@/assets/icons/icon-vocab-packs.webp";
import iconArcade3d from "@/assets/icons/icon-arcade-3d.webp";
import iconTrophy3d from "@/assets/icons/icon-trophy-3d.webp";
import iconVipCrown3d from "@/assets/icons/icon-vip-crown-3d.webp";
import iconFlame3d from "@/assets/icons/icon-flame-3d.webp";
import iconDictation3d from "@/assets/icons/icon-dictation-3d.webp";
import iconFulltest3d from "@/assets/icons/icon-fulltest-3d.webp";
import iconGift3d from "@/assets/icons/icon-gift-3d.webp";

export type ArcadeThemeColor = "emerald" | "cyan" | "purple" | "amber" | "rose" | "blue";

export interface ArcadeGameItem {
  id: string;
  title: string;
  description: string;
  badge: string;
  avatar_url: string; // preset identifier like 'preset:defense' or direct image URL / Data URL
  action_url: string;
  action_text: string;
  footer_tag: string;
  is_active: boolean; // Trò nào còn cho chơi, trò nào tắt
  order: number; // Vị trí trò chơi (thứ tự 0, 1, 2...)
  theme_color?: ArcadeThemeColor;
  hide_when_inactive?: boolean; // Nếu true: ẩn hẳn khi tắt; Nếu false: hiển thị kèm nhãn Tạm bảo trì
}

export interface ArcadeSectionConfig {
  badge: string;
  title: string;
  description: string;
  view_all_text: string;
  view_all_url: string;
  games: ArcadeGameItem[];
}

export interface AvatarPresetOption {
  key: string;
  label: string;
  src: string;
  category?: string;
}

export const AVATAR_PRESETS: AvatarPresetOption[] = [
  { key: "preset:defense", label: "🌻 Đậu Thần / Word Defense (PvZ)", src: iconWordDefense, category: "Game" },
  { key: "preset:shooter", label: "🚀 Phi Cơ Sky Strike", src: iconWordShooter, category: "Game" },
  { key: "preset:vocab", label: "🎁 Rương Bộ Từ Vựng", src: iconVocabPacks, category: "Kho từ" },
  { key: "preset:arcade", label: "🕹️ Máy Chơi Game Arcade 3D", src: iconArcade3d, category: "Arcade" },
  { key: "preset:trophy", label: "🏆 Cúp Vàng Đấu Trường 3D", src: iconTrophy3d, category: "Xếp hạng" },
  { key: "preset:crown", label: "👑 Vương Miện VIP 3D", src: iconVipCrown3d, category: "VIP" },
  { key: "preset:flame", label: "🔥 Chuỗi Lửa Chiến 3D", src: iconFlame3d, category: "Chiến tích" },
  { key: "preset:dictation", label: "🎧 Nghe Dictation 3D", src: iconDictation3d, category: "Luyện nghe" },
  { key: "preset:fulltest", label: "📝 Đề Thi Full Test 3D", src: iconFulltest3d, category: "Đề thi" },
  { key: "preset:gift", label: "📦 Hộp Quà May Mắn 3D", src: iconGift3d, category: "Phần thưởng" },
];

/**
 * Phân giải avatar_url thành URL hình ảnh thực tế (icon WebP hoặc link online)
 */
export function resolveGameAvatar(avatarUrl: string | null | undefined): string {
  if (!avatarUrl) return iconArcade3d;
  const found = AVATAR_PRESETS.find((p) => p.key === avatarUrl);
  if (found) return found.src;
  return avatarUrl;
}

export const DEFAULT_ARCADE_GAMES: ArcadeGameItem[] = [
  {
    id: "word-defense",
    title: "Word Defense: Cuộc Chiến Khu Vườn",
    description: "Bảo vệ khu vườn bằng cách gõ từ vựng triệu hồi Đậu Thần, Băng Tiễn, Bom Anh Đào. Giải mã khiên quái vật, luyện phản xạ từ vựng cấp tốc.",
    badge: "MỚI • PVZ STYLE",
    avatar_url: "preset:defense",
    action_url: "/games/word-defense",
    action_text: "⚔️ Chơi Ngay",
    footer_tag: "Chọn mọi bộ từ vựng",
    is_active: true,
    order: 0,
    theme_color: "emerald",
    hide_when_inactive: false,
  },
  {
    id: "word-shooter",
    title: "Phi Cơ Diệt Từ Vựng (Sky Strike 2.0)",
    description: "Lái chiến đấu cơ bắn nổ từ vựng đang rơi bằng cách gõ phím. Tích hợp audio phát âm chuẩn TTS, popup nghĩa nổ và đóng băng từ đặc biệt.",
    badge: "HOT • NÂNG CẤP 2.0",
    avatar_url: "preset:shooter",
    action_url: "/games/word-shooter",
    action_text: "🚀 Xuất Kích",
    footer_tag: "Có Audio TTS & PvP",
    is_active: true,
    order: 1,
    theme_color: "cyan",
    hide_when_inactive: false,
  },
  {
    id: "vocab-packs",
    title: "Kho Bộ Từ Vựng Đa Dạng",
    description: "Tùy ý nạp bộ từ: TOEIC 600 Master, Giao tiếp hàng ngày, Công nghệ, hoặc tự tạo bộ từ vựng cá nhân để chơi game.",
    badge: "TÙY CHỌN BỘ TỪ",
    avatar_url: "preset:vocab",
    action_url: "/games",
    action_text: "🕹️ Vào Kho Game",
    footer_tag: "1.000+ từ cốt lõi",
    is_active: true,
    order: 2,
    theme_color: "purple",
    hide_when_inactive: false,
  },
];

export const DEFAULT_ARCADE_SECTION: ArcadeSectionConfig = {
  badge: "ARCADE GAMIFICATION · VỪA HỌC VỪA CHƠI",
  title: "KHU VỰC TRÒ CHƠI HỌC TỪ VỰNG THEO BỘ TỪ VỰNG TÙY CHỌN",
  description: "Chọn bộ từ vựng yêu thích (TOEIC 600 từ, Giao tiếp, Công nghệ...) và chiến game ngay!",
  view_all_text: "Vào đấu trường Game",
  view_all_url: "/games",
  games: DEFAULT_ARCADE_GAMES,
};

/**
 * Bản đồ CSS Theme Color cho thẻ Game Bento
 */
export const ARCADE_THEME_STYLES: Record<
  ArcadeThemeColor,
  {
    border: string;
    borderHover: string;
    shadowHover: string;
    avatarBg: string;
    avatarBorder: string;
    avatarShadow: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    titleHover: string;
    buttonGradient: string;
    buttonShadow: string;
  }
> = {
  emerald: {
    border: "border-emerald-500/30",
    borderHover: "hover:border-emerald-400/60",
    shadowHover: "hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]",
    avatarBg: "bg-emerald-500/20",
    avatarBorder: "border-emerald-500/40",
    avatarShadow: "shadow-emerald-500/20",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-300",
    badgeBorder: "border-emerald-500/40",
    titleHover: "group-hover:text-emerald-300",
    buttonGradient: "from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500",
    buttonShadow: "shadow-[0_0_15px_rgba(16,185,129,0.4)]",
  },
  cyan: {
    border: "border-cyan-500/30",
    borderHover: "hover:border-cyan-400/60",
    shadowHover: "hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]",
    avatarBg: "bg-cyan-500/20",
    avatarBorder: "border-cyan-500/40",
    avatarShadow: "shadow-cyan-500/20",
    badgeBg: "bg-cyan-500/20",
    badgeText: "text-cyan-300",
    badgeBorder: "border-cyan-500/40",
    titleHover: "group-hover:text-cyan-300",
    buttonGradient: "from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500",
    buttonShadow: "shadow-[0_0_15px_rgba(6,182,212,0.4)]",
  },
  purple: {
    border: "border-purple-500/30",
    borderHover: "hover:border-purple-400/60",
    shadowHover: "hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]",
    avatarBg: "bg-purple-500/20",
    avatarBorder: "border-purple-500/40",
    avatarShadow: "shadow-purple-500/20",
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-300",
    badgeBorder: "border-purple-500/40",
    titleHover: "group-hover:text-purple-300",
    buttonGradient: "from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500",
    buttonShadow: "shadow-[0_0_15px_rgba(168,85,247,0.4)]",
  },
  amber: {
    border: "border-amber-500/30",
    borderHover: "hover:border-amber-400/60",
    shadowHover: "hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]",
    avatarBg: "bg-amber-500/20",
    avatarBorder: "border-amber-500/40",
    avatarShadow: "shadow-amber-500/20",
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-300",
    badgeBorder: "border-amber-500/40",
    titleHover: "group-hover:text-amber-300",
    buttonGradient: "from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500",
    buttonShadow: "shadow-[0_0_15px_rgba(245,158,11,0.4)]",
  },
  rose: {
    border: "border-rose-500/30",
    borderHover: "hover:border-rose-400/60",
    shadowHover: "hover:shadow-[0_0_30px_rgba(244,63,94,0.3)]",
    avatarBg: "bg-rose-500/20",
    avatarBorder: "border-rose-500/40",
    avatarShadow: "shadow-rose-500/20",
    badgeBg: "bg-rose-500/20",
    badgeText: "text-rose-300",
    badgeBorder: "border-rose-500/40",
    titleHover: "group-hover:text-rose-300",
    buttonGradient: "from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500",
    buttonShadow: "shadow-[0_0_15px_rgba(244,63,94,0.4)]",
  },
  blue: {
    border: "border-blue-500/30",
    borderHover: "hover:border-blue-400/60",
    shadowHover: "hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]",
    avatarBg: "bg-blue-500/20",
    avatarBorder: "border-blue-500/40",
    avatarShadow: "shadow-blue-500/20",
    badgeBg: "bg-blue-500/20",
    badgeText: "text-blue-300",
    badgeBorder: "border-blue-500/40",
    titleHover: "group-hover:text-blue-300",
    buttonGradient: "from-blue-500 to-cyan-600 hover:from-blue-400 hover:to-cyan-500",
    buttonShadow: "shadow-[0_0_15px_rgba(59,130,246,0.4)]",
  },
};
