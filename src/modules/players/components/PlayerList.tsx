import { User } from 'lucide-react'
import { PlayerCard } from './PlayerCard'
import { EmptyState } from '@/components/common/EmptyState'
import type { PlayerData } from '../types'

interface PlayerListProps {
  players: PlayerData[]
}

export function PlayerList({ players }: PlayerListProps) {
  if (players.length === 0) {
    return (
      <EmptyState
        icon={User}
        title="No players found"
        description="There are no players registered yet."
      />
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {players.map((player) => (
        <PlayerCard key={player.id} player={player} />
      ))}
    </div>
  )
}
