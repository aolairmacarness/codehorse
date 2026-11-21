// Plain (non-"use client") module so the root layout — a server component —
// can import the actual string. Keep in sync with ThemeProvider's logic.
export const THEME_STORAGE_KEY = "theme";

// Runs before hydration to set the `dark` class and avoid a theme flash.
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
