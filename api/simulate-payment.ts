import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ovjungvdsvzhzhobkryu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                     process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
                     process.env.SUPABASE_ANON_KEY || 
                     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92anVuZ3Zkc3Z6aHpob2Jrcnl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MzkxMTksImV4cCI6MjEwMzAxNTExOX0.UDtbmp_uQukHnJQikV0A3czRRwkYtRja0qkAN3QUM_M';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Endpoint giả lập thanh toán (Dành cho Development / Test / Admin)
 * Cho phép test luồng quét QR -> nhận tiền -> tự động lên PRO ngay lập tức mà không cần chuyển tiền thật
 */
export default async function handler(request: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const { order_code } = await request.json();

    if (!order_code) {
      return new Response(JSON.stringify({ error: 'Missing order_code in request body' }), {
        status: 400,
        headers,
      });
    }

    // Lấy thông tin đơn hàng để biết số tiền
    const { data: order, error: findError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('order_code', order_code.toUpperCase().trim())
      .maybeSingle();

    if (findError || !order) {
      return new Response(
        JSON.stringify({ error: findError?.message || 'Không tìm thấy đơn hàng' }),
        { status: 404, headers }
      );
    }

    // Kích hoạt qua stored procedure
    const { data: rpcResult, error: rpcError } = await supabase.rpc('complete_payment_order', {
      p_order_code: order.order_code,
      p_transfer_amount: order.amount,
      p_bank_tx_id: `SIMULATED_${Date.now()}`,
      p_transaction_content: `TEST_SIMULATE ${order.order_code}`,
    });

    if (rpcError) {
      return new Response(JSON.stringify({ error: rpcError.message }), { status: 500, headers });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Đã giả lập thanh toán thành công cho đơn ${order.order_code}!`,
        result: rpcResult,
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
