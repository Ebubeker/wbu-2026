import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PlayerData } from '../types'

interface PlayerCardProps {
  player: PlayerData
}

const positionColors: Record<string, string> = {
  GK: 'border-amber-300/20 bg-amber-400/15 text-amber-100',
  DEF: 'border-sky-300/20 bg-sky-400/15 text-sky-100',
  MID: 'border-emerald-300/20 bg-emerald-400/15 text-emerald-100',
  FWD: 'border-rose-300/20 bg-rose-400/15 text-rose-100',
}

export function PlayerCard({ player }: PlayerCardProps) {
  const initial = player.name.charAt(0).toUpperCase()

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:-translate-y-1">
      <CardContent className="flex flex-col items-center gap-3 p-4">
        <div className="relative h-16 w-16 overflow-hidden rounded-[14px] border border-white/10 bg-background p-2">
          {player.photo ? (
            <Image
              src={player.photo}
              alt={player.name}
              fill
              className="object-cover"
            />
          ) : (
            <span className="text-xl font-bold text-foreground">
              {initial}
            </span>
          )}
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm font-semibold leading-tight text-foreground">{player.name}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            #{player.number}
          </p>
        </div>

        <Badge
          variant="outline"
          className={positionColors[player.position] ?? ''}
        >
          {player.position}
        </Badge>
      </CardContent>
    </Card>
  )
}
