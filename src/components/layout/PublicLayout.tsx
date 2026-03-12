import type { ReactNode } from "react"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { cn } from "@/lib/utils"

interface PublicLayoutProps {
  children: ReactNode
  contentClassName?: string
  maxWidthClassName?: string
}

export function PublicLayout({
  children,
  contentClassName,
  maxWidthClassName = "max-w-6xl",
}: PublicLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <Header />

      <main className="relative z-10 flex-1">
        <div
          className={cn(
            "mx-auto w-full px-4 pb-28 pt-5 sm:px-6 sm:pb-20 sm:pt-6 lg:px-8",
            maxWidthClassName,
            contentClassName
          )}
        >
          {children}
        </div>
      </main>

      <Footer />
    </div>
  )
}
