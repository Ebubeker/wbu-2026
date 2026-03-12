import prisma from '@/lib/db'
import type { KitData } from './types'

export async function getKitsByTeam(teamId: string): Promise<KitData[]> {
  const kits = await prisma.kit.findMany({
    where: { teamId },
  })
  return kits as KitData[]
}

export async function getKit(teamId: string, type: 'HOME' | 'AWAY'): Promise<KitData | null> {
  const kit = await prisma.kit.findUnique({
    where: { teamId_type: { teamId, type } },
  })
  return kit as KitData | null
}
