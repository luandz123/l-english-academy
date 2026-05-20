import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    // Check initial theme from localStorage or system prefers
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    }

    // Set up a MutationObserver to listen to class changes on documentElement
    // so it syncs with other theme toggles (like the sidebar one)!
    const observer = new MutationObserver(() => {
      const darkActive = document.documentElement.classList.contains("dark");
      setIsDark(darkActive);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full border-4 transition-all duration-200 active:scale-95 active:translate-y-[2px] hover:-translate-y-[2px]",
        isDark 
          ? "bg-zinc-900 border-zinc-800 text-[var(--duo-yellow)] hover:bg-zinc-850 shadow-[0_4px_0_#1a1a1a] active:shadow-[0_2px_0_#1a1a1a]" 
          : "bg-white border-[var(--duo-gray)] text-[var(--duo-purple)] hover:bg-zinc-50 shadow-[0_4px_0_var(--duo-gray)] active:shadow-[0_2px_0_var(--duo-gray)]"
      )}
    >
      {isDark ? (
        <Sun className="w-5 h-5 animate-[spin_8s_linear_infinite]" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
};

export default ThemeToggle;
