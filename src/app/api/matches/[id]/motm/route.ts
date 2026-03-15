import { NextRequest, NextResponse } from 'next/server'
import { castMotmVote } from '@/modules/voting/actions'
import { getMotmResults } from '@/modules/voting/queries'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const fingerprint = request.nextUrl.searchParams.get('fingerprint') ?? undefined
  const results = await getMotmResults(id, fingerprint)
  return NextResponse.json(results)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    await castMotmVote(id, body.playerId, body.fingerprint)

    const results = await getMotmResults(id, body.fingerprint)
    return NextResponse.json(results)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to vote'
    const status = message.includes('already voted') ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
