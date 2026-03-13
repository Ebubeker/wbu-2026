import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import type { PlayerData } from '../types'

interface PlayerCardProps {
  player: PlayerData
}

const positionColors: Record<string, string> = {
  GK: 'text-amber-600',
  DEF: 'text-sky-600',
  MID: 'text-emerald-600',
  FWD: 'text-rose-600',
}

export function PlayerCard({ player }: PlayerCardProps) {
  const initial = player.name.charAt(0).toUpperCase()

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:-translate-y-1">
      <CardContent className="flex flex-col items-center gap-2 p-3 sm:gap-3 sm:p-4">
        <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-border/60 bg-muted/30 p-1.5 sm:h-16 sm:w-16 sm:rounded-[14px] sm:p-2">
          {player.photo ? (
            <Image
              src={player.photo}
              alt={player.name}
              fill
              className="object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-foreground sm:text-xl">
              {initial}
            </span>
          )}
        </div>

        <div className="text-center space-y-0.5">
          <p className="text-xs font-semibold leading-tight text-foreground sm:text-sm">{player.name}</p>
          <p className="text-[10px] text-muted-foreground sm:text-xs">
            #{player.number}
          </p>
        </div>

        <span className={`text-[10px] font-semibold uppercase tracking-wider sm:text-xs ${positionColors[player.position] ?? 'text-muted-foreground'}`}>
          {player.position}
        </span>
      </CardContent>
    </Card>
  )
}
