export interface LineupPlayerData {
  id: string
  playerId: string
  positionSlot: number
  player: {
    id: string
    name: string
    number: number
    position: string
  }
}

export interface LineupData {
  id: string
  matchId: string
  teamId: string
  formation: string
  players: LineupPlayerData[]
}
