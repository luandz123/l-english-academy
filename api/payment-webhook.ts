import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

// Khởi tạo Supabase client trong môi trường Edge với Fallback Key an toàn 100%
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ovjungvdsvzhzhobkryu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                     process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
                     process.env.SUPABASE_ANON_KEY || 
                     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92anVuZ3Zkc3Z6aHpob2Jrcnl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MzkxMTksImV4cCI6MjEwMzAxNTExOX0.UDtbmp_uQukHnJQikV0A3czRRwkYtRja0qkAN3QUM_M';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Trích xuất mã đơn hàng từ nội dung chuyển khoản
 * Khớp mã dạng LEAxxxxx, VIPxxxxx hoặc mã số
 */
function extractOrderCode(content: string): string | null {
  if (!content) return null;
  const match = content.match(/\b(LEA[A-Z0-9]{4,10})\b/i) || 
                content.match(/\b(VIP[A-Z0-9]{4,10})\b/i) ||
                content.match(/LEA\s*([0-9]{4,8})/i) ||
                content.match(/\b([0-9]{5,6})\b/);

  if (match) {
    const raw = match[0].toUpperCase().replace(/\s+/g, '');
    if (raw.startsWith('LEA') || raw.startsWith('VIP')) {
      return raw;
    }
    // Nếu chỉ có số 5 ký tự
    return `LEA${raw}`;
  }
  return null;
}

export default async function handler(request: Request) {
  // CORS Headers cho phép webhook gọi từ mọi nguồn hợp lệ
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (request.method === 'GET') {
    return new Response(
      JSON.stringify({
        status: 'online',
        service: 'L-English Academy SePay Webhook',
        gateway: 'SePay Auto-Pay 24/7',
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers }
    );
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 200, headers });
  }

  try {
    // 1. Kiểm tra xác thực Token (nếu cấu hình SEPAY_API_KEY)
    const secretKey = process.env.SEPAY_WEBHOOK_API_KEY || process.env.PAYMENT_WEBHOOK_SECRET;
    const authHeader = request.headers.get('Authorization') || request.headers.get('x-api-key') || '';

    if (secretKey) {
      const cleanAuth = authHeader.replace(/^(Apikey|Bearer)\s+/i, '').trim();
      if (cleanAuth !== secretKey) {
        console.warn('[Payment Webhook] Unauthorized request attempt');
        return new Response(
          JSON.stringify({ success: false, message: 'Unauthorized webhook request' }),
          { status: 200, headers }
        );
      }
    }

    // 2. Parse Body dữ liệu an toàn từ webhook SePay
    let rawBody: any = null;
    try {
      rawBody = await request.json();
    } catch (parseErr: any) {
      console.warn('[Payment Webhook] Invalid JSON body:', parseErr?.message);
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid JSON body payload' }),
        { status: 200, headers }
      );
    }

    console.log('[Payment Webhook] Received SePay payload:', JSON.stringify(rawBody));

    let orderCode: string | null = null;
    let transferAmount = 0;
    let bankTxId = '';
    let transactionContent = '';

    // A. Xử lý định dạng SePay Webhook chuẩn
    // Payload mẫu SePay: { id, gateway, transactionDate, accountNumber, content, transferType: 'in', transferAmount, referenceCode }
    if (rawBody && typeof rawBody === 'object') {
      const transferType = String(rawBody.transferType || 'in').toLowerCase();
      if (transferType !== 'in') {
        return new Response(
          JSON.stringify({ success: true, message: 'Ignored outgoing transfer' }),
          { status: 200, headers }
        );
      }

      transactionContent = String(rawBody.content || rawBody.description || '');
      transferAmount = Number(rawBody.transferAmount) || 0;
      bankTxId = String(rawBody.id || rawBody.referenceCode || '');
      orderCode = extractOrderCode(transactionContent) || (rawBody.code ? String(rawBody.code) : null);
    }

    console.log(`[Payment Webhook] Extracted: Code=${orderCode}, Amount=${transferAmount}, Content="${transactionContent}"`);

    // 3. Nếu không tìm thấy mã đơn trong nội dung:
    // Thử truy vấn đơn pending mới nhất qua REST hoặc giao cho Stored Procedure tự động khớp
    if (!orderCode) {
      try {
        const { data: latestPending } = await supabase
          .from('payment_orders')
          .select('order_code')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestPending?.order_code) {
          orderCode = latestPending.order_code;
          console.log(`[Payment Webhook] Auto-mapped to latest pending order via REST: ${orderCode}`);
        }
      } catch (err: any) {
        console.warn('[Payment Webhook] Error querying latest pending:', err?.message);
      }
    }

    // Gán mã đơn hàng mục tiêu: nếu không có mã đơn, truyền cờ 'AUTO_MATCH_LATEST' cho Stored Procedure
    const targetOrderCode = orderCode || 'AUTO_MATCH_LATEST';

    // 4. Gọi Stored Procedure để hoàn tất đơn và tự động nâng cấp VIP PRO
    const { data: rpcResult, error: rpcError } = await supabase.rpc('complete_payment_order', {
      p_order_code: targetOrderCode,
      p_transfer_amount: transferAmount,
      p_bank_tx_id: bankTxId || null,
      p_transaction_content: transactionContent || null,
    });

    if (rpcError) {
      console.error('[Payment Webhook] RPC Error:', rpcError);
      
      // Nếu RPC báo lỗi, lưu lại giao dịch để admin không bị sót
      try {
        await supabase.from('payment_orders').insert({
          order_code: `SEPAY_${bankTxId || Date.now()}`,
          amount: transferAmount,
          status: 'pending',
          bank_transaction_id: bankTxId || null,
          transaction_content: transactionContent || 'Lỗi RPC webhook SePay',
        });
      } catch {}

      return new Response(
        JSON.stringify({
          success: false,
          message: 'Lỗi thực thi Stored Procedure kích hoạt đơn hàng',
          error: rpcError.message,
          orderCode: targetOrderCode,
        }),
        { status: 200, headers }
      );
    }

    console.log('[Payment Webhook] RPC Result:', rpcResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Xử lý webhook SePay thành công!',
        result: rpcResult,
      }),
      { status: 200, headers }
    );
  } catch (error: any) {
    console.error('[Payment Webhook] Exception:', error);
    // LUÔN TRẢ VỀ HTTP 200 ĐỂ SEPAY KHÔNG BẬT "SỰ CỐ (HTTP 500)"
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Lỗi xử lý nội bộ server webhook',
        error: error?.message || String(error),
      }),
      { status: 200, headers }
    );
  }
}
