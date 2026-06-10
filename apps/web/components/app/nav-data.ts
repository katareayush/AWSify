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

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Platform",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Deployments", href: "/deployments", icon: FileCode2 },
      { label: "Repositories", href: "/repositories", icon: Github }
    ]
  },
  {
    label: "Configure",
    items: [
      { label: "Connections", href: "/connections", icon: KeyRound },
      { label: "Settings", href: "/settings", icon: Settings }
    ]
  }
];

export const navItems: NavItem[] = navGroups.flatMap((group) => group.items);
