import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import Logo from "@/components/Logo";

const Register = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <Link to="/" className="mb-4">
            <Logo imgClassName="w-12 h-12" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Đăng ký tài khoản</h1>
          <p className="text-sm text-muted-foreground mt-1">Học Tiếng Anh giá rẻ, chất lượng cao</p>
        </div>


        <div className="bg-card rounded-xl border shadow-sm p-8 space-y-6 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Liên hệ để tạo tài khoản</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vui lòng liên hệ Admin qua Zalo để được tạo tài khoản dùng thử miễn phí và nhận ưu đãi tốt nhất.
            </p>
            
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
              <p className="text-sm font-medium text-primary mb-1">Số điện thoại Zalo</p>
              <p className="text-2xl font-bold text-foreground">0334729066</p>
            </div>
            
            <Button className="w-full py-6 text-lg" asChild>
              <a href="https://zalo.me/0334729066" target="_blank" rel="noopener noreferrer">
                Nhắn tin Zalo ngay
              </a>
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground pt-4 border-t">
            Đã có tài khoản?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Đăng nhập ngay</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

