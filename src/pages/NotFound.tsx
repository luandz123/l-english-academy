import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-4">
      <div className="card-duo p-8 max-w-md text-center space-y-5">
        <div className="text-6xl mb-2">🦉</div>
        <h1 className="text-4xl font-extrabold text-foreground">404</h1>
        <p className="text-lg font-bold text-muted-foreground">Úi! Trang này không tồn tại</p>
        <p className="text-sm text-muted-foreground font-medium">Có vẻ bạn đã đi lạc rồi. Hãy quay về trang chủ nhé!</p>
        <Link to="/" className="btn-3d btn-3d-primary py-3 px-6 text-base inline-block">
          Về trang chủ 🏠
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
