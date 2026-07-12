import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resources — AWS-ify"
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
