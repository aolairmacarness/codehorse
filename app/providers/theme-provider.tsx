"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "theme";
const THEME_CHANGE = "theme-change";

function resolveDark(theme: Theme, enableSystem: boolean) {
  if (theme === "dark") return true;
  if (theme === "light" || !enableSystem) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(
  theme: Theme,
  enableSystem: boolean,
  disableTransition: boolean,
) {
  const root = document.documentElement;
  const style = disableTransition ? document.createElement("style") : null;
  if (style) {
    style.appendChild(
      document.createTextNode(
        "*,*::before,*::after{transition:none!important}",
      ),
    );
    document.head.appendChild(style);
  }
  root.classList.toggle("dark", resolveDark(theme, enableSystem));
  if (style) {
    void window.getComputedStyle(root).transition;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => style.remove());
    });
  }
}

function readTheme(defaultTheme: Theme): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return defaultTheme;
}

const themeScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
}: {
  children: ReactNode;
  attribute?: "class";
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}) {
  const theme = useSyncExternalStore(
    (onStoreChange) => {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const onMedia = () => {
        if (enableSystem && readTheme(defaultTheme) === "system") {
          applyTheme("system", enableSystem, disableTransitionOnChange);
        }
        onStoreChange();
      };
      window.addEventListener(THEME_CHANGE, onStoreChange);
      media.addEventListener("change", onMedia);
      return () => {
        window.removeEventListener(THEME_CHANGE, onStoreChange);
        media.removeEventListener("change", onMedia);
      };
    },
    () => readTheme(defaultTheme),
    () => defaultTheme,
  );

  useEffect(() => {
    if (attribute === "class") {
      applyTheme(theme, enableSystem, disableTransitionOnChange);
    }
  }, [attribute, theme, enableSystem, disableTransitionOnChange]);

  function setTheme(next: Theme) {
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next, enableSystem, disableTransitionOnChange);
    window.dispatchEvent(new Event(THEME_CHANGE));
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
