
import { StatusBadge } from '@/components/common/StatusBadge'

interface LiveScoreboardProps {
  homeTeam: { name: string; shortName: string; logo: string | null }
  awayTeam: { name: string; shortName: string; logo: string | null }
  homeScore: number
  awayScore: number
  matchMinute: number
  status: string
}

export function LiveScoreboard({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  matchMinute,
  status,
}: LiveScoreboardProps) {
  const isLive = ['FIRST_HALF', 'HALF_TIME', 'SECOND_HALF'].includes(status)

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex items-center justify-between gap-4 w-full max-w-md">
        {/* Home */}
        <div className="flex flex-col items-center gap-1 flex-1">
          <div className="relative h-14 w-14">
            {homeTeam.logo ? (
              <img
                src={homeTeam.logo}
                alt={homeTeam.name}
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                {homeTeam.shortName}
              </div>
            )}
          </div>
          <span className="text-sm font-semibold text-center">{homeTeam.name}</span>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3">
            <span className="text-5xl font-bold tabular-nums">{homeScore}</span>
            <span className="text-2xl text-muted-foreground">-</span>
            <span className="text-5xl font-bold tabular-nums">{awayScore}</span>
          </div>
          {isLive && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <span className="text-sm font-medium text-red-600">
                {matchMinute}&apos;
              </span>
            </div>
          )}
        </div>

        {/* Away */}
        <div className="flex flex-col items-center gap-1 flex-1">
          <div className="relative h-14 w-14">
            {awayTeam.logo ? (
              <img
                src={awayTeam.logo}
                alt={awayTeam.name}
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                {awayTeam.shortName}
              </div>
            )}
          </div>
          <span className="text-sm font-semibold text-center">{awayTeam.name}</span>
        </div>
      </div>

      <StatusBadge status={status} />
    </div>
  )
}
