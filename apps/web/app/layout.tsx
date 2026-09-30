import type { Metadata } from "next";
import { ToastProvider } from "../components/ui/toast";
import { SidebarProvider } from "../components/app/sidebar-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "AWS-ify: Ship AWS infrastructure from your repository",
  description:
    "AWS-ify turns your repository into reviewed, production-grade AWS infrastructure. No console. No drift. Templates execute, you approve."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
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
