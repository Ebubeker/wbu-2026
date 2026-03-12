import { cn } from '@/lib/utils'

interface LiveMinuteDisplayProps {
  minute: number
  isLive: boolean
}

export function LiveMinuteDisplay({ minute, isLive }: LiveMinuteDisplayProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {isLive && (
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
      )}
      <span
        className={cn(
          'text-3xl font-bold tabular-nums',
          isLive ? 'text-red-600' : 'text-muted-foreground'
        )}
      >
        {minute}&apos;
      </span>
    </div>
  )
}
