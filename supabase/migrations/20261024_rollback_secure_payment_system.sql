-- ====================================================================
-- ROLLBACK MIGRATION: KHÔI PHỤC TRẠNG THÁI HỆ THỐNG THANH TOÁN
-- Dự án: L-English Academy
-- Ngày rollback: 2026-10-24
-- Rollback cho: 20261024_secure_payment_system.sql
-- Mục tiêu: Khôi phục chính xác trạng thái migration 20261020_payment_and_pro_system.sql
-- ====================================================================

-- 1. Xóa các policy chặt chẽ mới tạo
DROP POLICY IF EXISTS "Users can view own payment orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Admins can view all payment orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Admins can update payment orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Admins can insert payment orders" ON public.payment_orders;

-- 2. Khôi phục các policy công khai ban đầu của payment_orders
CREATE POLICY "Allow public read payment orders"
    ON public.payment_orders
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow public create payment orders"
    ON public.payment_orders
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Allow admin and system update payment orders"
    ON public.payment_orders
    FOR UPDATE
    TO anon, authenticated
    USING (true);

-- 3. Xóa hàm RPC create_payment_order
DROP FUNCTION IF EXISTS public.create_payment_order(text);

-- 4. Khôi phục hàm complete_payment_order không có guard chặt chẽ và mở lại quyền
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
    IF p_order_code IS NOT NULL AND TRIM(p_order_code) <> '' AND p_order_code NOT IN ('AUTO_MATCH_LATEST', 'PENDING_MATCH', 'LEAPRO', 'TEST12345') THEN
        SELECT * INTO v_order
        FROM public.payment_orders
        WHERE UPPER(order_code) = UPPER(TRIM(p_order_code))
        FOR UPDATE;
    END IF;

    IF v_order.id IS NULL THEN
        SELECT * INTO v_order
        FROM public.payment_orders
        WHERE status = 'pending'
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE;
    END IF;

    IF v_order.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Không tìm thấy đơn hàng nào đang chờ thanh toán (mã: ' || COALESCE(p_order_code, 'rỗng') || ')'
        );
    END IF;

    IF v_order.status = 'completed' THEN
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Đơn hàng đã được hoàn tất trước đó.', 
            'already_completed', true,
            'order_code', v_order.order_code
        );
    END IF;

    IF p_transfer_amount < v_order.amount AND p_transfer_amount < 5000 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Số tiền chuyển (' || p_transfer_amount || 'đ) không đủ so với giá trị đơn (' || v_order.amount || 'đ)'
        );
    END IF;

    UPDATE public.payment_orders
    SET status = 'completed',
        paid_at = now(),
        updated_at = now(),
        bank_transaction_id = COALESCE(p_bank_tx_id, bank_transaction_id),
        transaction_content = COALESCE(p_transaction_content, transaction_content)
    WHERE id = v_order.id;

    IF v_order.user_id IS NOT NULL THEN
        UPDATE public.profiles
        SET is_pro = true,
            pro_plan = COALESCE(v_order.plan_type, 'vip_combo'),
            pro_activated_at = now(),
            updated_at = now()
        WHERE user_id = v_order.user_id;

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

GRANT EXECUTE ON FUNCTION public.complete_payment_order(text, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_payment_order(text, numeric, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.complete_payment_order(text, numeric, text, text) TO service_role;

-- 5. Khôi phục quyền hàm manually_upgrade_user_to_pro
GRANT EXECUTE ON FUNCTION public.manually_upgrade_user_to_pro(text) TO anon;
GRANT EXECUTE ON FUNCTION public.manually_upgrade_user_to_pro(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manually_upgrade_user_to_pro(text) TO service_role;

-- 6. Khôi phục hàm check_payment_order_status mở cho public
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

-- ====================================================================
-- HẾT ROLLBACK MIGRATION
-- ====================================================================
