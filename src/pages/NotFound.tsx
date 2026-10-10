import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050914] text-slate-100 p-4 relative overflow-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none z-0" />
      <div className="fixed -top-28 -right-28 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none z-0" />
      <div className="fixed -bottom-28 -left-28 w-[550px] h-[550px] rounded-full bg-blue-600/10 blur-[160px] pointer-events-none z-0" />

      <div className="relative z-10 bg-[#070e1c]/90 border border-cyan-500/20 backdrop-blur-xl p-8 sm:p-10 max-w-md w-full text-center space-y-5 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_30px_rgba(6,182,212,0.1)]">
        <div className="text-6xl mb-2">🦉</div>
        <h1 className="text-5xl font-black text-white tracking-tight font-display bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">404</h1>
        <p className="text-lg font-bold text-slate-200">Úi! Trang này không tồn tại</p>
        <p className="text-xs sm:text-sm text-slate-400 font-medium">Có vẻ bạn đã đi lạc rồi. Hãy quay về trang chủ nhé!</p>
        <Link to="/" className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(6,182,212,0.3)] transition-all active:scale-95 cursor-pointer">
          Về trang chủ 🏠
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
