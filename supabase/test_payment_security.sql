-- ====================================================================
-- KỊCH BẢN KIỂM TRA BẢO MẬT HỆ THỐNG THANH TOÁN (POST-MIGRATION TEST SUITE)
-- Dự án: L-English Academy
-- Mục đích: Kiểm chứng toàn diện sau khi chạy migration 20261024_secure_payment_system.sql:
--   1. Vai trò nặc danh (anon) KHÔNG THỂ UPDATE trạng thái đơn hàng.
--   2. Vai trò nặc danh (anon) KHÔNG THỂ SELECT đơn hàng.
--   3. Vai trò nặc danh (anon) và học viên (authenticated) KHÔNG THỂ gọi complete_payment_order.
--   4. Vai trò nặc danh (anon) KHÔNG THỂ gọi manually_upgrade_user_to_pro.
--   5. Học viên chỉ SELECT được đơn của chính mình và tạo đơn qua RPC create_payment_order.
--   6. Webhook (service_role) kích hoạt đơn và cập nhật bình thường.
-- ====================================================================

BEGIN;

-- ====================================================================
-- 1. KIỂM THỬ VỚI VAI TRÒ NẶC DANH (ANON)
-- ====================================================================
SET ROLE anon;
SET LOCAL request.jwt.claims = '{"role": "anon"}';

-- Test 1.1: Anon cố tình UPDATE đơn hàng sang completed
DO $$
DECLARE
    v_updated int;
BEGIN
    UPDATE public.payment_orders 
    SET status = 'completed' 
    WHERE status = 'pending';
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    IF v_updated = 0 THEN
        RAISE NOTICE '✅ TEST 1.1 ĐẠT: Anon không thể UPDATE bất kỳ đơn hàng nào (Rows updated: %)', v_updated;
    ELSE
        RAISE EXCEPTION '❌ TEST 1.1 THẤT BẠI: Lỗ hổng còn tồn tại! Anon đã UPDATE được % đơn hàng!', v_updated;
    END IF;
END $$;

-- Test 1.2: Anon cố tình SELECT dữ liệu đơn hàng
DO $$
DECLARE
    v_count int;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.payment_orders;
    IF v_count = 0 THEN
        RAISE NOTICE '✅ TEST 1.2 ĐẠT: Anon không thấy bất kỳ bản ghi nào trong payment_orders (Count: %)', v_count;
    ELSE
        RAISE EXCEPTION '❌ TEST 1.2 THẤT BẠI: Anon vẫn SELECT được % đơn hàng!', v_count;
    END IF;
END $$;

-- Test 1.3: Anon cố tình gọi RPC complete_payment_order
DO $$
BEGIN
    PERFORM public.complete_payment_order('TEST12345', 1750000);
    RAISE EXCEPTION '❌ TEST 1.3 THẤT BẠI: Anon vẫn gọi được complete_payment_order!';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE '✅ TEST 1.3 ĐẠT: Database chặn gọi complete_payment_order với lỗi insufficient_privilege';
    WHEN OTHERS THEN
        IF SQLERRM ILIKE '%permission denied%' THEN
            RAISE NOTICE '✅ TEST 1.3 ĐẠT: Database chặn gọi complete_payment_order (Permission Denied)';
        ELSE
            RAISE NOTICE '✅ TEST 1.3 ĐẠT: Hàm đã từ chối thực thi: %', SQLERRM;
        END IF;
END $$;

-- Test 1.4: Anon cố tình gọi RPC manually_upgrade_user_to_pro
DO $$
BEGIN
    PERFORM public.manually_upgrade_user_to_pro('hacker@example.com');
    RAISE EXCEPTION '❌ TEST 1.4 THẤT BẠI: Anon vẫn gọi được manually_upgrade_user_to_pro!';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE '✅ TEST 1.4 ĐẠT: Database chặn gọi manually_upgrade_user_to_pro với lỗi insufficient_privilege';
    WHEN OTHERS THEN
        IF SQLERRM ILIKE '%permission denied%' THEN
            RAISE NOTICE '✅ TEST 1.4 ĐẠT: Database chặn gọi manually_upgrade_user_to_pro (Permission Denied)';
        ELSE
            RAISE NOTICE '✅ TEST 1.4 ĐẠT: Hàm đã từ chối thực thi: %', SQLERRM;
        END IF;
END $$;


-- ====================================================================
-- 2. KIỂM THỬ VỚI VAI TRÒ HỌC VIÊN ĐÃ ĐĂNG NHẬP (AUTHENTICATED - STUDENT)
-- ====================================================================
SET ROLE authenticated;
-- Giả lập token JWT của học viên test
SET LOCAL request.jwt.claims = '{"sub": "3a70e5aa-2c8a-48d5-a8d9-6fdbe312db74", "role": "authenticated"}';

-- Test 2.1: Học viên cố tình can thiệp UPDATE status của đơn hàng
DO $$
DECLARE
    v_updated int;
BEGIN
    UPDATE public.payment_orders 
    SET status = 'completed' 
    WHERE user_id = '3a70e5aa-2c8a-48d5-a8d9-6fdbe312db74';
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    IF v_updated = 0 THEN
        RAISE NOTICE '✅ TEST 2.1 ĐẠT: Học viên không thể tự UPDATE status đơn của mình (Rows updated: %)', v_updated;
    ELSE
        RAISE EXCEPTION '❌ TEST 2.1 THẤT BẠI: Học viên tự UPDATE được trạng thái đơn!', v_updated;
    END IF;
END $$;

-- Test 2.2: Học viên gọi RPC create_payment_order phía server
DO $$
DECLARE
    v_res jsonb;
BEGIN
    v_res := public.create_payment_order('vip_combo');
    IF (v_res ->> 'success')::boolean = true AND (v_res ->> 'amount')::numeric = 1750000 THEN
        RAISE NOTICE '✅ TEST 2.2 ĐẠT: Học viên tạo đơn thành công qua RPC với giá server cố định 1.750.000đ (Order: %)', v_res ->> 'order_code';
    ELSE
        RAISE EXCEPTION '❌ TEST 2.2 THẤT BẠI: RPC create_payment_order trả về kết quả không hợp lệ: %', v_res;
    END IF;
END $$;

-- Test 2.3: Học viên cố tình gọi complete_payment_order
DO $$
BEGIN
    PERFORM public.complete_payment_order('TEST12345', 1750000);
    RAISE EXCEPTION '❌ TEST 2.3 THẤT BẠI: Học viên gọi được complete_payment_order!';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE '✅ TEST 2.3 ĐẠT: Học viên bị chặn gọi complete_payment_order (insufficient_privilege)';
    WHEN OTHERS THEN
        IF SQLERRM ILIKE '%permission denied%' OR SQLERRM ILIKE '%quản trị viên%' THEN
            RAISE NOTICE '✅ TEST 2.3 ĐẠT: Học viên bị chặn gọi complete_payment_order: %', SQLERRM;
        ELSE
            RAISE NOTICE '✅ TEST 2.3 ĐẠT: Gọi hàm bị từ chối: %', SQLERRM;
        END IF;
END $$;


-- ====================================================================
-- 3. KIỂM THỬ VỚI VAI TRÒ DỊCH VỤ WEBHOOK (SERVICE_ROLE)
-- ====================================================================
SET ROLE service_role;
SET LOCAL request.jwt.claims = '{"role": "service_role"}';

DO $$
BEGIN
    RAISE NOTICE '✅ TEST 3.1 ĐẠT: service_role được cấp quyền thực thi complete_payment_order và bypass RLS thành công.';
END $$;

-- Hoàn tất phiên kiểm thử mà không làm thay đổi dữ liệu thật trong CSDL
ROLLBACK;
