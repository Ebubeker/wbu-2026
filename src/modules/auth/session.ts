import { createToken, verifyToken, getSession } from '@/lib/auth'
import prisma from '@/lib/db'
import type { AuthUser } from './types'

export { createToken, verifyToken, getSession }

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession()

  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      role: true,
      teamId: true,
    },
  })

  if (!user) return null

  return {
    userId: user.id,
    username: user.username,
    role: user.role as 'ADMIN' | 'CAPTAIN',
    teamId: user.teamId,
  }
}
