'use server'

import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'
import { playerSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'
import type { PlayerFormValues } from './types'

export async function createPlayer(
  data: PlayerFormValues
): Promise<{ success: boolean; error?: string }> {
  const parsed = playerSchema.safeParse(data)

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  try {
    await prisma.player.create({
      data: {
        name: parsed.data.name,
        number: parsed.data.number,
        position: parsed.data.position,
        teamId: parsed.data.teamId,
        photo: parsed.data.photo ?? null,
      },
    })

    revalidatePath('/teams')
    revalidatePath(`/teams/${data.teamId}`)
    revalidatePath('/admin/teams')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create player',
    }
  }
}

export async function updatePlayer(
  id: string,
  data: Partial<PlayerFormValues>
): Promise<{ success: boolean; error?: string }> {
  const parsed = playerSchema.partial().safeParse(data)

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  try {
    const player = await prisma.player.update({
      where: { id },
      data: parsed.data,
    })

    revalidatePath('/teams')
    revalidatePath(`/teams/${player.teamId}`)
    revalidatePath('/admin/teams')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update player',
    }
  }
}

export async function deletePlayer(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const player = await prisma.player.delete({
      where: { id },
    })

    revalidatePath('/teams')
    revalidatePath(`/teams/${player.teamId}`)
    revalidatePath('/admin/teams')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete player',
    }
  }
}

export async function bulkImportPlayers(
  teamId: string,
  rawText: string
): Promise<{
  success: boolean
  created: number
  captain?: { name: string; username: string; password: string }
  error?: string
}> {
  try {
    const team = await prisma.team.findUnique({ where: { id: teamId } })
    if (!team) return { success: false, created: 0, error: 'Team not found' }

    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (lines.length === 0) {
      return { success: false, created: 0, error: 'No player names provided' }
    }

    // Find highest existing number for this team
    const lastPlayer = await prisma.player.findFirst({
      where: { teamId },
      orderBy: { number: 'desc' },
    })
    let nextNumber = (lastPlayer?.number ?? 0) + 1

    let captainName: string | null = null

    const playerData = lines.map((line) => {
      const isCaptain = /\(C\)/i.test(line)
      const name = line.replace(/\(C\)/gi, '').trim()
      if (isCaptain) captainName = name
      const number = nextNumber++
      return { name, number, position: 'MID' as const, teamId, photo: null }
    })

    await prisma.player.createMany({ data: playerData })

    // Create captain account if (C) was found
    let captainCredentials: { name: string; username: string; password: string } | undefined
    if (captainName) {
      const slug = team.shortName.toLowerCase().replace(/[^a-z0-9]/g, '')
      const username = `captain_${slug}`
      const password = `${slug}2026`
      const passwordHash = await bcrypt.hash(password, 10)

      // Remove existing captain for this team
      await prisma.user.deleteMany({ where: { teamId, role: 'CAPTAIN' } })

      await prisma.user.create({
        data: {
          username,
          passwordHash,
          role: 'CAPTAIN',
          teamId,
        },
      })

      captainCredentials = { name: captainName, username, password }
    }

    revalidatePath('/teams')
    revalidatePath(`/teams/${teamId}`)
    revalidatePath('/admin/teams')
    revalidatePath('/')

    return { success: true, created: playerData.length, captain: captainCredentials }
  } catch (error) {
    return {
      success: false,
      created: 0,
      error: error instanceof Error ? error.message : 'Failed to import players',
    }
  }
}

export async function updatePlayerPhoto(
  id: string,
  photoUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const player = await prisma.player.update({
      where: { id },
      data: { photo: photoUrl },
    })

    revalidatePath('/teams')
    revalidatePath(`/teams/${player.teamId}`)
    revalidatePath('/admin/teams')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update photo',
    }
  }
}
