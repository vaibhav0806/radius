"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/reviews", label: "Reviews", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavItems({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
              active
                ? "bg-brand/8 text-brand font-medium shadow-sm ring-1 ring-brand/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted [&:hover_svg]:text-foreground"
            )}
          >
            <Icon className="size-[18px] transition-colors" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:text-foreground hover:bg-muted"
    >
      <Sun className="hidden size-[18px] dark:block" />
      <Moon className="block size-[18px] dark:hidden" />
      <span className="dark:hidden">Dark mode</span>
      <span className="hidden dark:inline">Light mode</span>
    </button>
  );
}

function UserSection() {
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.charAt(0).toUpperCase()
    : "?";

  return (
    <div className="px-3 pb-4">
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-3" />
      <div className="flex items-center gap-3 rounded-lg px-3 py-2">
        <Avatar size="default">
          <AvatarFallback className="bg-gradient-to-br from-orange-400 to-amber-400 text-white text-xs font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {user?.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {user?.email}
          </p>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-3" />
      <ThemeToggle />
      <button
        onClick={logout}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-all hover:bg-destructive/10"
      >
        <LogOut className="size-[18px]" />
        Log out
      </button>
    </div>
  );
}

function SidebarLogo() {
  return (
    <div className="flex h-14 items-center border-b px-5">
      <span className="text-[22px] font-extrabold tracking-[-0.02em] font-logo">radius</span>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 flex-col border-r bg-card/80 backdrop-blur-sm md:flex">
      <SidebarLogo />
      <NavItems pathname={pathname} />
      <UserSection />
    </aside>
  );
}

export function MobileSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden">
        <Menu className="size-5" />
        <span className="sr-only">Open menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SidebarLogo />
        <div className="flex flex-1 flex-col overflow-y-auto">
          <NavItems pathname={pathname} onNavigate={() => setOpen(false)} />
          <UserSection />
        </div>
      </SheetContent>
    </Sheet>
  );
}
