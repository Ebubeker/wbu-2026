export interface GroupData {
  id: string
  name: string
  order: number
  createdAt: Date
}

export interface GroupWithTeams extends GroupData {
  teams: Array<{ id: string; name: string; shortName: string; logo: string | null }>
  _count?: { matches: number; teams: number }
}
