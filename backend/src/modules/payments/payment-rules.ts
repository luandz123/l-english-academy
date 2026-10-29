/** Giá mặc định như `DEFAULT_HOMEPAGE_CONFIG.vip_combo.price` (homepageShowcaseService.ts:128). */
export const DEFAULT_VIP_PRICE = 1_750_000;

/** Đơn pending của chính mình tạo trong khoảng này được dùng lại (UpgradeProModal.tsx:95). */
export const REUSE_PENDING_MS = 30 * 60 * 1000;

/**
 * Giá gói VIP lấy từ `platform_settings.homepage_showcase_config` (cùng nguồn giao diện
 * hiển thị, admin sửa ở trang cài đặt). JSON hỏng hoặc giá không hợp lệ → giá mặc định.
 */
export function vipPriceFromSetting(raw: string | null | undefined): number {
  if (!raw) return DEFAULT_VIP_PRICE;
  try {
    const parsed = JSON.parse(raw) as { vip_combo?: { price?: unknown } };
    const price = Number(parsed?.vip_combo?.price);
    return Number.isFinite(price) && price > 0
      ? Math.round(price)
      : DEFAULT_VIP_PRICE;
  } catch {
    return DEFAULT_VIP_PRICE;
  }
}

/**
 * Trích mã đơn từ nội dung chuyển khoản. Giữ đúng các mẫu của `api/payment-webhook.ts:20-36`
 * (LEAxxxx, VIPxxxx, "LEA 12345", hoặc chỉ 5-6 chữ số → "LEA" + số). Mã chỉ để **tra cứu**:
 * không có đơn trùng mã thì không kích hoạt gì (#23b).
 */
export function extractOrderCode(content: string): string | null {
  if (!content) return null;
  const match =
    content.match(/\b(LEA[A-Z0-9]{4,10})\b/i) ||
    content.match(/\b(VIP[A-Z0-9]{4,10})\b/i) ||
    content.match(/LEA\s*([0-9]{4,8})/i) ||
    content.match(/\b([0-9]{5,6})\b/);
  if (!match) return null;
  const raw = match[0].toUpperCase().replace(/\s+/g, '');
  return raw.startsWith('LEA') || raw.startsWith('VIP') ? raw : `LEA${raw}`;
}

/** Mã đơn mới như client cũ: "LEA" + 5 chữ số (UpgradeProModal.tsx:58). */
export function newOrderCode(random: () => number = Math.random): string {
  return `LEA${Math.floor(10000 + random() * 90000)}`;
}

/** #23a: chỉ kích hoạt khi chuyển **đủ** số tiền của đơn (bỏ ngưỡng 5.000đ cũ). */
export function isPaidInFull(
  transferAmount: number,
  orderAmount: number,
): boolean {
  return Number.isFinite(transferAmount) && transferAmount >= orderAmount;
}
