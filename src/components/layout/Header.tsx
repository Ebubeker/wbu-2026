"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  CalendarDays,
  GitBranch,
  House,
  Shield,
  TableProperties,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const desktopNavLinks = [
  { href: "/", label: "Home", icon: House },
  { href: "/matches", label: "Matches", icon: CalendarDays },
  { href: "/standings", label: "Standings", icon: TableProperties },
  { href: "/bracket", label: "Bracket", icon: GitBranch },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/statistics", label: "Statistics", icon: BarChart3 },
]

const mobileNavLinks = [
  { href: "/", label: "Home", icon: House },
  { href: "/matches", label: "Matches", icon: CalendarDays },
  { href: "/standings", label: "Standings", icon: TableProperties },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/statistics", label: "Stats", icon: BarChart3 },
]

export function Header() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="WBU 2026 Championship"
              width={36}
              height={36}
              className="shrink-0"
            />
            <p className="truncate text-sm font-semibold text-foreground sm:text-base">
              WBU 2026
            </p>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {desktopNavLinks.map((link) => {
              const active = isActive(link.href)
              const Icon = link.icon

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </nav>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-lg"
          >
            <Link href="/login">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Captain Login</span>
              <span className="sm:hidden">Login</span>
            </Link>
          </Button>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg md:hidden">
        <div className="mx-auto max-w-md px-2 py-2">
          <div className="grid grid-cols-5 gap-1">
            {mobileNavLinks.map((link) => {
              const active = isActive(link.href)
              const Icon = link.icon

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="leading-none">{link.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </>
  )
}
