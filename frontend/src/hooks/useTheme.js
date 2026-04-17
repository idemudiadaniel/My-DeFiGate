import { useState, useEffect } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('theme-mode');
    if (saved) return saved === 'dark';
    
    // Then check system preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Update localStorage
    localStorage.setItem('theme-mode', isDark ? 'dark' : 'light');
    
    // Update document class
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  return { isDark, toggleTheme };
}