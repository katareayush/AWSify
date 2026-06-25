import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "../components/ui/toast";
import { SidebarProvider } from "../components/app/sidebar-context";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600"]
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500"]
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["400"],
  style: ["normal", "italic"]
});

export const metadata: Metadata = {
  title: "AWS-ify: Ship AWS infrastructure from your repository",
  description:
    "AWS-ify turns your repository into reviewed, production-grade AWS infrastructure. No console. No drift. Templates execute, you approve."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}`}>
      <body className="font-sans">
        <ToastProvider>
          {/* Persist sidebar collapse state across navigations so it never
              flashes open-then-collapsed when the per-page shell re-mounts. */}
          <SidebarProvider>{children}</SidebarProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
