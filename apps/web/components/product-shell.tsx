import Link from "next/link";
import {
  Cloud,
  FileCode2,
  Github,
  KeyRound,
  LayoutDashboard,
  Search,
  Settings
} from "lucide-react";
import { Button } from "./ui/button";

const navItems = [
  { label: "Deployments", href: "/", icon: LayoutDashboard },
  { label: "Repositories", href: "/repositories", icon: Github },
  { label: "Connections", href: "/connections", icon: KeyRound },
  { label: "Templates", href: "/deployments/demo", icon: FileCode2 },
  { label: "Settings", href: "/settings", icon: Settings }
];

export function ProductShell({ children, active = "Deployments" }: { children: React.ReactNode; active?: string }) {
  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-[248px_1fr]">
        <aside className="hidden border-r border-border bg-surface lg:block">
          <Link href="/" className="flex h-14 items-center gap-3 border-b border-border px-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background">
              <Cloud className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">AWSify</p>
              <p className="mt-1 text-xs text-muted-foreground">Personal workspace</p>
            </div>
          </Link>

          <nav className="space-y-1 p-3">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm ${
                  item.label === active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/" className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background lg:hidden">
                <Cloud className="h-4 w-4" />
              </Link>
              <button className="hidden h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground sm:flex">
                <Search className="h-4 w-4" />
                Search AWSify
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary">
                <Github className="h-4 w-4" />
                Connect
              </Button>
              <Button>New deploy</Button>
            </div>
          </header>

          <div className="px-4 py-5 sm:px-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
