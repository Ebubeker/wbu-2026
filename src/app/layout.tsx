import type { Metadata, Viewport } from "next"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "WBU 2026 Championship",
  description: "Western Balkans University 2026 Football Championship",
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased selection:bg-primary/30 selection:text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
