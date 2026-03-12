'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/db'
import { competitionSchema } from '@/lib/validations'

export async function updateCompetition(data: {
  name: string
  season: string
  description?: string
  logoUrl?: string
}): Promise<{ success: boolean; error?: string }> {
  const parsed = competitionSchema.safeParse(data)

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  try {
    const existing = await prisma.competition.findFirst()

    if (existing) {
      await prisma.competition.update({
        where: { id: existing.id },
        data: {
          name: parsed.data.name,
          season: parsed.data.season,
          description: parsed.data.description ?? null,
          logoUrl: data.logoUrl ?? existing.logoUrl,
        },
      })
    } else {
      await prisma.competition.create({
        data: {
          name: parsed.data.name,
          season: parsed.data.season,
          description: parsed.data.description ?? null,
          logoUrl: data.logoUrl ?? null,
        },
      })
    }

    revalidatePath('/')
    revalidatePath('/admin/competition')

    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update competition' }
  }
}
