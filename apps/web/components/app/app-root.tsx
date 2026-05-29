import { AppBackdrop } from "./backdrop";

export function AppRoot({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-root font-sans relative min-h-screen overflow-x-hidden">
      <AppBackdrop />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
