import { AppRoot, PageTransition, Sidebar, TopBar } from "./app";

interface ProductShellProps {
  children: React.ReactNode;
  active?: string;
}

export function ProductShell({ children, active = "Deployments" }: ProductShellProps) {
  return (
    <AppRoot>
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <Sidebar active={active} />
        <section className="min-w-0">
          <TopBar />
          <div className="px-4 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto max-w-7xl">
              <PageTransition>{children}</PageTransition>
            </div>
          </div>
        </section>
      </div>
    </AppRoot>
  );
}
