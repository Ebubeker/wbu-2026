export const FORMATIONS = ['1-2-2-1', '1-1-3-1', '1-3-1-1', '1-2-1-2'] as const

export type Formation = (typeof FORMATIONS)[number]

export const FORMATION_POSITIONS: Record<Formation, Array<{ x: number; y: number; label: string }>> = {
  '1-2-2-1': [
    { x: 50, y: 10, label: 'GK' },
    { x: 30, y: 35, label: 'DEF' },
    { x: 70, y: 35, label: 'DEF' },
    { x: 30, y: 60, label: 'MID' },
    { x: 70, y: 60, label: 'MID' },
    { x: 50, y: 85, label: 'FWD' },
  ],
  '1-1-3-1': [
    { x: 50, y: 10, label: 'GK' },
    { x: 50, y: 30, label: 'DEF' },
    { x: 20, y: 55, label: 'MID' },
    { x: 50, y: 55, label: 'MID' },
    { x: 80, y: 55, label: 'MID' },
    { x: 50, y: 85, label: 'FWD' },
  ],
  '1-3-1-1': [
    { x: 50, y: 10, label: 'GK' },
    { x: 20, y: 35, label: 'DEF' },
    { x: 50, y: 35, label: 'DEF' },
    { x: 80, y: 35, label: 'DEF' },
    { x: 50, y: 60, label: 'MID' },
    { x: 50, y: 85, label: 'FWD' },
  ],
  '1-2-1-2': [
    { x: 50, y: 10, label: 'GK' },
    { x: 30, y: 35, label: 'DEF' },
    { x: 70, y: 35, label: 'DEF' },
    { x: 50, y: 55, label: 'MID' },
    { x: 35, y: 80, label: 'FWD' },
    { x: 65, y: 80, label: 'FWD' },
  ],
}

export const FORMATION_LABELS: Record<Formation, string> = {
  '1-2-2-1': '1-2-2-1 (GK, 2 DEF, 2 MID, 1 FWD)',
  '1-1-3-1': '1-1-3-1 (GK, 1 DEF, 3 MID, 1 FWD)',
  '1-3-1-1': '1-3-1-1 (GK, 3 DEF, 1 MID, 1 FWD)',
  '1-2-1-2': '1-2-1-2 (GK, 2 DEF, 1 MID, 2 FWD)',
}
