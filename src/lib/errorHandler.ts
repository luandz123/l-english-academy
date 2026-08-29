/**
 * Helper chuyển đổi lỗi kỹ thuật từ Supabase / API thành thông báo tiếng Việt
 * rõ ràng, thân thiện với người dùng và có hướng dẫn khắc phục cụ thể.
 */
export function getFriendlyErrorMessage(error: any): string {
  if (!error) return "Đã có lỗi xảy ra. Vui lòng thử lại sau.";

  const msg = (typeof error === "string" ? error : error.message || "").toLowerCase();
  const code = (error?.code || "").toString().toLowerCase();

  // 1. Lỗi Auth / Đăng nhập
  if (msg.includes("invalid login credentials") || msg.includes("invalid_grant")) {
    return "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại hoặc sử dụng tính năng 'Quên mật khẩu'.";
  }

  if (msg.includes("user already registered") || msg.includes("email_exists")) {
    return "Email này đã được đăng ký trước đó. Bạn vui lòng đăng nhập hoặc dùng chức năng khôi phục mật khẩu.";
  }

  if (msg.includes("signup disabled") || msg.includes("signup is disabled")) {
    return "Hệ thống tạm thời đóng đăng ký mới. Vui lòng liên hệ quản trị viên để được hỗ trợ.";
  }

  if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed")) {
    return "Tài khoản chưa được xác thực email. Vui lòng kiểm tra hộp thư (hoặc mục Spam) để kích hoạt tài khoản.";
  }

  if (msg.includes("password should be at least")) {
    return "Mật khẩu quá ngắn. Vui lòng đặt mật khẩu tối thiểu 6 ký tự để đảm bảo an toàn.";
  }

  if (msg.includes("over email rate limit") || msg.includes("rate limit") || code === "429") {
    return "Bạn đang thực hiện thao tác quá nhanh. Vui lòng chờ 1-2 phút rồi thử lại nhé.";
  }

  if (msg.includes("auth session missing") || msg.includes("jwt expired") || msg.includes("token is expired")) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.";
  }

  // 2. Lỗi mạng / Network
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed")) {
    return "Mất kết nối mạng hoặc máy chủ không phản hồi. Vui lòng kiểm tra đường truyền Internet của bạn.";
  }

  // 3. Lỗi Database / RLS / Khóa ngoại
  if (code === "23505" || msg.includes("unique constraint")) {
    return "Dữ liệu này đã tồn tại trên hệ thống (bị trùng lặp). Vui lòng đổi tên hoặc kiểm tra lại.";
  }

  if (code === "23503" || msg.includes("foreign key constraint")) {
    return "Không thể xóa hoặc thay đổi vì mục này đang chứa các dữ liệu liên kết khác.";
  }

  if (code === "42501" || msg.includes("row-level security") || msg.includes("permission denied")) {
    return "Bạn không có đủ quyền hạn để thực hiện thao tác này. Vui lòng liên hệ quản trị viên.";
  }

  // 4. Mặc định: Trả về thông báo gốc nếu có ý nghĩa, hoặc câu thông báo chung
  if (error.message && error.message.length < 120 && !error.message.includes("http")) {
    return error.message;
  }

  return "Đã xảy ra sự cố không mong muốn. Vui lòng tải lại trang hoặc thử lại sau ít phút.";
}
