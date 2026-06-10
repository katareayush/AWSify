import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Repositories — AWS-ify"
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
