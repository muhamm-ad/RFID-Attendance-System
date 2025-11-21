import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

const themeInitScript = `
(function () {
  const storageKey = "theme";
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const systemTheme = () => (media.matches ? "dark" : "light");
  const getStoredTheme = () => {
    try {
      return window.localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  };

  const applyTheme = (theme, persist) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    if (persist) {
      try {
        window.localStorage.setItem(storageKey, theme);
      } catch {}
    }
    window.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
  };

  const initialTheme = getStoredTheme() || systemTheme();
  applyTheme(initialTheme);

  window.__setTheme = (theme) => {
    applyTheme(theme, true);
  };

  media.addEventListener("change", (event) => {
    if (!getStoredTheme()) {
      applyTheme(event.matches ? "dark" : "light");
    }
  });
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RFID Access Control System",
  description: "Automated entry and exit management with payment tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <div className="fixed right-4 top-4 z-50">
          <ThemeToggle />
        </div>
        {children}
      </body>
    </html>
  );
}
