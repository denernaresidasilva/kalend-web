import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./styles/kalend-tokens.css";
import "./styles/kalend-components.css";
import "./styles/super-admin-shell.css";
import "./styles/kalend-plans.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { themeScript } from "@/lib/theme";
import { CommercialNotice } from "@/components/commercial-notice";
import { PwaProvider } from "@/components/pwa-provider";
import { CommercialEntry } from "@/components/commercial-entry";
import { AuthProvider } from "@/components/auth-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kalend · Super Admin",
  description: "Administração da plataforma Kalend",
  applicationName: "Kalend",
  appleWebApp: { capable: true, title: "Kalend", statusBarStyle: "default" },
  icons: { apple: "/icons/kalend-180.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#6558f5" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-full flex flex-col"><ThemeProvider><AuthProvider><PwaProvider /><CommercialNotice /><CommercialEntry>{children}</CommercialEntry></AuthProvider></ThemeProvider></body>
    </html>
  );
}
