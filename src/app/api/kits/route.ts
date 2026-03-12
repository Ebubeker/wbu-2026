import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { upsertKit } from '@/modules/kits/actions'
import { getKitsByTeam } from '@/modules/kits/queries'

export async function GET(request: NextRequest) {
  const teamId = request.nextUrl.searchParams.get('teamId')
  if (!teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
  }
  const kits = await getKitsByTeam(teamId)
  return NextResponse.json(kits)
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (session.role === 'CAPTAIN' && session.teamId !== body.teamId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const kit = await upsertKit(body)
    return NextResponse.json(kit)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save kit'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
