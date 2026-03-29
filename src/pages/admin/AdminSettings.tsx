import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const AdminSettings = () => {
  const { toast } = useToast();

  const handleSave = () => {
    toast({ title: "Đã lưu cài đặt", description: "Cài đặt hệ thống đã được cập nhật." });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-foreground">Cài đặt Hệ thống</h1>

        <Tabs defaultValue="platform">
          <TabsList>
            <TabsTrigger value="platform">Nền tảng</TabsTrigger>
            <TabsTrigger value="admins">Tài khoản Admin</TabsTrigger>
            <TabsTrigger value="email">Email & Thông báo</TabsTrigger>
            <TabsTrigger value="security">Bảo mật</TabsTrigger>
          </TabsList>

          <TabsContent value="platform" className="mt-4">
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <div className="space-y-2">
                <Label>Tên nền tảng</Label>
                <Input defaultValue="L-English" />
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input defaultValue="Learn Smart. Score High." />
              </div>
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">Upload logo</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Màu chủ đạo</Label>
                  <div className="flex gap-2">
                    <div className="w-10 h-10 rounded-lg bg-primary border" />
                    <Input defaultValue="#4f46e5" className="flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Màu accent</Label>
                  <div className="flex gap-2">
                    <div className="w-10 h-10 rounded-lg bg-accent border" />
                    <Input defaultValue="#10b981" className="flex-1" />
                  </div>
                </div>
              </div>
              <Button onClick={handleSave}>Lưu thay đổi</Button>
            </div>
          </TabsContent>

          <TabsContent value="admins" className="mt-4 space-y-4">
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold text-foreground">Tên</th>
                    <th className="text-left p-3 font-semibold text-foreground">Email</th>
                    <th className="text-center p-3 font-semibold text-foreground">Vai trò</th>
                    <th className="text-center p-3 font-semibold text-foreground">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium text-foreground">Admin</td>
                    <td className="p-3 text-muted-foreground">admin@l-english.vn</td>
                    <td className="p-3 text-center text-primary">Super Admin</td>
                    <td className="p-3 text-center text-muted-foreground">01/01/2026</td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="p-3 font-medium text-foreground">Content</td>
                    <td className="p-3 text-muted-foreground">content@l-english.vn</td>
                    <td className="p-3 text-center text-accent">Content Manager</td>
                    <td className="p-3 text-center text-muted-foreground">15/01/2026</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <Button>+ Thêm admin</Button>
          </TabsContent>

          <TabsContent value="email" className="mt-4">
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Gửi email chào mừng khi đăng ký</Label>
                  <p className="text-xs text-muted-foreground">Tự động gửi email khi học viên tạo tài khoản</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Nhắc nhở khi sắp hết hạn</Label>
                  <p className="text-xs text-muted-foreground">Gửi email trước 7 ngày khi khóa học sắp hết hạn</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Thông báo bộ đề mới</Label>
                  <p className="text-xs text-muted-foreground">Thông báo khi có bộ đề mới được phát hành</p>
                </div>
                <Switch />
              </div>
              <Button onClick={handleSave}>Lưu cài đặt</Button>
            </div>
          </TabsContent>

          <TabsContent value="security" className="mt-4">
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <div className="space-y-2">
                <Label>Thời gian session timeout</Label>
                <Select defaultValue="8">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 giờ</SelectItem>
                    <SelectItem value="4">4 giờ</SelectItem>
                    <SelectItem value="8">8 giờ</SelectItem>
                    <SelectItem value="24">24 giờ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Xác thực 2 bước</Label>
                  <p className="text-xs text-muted-foreground">Bảo vệ tài khoản admin bằng 2FA</p>
                </div>
                <Switch />
              </div>
              <Button onClick={handleSave}>Lưu cài đặt</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
