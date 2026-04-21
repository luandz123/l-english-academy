import logoImg from "@/assets/logo.jpg";

interface LogoProps {
  className?: string;
  imgClassName?: string;
  showText?: boolean;
}

const Logo = ({ className = "", imgClassName = "w-9 h-9", showText = true }: LogoProps) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`rounded-lg overflow-hidden flex items-center justify-center ${imgClassName}`}>
        <img src={logoImg} alt="L-English Logo" className="w-full h-full object-cover" />
      </div>
      {showText && <span className="text-xl font-bold text-primary">L-English</span>}
    </div>
  );
};

export default Logo;
