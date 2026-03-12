import { Badge } from "@/components/ui/badge"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { LoginForm } from "@/modules/auth/components/LoginForm"

export default function LoginPage() {
  return (
    <PublicLayout
      maxWidthClassName="max-w-4xl"
      contentClassName="flex min-h-[calc(100vh-9rem)] items-center justify-center"
    >
      <div className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[24px] border border-white/10 bg-card p-6 sm:p-8">
          <Badge className="border-primary/20 bg-primary/15 text-primary">
            Team Access
          </Badge>
          <h1 className="mt-5 text-4xl font-bold text-foreground">
            Sign in to manage your side.
          </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Captains and staff can update players, review fixtures, and keep team
              information current from the same mobile-friendly workspace.
            </p>
          <div className="mt-8 rounded-[16px] border border-white/10 bg-background p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-primary/75">
              WBU 2026
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use the credentials assigned to your team account. Public visitors can
              continue browsing fixtures, standings, and bracket views without logging in.
            </p>
          </div>
        </div>
        <LoginForm />
      </div>
    </PublicLayout>
  )
}
