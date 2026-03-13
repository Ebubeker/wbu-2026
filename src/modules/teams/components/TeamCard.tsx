import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, Shield } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { TeamData } from '../types'

interface TeamCardProps {
  team: TeamData
}

export function TeamCard({ team }: TeamCardProps) {
  return (
    <Link href={`/teams/${team.id}`} className="block">
      <Card className="group h-full overflow-hidden transition-all duration-200 hover:-translate-y-1">
        <CardContent className="flex h-full flex-col p-3 sm:p-5">
          {/* Mobile: horizontal compact layout */}
          <div className="flex items-center gap-3 sm:hidden">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/30 p-1.5">
              {team.logo ? (
                <Image
                  src={team.logo}
                  alt={team.name}
                  fill
                  className="object-contain p-1.5"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-foreground">
                {team.name}
              </h3>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{team.shortName}</span>
                {team.group && (
                  <>
                    <span className="text-border">·</span>
                    <span className="text-[10px] text-muted-foreground">{team.group.name}</span>
                  </>
                )}
              </div>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
          </div>

          {/* Desktop: vertical centered layout */}
          <div className="hidden sm:flex sm:h-full sm:flex-col">
            <div className="flex items-start justify-between gap-3">
              {team.group ? (
                <span className="text-xs text-muted-foreground">{team.group.name}</span>
              ) : (
                <span />
              )}
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
            </div>

            <div className="mt-6 flex flex-1 flex-col items-center text-center">
              <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-border/60 bg-muted/30 p-2">
                {team.logo ? (
                  <Image
                    src={team.logo}
                    alt={team.name}
                    fill
                    className="object-contain p-2"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Shield className="h-7 w-7 text-primary" />
                  </div>
                )}
              </div>

              <h3 className="mt-3 text-base font-semibold leading-tight text-foreground">
                {team.name}
              </h3>

              <span className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                {team.shortName}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
