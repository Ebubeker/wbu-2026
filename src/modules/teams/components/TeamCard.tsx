import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, Shield } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TeamData } from '../types'

interface TeamCardProps {
  team: TeamData
}

export function TeamCard({ team }: TeamCardProps) {
  return (
    <Link href={`/teams/${team.id}`} className="block">
      <Card className="group h-full overflow-hidden transition-all duration-200 hover:-translate-y-1">
        <CardContent className="flex h-full flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            {team.group ? (
              <Badge variant="outline">{team.group.name}</Badge>
            ) : (
              <span />
            )}
            <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
          </div>

          <div className="mt-8 flex flex-1 flex-col items-center text-center">
            <div className="relative h-20 w-20 overflow-hidden rounded-[18px] border border-white/10 bg-background p-3">
              {team.logo ? (
                <Image
                  src={team.logo}
                  alt={team.name}
                  fill
                  className="object-contain p-3"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Shield className="h-9 w-9 text-primary" />
                </div>
              )}
            </div>

            <h3 className="mt-5 text-lg font-semibold leading-tight text-foreground">
              {team.name}
            </h3>

            <Badge variant="secondary" className="mt-3">
              {team.shortName}
            </Badge>

            {team.description ? (
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {team.description}
              </p>
            ) : (
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Tap to see the squad, match history, and team statistics.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
