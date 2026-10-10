import { useEffect } from "react";

const ThemeToggle = () => {
  useEffect(() => {
    // Default to dark mode matching homepage theme
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  }, []);

  return null;
};

export default ThemeToggle;

