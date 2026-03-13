export function FormBadges({ form }: { form: ('W' | 'D' | 'L')[] }) {
  if (form.length === 0) return <span className="text-muted-foreground">—</span>

  return (
    <div className="flex gap-1">
      {form.map((result, i) => (
        <span
          key={i}
          className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${
            result === 'W' ? 'bg-emerald-500/20 text-emerald-400' :
            result === 'D' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}
        >
          {result}
        </span>
      ))}
    </div>
  )
}
