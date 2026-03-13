import { PublicLayout } from '@/components/layout/PublicLayout'

export default function RootLoading() {
  return (
    <PublicLayout contentClassName="max-w-3xl">
      <div className="space-y-8 animate-pulse">
        <div>
          <div className="h-8 w-56 rounded-lg bg-muted" />
          <div className="mt-2 h-4 w-40 rounded bg-muted" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-24 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl border border-border bg-card" />
          ))}
        </div>
      </div>
    </PublicLayout>
  )
}
