'use server'

import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'
import { createToken, setAuthCookie, clearAuthCookie } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'

export async function loginAction(formData: {
  username: string
  password: string
}): Promise<{ success: boolean; role?: string; error?: string }> {
  const parsed = loginSchema.safeParse(formData)

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { username, password } = parsed.data

  const user = await prisma.user.findUnique({
    where: { username },
  })

  if (!user) {
    return { success: false, error: 'Invalid username or password' }
  }

  const isValid = await bcrypt.compare(password, user.passwordHash)

  if (!isValid) {
    return { success: false, error: 'Invalid username or password' }
  }

  const token = createToken({
    userId: user.id,
    role: user.role,
    teamId: user.teamId,
  })

  await setAuthCookie(token)

  return { success: true, role: user.role }
}

export async function logoutAction(): Promise<void> {
  await clearAuthCookie()
}
