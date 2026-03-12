import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { addConnection, removeConnection } from "@/modules/live/sse"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: { select: { id: true, name: true, shortName: true } },
      awayTeam: { select: { id: true, name: true, shortName: true } },
      goals: { include: { player: true, team: true }, orderBy: { minute: 'asc' } },
      cards: { include: { player: true, team: true }, orderBy: { minute: 'asc' } },
    },
  })

  if (!match) {
    return new Response("Match not found", { status: 404 })
  }

  const encoder = new TextEncoder()
  let controllerRef: ReadableStreamDefaultController | null = null

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller
      addConnection(id, controller)
      const initialData = `event: connected\ndata: ${JSON.stringify(match)}\n\n`
      controller.enqueue(encoder.encode(initialData))
    },
    cancel() {
      if (controllerRef) {
        removeConnection(id, controllerRef)
      }
    },
  })

  request.signal.addEventListener('abort', () => {
    if (controllerRef) {
      removeConnection(id, controllerRef)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}

export const dynamic = 'force-dynamic'
