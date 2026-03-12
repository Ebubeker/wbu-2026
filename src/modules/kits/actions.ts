'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { kitSchema } from '@/lib/validations'

function revalidateKitPaths(teamId: string) {
  revalidatePath(`/teams/${teamId}`)
  revalidatePath('/captain/kits')
  revalidatePath('/matches')
}

export async function upsertKit(data: {
  teamId: string
  type: 'HOME' | 'AWAY'
  primaryColor: string
  secondaryColor: string
  pattern: 'SOLID' | 'STRIPES' | 'CHECKERED' | 'GRADIENT'
}) {
  const parsed = kitSchema.parse(data)

  const kit = await prisma.kit.upsert({
    where: {
      teamId_type: { teamId: parsed.teamId, type: parsed.type },
    },
    create: {
      teamId: parsed.teamId,
      type: parsed.type,
      primaryColor: parsed.primaryColor,
      secondaryColor: parsed.secondaryColor,
      pattern: parsed.pattern,
    },
    update: {
      primaryColor: parsed.primaryColor,
      secondaryColor: parsed.secondaryColor,
      pattern: parsed.pattern,
    },
  })

  revalidateKitPaths(parsed.teamId)
  return kit
}
