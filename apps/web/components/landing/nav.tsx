"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Mark } from "./primitives/mark";
import { navLinks } from "./data";

export function Nav() {
  const scrolled = useScrolled(20);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-5 sm:px-6">
      <div
        className={`pointer-events-auto relative flex h-[56px] w-full items-center justify-between rounded-full border border-white/[0.09] backdrop-blur-2xl backdrop-saturate-150 transition-[max-width,gap,padding,background-color,box-shadow] duration-500 ease-out ${
          scrolled
            ? "max-w-5xl gap-4 bg-black/65 pl-5 pr-1.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)]"
            : "max-w-7xl gap-8 bg-black/35 pl-6 pr-2 shadow-[0_14px_40px_-18px_rgba(0,0,0,0.55)]"
        }`}
      >
        <NavRing />
        <Brand />
        <NavLinks />
        <Actions />
      </div>
    </header>
  );
}

function useScrolled(threshold = 20) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > threshold);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [threshold]);

  return scrolled;
}

function NavRing() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-px rounded-[inherit] bg-gradient-to-b from-white/[0.14] via-white/[0.04] to-transparent opacity-70 [mask:linear-gradient(black,transparent_55%)]"
    />
  );
}

function Brand() {
  return (
    <Link href="/" className="relative z-10 flex shrink-0 items-center gap-2.5">
      <Mark />
      <span className="text-[15px] font-medium tracking-tight text-white">AWS-ify</span>
    </Link>
  );
}

function NavLinks() {
  return (
    <nav className="relative z-10 hidden items-center gap-1 md:flex">
      {navLinks.map(([label, href]) => (
        <a
          key={href}
          href={href}
          className="whitespace-nowrap rounded-full px-3.5 py-2 text-[14px] text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          {label}
        </a>
      ))}
    </nav>
  );
}

function Actions() {
  return (
    <div className="relative z-10 flex shrink-0 items-center gap-1.5">
      <Link
        href="/dashboard"
        className="hidden whitespace-nowrap rounded-full px-4 py-2 text-[14px] text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white sm:inline-flex"
      >
        Sign in
      </Link>
      <Link
        href="/onboarding"
        className="group inline-flex whitespace-nowrap items-center gap-1.5 rounded-full bg-white py-2 pl-4 pr-3.5 text-[14px] font-medium text-black transition-transform hover:scale-[1.02]"
      >
        Get started
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
