import { PublicLayout } from '@/components/layout/PublicLayout'

export default function PublicLoading() {
  return (
    <PublicLayout>
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-muted" />
        <div className="h-4 w-72 rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl border border-border bg-card" />
          ))}
        </div>
      </div>
    </PublicLayout>
  )
}
