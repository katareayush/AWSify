import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AWS-ify: Ship AWS infrastructure from your repository",
  description:
    "AWS-ify turns your repository into reviewed, production-grade AWS infrastructure. No console. No drift. Templates execute, you approve."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
