import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export function authMiddleware(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('auth_token')?.value

  const isAdminRoute = pathname.startsWith('/admin')
  const isCaptainRoute = pathname.startsWith('/captain')

  if (!isAdminRoute && !isCaptainRoute) {
    return null
  }

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  const payload = verifyToken(token)

  if (!payload) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (isAdminRoute && payload.role !== 'ADMIN') {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (isCaptainRoute && payload.role !== 'CAPTAIN') {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return null
}
