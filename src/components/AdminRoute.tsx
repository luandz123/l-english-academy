import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const alertedRef = useRef(false);

  useEffect(() => {
    if (!loading && user && !isAdmin && !alertedRef.current) {
      alertedRef.current = true;
      toast({
        title: "Truy cập bị từ chối (403 Forbidden)",
        description: "Bạn không có quyền quản trị viên để truy cập khu vực quản trị.",
        variant: "destructive",
      });
    }
  }, [loading, user, isAdmin, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
