import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PitchView } from './PitchView'
import type { LineupData } from '../types'
import type { Formation } from '@/lib/formations'

interface LineupDisplayProps {
  homeLineup: LineupData | null
  awayLineup: LineupData | null
  homeKit?: { primaryColor: string; secondaryColor: string } | null
  awayKit?: { primaryColor: string; secondaryColor: string } | null
  homeTeamName?: string
  awayTeamName?: string
}

export function LineupDisplay({
  homeLineup,
  awayLineup,
  homeKit,
  awayKit,
  homeTeamName,
  awayTeamName,
}: LineupDisplayProps) {
  if (!homeLineup && !awayLineup) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Lineups not announced yet
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-2">
          {/* Home side */}
          <div className="border-r border-border">
            <div className="p-3 text-center border-b border-border">
              <p className="font-semibold text-sm">{homeTeamName ?? 'Home'}</p>
              {homeLineup && (
                <Badge variant="outline" className="mt-1">{homeLineup.formation}</Badge>
              )}
            </div>
            {homeLineup ? (
              <PitchView
                formation={homeLineup.formation as Formation}
                players={homeLineup.players.map((p) => ({
                  name: p.player.name,
                  number: p.player.number,
                  positionSlot: p.positionSlot,
                }))}
                primaryColor={homeKit?.primaryColor ?? '#FFFFFF'}
                secondaryColor={homeKit?.secondaryColor ?? '#000000'}
                side="left"
                className="aspect-[2/3]"
              />
            ) : (
              <div className="flex items-center justify-center aspect-[2/3] text-sm text-muted-foreground">
                Not announced
              </div>
            )}
          </div>

          {/* Away side */}
          <div>
            <div className="p-3 text-center border-b border-border">
              <p className="font-semibold text-sm">{awayTeamName ?? 'Away'}</p>
              {awayLineup && (
                <Badge variant="outline" className="mt-1">{awayLineup.formation}</Badge>
              )}
            </div>
            {awayLineup ? (
              <PitchView
                formation={awayLineup.formation as Formation}
                players={awayLineup.players.map((p) => ({
                  name: p.player.name,
                  number: p.player.number,
                  positionSlot: p.positionSlot,
                }))}
                primaryColor={awayKit?.primaryColor ?? '#FFFFFF'}
                secondaryColor={awayKit?.secondaryColor ?? '#000000'}
                side="right"
                className="aspect-[2/3]"
              />
            ) : (
              <div className="flex items-center justify-center aspect-[2/3] text-sm text-muted-foreground">
                Not announced
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
