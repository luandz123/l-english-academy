import { getPublicSetting, saveSetting } from "@/lib/api/admin";
import {
  ArcadeGameItem,
  ArcadeSectionConfig,
  DEFAULT_ARCADE_GAMES,
  DEFAULT_ARCADE_SECTION,
  AVATAR_PRESETS,
  resolveGameAvatar,
  ARCADE_THEME_STYLES,
  ArcadeThemeColor,
} from "./arcadeGamesService";

export type { ArcadeGameItem, ArcadeSectionConfig, ArcadeThemeColor };
export { DEFAULT_ARCADE_GAMES, DEFAULT_ARCADE_SECTION, AVATAR_PRESETS, resolveGameAvatar, ARCADE_THEME_STYLES };

export interface ContactInfo {
  hotline: string;
  zalo_number: string;
  email: string;
  working_hours: string;
  facebook_url: string;
  tiktok_url: string;
  youtube_url: string;
}

export interface VipComboFeature {
  title: string;
  desc: string;
}

export interface TestimonialItem {
  id: string;
  name: string;
  score: string;
  score_increase?: string;
  avatar_emoji: string;
  quote: string;
  target?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface EtsCommitment {
  id: string;
  title: string;
  desc: string;
}

export interface HomepageShowcaseConfig {
  section_toggles: {
    show_categories: boolean;
    show_part2_banner: boolean;
    show_games: boolean;
    show_vip_combo: boolean;
    show_testimonials: boolean;
    show_faq: boolean;
    show_ets_commitments: boolean;
  };
  contact_info: ContactInfo;
  part2_banner: {
    badge: string;
    title: string;
    description: string;
    button_text: string;
    button_link: string;
  };
  vip_combo: {
    badge: string;
    title: string;
    subtitle: string;
    original_price: number;
    price: number;
    price_note: string;
    cta_text: string;
    security_note: string;
    features: VipComboFeature[];
    bank_name: string;
    bank_bin: string;
    bank_account: string;
    account_holder: string;
    transfer_syntax: string;
    discount_badge?: string;
    zalo_hotline?: string;
  };
  testimonials: TestimonialItem[];
  faqs: FaqItem[];
  commitments: EtsCommitment[];
  arcade_section: ArcadeSectionConfig;
}

export const SHOWCASE_CONFIG_STORAGE_KEY = "l_english_homepage_showcase_config";

export const DEFAULT_HOMEPAGE_CONFIG: HomepageShowcaseConfig = {
  section_toggles: {
    show_categories: true,
    show_part2_banner: true,
    show_games: true,
    show_vip_combo: true,
    show_testimonials: true,
    show_faq: true,
    show_ets_commitments: true,
  },
  arcade_section: DEFAULT_ARCADE_SECTION,
  contact_info: {
    hotline: "0334 729 066",
    zalo_number: "0334729066",
    email: "hotro@l-english.vn",
    working_hours: "8:00 - 22:00 hàng ngày (kể cả Thứ 7 & CN)",
    facebook_url: "https://www.facebook.com/YOUR_FACEBOOK",
    tiktok_url: "https://www.tiktok.com/@YOUR_TIKTOK",
    youtube_url: "https://www.youtube.com/@YOUR_YOUTUBE",
  },
  part2_banner: {
    badge: "Quy trình 8 bước độc quyền",
    title: "Luyện Nghe Phản Xạ TOEIC Part 2 (Quy Trình 8 Bước Độc Quyền)",
    description: "Bẻ nhỏ Functional Chunks • Phản xạ 1s bật nghĩa • Đoán hướng trả lời • Shadowing nối âm nuốt âm • Vạch trần bẫy ETS.",
    button_text: "Trải Nghiệm 8 Bước Ngay",
    button_link: "/part2-coach",
  },
  vip_combo: {
    badge: "GÓI VIP TOÀN DIỆN TOEIC · ƯU ĐÃI ĐỢT 1 TIẾT KIỆM 50%",
    title: "NÂNG CẤP VIP TRỌN ĐỜI",
    subtitle: "Mở khóa vĩnh viễn toàn bộ kho đề thi ETS 200 câu có giải chi tiết, hệ thống Dictation 8 bước và trọn bộ video bài giảng Part 1–7.",
    original_price: 3500000,
    price: 1750000,
    price_note: "Thanh toán 1 lần duy nhất để học trọn đời",
    cta_text: "MUA GÓI VIP TRỌN GÓI",
    security_note: "Kích hoạt tài khoản tự động ngay sau khi chuyển khoản",
    features: [
      {
        title: "Kho Đề Full Test ETS 200 Câu",
        desc: "Format 2026 chuẩn 120 phút, giải chi tiết 100%.",
      },
      {
        title: "Luyện Nghe Dictation Không Giới Hạn",
        desc: "Quy trình 8 bước độc quyền bẻ nhỏ âm thanh.",
      },
      {
        title: "Trọn Bộ Video Bài Giảng Part 1–7",
        desc: "Chiến thuật 5 giây xử lý bẫy ngữ pháp & từ loại.",
      },
      {
        title: "Cố Vấn Đồng Hành 1-1 Qua Zalo",
        desc: "Giải đáp thắc mắc câu hỏi khó 24/7 trực tiếp.",
      },
    ],
    bank_name: "MBBank",
    bank_bin: "970422",
    bank_account: "0334729066",
    account_holder: "HOANG CONG LUAN",
    transfer_syntax: "LEA [Mã Đơn Tự Động]",
    zalo_hotline: "0334729066",
  },
  testimonials: [
    {
      id: "t1",
      name: "Nguyễn Thị Mai",
      score: "855 / 990 TOEIC",
      score_increase: "+320 điểm sau 2 tháng",
      avatar_emoji: "👩‍🎓",
      target: "Mục tiêu ra trường & Nộp hồ sơ VinFast",
      quote: "Lộ trình cực kỳ sát đề thi thật! Mình chăm chỉ luyện 8 bước Part 2 và cày 10 đề Full Test trên web, lúc đi thi thật bấm giờ không hề bị khớp, tăng từ 535 lên 855 điểm.",
    },
    {
      id: "t2",
      name: "Trần Minh Đức",
      score: "780 / 990 TOEIC",
      score_increase: "+250 điểm",
      avatar_emoji: "👨‍💼",
      target: "Người đi làm bận rộn",
      quote: "Không cần đến trung tâm tốn hàng chục triệu. Mình học buổi tối 45 phút mỗi ngày, tính năng Nghe chép chính tả bẻ nhỏ âm thanh giúp mình nghe rõ từng nối âm nuốt âm của người bản xứ.",
    },
    {
      id: "t3",
      name: "Lê Hoàng Anh",
      score: "920 / 990 TOEIC",
      score_increase: "Thủ khoa khóa 2026",
      avatar_emoji: "👩‍💻",
      target: "Du học & Giảng dạy tiếng Anh",
      quote: "Bộ đề có đáp án giải thích từng bẫy ngữ pháp và từ vựng mở rộng cực chi tiết. Game Word Shooter và Word Defense giúp mình nạp 1000 từ vựng cốt lõi mà không bị ngán.",
    },
  ],
  faqs: [
    {
      question: "Sau khi chuyển khoản bao lâu thì tài khoản VIP được kích hoạt?",
      answer: "Hệ thống tự động kích hoạt trong vòng 3–5 phút ngay khi nhận được biến động số dư. Bạn cũng có thể gửi bill chuyển khoản qua Zalo để được duyệt ưu tiên ngay lập tức.",
    },
    {
      question: "Học trên web có được giảng viên hỗ trợ 1-1 không?",
      answer: "Có! Học viên gói VIP được tham gia nhóm Zalo học thuật và có cố vấn giải đáp mọi câu hỏi khó, bẫy đề thi 24/7 trong suốt quá trình ôn luyện.",
    },
    {
      question: "Kho đề thi có được cập nhật theo Format ETS 2026 mới nhất không?",
      answer: "Toàn bộ kho đề Full Test và bài Dictation được cập nhật liên tục bám sát format khảo thí ETS mới nhất. Bạn được truy cập toàn bộ đề mới trọn đời mà không tốn thêm chi phí.",
    },
    {
      question: "Tôi bị mất gốc tiếng Anh thì nên bắt đầu từ đâu?",
      answer: "Bạn nên bắt đầu với phần Luyện từ vựng Arcade và Luyện nghe phản xạ 8 bước Part 2 để lấy lại phản xạ âm thanh, sau đó mới bước vào giải đề Full Test 200 câu.",
    },
  ],
  commitments: [
    {
      id: "ets",
      title: "Bộ Đề Chuẩn ETS",
      desc: "Format 2026 sát đề thi thật",
    },
    {
      id: "game",
      title: "Game Từ Vựng Tùy Chọn",
      desc: "Luyện thi vui, nhớ từ siêu tốc",
    },
    {
      id: "dictation",
      title: "Dictation Đột Phá",
      desc: "Quy trình 8 bước bứt phá Listening",
    },
    {
      id: "mentor",
      title: "Đồng Hành 1-1",
      desc: "Cố vấn giải đáp 24/7 qua Zalo",
    },
  ],
};

/**
 * Tự động tính số tiền tiết kiệm và phần trăm giảm giá từ 2 mức giá
 */
export function calculateSavings(originalPrice: number, price: number) {
  const orig = Math.max(0, originalPrice || 0);
  const cur = Math.max(0, price || 0);
  const savings = Math.max(0, orig - cur);
  const percent = orig > 0 ? Math.round((savings / orig) * 100) : 0;
  return {
    savings,
    percent,
    badgeText: savings > 0 ? `TIẾT KIỆM ${savings.toLocaleString("vi-VN")} Đ (-${percent}%)` : "",
  };
}

/**
 * Tách biệt icon và mô tả của danh mục từ trường `icon`
 */
export function parseCategoryIconAndDesc(rawIcon: string | null | undefined): {
  icon: string;
  description: string;
} {
  if (!rawIcon) return { icon: "BookOpen", description: "" };
  if (rawIcon.includes(":::")) {
    const parts = rawIcon.split(":::");
    return {
      icon: parts[0]?.trim() || "BookOpen",
      description: parts.slice(1).join(":::").trim(),
    };
  }
  return { icon: rawIcon.trim() || "BookOpen", description: "" };
}

/**
 * Ghép icon và mô tả của danh mục để lưu vào database
 */
export function formatCategoryIconAndDesc(icon: string, description?: string): string {
  const cleanIcon = (icon || "BookOpen").trim();
  const cleanDesc = (description || "").trim();
  if (!cleanDesc) return cleanIcon;
  return `${cleanIcon}:::${cleanDesc}`;
}

export interface CategoryCourseStats {
  total: number;
  active: number;
}

/**
 * Thống kê số lượng khóa học (tổng số và số khóa đang bật) theo từng category_id.
 * courses.category_id là nguồn sự thật duy nhất.
 */
export function getCategoryCourseStats(
  courses: Array<{ category_id: number | null; is_active: boolean | null }>
): Record<number, CategoryCourseStats> {
  return courses.reduce<Record<number, CategoryCourseStats>>((acc, c) => {
    if (c.category_id) {
      if (!acc[c.category_id]) acc[c.category_id] = { total: 0, active: 0 };
      acc[c.category_id].total++;
      if (c.is_active) acc[c.category_id].active++;
    }
    return acc;
  }, {});
}

/**
 * Gom nhóm khóa học thuần theo category_id (nguồn sự thật duy nhất).
 */
export function groupCoursesByCategoryId<T extends { category_id: number | null }>(
  categories: Array<{ id: number }>,
  courses: T[]
): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const cat of categories) {
    map.set(cat.id, []);
  }
  for (const course of courses) {
    if (course.category_id && map.has(course.category_id)) {
      map.get(course.category_id)!.push(course);
    }
  }
  return map;
}

/**
 * Sinh link ảnh mã VietQR tự động theo chuẩn Napas 24/7 (hoặc SePay QR)
 */
export function generateVietQrUrl(
  bankBin: string,
  bankAccount: string,
  accountHolder: string,
  amount: number,
  syntax: string,
  template: "compact2" | "compact" | "qr_only" = "compact2"
): string {
  const bin = (bankBin || "970422").trim();
  const acc = (bankAccount || "0334729066").replace(/\s+/g, "").trim();
  const name = encodeURIComponent((accountHolder || "HOANG CONG LUAN").trim());
  const amt = Math.round(Number(amount) || 1750000);
  // Loại bỏ các ký tự đặc biệt có thể làm ứng dụng ngân hàng từ chối quét
  const cleanSyntax = (syntax || "VIP LENGLISH").replace(/[^a-zA-Z0-9_\-\s]/g, "").trim();
  const desc = encodeURIComponent(cleanSyntax);

  // Link chính thức chuẩn VietQR NAPAS 24/7 (tương thích 100% tất cả app ngân hàng)
  return `https://img.vietqr.io/image/${bin}-${acc}-${template}.png?amount=${amt}&addInfo=${desc}&accountName=${name}`;
}

/**
 * Sinh link ảnh SePay QR (chuyên dụng cho cổng SePay Webhook)
 * Tương thích 100% với toàn bộ App Ngân hàng Việt Nam (MB, VCB, BIDV, Techcombank...)
 * Tự động điền: Ngân hàng, STK, Số tiền, và Nội dung chuyển khoản
 */
export function generateSepayQrUrl(
  bankShortName: string,
  bankAccount: string,
  amount: number,
  syntax: string
): string {
  const bank = (bankShortName || "MBBank").replace(/\s+/g, "").trim();
  const acc = (bankAccount || "0334729066").replace(/\s+/g, "").trim();
  const amt = Math.round(Number(amount) || 1750000);
  // Loại bỏ khoảng trắng và ký tự đặc biệt, chuẩn hóa viết hoa (ví dụ: LEA83921)
  const cleanSyntax = (syntax || "LEAPRO").replace(/[^a-zA-Z0-9_\-]/g, "").trim().toUpperCase();
  const desc = encodeURIComponent(cleanSyntax);

  return `https://qr.sepay.vn/img?bank=${bank}&acc=${acc}&template=compact&amount=${amt}&des=${desc}`;
}

/**
 * Lấy cấu hình các mục trưng bày trang chủ
 */
export async function getHomepageShowcaseConfig(): Promise<HomepageShowcaseConfig> {
  try {
    const { data, error } = await getPublicSetting("homepage_showcase_config");

    if (!error && data?.value) {
      const parsed = JSON.parse(data.value);
      const merged: HomepageShowcaseConfig = {
        section_toggles: { ...DEFAULT_HOMEPAGE_CONFIG.section_toggles, ...(parsed.section_toggles || {}) },
        contact_info: { ...DEFAULT_HOMEPAGE_CONFIG.contact_info, ...(parsed.contact_info || {}) },
        part2_banner: { ...DEFAULT_HOMEPAGE_CONFIG.part2_banner, ...(parsed.part2_banner || {}) },
        vip_combo: {
          ...DEFAULT_HOMEPAGE_CONFIG.vip_combo,
          ...(parsed.vip_combo || {}),
          features: Array.isArray(parsed.vip_combo?.features) && parsed.vip_combo.features.length > 0
            ? parsed.vip_combo.features
            : DEFAULT_HOMEPAGE_CONFIG.vip_combo.features,
        },
        testimonials: Array.isArray(parsed.testimonials) && parsed.testimonials.length > 0
          ? parsed.testimonials
          : DEFAULT_HOMEPAGE_CONFIG.testimonials,
        faqs: Array.isArray(parsed.faqs) && parsed.faqs.length > 0
          ? parsed.faqs
          : DEFAULT_HOMEPAGE_CONFIG.faqs,
        commitments: Array.isArray(parsed.commitments) && parsed.commitments.length > 0
          ? parsed.commitments
          : DEFAULT_HOMEPAGE_CONFIG.commitments,
        arcade_section: {
          ...DEFAULT_ARCADE_SECTION,
          ...(parsed.arcade_section || {}),
          games: Array.isArray(parsed.arcade_section?.games) && parsed.arcade_section.games.length > 0
            ? parsed.arcade_section.games
            : DEFAULT_ARCADE_SECTION.games,
        },
      };
      localStorage.setItem(SHOWCASE_CONFIG_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn("[homepageShowcaseService] Failed to load from Supabase:", err);
  }

  try {
    const cached = localStorage.getItem(SHOWCASE_CONFIG_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        section_toggles: { ...DEFAULT_HOMEPAGE_CONFIG.section_toggles, ...(parsed.section_toggles || {}) },
        contact_info: { ...DEFAULT_HOMEPAGE_CONFIG.contact_info, ...(parsed.contact_info || {}) },
        part2_banner: { ...DEFAULT_HOMEPAGE_CONFIG.part2_banner, ...(parsed.part2_banner || {}) },
        vip_combo: {
          ...DEFAULT_HOMEPAGE_CONFIG.vip_combo,
          ...(parsed.vip_combo || {}),
          features: Array.isArray(parsed.vip_combo?.features) && parsed.vip_combo.features.length > 0
            ? parsed.vip_combo.features
            : DEFAULT_HOMEPAGE_CONFIG.vip_combo.features,
        },
        testimonials: Array.isArray(parsed.testimonials) && parsed.testimonials.length > 0
          ? parsed.testimonials
          : DEFAULT_HOMEPAGE_CONFIG.testimonials,
        faqs: Array.isArray(parsed.faqs) && parsed.faqs.length > 0
          ? parsed.faqs
          : DEFAULT_HOMEPAGE_CONFIG.faqs,
        commitments: Array.isArray(parsed.commitments) && parsed.commitments.length > 0
          ? parsed.commitments
          : DEFAULT_HOMEPAGE_CONFIG.commitments,
        arcade_section: {
          ...DEFAULT_ARCADE_SECTION,
          ...(parsed.arcade_section || {}),
          games: Array.isArray(parsed.arcade_section?.games) && parsed.arcade_section.games.length > 0
            ? parsed.arcade_section.games
            : DEFAULT_ARCADE_SECTION.games,
        },
      };
    }
  } catch (err) {
    console.warn("[homepageShowcaseService] Failed to parse local cache:", err);
  }

  return DEFAULT_HOMEPAGE_CONFIG;
}

/**
 * Lưu cấu hình các mục trưng bày trang chủ
 */
export async function saveHomepageShowcaseConfig(config: HomepageShowcaseConfig): Promise<void> {
  const jsonStr = JSON.stringify(config);
  localStorage.setItem(SHOWCASE_CONFIG_STORAGE_KEY, jsonStr);

  try {
    const { error } = await saveSetting("homepage_showcase_config", jsonStr);
    if (error) throw error;
  } catch (err) {
    console.error("[homepageShowcaseService] Error saving to Supabase:", err);
    throw err;
  }
}
