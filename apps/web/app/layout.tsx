import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AWSify",
  description: "Deploy GitHub apps to AWS ECS Fargate with reviewed templates."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
