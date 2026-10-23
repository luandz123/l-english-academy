-- ==============================================================================
-- ENGLISH SPEAKING VOICE ROOMS MIGRATION
-- ==============================================================================

-- 1. Extend profiles with English level and total speaking practice time
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS english_level TEXT DEFAULT 'B1',
  ADD COLUMN IF NOT EXISTS total_speaking_seconds INT DEFAULT 0;

-- 2. Create speaking_rooms table
CREATE TABLE IF NOT EXISTS public.speaking_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  host_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  english_level TEXT NOT NULL CHECK (english_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  topics TEXT[] NOT NULL DEFAULT '{}',
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  passcode TEXT,
  capacity INT NOT NULL DEFAULT 4 CHECK (capacity >= 2 AND capacity <= 5),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '4 hours')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_speaking_rooms_status_visibility ON public.speaking_rooms (status, visibility);
CREATE INDEX IF NOT EXISTS idx_speaking_rooms_level ON public.speaking_rooms (english_level);
CREATE INDEX IF NOT EXISTS idx_speaking_rooms_host ON public.speaking_rooms (host_user_id);

-- 3. Create speaking_room_members table
CREATE TABLE IF NOT EXISTS public.speaking_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.speaking_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('host', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_muted BOOLEAN NOT NULL DEFAULT false,
  is_speaking BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT uq_speaking_room_user UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_speaking_room_members_room ON public.speaking_room_members (room_id);
CREATE INDEX IF NOT EXISTS idx_speaking_room_members_user ON public.speaking_room_members (user_id);

-- 4. Create speaking_sessions table
CREATE TABLE IF NOT EXISTS public.speaking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES public.speaking_rooms(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_speaking_sessions_user ON public.speaking_sessions (user_id);

-- 5. Enable Row Level Security
ALTER TABLE public.speaking_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaking_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaking_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: speaking_rooms
CREATE POLICY "Public read for active rooms" 
  ON public.speaking_rooms 
  FOR SELECT 
  USING (status = 'active' OR auth.uid() = host_user_id);

CREATE POLICY "Authenticated users can create rooms" 
  ON public.speaking_rooms 
  FOR INSERT 
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Host can update room" 
  ON public.speaking_rooms 
  FOR UPDATE 
  USING (auth.uid() = host_user_id);

CREATE POLICY "Host can delete room" 
  ON public.speaking_rooms 
  FOR DELETE 
  USING (auth.uid() = host_user_id);

-- RLS Policies: speaking_room_members
CREATE POLICY "Anyone can view members of active rooms" 
  ON public.speaking_room_members 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can join rooms" 
  ON public.speaking_room_members 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own membership" 
  ON public.speaking_room_members 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users or hosts can remove membership" 
  ON public.speaking_room_members 
  FOR DELETE 
  USING (
    auth.uid() = user_id OR 
    auth.uid() IN (SELECT host_user_id FROM public.speaking_rooms WHERE id = room_id)
  );

-- RLS Policies: speaking_sessions
CREATE POLICY "Users can view own speaking sessions" 
  ON public.speaking_sessions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own speaking sessions" 
  ON public.speaking_sessions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own speaking sessions" 
  ON public.speaking_sessions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- 6. Helper RPC: Join Speaking Room atomically with capacity and passcode checks
CREATE OR REPLACE FUNCTION public.join_speaking_room(
  p_room_id UUID,
  p_passcode TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_room RECORD;
  v_current_count INT;
  v_session_id UUID;
  v_member_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Vui lòng đăng nhập để tham gia phòng');
  END IF;

  -- Lock room row for update to prevent concurrent over-capacity race condition
  SELECT * INTO v_room 
  FROM public.speaking_rooms 
  WHERE id = p_room_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ROOM_NOT_FOUND', 'message', 'Phòng không tồn tại');
  END IF;

  IF v_room.status != 'active' OR v_room.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'ROOM_CLOSED', 'message', 'Phòng đã kết thúc hoặc hết hạn');
  END IF;

  -- Validate passcode for private rooms
  IF v_room.visibility = 'private' AND v_room.host_user_id != v_user_id THEN
    IF v_room.passcode IS NOT NULL AND v_room.passcode != '' AND (p_passcode IS NULL OR p_passcode != v_room.passcode) THEN
      RETURN jsonb_build_object('success', false, 'error', 'INVALID_PASSCODE', 'message', 'Mã tham gia phòng riêng tư không chính xác');
    END IF;
  END IF;

  -- Check if user is already in the room
  SELECT id INTO v_member_id 
  FROM public.speaking_room_members 
  WHERE room_id = p_room_id AND user_id = v_user_id;

  IF v_member_id IS NOT NULL THEN
    UPDATE public.speaking_room_members 
    SET last_seen_at = now() 
    WHERE id = v_member_id;

    RETURN jsonb_build_object(
      'success', true, 
      'member_id', v_member_id, 
      'is_existing', true,
      'role', (SELECT role FROM public.speaking_room_members WHERE id = v_member_id)
    );
  END IF;

  -- Check capacity
  SELECT count(*) INTO v_current_count 
  FROM public.speaking_room_members 
  WHERE room_id = p_room_id;

  IF v_current_count >= v_room.capacity THEN
    RETURN jsonb_build_object('success', false, 'error', 'ROOM_FULL', 'message', 'Phòng đã đủ số lượng người tham gia tối đa');
  END IF;

  -- Insert membership
  INSERT INTO public.speaking_room_members (room_id, user_id, role)
  VALUES (p_room_id, v_user_id, CASE WHEN v_user_id = v_room.host_user_id THEN 'host' ELSE 'member' END)
  RETURNING id INTO v_member_id;

  -- Create speaking session tracking
  INSERT INTO public.speaking_sessions (user_id, room_id, started_at)
  VALUES (v_user_id, p_room_id, now())
  RETURNING id INTO v_session_id;

  RETURN jsonb_build_object(
    'success', true, 
    'member_id', v_member_id, 
    'session_id', v_session_id,
    'role', CASE WHEN v_user_id = v_room.host_user_id THEN 'host' ELSE 'member' END
  );
END;
$$;

-- 7. Helper RPC: Leave Speaking Room cleanly
CREATE OR REPLACE FUNCTION public.leave_speaking_room(
  p_room_id UUID,
  p_session_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_duration INT := 0;
  v_active_session RECORD;
  v_remaining_members INT;
  v_next_host_id UUID;
  v_is_host BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  -- Check if user is host
  SELECT (host_user_id = v_user_id) INTO v_is_host 
  FROM public.speaking_rooms 
  WHERE id = p_room_id;

  -- Remove member
  DELETE FROM public.speaking_room_members 
  WHERE room_id = p_room_id AND user_id = v_user_id;

  -- Close session and calculate duration
  IF p_session_id IS NOT NULL THEN
    SELECT * INTO v_active_session 
    FROM public.speaking_sessions 
    WHERE id = p_session_id AND user_id = v_user_id;
  ELSE
    SELECT * INTO v_active_session 
    FROM public.speaking_sessions 
    WHERE room_id = p_room_id AND user_id = v_user_id AND ended_at IS NULL 
    ORDER BY started_at DESC LIMIT 1;
  END IF;

  IF v_active_session.id IS NOT NULL THEN
    v_duration := GREATEST(0, EXTRACT(EPOCH FROM (now() - v_active_session.started_at))::INT);
    UPDATE public.speaking_sessions 
    SET ended_at = now(), duration_seconds = v_duration 
    WHERE id = v_active_session.id;

    -- Update user cumulative speaking seconds in profiles
    UPDATE public.profiles 
    SET total_speaking_seconds = COALESCE(total_speaking_seconds, 0) + v_duration 
    WHERE user_id = v_user_id;
  END IF;

  -- Check remaining members in the room
  SELECT count(*) INTO v_remaining_members 
  FROM public.speaking_room_members 
  WHERE room_id = p_room_id;

  IF v_remaining_members = 0 THEN
    -- If no members remain, close the room
    UPDATE public.speaking_rooms 
    SET status = 'closed' 
    WHERE id = p_room_id;
  ELSIF v_is_host THEN
    -- If host left, pass host role to earliest joined remaining member
    SELECT user_id INTO v_next_host_id 
    FROM public.speaking_room_members 
    WHERE room_id = p_room_id 
    ORDER BY joined_at ASC 
    LIMIT 1;

    IF v_next_host_id IS NOT NULL THEN
      UPDATE public.speaking_rooms 
      SET host_user_id = v_next_host_id 
      WHERE id = p_room_id;

      UPDATE public.speaking_room_members 
      SET role = 'host' 
      WHERE room_id = p_room_id AND user_id = v_next_host_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'duration_seconds', v_duration, 
    'remaining_members', v_remaining_members
  );
END;
$$;

-- 8. Helper RPC: Match Speaking Room
CREATE OR REPLACE FUNCTION public.match_speaking_room(
  p_level TEXT,
  p_topics TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_match RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  -- Find active public room matching english level with available slots
  -- Ordered by: 
  -- 1) exact level match (1) then different (0)
  -- 2) number of overlapping topics
  -- 3) most recent
  SELECT 
    r.id,
    r.name,
    r.english_level,
    r.topics,
    r.capacity,
    count(m.id) as current_members,
    (CASE WHEN r.english_level = p_level THEN 2 ELSE 1 END) as level_score,
    COALESCE(cardinality(ARRAY(SELECT unnest(r.topics) INTERSECT SELECT unnest(p_topics))), 0) as topic_overlap
  INTO v_match
  FROM public.speaking_rooms r
  LEFT JOIN public.speaking_room_members m ON r.id = m.room_id
  WHERE r.status = 'active'
    AND r.visibility = 'public'
    AND r.expires_at > now()
    AND r.id NOT IN (
      SELECT room_id FROM public.speaking_room_members WHERE user_id = v_user_id
    )
  GROUP BY r.id, r.name, r.english_level, r.topics, r.capacity, r.created_at
  HAVING count(m.id) < r.capacity
  ORDER BY 
    level_score DESC,
    topic_overlap DESC,
    current_members DESC,
    r.created_at DESC
  LIMIT 1;

  IF v_match.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true, 
      'matched', true, 
      'room', jsonb_build_object(
        'id', v_match.id,
        'name', v_match.name,
        'english_level', v_match.english_level,
        'topics', v_match.topics,
        'capacity', v_match.capacity,
        'current_members', v_match.current_members
      )
    );
  ELSE
    RETURN jsonb_build_object('success', true, 'matched', false);
  END IF;
END;
$$;

-- 9. Add tables to Supabase Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'speaking_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.speaking_rooms;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'speaking_room_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.speaking_room_members;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Publication might not exist or have different permissions, ignore error
    NULL;
END;
$$;
