'use server'

import prisma from '@/lib/db'
import { teamSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'
import type { TeamData, TeamFormValues } from './types'

export async function createTeam(
  data: TeamFormValues
): Promise<{ success: boolean; team?: TeamData; error?: string }> {
  const parsed = teamSchema.safeParse(data)

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  try {
    const team = await prisma.team.create({
      data: {
        name: parsed.data.name,
        shortName: parsed.data.shortName,
        description: parsed.data.description ?? null,
        logo: parsed.data.logo ?? null,
        groupId: parsed.data.groupId ?? null,
      },
    })

    revalidatePath('/teams')
    revalidatePath('/admin/teams')
    revalidatePath('/standings')
    revalidatePath('/')

    return { success: true, team: team as TeamData }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create team',
    }
  }
}

export async function updateTeam(
  id: string,
  data: Partial<TeamFormValues>
): Promise<{ success: boolean; error?: string }> {
  const parsed = teamSchema.partial().safeParse(data)

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  try {
    await prisma.team.update({
      where: { id },
      data: parsed.data,
    })

    revalidatePath('/teams')
    revalidatePath('/admin/teams')
    revalidatePath('/standings')
    revalidatePath('/')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update team',
    }
  }
}

export async function deleteTeam(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.team.delete({
      where: { id },
    })

    revalidatePath('/teams')
    revalidatePath('/admin/teams')
    revalidatePath('/standings')
    revalidatePath('/')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete team',
    }
  }
}
