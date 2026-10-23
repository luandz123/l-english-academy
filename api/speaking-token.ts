import { createClient } from '@supabase/supabase-js';
import { AccessToken } from 'livekit-server-sdk';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ovjungvdsvzhzhobkryu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                     process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
                     process.env.SUPABASE_ANON_KEY || 
                     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92anVuZ3Zkc3Z6aHpob2Jrcnl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MzkxMTksImV4cCI6MjEwMzAxNTExOX0.UDtbmp_uQukHnJQikV0A3czRRwkYtRja0qkAN3QUM_M';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL || process.env.VITE_LIVEKIT_URL;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(request: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    // 1. Verify Authorization Bearer token from header
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'UNAUTHORIZED', message: 'Thiếu Authorization token' }),
        { status: 401, headers }
      );
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'UNAUTHORIZED', message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' }),
        { status: 401, headers }
      );
    }

    const user = userData.user;

    // 2. Parse request body
    const body = await request.json().catch(() => ({}));
    const { roomId, passcode } = body;

    if (!roomId) {
      return new Response(
        JSON.stringify({ error: 'BAD_REQUEST', message: 'Thiếu roomId' }),
        { status: 400, headers }
      );
    }

    // 3. Check room in database
    const { data: room, error: roomError } = await supabase
      .from('speaking_rooms')
      .select('*')
      .eq('id', roomId)
      .maybeSingle();

    if (roomError && roomError.code !== 'PGRST116') {
      console.warn('[speaking-token] Warning query speaking_rooms:', roomError.message);
    }

    if (room && room.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'ROOM_CLOSED', message: 'Phòng đã kết thúc' }),
        { status: 403, headers }
      );
    }

    // If private room, verify passcode or host
    if (room && room.visibility === 'private' && room.host_user_id !== user.id) {
      if (room.passcode && room.passcode !== passcode) {
        return new Response(
          JSON.stringify({ error: 'INVALID_PASSCODE', message: 'Mã phòng riêng tư không chính xác' }),
          { status: 403, headers }
        );
      }
    }

    // Get user profile name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle();

    const participantName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Learner';
    const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null;

    // 4. Generate token if LiveKit is configured
    if (LIVEKIT_API_KEY && LIVEKIT_API_SECRET && LIVEKIT_URL) {
      const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: user.id,
        name: participantName,
        metadata: JSON.stringify({ avatarUrl }),
        ttl: '2h',
      });

      at.addGrant({
        room: roomId,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      const livekitToken = await at.toJwt();

      return new Response(
        JSON.stringify({
          mode: 'livekit',
          token: livekitToken,
          url: LIVEKIT_URL,
          identity: user.id,
          name: participantName,
          avatarUrl,
        }),
        { status: 200, headers }
      );
    }

    // 5. Fallback to standard WebRTC Mesh with STUN
    return new Response(
      JSON.stringify({
        mode: 'webrtc-mesh',
        roomId,
        identity: user.id,
        name: participantName,
        avatarUrl,
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun.cloudflare.com:3478' },
        ],
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    console.error('[speaking-token] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'INTERNAL_ERROR', message: err?.message || 'Lỗi xử lý yêu cầu' }),
      { status: 500, headers }
    );
  }
}
