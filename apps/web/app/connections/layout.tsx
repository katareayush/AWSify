import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connections — AWS-ify"
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
