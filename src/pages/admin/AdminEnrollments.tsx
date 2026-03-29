import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const enrollments = [
  { id: 1, student: "Nguyễn A", email: "a@gmail.com", course: "TOEIC L&R", start: "01/01", end: "01/07/2026", remaining: 94, status: "active" },
  { id: 2, student: "Trần B", email: "b@gmail.com", course: "EZ Vocab", start: "01/01", end: "25/03/2026", remaining: 0, status: "expired" },
  { id: 3, student: "Lê C", email: "c@gmail.com", course: "TOEIC L&R", start: "15/01", end: "15/07/2026", remaining: 108, status: "active" },
  { id: 4, student: "Phạm D", email: "d@gmail.com", course: "Full Test", start: "01/02", end: "01/08/2026", remaining: 125, status: "active" },
  { id: 5, student: "Hoàng E", email: "e@gmail.com", course: "Listening", start: "01/03", end: "05/04/2026", remaining: 7, status: "expiring" },
  { id: 6, student: "Vũ F", email: "f@gmail.com", course: "TOEIC L&R", start: "10/01", end: "20/03/2026", remaining: 0, status: "expired" },
];

const statusMap: Record<string, { label: string; color: string }> = {
  active: { label: "Còn hạn", color: "bg-success text-success-foreground" },
  expired: { label: "Hết hạn", color: "bg-destructive text-destructive-foreground" },
  expiring: { label: "Sắp hết", color: "bg-warning text-warning-foreground" },
};

const AdminEnrollments = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quản lý Đăng Ký</h1>
            <p className="text-sm text-muted-foreground">{enrollments.length} đăng ký</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">📥 Import Excel</Button>
            <Button>+ Tạo đăng ký</Button>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm..." className="pl-9" />
        </div>

        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-semibold text-foreground">Học viên</th>
                  <th className="text-left p-3 font-semibold text-foreground">Khóa học</th>
                  <th className="text-center p-3 font-semibold text-foreground">Bắt đầu</th>
                  <th className="text-center p-3 font-semibold text-foreground">Hết hạn</th>
                  <th className="text-center p-3 font-semibold text-foreground">Còn lại</th>
                  <th className="text-center p-3 font-semibold text-foreground">Trạng thái</th>
                  <th className="text-center p-3 font-semibold text-foreground">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <p className="font-medium text-foreground">{e.student}</p>
                      <p className="text-xs text-muted-foreground">{e.email}</p>
                    </td>
                    <td className="p-3 text-foreground">{e.course}</td>
                    <td className="p-3 text-center text-muted-foreground">{e.start}</td>
                    <td className="p-3 text-center text-muted-foreground">{e.end}</td>
                    <td className="p-3 text-center text-foreground">{e.remaining} ngày</td>
                    <td className="p-3 text-center">
                      <Badge className={statusMap[e.status].color}>{statusMap[e.status].label}</Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Button size="sm" variant="outline" className="text-xs">
                        {e.status === "expired" ? "Gia hạn" : "Quản lý"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEnrollments;
