import { useEffect } from "react";

const ThemeToggle = () => {
  useEffect(() => {
    // Force light mode always
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }, []);

  return null;
};

export default ThemeToggle;

