export interface VoteCounts {
  home: number
  draw: number
  away: number
  total: number
  userVote?: 'HOME' | 'DRAW' | 'AWAY' | null
}
