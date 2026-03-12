import { NextRequest, NextResponse } from 'next/server'
import { castVote } from '@/modules/voting/actions'
import { getVoteCounts } from '@/modules/voting/queries'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const fingerprint = request.nextUrl.searchParams.get('fingerprint') ?? undefined
  const counts = await getVoteCounts(id, fingerprint)
  return NextResponse.json(counts)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    await castVote(id, body.vote, body.fingerprint, ipAddress)

    const counts = await getVoteCounts(id, body.fingerprint)
    return NextResponse.json(counts)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to vote'
    const status = message.includes('already voted') ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
