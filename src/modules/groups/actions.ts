'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { groupSchema } from '@/lib/validations'

export async function createGroup(data: { name: string; order?: number }) {
  const validated = groupSchema.parse(data)

  const group = await prisma.group.create({
    data: {
      name: validated.name,
      order: validated.order,
    },
  })

  revalidatePath('/admin/groups')
  revalidatePath('/matches')
  revalidatePath('/standings')

  return group
}

export async function updateGroup(id: string, data: { name?: string; order?: number }) {
  const updateData: { name?: string; order?: number } = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.order !== undefined) updateData.order = data.order

  const group = await prisma.group.update({
    where: { id },
    data: updateData,
  })

  revalidatePath('/admin/groups')
  revalidatePath('/matches')
  revalidatePath('/standings')

  return group
}

export async function deleteGroup(id: string) {
  await prisma.team.updateMany({
    where: { groupId: id },
    data: { groupId: null },
  })

  await prisma.match.updateMany({
    where: { groupId: id },
    data: { groupId: null },
  })

  await prisma.group.delete({
    where: { id },
  })

  revalidatePath('/admin/groups')
  revalidatePath('/matches')
  revalidatePath('/standings')
}

export async function assignTeamToGroup(teamId: string, groupId: string) {
  await prisma.team.update({
    where: { id: teamId },
    data: { groupId },
  })

  revalidatePath('/admin/groups')
  revalidatePath('/matches')
  revalidatePath('/standings')
}

export async function removeTeamFromGroup(teamId: string) {
  await prisma.team.update({
    where: { id: teamId },
    data: { groupId: null },
  })

  revalidatePath('/admin/groups')
  revalidatePath('/matches')
  revalidatePath('/standings')
}

export async function generateGroupMatches(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      teams: {
        select: { id: true, name: true },
      },
    },
  })

  if (!group) {
    throw new Error('Group not found')
  }

  if (group.teams.length < 2) {
    throw new Error('Group must have at least 2 teams to generate matches')
  }

  // Delete only SCHEDULED matches for this group (preserve FULL_TIME ones)
  await prisma.match.deleteMany({
    where: {
      groupId,
      status: 'SCHEDULED',
    },
  })

  // Generate all N*(N-1)/2 combinations
  const matchData: Array<{
    homeTeamId: string
    awayTeamId: string
    groupId: string
    stage: 'GROUP'
    status: 'SCHEDULED'
    matchDate: Date
  }> = []

  let dayOffset = 0
  for (let i = 0; i < group.teams.length; i++) {
    for (let j = i + 1; j < group.teams.length; j++) {
      const matchDate = new Date()
      matchDate.setDate(matchDate.getDate() + dayOffset * 2)
      matchDate.setHours(15, 0, 0, 0)

      matchData.push({
        homeTeamId: group.teams[i].id,
        awayTeamId: group.teams[j].id,
        groupId,
        stage: 'GROUP',
        status: 'SCHEDULED',
        matchDate,
      })

      dayOffset++
    }
  }

  // Create matches in a transaction
  await prisma.$transaction(
    matchData.map((match) =>
      prisma.match.create({ data: match })
    )
  )

  revalidatePath('/admin/groups')
  revalidatePath('/matches')
  revalidatePath('/standings')
}
