import logoImg from "@/assets/logo.jpg";
import { Link } from "react-router-dom";

interface LogoProps {
  className?: string;
  imgClassName?: string;
  showText?: boolean;
}

const Logo = ({ className = "", imgClassName = "w-10 h-10", showText = true }: LogoProps) => {
  return (
    <Link to="/" className={`flex items-center gap-2.5 ${className}`}>
      <div className={`rounded-2xl overflow-hidden flex items-center justify-center shadow-lg shadow-[var(--duo-green)]/20 border-2 border-white/60 bg-gradient-to-br from-[var(--duo-green)] via-[var(--duo-green)] to-[var(--duo-orange)] ${imgClassName}`}>
        <img src={logoImg} alt="L-English Logo" className="w-full h-full object-cover" />
      </div>
      {showText && (
        <span className="text-xl font-black tracking-normal bg-gradient-to-r from-[var(--duo-green)] to-[var(--duo-orange)] bg-clip-text text-transparent">
          L-English
        </span>
      )}
    </Link>
  );
};

export default Logo;
