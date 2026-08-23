"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Ticket } from "lucide-react";
import { Button } from "./ui/button";
import type { SessionUser } from "@/lib/auth";

export function Header({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-cream">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15 text-gold">
            <Ticket className="h-4 w-4" />
          </span>
          <span className="font-display text-lg tracking-tight">StagePass</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-cream/70 md:flex">
          <Link className={nav(pathname, "/shows")} href="/shows">
            Events
          </Link>
          {user?.role === "CUSTOMER" && (
            <Link className={nav(pathname, "/account")} href="/account">
              My tickets
            </Link>
          )}
          {user?.role === "ORGANISER" && (
            <Link className={nav(pathname, "/organiser")} href="/organiser">
              Organiser
            </Link>
          )}
          {!user && (
            <Link className={nav(pathname, "/organiser")} href="/organiser/login">
              Organiser portal
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <Link className={nav(pathname, "/admin")} href="/admin">
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-xs text-cream/50 sm:inline">
                {user.name}
              </span>
              <Button variant="secondary" size="sm" onClick={logout}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Customer sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/organiser/login">Organiser portal</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function nav(path: string, href: string) {
  return path.startsWith(href) ? "text-gold" : "hover:text-cream";
}
