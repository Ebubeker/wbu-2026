import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getLineupsForMatch, getLineup } from '@/modules/lineups/queries'
import { saveLineup } from '@/modules/lineups/actions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const teamId = request.nextUrl.searchParams.get('teamId')

  if (teamId) {
    const lineup = await getLineup(id, teamId)
    return NextResponse.json(lineup)
  }

  const lineups = await getLineupsForMatch(id)
  return NextResponse.json(lineups)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSession()

    if (!session || !session.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only captains can set lineups, and only for their own team
    if (session.role !== 'CAPTAIN') {
      return NextResponse.json({ error: 'Only captains can set lineups' }, { status: 403 })
    }

    const body = await request.json()

    const result = await saveLineup({
      matchId: id,
      teamId: session.teamId,
      formation: body.formation,
      players: body.players,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save lineup'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
