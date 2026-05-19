import logoImg from "@/assets/logo.jpg";

interface LogoProps {
  className?: string;
  imgClassName?: string;
  showText?: boolean;
}

const Logo = ({ className = "", imgClassName = "w-10 h-10", showText = true }: LogoProps) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`rounded-2xl overflow-hidden flex items-center justify-center shadow-lg shadow-[var(--duo-green)]/20 border-2 border-white/50 bg-gradient-to-br from-[#FF0080] via-[#FF0080] to-[#FF8C00] ${imgClassName}`}>
        <img src={logoImg} alt="L-English Logo" className="w-full h-full object-cover" />
      </div>
      {showText && (
        <span className="text-xl font-black tracking-tight bg-gradient-to-r from-[#FF0080] to-[#FF8C00] bg-clip-text text-transparent">
          L-English
        </span>
      )}
    </div>
  );
};

export default Logo;
