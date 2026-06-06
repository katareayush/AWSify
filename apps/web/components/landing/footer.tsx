import Link from "next/link";
import { Mark } from "./primitives/mark";
import { Wordmark } from "./primitives/wordmark";
import { footerColumns } from "./data";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/[0.06]">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_2fr]">
        <Brand />
        <div className="grid grid-cols-2 gap-8 text-[13.5px] sm:grid-cols-3">
          {footerColumns.map((col) => (
            <FooterCol key={col.title} title={col.title} links={col.links} />
          ))}
        </div>
      </div>
    </footer>
  );
}

function Brand() {
  return (
    <div>
      <Link href="/" className="flex items-center gap-2.5">
        <Mark />
        <Wordmark size={16} />
      </Link>
      <p className="mt-5 max-w-sm text-[13.5px] leading-[1.6] text-white/45">
        A control plane between your repository and AWS. Reviewed templates.
        Owned by you. Built for teams shipping in production.
      </p>
      <p className="mt-6 font-mono text-[11px] text-white/30">
        © {new Date().getFullYear()} AWS-ify Labs · <Link href="/status" className="transition-colors hover:text-white/55">status</Link>
      </p>
    </div>
  );
}

interface FooterColProps {
  title: string;
  links: ReadonlyArray<readonly [string, string]>;
}

function FooterCol({ title, links }: FooterColProps) {
  return (
    <div>
      <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-white/35">{title}</p>
      <div className="mt-4 space-y-2.5">
        {links.map(([label, href]) => (
          <Link
            key={label}
            href={href}
            className="block text-white/65 transition-colors hover:text-white"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
