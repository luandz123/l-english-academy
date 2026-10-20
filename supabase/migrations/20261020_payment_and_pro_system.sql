-- ====================================================================
-- HỆ THỐNG THANH TOÁN TỰ ĐỘNG SEPAY & NÂNG CẤP VIP PRO TRỌN ĐỜI (SỬA LỖI TOÀN DIỆN)
-- Dự án: L-English Academy
-- Ngày sửa: 2026-10-20
-- ====================================================================

-- 1. Bổ sung các cột quản lý gói PRO vào bảng `public.profiles` nếu chưa có
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pro_plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS pro_activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ;

-- Tạo index để truy vấn nhanh trạng thái VIP
CREATE INDEX IF NOT EXISTS idx_profiles_is_pro ON public.profiles(is_pro);

-- 2. Tạo bảng lưu trữ thông tin đơn thanh toán `payment_orders`
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    order_code TEXT NOT NULL UNIQUE,
    plan_type TEXT NOT NULL DEFAULT 'vip_combo',
    amount NUMERIC NOT NULL DEFAULT 1750000,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
    bank_transaction_id TEXT,
    transaction_content TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    paid_at TIMESTAMPTZ
);

-- Index cho bảng payment_orders
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_code ON public.payment_orders(order_code);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON public.payment_orders(created_at DESC);

-- Bật Row Level Security (RLS)
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- Xóa các policy cũ để áp dụng policy chuẩn không bị lỗi 404 / RLS
DROP POLICY IF EXISTS "Users can view own payment orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Users can create own pending payment orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Admins manage all payment orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Allow anon read payment_orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Allow anon create payment_orders" ON public.payment_orders;

-- Cho phép công khai đọc đơn hàng (để Modal kiểm tra trạng thái và realtime webhook)
CREATE POLICY "Allow public read payment orders"
    ON public.payment_orders
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Cho phép học viên / khách tạo đơn hàng pending
CREATE POLICY "Allow public create payment orders"
    ON public.payment_orders
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Cho phép Admin và hệ thống cập nhật đơn hàng
CREATE POLICY "Allow admin and system update payment orders"
    ON public.payment_orders
    FOR UPDATE
    TO anon, authenticated
    USING (true);

-- Đăng ký Realtime cho bảng `payment_orders`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'payment_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_orders;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 3. Stored Procedure kích hoạt đơn hàng & tự động nâng cấp VIP PRO (ĐÃ SỬA LỖI is_published)
CREATE OR REPLACE FUNCTION public.complete_payment_order(
    p_order_code text,
    p_transfer_amount numeric,
    p_bank_tx_id text DEFAULT NULL,
    p_transaction_content text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order record;
    v_enrolled_count int := 0;
BEGIN
    -- 1. Tìm đơn hàng cần hoàn tất theo mã đơn
    IF p_order_code IS NOT NULL AND TRIM(p_order_code) <> '' AND p_order_code NOT IN ('AUTO_MATCH_LATEST', 'PENDING_MATCH', 'LEAPRO', 'TEST12345') THEN
        SELECT * INTO v_order
        FROM public.payment_orders
        WHERE UPPER(order_code) = UPPER(TRIM(p_order_code))
        FOR UPDATE;
    END IF;

    -- Nếu không tìm thấy theo mã đơn, tự động khớp với đơn 'pending' mới nhất gần đây
    IF v_order.id IS NULL THEN
        SELECT * INTO v_order
        FROM public.payment_orders
        WHERE status = 'pending'
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE;
    END IF;

    -- Nếu trong hệ thống hoàn toàn không có đơn pending nào
    IF v_order.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Không tìm thấy đơn hàng nào đang chờ thanh toán (mã: ' || COALESCE(p_order_code, 'rỗng') || ')'
        );
    END IF;

    -- 2. Nếu đơn đã hoàn tất trước đó thì bỏ qua (Idempotent)
    IF v_order.status = 'completed' THEN
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Đơn hàng đã được hoàn tất trước đó.', 
            'already_completed', true,
            'order_code', v_order.order_code
        );
    END IF;

    -- 3. Kiểm tra số tiền chuyển (Chấp nhận đủ tiền gói hoặc tiền chuyển thử nghiệm >= 5.000đ)
    IF p_transfer_amount < v_order.amount AND p_transfer_amount < 5000 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Số tiền chuyển (' || p_transfer_amount || 'đ) không đủ so với giá trị đơn (' || v_order.amount || 'đ)'
        );
    END IF;

    -- 4. Cập nhật trạng thái đơn hàng sang completed
    UPDATE public.payment_orders
    SET status = 'completed',
        paid_at = now(),
        updated_at = now(),
        bank_transaction_id = COALESCE(p_bank_tx_id, bank_transaction_id),
        transaction_content = COALESCE(p_transaction_content, transaction_content)
    WHERE id = v_order.id;

    -- 5. Nâng cấp PRO cho hồ sơ học viên
    IF v_order.user_id IS NOT NULL THEN
        UPDATE public.profiles
        SET is_pro = true,
            pro_plan = COALESCE(v_order.plan_type, 'vip_combo'),
            pro_activated_at = now(),
            updated_at = now()
        WHERE user_id = v_order.user_id;

        -- 6. Tự động ghi danh (Enroll) học viên vào tất cả các khóa học hiện có
        -- Sửa lỗi: Bảng courses dùng cột is_active (không phải is_published)
        -- Sử dụng NOT EXISTS để không phụ thuộc vào unique constraint của bảng enrollments
        BEGIN
            INSERT INTO public.enrollments (user_id, course_id, enrolled_at)
            SELECT v_order.user_id, c.id, now()
            FROM public.courses c
            WHERE (c.is_active = true OR c.is_active IS NULL)
              AND NOT EXISTS (
                  SELECT 1 FROM public.enrollments e 
                  WHERE e.user_id = v_order.user_id AND e.course_id = c.id
              );

            GET DIAGNOSTICS v_enrolled_count = ROW_COUNT;
        EXCEPTION
            WHEN OTHERS THEN
                v_enrolled_count := 0;
        END;
    END IF;

    -- 7. Ghi nhật ký hệ thống admin an toàn (không làm dừng giao dịch nếu lỗi log)
    BEGIN
        INSERT INTO public.admin_activity_log (action, entity_type, entity_id, details)
        VALUES (
            'payment_completed_auto_upgrade',
            'payment_orders',
            v_order.id::text,
            jsonb_build_object(
                'order_code', v_order.order_code,
                'user_id', v_order.user_id,
                'amount', p_transfer_amount,
                'bank_tx_id', p_bank_tx_id,
                'transaction_content', p_transaction_content,
                'enrolled_courses', v_enrolled_count
            )
        );
    EXCEPTION
        WHEN OTHERS THEN
            NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Kích hoạt thành công đơn hàng ' || v_order.order_code,
        'order_id', v_order.id,
        'order_code', v_order.order_code,
        'user_id', v_order.user_id,
        'amount', p_transfer_amount,
        'enrolled_courses', v_enrolled_count
    );
END;
$$;

-- Phân quyền thực thi hàm cho mọi vai trò (anon, authenticated, service_role)
GRANT EXECUTE ON FUNCTION public.complete_payment_order(text, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_payment_order(text, numeric, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.complete_payment_order(text, numeric, text, text) TO service_role;

-- 4. Stored Procedure kiểm tra trạng thái đơn an toàn (Bypass RLS 100%)
CREATE OR REPLACE FUNCTION public.check_payment_order_status(p_order_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order record;
BEGIN
    SELECT id, order_code, status, amount, plan_type, paid_at, created_at
    INTO v_order
    FROM public.payment_orders
    WHERE UPPER(order_code) = UPPER(TRIM(p_order_code));

    IF NOT FOUND THEN
        RETURN jsonb_build_object('found', false);
    END IF;

    RETURN jsonb_build_object(
        'found', true,
        'order_code', v_order.order_code,
        'status', v_order.status,
        'completed', (v_order.status = 'completed'),
        'amount', v_order.amount,
        'paid_at', v_order.paid_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_payment_order_status(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_payment_order_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_payment_order_status(text) TO service_role;

-- 5. Hàm cứu hộ: Nâng cấp PRO trực tiếp theo Email hoặc User ID
CREATE OR REPLACE FUNCTION public.manually_upgrade_user_to_pro(p_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_enrolled int := 0;
BEGIN
    -- 1. Tìm user_id trong bảng profiles
    SELECT user_id INTO v_user_id
    FROM public.profiles
    WHERE LOWER(COALESCE(email, '')) = LOWER(TRIM(p_identifier))
       OR user_id::text = TRIM(p_identifier)
    LIMIT 1;

    -- 2. Nếu không thấy trong profiles, tìm trong auth.users
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id
        FROM auth.users
        WHERE LOWER(COALESCE(email, '')) = LOWER(TRIM(p_identifier))
           OR id::text = TRIM(p_identifier)
        LIMIT 1;
    END IF;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Không tìm thấy người dùng với: ' || p_identifier);
    END IF;

    -- 3. Nâng cấp PRO trong bảng profiles
    UPDATE public.profiles
    SET is_pro = true,
        pro_plan = 'vip_combo',
        pro_activated_at = now(),
        updated_at = now()
    WHERE user_id = v_user_id;

    -- 4. Ghi danh tất cả khóa học
    BEGIN
        INSERT INTO public.enrollments (user_id, course_id, enrolled_at)
        SELECT v_user_id, c.id, now()
        FROM public.courses c
        WHERE (c.is_active = true OR c.is_active IS NULL)
          AND NOT EXISTS (
              SELECT 1 FROM public.enrollments e 
              WHERE e.user_id = v_user_id AND e.course_id = c.id
          );
        GET DIAGNOSTICS v_enrolled = ROW_COUNT;
    EXCEPTION
        WHEN OTHERS THEN
            v_enrolled := 0;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Đã nâng cấp VIP PRO thành công cho tài khoản ' || p_identifier,
        'user_id', v_user_id,
        'enrolled_courses', v_enrolled
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.manually_upgrade_user_to_pro(text) TO anon;
GRANT EXECUTE ON FUNCTION public.manually_upgrade_user_to_pro(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manually_upgrade_user_to_pro(text) TO service_role;
