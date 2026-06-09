import {
  FileCode2,
  Github,
  KeyRound,
  LayoutDashboard,
  Settings,
  type LucideIcon
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Deployments", href: "/deployments", icon: FileCode2 },
  { label: "Repositories", href: "/repositories", icon: Github },
  { label: "Connections", href: "/connections", icon: KeyRound },
  { label: "Settings", href: "/settings", icon: Settings }
];
