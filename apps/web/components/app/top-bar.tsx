import Link from "next/link";
import { Cloud, Github, Search } from "lucide-react";
import { Button } from "../ui/button";

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.06] bg-black/40 px-4 backdrop-blur-xl sm:px-6">
      <LeftCluster />
      <RightCluster />
    </header>
  );
}

function LeftCluster() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Link
        href="/"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] lg:hidden"
      >
        <Cloud className="h-4 w-4 text-white/75" />
      </Link>
      <SearchBox />
    </div>
  );
}

function SearchBox() {
  return (
    <button className="hidden h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-[13px] text-white/45 transition-colors hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-white/75 sm:flex">
      <Search className="h-3.5 w-3.5" />
      Search AWS-ify
      <kbd className="ml-3 hidden rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-white/45 md:inline-block">
        ⌘ K
      </kbd>
    </button>
  );
}

function RightCluster() {
  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary">
        <Github className="h-4 w-4" />
        Connect
      </Button>
      <Button>New deploy</Button>
    </div>
  );
}
