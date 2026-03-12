export interface PlayerData {
  id: string
  name: string
  number: number
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  photo: string | null
  teamId: string
  team?: { id: string; name: string; shortName: string }
}

export interface PlayerFormValues {
  name: string
  number: number
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  teamId: string
}
