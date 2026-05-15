import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
      toast({ title: "Đã gửi email", description: "Vui lòng kiểm tra hộp thư của bạn để khôi phục mật khẩu." });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-[var(--duo-green)]/10 blur-2xl pointer-events-none" />
      <div className="absolute bottom-20 right-20 w-40 h-40 rounded-full bg-[var(--duo-blue)]/10 blur-2xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-20 h-20 rounded-full bg-[var(--duo-yellow)]/15 blur-xl pointer-events-none" />
      
      <div className="w-full max-w-md relative">
        <div className="text-center mb-8 flex flex-col items-center">
          <Link to="/" className="mb-4">
            <Logo imgClassName="w-14 h-14" />
          </Link>
          <h1 className="text-2xl font-extrabold text-foreground">Quên mật khẩu? 🔒</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Nhập email để đặt lại mật khẩu của bạn</p>
        </div>

        <div className="card-duo p-6 space-y-6">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-bold">Email</Label>
                <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl border-2 border-[var(--duo-gray)] font-medium focus:border-[var(--duo-blue)] transition-colors" />
              </div>
              <button type="submit" className="btn-3d btn-3d-primary w-full py-3.5" disabled={loading}>
                {loading ? "Đang gửi..." : "GỬI LIÊN KẾT KHÔI PHỤC"}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-[var(--duo-green)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[var(--duo-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="font-extrabold text-lg">Kiểm tra email của bạn</h3>
              <p className="text-sm text-muted-foreground font-medium">
                Chúng tôi đã gửi một liên kết khôi phục mật khẩu đến email <strong>{email}</strong>.
              </p>
            </div>
          )}

          <div className="pt-2 text-center border-t-2 border-[var(--duo-gray)] mt-6">
            <p className="text-sm text-muted-foreground font-medium mt-4">
              Nhớ mật khẩu rồi?{" "}
              <Link to="/login" className="text-[var(--duo-blue)] font-bold hover:underline">Quay lại đăng nhập</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
