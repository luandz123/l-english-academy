import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

// Khởi tạo Supabase client trong môi trường Edge
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ovjungvdsvzhzhobkryu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface WebhookResult {
  success: boolean;
  message: string;
  order_code?: string;
  data?: any;
}

/**
 * Trích xuất mã đơn hàng từ nội dung chuyển khoản
 * Định dạng chuẩn của hệ thống: LEA + số/chữ (ví dụ: LEA83921)
 */
function extractOrderCode(content: string): string | null {
  if (!content) return null;
  // Khớp mã dạng LEA12345, LEA_12345, VIP12345 hoặc mã 5-8 ký tự viết hoa
  const match = content.match(/\b(LEA[A-Z0-9]{4,10})\b/i) || 
                content.match(/\b(VIP[A-Z0-9]{4,10})\b/i) ||
                content.match(/LEA\s*([0-9]{4,8})/i);

  if (match) {
    if (match[0].startsWith('LEA') || match[0].startsWith('lea')) {
      return match[0].toUpperCase().replace(/\s+/g, '');
    }
    return match[0].toUpperCase().replace(/\s+/g, '');
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
        service: 'L-English Academy Payment Webhook',
        gateway: 'VietQR / SePay / Casso / payOS',
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers }
    );
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    // 1. Kiểm tra xác thực Token (nếu cấu hình SEPAY_API_KEY trong Environment)
    const secretKey = process.env.SEPAY_WEBHOOK_API_KEY || process.env.PAYMENT_WEBHOOK_SECRET;
    const authHeader = request.headers.get('Authorization') || request.headers.get('x-api-key') || '';

    if (secretKey) {
      const cleanAuth = authHeader.replace(/^(Apikey|Bearer)\s+/i, '').trim();
      if (cleanAuth !== secretKey) {
        console.warn('[Payment Webhook] Unauthorized request attempt');
        return new Response(
          JSON.stringify({ success: false, message: 'Unauthorized webhook request' }),
          { status: 401, headers }
        );
      }
    }

    // 2. Parse Body dữ liệu từ webhook
    const rawBody = await request.json();
    console.log('[Payment Webhook] Received payload:', JSON.stringify(rawBody));

    let orderCode: string | null = null;
    let transferAmount = 0;
    let bankTxId = '';
    let transactionContent = '';
    let isIncomingMoney = true;

    // A. Xử lý định dạng SePay Webhook
    // { id, gateway, transactionDate, accountNumber, content, transferType: 'in', transferAmount }
    if (rawBody && typeof rawBody === 'object' && ('transferAmount' in rawBody || 'content' in rawBody)) {
      if (rawBody.transferType && rawBody.transferType.toLowerCase() !== 'in') {
        return new Response(
          JSON.stringify({ success: true, message: 'Ignored outgoing transfer' }),
          { status: 200, headers }
        );
      }

      transactionContent = String(rawBody.content || '');
      transferAmount = Number(rawBody.transferAmount) || 0;
      bankTxId = String(rawBody.id || rawBody.referenceCode || '');
      orderCode = extractOrderCode(transactionContent) || (rawBody.code ? String(rawBody.code) : null);
    }
    // B. Xử lý định dạng Casso Webhook
    // { error: 0, data: [{ id, tid, description, amount, ... }] }
    else if (rawBody && Array.isArray(rawBody.data) && rawBody.data.length > 0) {
      const item = rawBody.data[0];
      transactionContent = String(item.description || '');
      transferAmount = Number(item.amount) || 0;
      bankTxId = String(item.id || item.tid || '');
      orderCode = extractOrderCode(transactionContent);
    }
    // C. Xử lý định dạng payOS Webhook
    // { code: '00', data: { orderCode, amount, description, reference } }
    else if (rawBody && rawBody.data && typeof rawBody.data === 'object') {
      transactionContent = String(rawBody.data.description || '');
      transferAmount = Number(rawBody.data.amount) || 0;
      bankTxId = String(rawBody.data.reference || rawBody.data.orderCode || '');
      orderCode = extractOrderCode(transactionContent) || (rawBody.data.orderCode ? `LEA${rawBody.data.orderCode}` : null);
    }

    if (!orderCode) {
      console.warn('[Payment Webhook] Could not find order code in content:', transactionContent);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Không tìm thấy mã đơn hàng (LEAxxxxx) trong nội dung chuyển khoản',
          content: transactionContent,
        }),
        { status: 200, headers } // Trả về 200 để SePay không retry nếu khách chuyển sai cú pháp
      );
    }

    console.log(`[Payment Webhook] Processing Order: ${orderCode}, Amount: ${transferAmount}, TxID: ${bankTxId}`);

    // 3. Gọi Stored Procedure bảo mật để hoàn tất đơn và nâng cấp PRO
    const { data: rpcResult, error: rpcError } = await supabase.rpc('complete_payment_order', {
      p_order_code: orderCode,
      p_transfer_amount: transferAmount,
      p_bank_tx_id: bankTxId || null,
      p_transaction_content: transactionContent || null,
    });

    if (rpcError) {
      console.error('[Payment Webhook] RPC Error:', rpcError);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Lỗi thực thi kích hoạt đơn hàng',
          error: rpcError.message,
        }),
        { status: 500, headers }
      );
    }

    console.log('[Payment Webhook] RPC Result:', rpcResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Xử lý webhook thành công',
        result: rpcResult,
      }),
      { status: 200, headers }
    );
  } catch (error: any) {
    console.error('[Payment Webhook] Exception:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Lỗi xử lý nội bộ server webhook',
        error: error?.message || String(error),
      }),
      { status: 500, headers }
    );
  }
}
