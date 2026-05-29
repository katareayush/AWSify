import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Mark } from "./primitives/mark";
import { navLinks } from "./data";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050505]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Mark />
          <span className="text-[15px] font-medium tracking-tight text-white">Awsify</span>
        </Link>

        <nav className="hidden items-center gap-8 text-[13px] text-white/55 md:flex">
          {navLinks.map(([label, href]) => (
            <a key={href} href={href} className="transition-colors hover:text-white">
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="hidden rounded-full px-3.5 py-1.5 text-[13px] text-white/70 transition-colors hover:text-white sm:inline-block"
          >
            Sign in
          </Link>
          <Link
            href="/onboarding"
            className="group inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium text-black transition-transform hover:scale-[1.02]"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
