export interface TeamData {
  id: string
  name: string
  shortName: string
  logo: string | null
  description: string | null
  groupId: string | null
  group?: { id: string; name: string } | null
  createdAt: Date
  updatedAt: Date
}

export interface TeamWithPlayers extends TeamData {
  players: Array<{
    id: string
    name: string
    number: number
    position: string
    photo: string | null
  }>
  captain?: { id: string; username: string } | null
  _count?: { players: number }
}

export interface TeamFormValues {
  name: string
  shortName: string
  description?: string
  logo?: string
  groupId?: string | null
}
