import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Search, Eye, Edit, Ban, RefreshCw, BookPlus } from "lucide-react";

const students = [
  { id: "u1", name: "Nguyễn Văn An", email: "an@gmail.com", courses: 3, enrolled: "01/01/2026", status: "active" },
  { id: "u2", name: "Trần Thị Bình", email: "binh@gmail.com", courses: 2, enrolled: "15/01/2026", status: "active" },
  { id: "u3", name: "Lê Minh Châu", email: "chau@gmail.com", courses: 1, enrolled: "01/02/2026", status: "active" },
  { id: "u4", name: "Phạm Duy", email: "duy@gmail.com", courses: 3, enrolled: "10/02/2026", status: "active" },
  { id: "u5", name: "Hoàng Enh", email: "enh@gmail.com", courses: 1, enrolled: "15/02/2026", status: "expired" },
  { id: "u6", name: "Vũ Phương", email: "phuong@gmail.com", courses: 2, enrolled: "20/02/2026", status: "active" },
  { id: "u7", name: "Đặng Giang", email: "giang@gmail.com", courses: 0, enrolled: "01/03/2026", status: "inactive" },
  { id: "u8", name: "Bùi Hải", email: "hai@gmail.com", courses: 3, enrolled: "05/03/2026", status: "active" },
  { id: "u9", name: "Ngô Khánh", email: "khanh@gmail.com", courses: 1, enrolled: "10/03/2026", status: "expired" },
  { id: "u10", name: "Mai Linh", email: "linh@gmail.com", courses: 0, enrolled: "20/03/2026", status: "inactive" },
];

const statusMap: Record<string, { label: string; color: string }> = {
  active: { label: "Đang học", color: "bg-success text-success-foreground" },
  expired: { label: "Hết hạn", color: "bg-warning text-warning-foreground" },
  inactive: { label: "Chưa đăng ký", color: "bg-muted text-muted-foreground" },
};

const AdminStudents = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quản lý Học Viên</h1>
            <p className="text-sm text-muted-foreground">1,248 học viên</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">📥 Xuất Excel</Button>
            <Button>+ Thêm học viên</Button>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm theo tên, email..." className="pl-9" />
        </div>

        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-semibold text-foreground">#</th>
                  <th className="text-left p-3 font-semibold text-foreground">Họ tên</th>
                  <th className="text-left p-3 font-semibold text-foreground">Email</th>
                  <th className="text-center p-3 font-semibold text-foreground">Khóa</th>
                  <th className="text-center p-3 font-semibold text-foreground">Ngày ĐK</th>
                  <th className="text-center p-3 font-semibold text-foreground">Trạng thái</th>
                  <th className="text-center p-3 font-semibold text-foreground">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground">{i + 1}</td>
                    <td className="p-3 font-medium text-foreground">{s.name}</td>
                    <td className="p-3 text-muted-foreground">{s.email}</td>
                    <td className="p-3 text-center text-foreground">{s.courses} khóa</td>
                    <td className="p-3 text-center text-muted-foreground">{s.enrolled}</td>
                    <td className="p-3 text-center">
                      <Badge className={statusMap[s.status].color}>{statusMap[s.status].label}</Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="icon" variant="ghost" asChild>
                          <Link to={`/admin/students/${s.id}`}><Eye className="w-4 h-4" /></Link>
                        </Button>
                        {s.status === "expired" && (
                          <Button size="icon" variant="ghost"><RefreshCw className="w-4 h-4 text-accent" /></Button>
                        )}
                        {s.status === "inactive" && (
                          <Button size="icon" variant="ghost"><BookPlus className="w-4 h-4 text-primary" /></Button>
                        )}
                      </div>
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

export default AdminStudents;
