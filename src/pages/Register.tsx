import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Lỗi", description: "Mật khẩu xác nhận không khớp.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Lỗi", description: "Mật khẩu phải có ít nhất 6 ký tự.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Đăng ký thất bại", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Đăng ký thành công!", description: "Chào mừng bạn đến với L-English." });
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-primary">L-English</span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Tạo tài khoản</h1>
          <p className="text-sm text-muted-foreground mt-1">Bắt đầu hành trình chinh phục TOEIC!</p>
        </div>

        <div className="bg-card rounded-xl border shadow-sm p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Họ và tên</Label>
              <Input id="name" placeholder="Nguyễn Văn A" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" placeholder="Tối thiểu 6 ký tự" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Xác nhận mật khẩu</Label>
              <Input id="confirm" type="password" placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="terms" required />
              <Label htmlFor="terms" className="text-sm text-muted-foreground">
                Tôi đồng ý với <a href="#" className="text-primary hover:underline">điều khoản sử dụng</a>
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
