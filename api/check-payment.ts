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

export default async function handler(request: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const url = new URL(request.url);
  const orderCode = url.searchParams.get('order_code');

  if (!orderCode) {
    return new Response(JSON.stringify({ error: 'Missing order_code parameter' }), {
      status: 400,
      headers,
    });
  }

  try {
    const { data: order, error } = await supabase
      .from('payment_orders')
      .select('id, order_code, status, amount, plan_type, paid_at, created_at')
      .eq('order_code', orderCode.toUpperCase().trim())
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
    }

    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers });
    }

    return new Response(
      JSON.stringify({
        order_code: order.order_code,
        status: order.status,
        completed: order.status === 'completed',
        amount: order.amount,
        paid_at: order.paid_at,
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
