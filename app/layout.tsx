import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CommercialNotice } from "@/components/commercial-notice";
import { PwaProvider } from "@/components/pwa-provider";
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><AuthProvider><PwaProvider /><CommercialNotice />{children}</AuthProvider></body>
    </html>
  );
}
