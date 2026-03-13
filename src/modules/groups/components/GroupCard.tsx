import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Swords } from 'lucide-react'
import type { GroupWithTeams } from '../types'

interface GroupCardProps {
  group: GroupWithTeams
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>{group.name}</span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {group._count?.teams ?? group.teams.length}
            </span>
            {group._count?.matches !== undefined && (
              <span className="inline-flex items-center gap-1">
                <Swords className="h-3 w-3" />
                {group._count.matches}
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {group.teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No teams assigned</p>
        ) : (
          <ul className="space-y-1">
            {group.teams.map((team) => (
              <li key={team.id} className="text-sm flex items-center gap-2">
                {team.logo ? (
                  <img
                    src={team.logo}
                    alt={team.name}
                    className="h-5 w-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                    {team.shortName.charAt(0)}
                  </div>
                )}
                <span>{team.name}</span>
                <span className="text-muted-foreground">({team.shortName})</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
