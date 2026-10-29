-- ====================================================================
-- MIGRATION: BẢO MẬT HỆ THỐNG THANH TOÁN & GỠ BỎ LỖ HỔNG RLS / FUNCTION
-- Dự án: L-English Academy
-- Ngày: 2026-10-24
-- Mục tiêu:
--   1. Gỡ bỏ toàn bộ RLS policy lỏng lẻo (USING true / WITH CHECK true) trên `payment_orders`.
--   2. Học viên chỉ được SELECT đơn của chính mình (auth.uid() = user_id).
--   3. Cấm anon và authenticated UPDATE `payment_orders` (đổi status chỉ do service_role webhook thực hiện).
--   4. Bổ sung RPC `create_payment_order` (SECURITY DEFINER) tính giá phía server, chống sửa giá client.
--   5. REVOKE EXECUTE trên `complete_payment_order` và `manually_upgrade_user_to_pro` khỏi anon & authenticated.
--   6. Bật REPLICA IDENTITY FULL cho `payment_orders` để realtime filter hoạt động trơn tru.
-- ====================================================================

-- --------------------------------------------------------------------
-- PHẦN 1: BẢNG PAYMENT_ORDERS - GỠ BỎ CÁC POLICY CŨ & THIẾT LẬP RLS CHẶT CHẼ
-- --------------------------------------------------------------------

-- Đảm bảo RLS luôn được kích hoạt
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- 1.1. Xóa toàn bộ các policy lỏng lẻo trước đây
DROP POLICY IF EXISTS "Allow public read payment orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Allow public create payment orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Allow admin and system update payment orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Users can view own payment orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Users can create own pending payment orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Admins manage all payment orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Allow anon read payment_orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Allow anon create payment_orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Admins can view all payment orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Admins can update payment orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Admins can insert payment orders" ON public.payment_orders;

-- 1.2. SELECT: Học viên chỉ được xem đơn hàng của chính mình
CREATE POLICY "Users can view own payment orders"
    ON public.payment_orders
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 1.3. SELECT: Admin được xem tất cả đơn hàng phục vụ quản trị
CREATE POLICY "Admins can view all payment orders"
    ON public.payment_orders
    FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- 1.4. UPDATE: CẤM học viên và anon cập nhật đơn hàng. Chỉ Admin có role admin mới được update.
-- Ghi chú: Webhook SePay (api/payment-webhook.ts) chạy dưới quyền service_role nên tự động bypass RLS.
CREATE POLICY "Admins can update payment orders"
    ON public.payment_orders
    FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 1.5. INSERT: Chỉ cho phép Admin tạo đơn thủ công trực tiếp từ bảng (nếu cần).
-- Học viên bắt buộc phải tạo đơn thông qua RPC `create_payment_order` để tính giá server-side.
CREATE POLICY "Admins can insert payment orders"
    ON public.payment_orders
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 1.6. Đảm bảo cấu hình REPLICA IDENTITY FULL để Supabase Realtime bắt chính xác sự kiện UPDATE theo order_code
ALTER TABLE public.payment_orders REPLICA IDENTITY FULL;

-- --------------------------------------------------------------------
-- PHẦN 2: RPC TẠO ĐƠN HÀNG AN TOÀN PHÍA SERVER (SERVER-SIDE PRICING)
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_payment_order(
    p_plan_type text DEFAULT 'vip_combo'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_amount numeric;
    v_existing_order record;
    v_order_code text;
    v_new_order record;
    v_retry_count int := 0;
BEGIN
    -- 1. Bắt buộc người dùng phải đăng nhập
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'UNAUTHORIZED',
            'message', 'Bạn cần đăng nhập tài khoản trước khi tạo đơn thanh toán.'
        );
    END IF;

    -- 2. TÍNH GIÁ PHÍA SERVER (Chống tuyệt đối việc client tự gửi amount: 1000đ)
    CASE LOWER(TRIM(COALESCE(p_plan_type, 'vip_combo')))
        WHEN 'vip_combo' THEN
            v_amount := 1750000;
        WHEN 'vip_annual' THEN
            v_amount := 950000;
        WHEN 'vip_monthly' THEN
            v_amount := 299000;
        ELSE
            v_amount := 1750000;
    END CASE;

    -- 3. Kiểm tra xem người dùng đã có đơn 'pending' được tạo trong vòng 30 phút qua hay chưa
    -- Nếu đã có thì tái sử dụng đơn này, tránh tạo đơn rác spam CSDL
    SELECT id, order_code, amount, plan_type, status, created_at
    INTO v_existing_order
    FROM public.payment_orders
    WHERE user_id = v_user_id
      AND status = 'pending'
      AND amount = v_amount
      AND created_at >= (now() - interval '30 minutes')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_existing_order.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'is_existing', true,
            'id', v_existing_order.id,
            'order_code', v_existing_order.order_code,
            'amount', v_existing_order.amount,
            'plan_type', v_existing_order.plan_type,
            'status', v_existing_order.status
        );
    END IF;

    -- 4. Sinh mã đơn hàng duy nhất dạng LEAxxxxx (5 số ngẫu nhiên)
    LOOP
        v_order_code := 'LEA' || LPAD(FLOOR(10000 + random() * 90000)::text, 5, '0');
        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM public.payment_orders WHERE order_code = v_order_code
        );
        v_retry_count := v_retry_count + 1;
        IF v_retry_count > 10 THEN
            v_order_code := 'LEA' || LPAD(FLOOR(100000 + random() * 900000)::text, 6, '0');
            EXIT;
        END IF;
    END LOOP;

    -- 5. Tạo bản ghi đơn hàng mới với status='pending'
    INSERT INTO public.payment_orders (
        user_id,
        order_code,
        plan_type,
        amount,
        status,
        created_at,
        updated_at
    )
    VALUES (
        v_user_id,
        v_order_code,
        LOWER(TRIM(p_plan_type)),
        v_amount,
        'pending',
        now(),
        now()
    )
    RETURNING * INTO v_new_order;

    RETURN jsonb_build_object(
        'success', true,
        'is_existing', false,
        'id', v_new_order.id,
        'order_code', v_new_order.order_code,
        'amount', v_new_order.amount,
        'plan_type', v_new_order.plan_type,
        'status', v_new_order.status
    );
END;
$$;

-- Phân quyền cho hàm create_payment_order: Chỉ cho phép người dùng đã đăng nhập (authenticated)
REVOKE EXECUTE ON FUNCTION public.create_payment_order(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_payment_order(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment_order(text) TO service_role;

-- --------------------------------------------------------------------
-- PHẦN 3: BẢO VỆ CHẶT CHẼ HÀM KÍCH HOẠT ĐƠN HÀNG (COMPLETE_PAYMENT_ORDER)
-- --------------------------------------------------------------------

-- Cập nhật lại hàm với guard kiểm tra quyền bên trong (Defense-in-depth)
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
    v_jwt_role text;
BEGIN
    -- 0. GUARD BẢO MẬT: Bắt buộc caller phải là service_role HOẶC tài khoản Admin
    BEGIN
        v_jwt_role := (current_setting('request.jwt.claims', true)::jsonb ->> 'role');
    EXCEPTION WHEN OTHERS THEN
        v_jwt_role := NULL;
    END;

    IF NOT (
        current_user = 'service_role'
        OR v_jwt_role = 'service_role'
        OR public.has_role(auth.uid(), 'admin')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'PERMISSION_DENIED',
            'message', 'Quyền truy cập bị từ chối: Chỉ webhook hệ thống hoặc Quản trị viên mới được kích hoạt đơn hàng.'
        );
    END IF;

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

    -- Nếu hoàn toàn không có đơn pending nào
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

    -- 3. Kiểm tra số tiền chuyển (Phải đủ tiền đơn hoặc tiền chuyển hợp lệ)
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

        -- 6. Tự động ghi danh (Enroll) học viên vào tất cả các khóa học đang active
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

    -- 7. Ghi nhật ký hệ thống admin an toàn
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

-- REVOKE EXECUTE: Thu hồi hoàn toàn quyền gọi từ anon, authenticated, PUBLIC
REVOKE EXECUTE ON FUNCTION public.complete_payment_order(text, numeric, text, text) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_payment_order(text, numeric, text, text) TO service_role;

-- --------------------------------------------------------------------
-- PHẦN 4: THU HỒI QUYỀN HÀM NÂNG CẤP THỦ CÔNG (MANUALLY_UPGRADE_USER_TO_PRO)
-- --------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.manually_upgrade_user_to_pro(text) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.manually_upgrade_user_to_pro(text) TO service_role;

-- --------------------------------------------------------------------
-- PHẦN 5: SIẾT CHẶT HÀM KIỂM TRA TRẠNG THÁI (CHECK_PAYMENT_ORDER_STATUS)
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_payment_order_status(p_order_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order record;
    v_jwt_role text;
BEGIN
    SELECT id, user_id, order_code, status, amount, plan_type, paid_at, created_at
    INTO v_order
    FROM public.payment_orders
    WHERE UPPER(order_code) = UPPER(TRIM(p_order_code));

    IF NOT FOUND THEN
        RETURN jsonb_build_object('found', false);
    END IF;

    -- Kiểm tra quyền xem chi tiết đơn hàng
    BEGIN
        v_jwt_role := (current_setting('request.jwt.claims', true)::jsonb ->> 'role');
    EXCEPTION WHEN OTHERS THEN
        v_jwt_role := NULL;
    END;

    IF NOT (
        auth.uid() = v_order.user_id 
        OR public.has_role(auth.uid(), 'admin')
        OR current_user = 'service_role'
        OR v_jwt_role = 'service_role'
    ) THEN
        RETURN jsonb_build_object(
            'found', false,
            'error', 'Access denied: Không có quyền tra cứu đơn hàng này.'
        );
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

-- Thu hồi quyền anon, chỉ cho phép học viên đã đăng nhập và service_role
REVOKE EXECUTE ON FUNCTION public.check_payment_order_status(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_payment_order_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_payment_order_status(text) TO service_role;

-- ====================================================================
-- HẾT MIGRATION 20261024_secure_payment_system.sql
-- ====================================================================
