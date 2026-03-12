export interface KitData {
  id: string
  teamId: string
  type: 'HOME' | 'AWAY'
  primaryColor: string
  secondaryColor: string
  pattern: 'SOLID' | 'STRIPES' | 'CHECKERED' | 'GRADIENT'
}

export const DEFAULT_KIT: Omit<KitData, 'id' | 'teamId' | 'type'> = {
  primaryColor: '#FFFFFF',
  secondaryColor: '#000000',
  pattern: 'SOLID',
}
