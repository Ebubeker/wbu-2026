import type { SSEMessage } from './types'

const matchConnections = new Map<string, Set<ReadableStreamDefaultController>>()

export function addConnection(
  matchId: string,
  controller: ReadableStreamDefaultController
) {
  if (!matchConnections.has(matchId)) {
    matchConnections.set(matchId, new Set())
  }
  matchConnections.get(matchId)!.add(controller)
}

export function removeConnection(
  matchId: string,
  controller: ReadableStreamDefaultController
) {
  const connections = matchConnections.get(matchId)
  if (connections) {
    connections.delete(controller)
    if (connections.size === 0) {
      matchConnections.delete(matchId)
    }
  }
}

export function broadcastToMatch(matchId: string, event: SSEMessage) {
  const connections = matchConnections.get(matchId)
  if (!connections) return

  const encoded = formatSSEMessage(event)
  const toRemove: ReadableStreamDefaultController[] = []

  connections.forEach((controller) => {
    try {
      controller.enqueue(encoded)
    } catch {
      toRemove.push(controller)
    }
  })

  toRemove.forEach((c) => removeConnection(matchId, c))
}

function formatSSEMessage(event: SSEMessage): Uint8Array {
  const text = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
  return new TextEncoder().encode(text)
}

export { matchConnections }
