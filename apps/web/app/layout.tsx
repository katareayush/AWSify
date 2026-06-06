import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { ToastProvider } from "../components/ui/toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-app",
  weight: ["400", "500", "600"]
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
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body className="font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
