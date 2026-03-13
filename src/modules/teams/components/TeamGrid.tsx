import { TeamCard } from './TeamCard'
import type { TeamData } from '../types'

interface TeamGridProps {
  teams: TeamData[]
}

export function TeamGrid({ teams }: TeamGridProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {teams.map((team) => (
        <TeamCard key={team.id} team={team} />
      ))}
    </div>
  )
}
