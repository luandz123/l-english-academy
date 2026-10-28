import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Search, 
  CreditCard, 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  Crown, 
  Loader2, 
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listAllEnrollments } from "@/lib/api/learning";
import { approvePaymentOrder, listAdminPaymentOrders } from "@/lib/api/payments";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const AdminEnrollments = () => {
  const [search, setSearch] = useState("");
  const [approvingCode, setApprovingCode] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 1. Fetch Danh sách Đơn Thanh toán
  const { 
    data: paymentOrders = [], 
    isLoading: loadingOrders, 
    refetch: refetchOrders 
  } = useQuery({
    queryKey: ["admin-payment-orders"],
    queryFn: async () => {
      const { data } = await listAdminPaymentOrders();
      return data ?? [];
    },
  });

  // 2. Fetch Danh sách Đăng ký khóa học (enrollments)
  const { 
    data: enrollments = [], 
    isLoading: loadingEnrollments, 
    refetch: refetchEnrollments 
  } = useQuery({
    queryKey: ["admin-enrollments"],
    queryFn: async () => {
      const { data, error } = await listAllEnrollments();
      if (error) throw error;

      const enrollmentsData = data ?? [];

      return enrollmentsData.map((e: any) => {
        const now = new Date();
        const expires = e.expires_at ? new Date(e.expires_at) : null;
        const remaining = expires ? Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / 86400000)) : null;
        let status = "active";
        if (expires && remaining === 0) status = "expired";
        else if (expires && remaining !== null && remaining <= 7) status = "expiring";

        return {
          ...e,
          remaining,
          status,
          profiles: e.profiles ?? null,
        };
      });
    },
  });

  // Admin duyệt thủ công đơn hàng (nếu khách chuyển sai cú pháp hoặc ngân hàng chậm)
  const handleApproveOrder = async (orderCode: string, _amount: number) => {
    if (!confirm(`Xác nhận duyệt và nâng cấp PRO ngay cho đơn hàng ${orderCode}?`)) {
      return;
    }

    setApprovingCode(orderCode);
    try {
      const { error } = await approvePaymentOrder(orderCode);

      if (error) {
        toast({
          title: "Lỗi duyệt đơn",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Duyệt đơn thành công!",
          description: `Đơn ${orderCode} đã hoàn tất và học viên đã được nâng cấp VIP PRO!`,
        });
        queryClient.invalidateQueries({ queryKey: ["admin-payment-orders"] });
        queryClient.invalidateQueries({ queryKey: ["admin-enrollments"] });
      }
    } catch (err: any) {
      toast({
        title: "Lỗi hệ thống",
        description: err?.message || "Không thể thực hiện duyệt",
        variant: "destructive",
      });
    } finally {
      setApprovingCode(null);
    }
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    active: { label: "Còn hạn", color: "bg-success text-success-foreground" },
    expired: { label: "Hết hạn", color: "bg-destructive text-destructive-foreground" },
    expiring: { label: "Sắp hết", color: "bg-warning text-warning-foreground" },
  };

  // Filter Đơn hàng
  const filteredOrders = paymentOrders.filter((o: any) =>
    (o.order_code || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.profile?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.profile?.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.transaction_content || "").toLowerCase().includes(search.toLowerCase())
  );

  // Filter Enrollments
  const filteredEnrollments = enrollments.filter((e: any) =>
    ((e as any).profiles?.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    ((e as any).courses?.title ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quản lý Đăng Ký & Đơn Hàng VIP</h1>
            <p className="text-sm text-muted-foreground">
              Theo dõi biến động chuyển khoản SePay Webhook tự động và danh sách học viên
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchOrders();
              refetchEnrollments();
            }}
            className="rounded-xl flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Làm mới</span>
          </Button>
        </div>

        <Tabs defaultValue="payments" className="w-full space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <TabsList className="bg-muted/70 p-1 rounded-xl">
              <TabsTrigger value="payments" className="rounded-lg font-bold gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                <span>Đơn VIP / SePay ({paymentOrders.length})</span>
              </TabsTrigger>
              <TabsTrigger value="enrollments" className="rounded-lg font-bold gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                <span>Đăng ký Khóa học ({enrollments.length})</span>
              </TabsTrigger>
            </TabsList>

            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm mã đơn, tên, email..."
                className="pl-9 rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* TAB 1: DANH SÁCH ĐƠN HÀNG THANH TOÁN SEPAY */}
          <TabsContent value="payments" className="space-y-4">
            {loadingOrders ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border/70 overflow-hidden shadow-soft-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/70 bg-muted/50 text-xs font-black uppercase text-muted-foreground">
                        <th className="text-left px-4 py-3">Mã Đơn</th>
                        <th className="text-left px-4 py-3">Học Viên</th>
                        <th className="text-right px-4 py-3">Số Tiền</th>
                        <th className="text-center px-4 py-3">Trạng Thái</th>
                        <th className="text-left px-4 py-3">Nội Dung Thực Tế</th>
                        <th className="text-center px-4 py-3">Thời Gian</th>
                        <th className="text-center px-4 py-3">Hành Động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order: any) => {
                        const isCompleted = order.status === "completed";
                        const isApproving = approvingCode === order.order_code;

                        return (
                          <tr
                            key={order.id}
                            className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                              <span className="px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                                {order.order_code}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-foreground">
                                {order.profile?.full_name || "—"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {order.profile?.email || order.user_id}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-black text-foreground">
                              {Number(order.amount).toLocaleString("vi-VN")} đ
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {isCompleted ? (
                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold rounded-lg px-2.5 py-0.5 gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Đã thanh toán</span>
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold rounded-lg px-2.5 py-0.5 gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Chờ chuyển khoản</span>
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono max-w-[200px] truncate" title={order.transaction_content || "Chưa có dữ liệu"}>
                              {order.transaction_content || "—"}
                            </td>
                            <td className="px-4 py-3.5 text-center text-xs text-muted-foreground whitespace-nowrap">
                              {order.paid_at
                                ? new Date(order.paid_at).toLocaleString("vi-VN")
                                : new Date(order.created_at).toLocaleString("vi-VN")}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {!isCompleted ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveOrder(order.order_code, order.amount)}
                                  disabled={isApproving}
                                  className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1 shadow-sm"
                                >
                                  {isApproving ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Crown className="w-3.5 h-3.5 text-amber-300" />
                                  )}
                                  <span>Duyệt VIP</span>
                                </Button>
                              ) : (
                                <span className="text-xs text-emerald-500 font-semibold inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>VIP Hoạt động</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredOrders.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground font-semibold">
                            Chưa có đơn hàng thanh toán nào phù hợp
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: DANH SÁCH ĐĂNG KÝ KHÓA HỌC */}
          <TabsContent value="enrollments" className="space-y-4">
            {loadingEnrollments ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border/70 overflow-hidden shadow-soft-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/70 bg-muted/50 text-xs font-black uppercase text-muted-foreground">
                        <th className="text-left px-4 py-3">Học viên</th>
                        <th className="text-left px-4 py-3">Khóa học</th>
                        <th className="text-center px-4 py-3">Bắt đầu</th>
                        <th className="text-center px-4 py-3">Hết hạn</th>
                        <th className="text-center px-4 py-3">Còn lại</th>
                        <th className="text-center px-4 py-3">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEnrollments.map((e: any) => (
                        <tr
                          key={e.id}
                          className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3.5 font-bold text-foreground">{e.profiles?.full_name ?? "—"}</td>
                          <td className="px-4 py-3.5 text-foreground font-medium">{e.courses?.title ?? "—"}</td>
                          <td className="px-4 py-3.5 text-center text-muted-foreground">
                            {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString("vi-VN") : ""}
                          </td>
                          <td className="px-4 py-3.5 text-center text-muted-foreground">
                            {e.expires_at ? new Date(e.expires_at).toLocaleDateString("vi-VN") : "Vĩnh viễn"}
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-foreground">
                            {e.remaining !== null ? `${e.remaining} ngày` : "∞"}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <Badge className={`${statusMap[e.status]?.color} font-bold rounded-lg px-2.5 py-0.5`}>
                              {statusMap[e.status]?.label}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {filteredEnrollments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground font-semibold">
                            Không có dữ liệu đăng ký nào phù hợp
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminEnrollments;
