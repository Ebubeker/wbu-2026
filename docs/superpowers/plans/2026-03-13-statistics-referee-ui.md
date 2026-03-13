# Statistics, Detail Pages & Referee Match Management — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add public statistics, group/player detail pages, enhanced team detail, and a mobile-first referee match management UI with auto-timer and step-based event entry.

**Architecture:** Prisma schema gets 3 new fields on Match (timer timestamps). New `statistics` module provides aggregate queries. Referee UI is a complete rewrite of `LiveControlPanel` with full-view step navigation. New public routes for `/statistics`, `/groups/[id]`, `/players/[id]`.

**Tech Stack:** Next.js 16, React 19, Prisma + PostgreSQL, shadcn/ui, Tailwind CSS, SWR, SSE, Zod

**Spec:** `docs/superpowers/specs/2026-03-13-statistics-referee-ui-design.md`

---

## Chunk 1: Database & Timer Backend

### Task 1: Prisma Schema — Add Timer Fields and Indexes

**Files:**
- Modify: `prisma/schema.prisma:133-162` (Match model)

- [ ] **Step 1: Add timer fields to Match model**

Add after line 149 (`matchMinute Int @default(0)`):

```prisma
  timerStartedAt  DateTime?
  timerPausedAt   DateTime?
  pausedElapsed   Int         @default(0)
```

- [ ] **Step 2: Add indexes to Goal and Card models**

Add to Goal model (after `@@index([matchId])`):
```prisma
  @@index([playerId])
  @@index([teamId])
```

Add to Card model (after `@@index([matchId])`):
```prisma
  @@index([playerId])
  @@index([teamId])
```

- [ ] **Step 3: Generate migration and apply**

Run: `npx prisma migrate dev --name add-timer-fields-and-indexes`
Expected: Migration created and applied successfully

- [ ] **Step 4: Generate Prisma client**

Run: `npx prisma generate`
Expected: Prisma Client generated

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "feat: add timer fields and stat indexes to schema"
```

---

### Task 2: Timer Server Actions

**Files:**
- Modify: `src/modules/live/actions.ts`
- Modify: `src/modules/live/types.ts`

- [ ] **Step 1: Add timer SSE event types**

In `src/modules/live/types.ts`, add `'timer_start' | 'timer_pause' | 'timer_resume'` to the SSEMessage type union:

```typescript
export interface SSEMessage {
  type:
    | 'score_update'
    | 'minute_update'
    | 'status_change'
    | 'goal_added'
    | 'goal_removed'
    | 'card_added'
    | 'card_removed'
    | 'connected'
    | 'match_ended'
    | 'timer_start'
    | 'timer_pause'
    | 'timer_resume'
  data: Record<string, unknown>
}
```

- [ ] **Step 2: Add `computeMatchMinute` helper to `src/modules/live/actions.ts`**

Add after the `recalculateScores` function (after line 50):

```typescript
function computeMatchMinute(match: {
  status: string
  timerStartedAt: Date | null
  timerPausedAt: Date | null
  pausedElapsed: number
}): number {
  const now = new Date()
  let elapsed = 0

  if (match.timerPausedAt && match.timerStartedAt) {
    elapsed = match.timerPausedAt.getTime() - match.timerStartedAt.getTime() - match.pausedElapsed
  } else if (match.timerStartedAt) {
    elapsed = now.getTime() - match.timerStartedAt.getTime() - match.pausedElapsed
  }

  const minutes = Math.max(0, Math.min(30, Math.floor(elapsed / 60000)))
  const isSecondHalf = match.status === 'SECOND_HALF'
  return isSecondHalf ? minutes + 30 : minutes
}
```

- [ ] **Step 3: Rewrite `updateMatchStatus` to manage timer fields**

Replace the existing `updateMatchStatus` function:

```typescript
export async function updateMatchStatus(
  matchId: string,
  status: string
) {
  // Auto-fill lineups when match starts
  if (status === 'FIRST_HALF') {
    const matchData = await prisma.match.findUnique({
      where: { id: matchId },
      select: { homeTeamId: true, awayTeamId: true },
    })
    if (matchData?.homeTeamId) {
      await autoFillLineup(matchId, matchData.homeTeamId)
    }
    if (matchData?.awayTeamId) {
      await autoFillLineup(matchId, matchData.awayTeamId)
    }
  }

  // Determine timer fields based on status transition
  const now = new Date()
  const timerData: Record<string, unknown> = {}

  if (status === 'FIRST_HALF' || status === 'SECOND_HALF') {
    // Starting a half: set timer, reset pause state
    timerData.timerStartedAt = now
    timerData.timerPausedAt = null
    timerData.pausedElapsed = 0
  } else if (status === 'HALF_TIME' || status === 'FULL_TIME') {
    // Ending a half: clear timer
    timerData.timerStartedAt = null
    timerData.timerPausedAt = null
    timerData.pausedElapsed = 0
  }

  // Compute matchMinute snapshot
  let matchMinute = 0
  if (status === 'FIRST_HALF') matchMinute = 0
  else if (status === 'HALF_TIME') matchMinute = 30
  else if (status === 'SECOND_HALF') matchMinute = 30
  else if (status === 'FULL_TIME') matchMinute = 60

  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      status: status as MatchStatus,
      matchMinute,
      ...timerData,
    },
  })

  broadcastToMatch(matchId, {
    type: 'status_change',
    data: {
      matchId,
      status,
      matchMinute,
      timerStartedAt: timerData.timerStartedAt ? (timerData.timerStartedAt as Date).toISOString() : null,
    },
  })

  if (status === 'FULL_TIME') {
    broadcastToMatch(matchId, {
      type: 'match_ended',
      data: { matchId },
    })
  }

  revalidateMatchPaths()
  return match
}
```

- [ ] **Step 4: Add `pauseTimer` and `resumeTimer` actions**

Add after `updateMatchMinute`:

```typescript
export async function pauseTimer(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { timerPausedAt: true, timerStartedAt: true, status: true, pausedElapsed: true },
  })

  if (!match || match.timerPausedAt) return // idempotent: no-op if already paused

  const now = new Date()
  const minute = computeMatchMinute({ ...match, timerPausedAt: now })

  await prisma.match.update({
    where: { id: matchId },
    data: { timerPausedAt: now, matchMinute: minute },
  })

  broadcastToMatch(matchId, {
    type: 'timer_pause',
    data: { matchId, timerPausedAt: now.toISOString(), matchMinute: minute },
  })
}

export async function resumeTimer(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { timerPausedAt: true, timerStartedAt: true, pausedElapsed: true },
  })

  if (!match || !match.timerPausedAt) return // idempotent: no-op if not paused

  const additionalPause = new Date().getTime() - match.timerPausedAt.getTime()
  const newPausedElapsed = match.pausedElapsed + additionalPause

  await prisma.match.update({
    where: { id: matchId },
    data: { timerPausedAt: null, pausedElapsed: newPausedElapsed },
  })

  broadcastToMatch(matchId, {
    type: 'timer_resume',
    data: { matchId, pausedElapsed: newPausedElapsed },
  })
}
```

- [ ] **Step 5: Add `getTimerState` query**

Add to `src/modules/live/actions.ts`:

```typescript
export async function getTimerState(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      status: true,
      matchMinute: true,
      timerStartedAt: true,
      timerPausedAt: true,
      pausedElapsed: true,
    },
  })

  if (!match) throw new Error('Match not found')
  return match
}
```

- [ ] **Step 6: Update `addGoal` to auto-compute minute from timer**

Modify `addGoal` — before the `goalSchema.parse(data)` call, if `data.minute` is not provided (or is 0), compute it from timer state:

```typescript
export async function addGoal(data: {
  matchId: string
  teamId: string
  playerId: string
  minute?: number
  isOwnGoal: boolean
}) {
  // Auto-compute minute from timer if not provided
  let minute = data.minute
  if (!minute) {
    const match = await prisma.match.findUnique({
      where: { id: data.matchId },
      select: { status: true, timerStartedAt: true, timerPausedAt: true, pausedElapsed: true },
    })
    if (match) {
      minute = computeMatchMinute(match)
    }
  }

  const parsed = goalSchema.parse({ ...data, minute: minute ?? 0 })
  // ... rest of existing logic unchanged
```

- [ ] **Step 7: Update `addCard` similarly**

Same pattern as addGoal — auto-compute minute from timer if not provided:

```typescript
export async function addCard(data: {
  matchId: string
  teamId: string
  playerId: string
  type: 'YELLOW' | 'RED'
  minute?: number
}) {
  let minute = data.minute
  if (!minute) {
    const match = await prisma.match.findUnique({
      where: { id: data.matchId },
      select: { status: true, timerStartedAt: true, timerPausedAt: true, pausedElapsed: true },
    })
    if (match) {
      minute = computeMatchMinute(match)
    }
  }

  const parsed = cardSchema.parse({ ...data, minute: minute ?? 0 })
  // ... rest of existing logic unchanged
```

- [ ] **Step 8: Update MatchStatusControls to not pass matchMinute**

In `src/modules/live/components/MatchStatusControls.tsx`, update `handleStatusChange` calls to remove the minute parameter. Change the function signature:

```typescript
async function handleStatusChange(newStatus: string) {
    setLoading(true)
    try {
      await updateMatchStatus(matchId, newStatus)
      // ... rest unchanged
```

Update all onClick handlers to remove the minute argument:
- `handleStatusChange('FIRST_HALF')` (remove `, 1`)
- `handleStatusChange('HALF_TIME')` (remove `, 45`)
- `handleStatusChange('SECOND_HALF')` (remove `, 46`)
- `handleStatusChange('FULL_TIME')` (remove `, 90`)
- `handleStatusChange('SECOND_HALF')` in reopen (remove `, 90`)

- [ ] **Step 9: Verify the app compiles**

Run: `npx next build --no-lint 2>&1 | head -30`
Expected: No type errors related to the changed signatures

- [ ] **Step 10: Commit**

```bash
git add src/modules/live/ prisma/
git commit -m "feat: add timer system with auto-minute computation"
```

---

## Chunk 2: Statistics Module

### Task 3: Statistics Queries

**Files:**
- Create: `src/modules/statistics/queries.ts`
- Create: `src/modules/statistics/types.ts`

- [ ] **Step 1: Create statistics types**

Create `src/modules/statistics/types.ts`:

```typescript
export interface CompetitionStats {
  totalMatches: number
  completedMatches: number
  scheduledMatches: number
  totalGoals: number
  totalYellowCards: number
  totalRedCards: number
  avgGoalsPerMatch: number
}

export interface TopScorer {
  playerId: string
  playerName: string
  playerNumber: number
  playerPhoto: string | null
  teamId: string
  teamName: string
  teamShortName: string
  teamLogo: string | null
  goals: number
}

export interface MostCardedPlayer {
  playerId: string
  playerName: string
  playerNumber: number
  teamId: string
  teamName: string
  teamShortName: string
  yellowCards: number
  redCards: number
  totalCards: number
}

export interface TeamRanking {
  teamId: string
  teamName: string
  teamShortName: string
  teamLogo: string | null
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  form: ('W' | 'D' | 'L')[]
}

export interface MatchRecord {
  matchId: string
  homeTeam: { id: string; name: string; shortName: string }
  awayTeam: { id: string; name: string; shortName: string }
  homeScore: number
  awayScore: number
  matchDate: string
  label: string
}

export interface PlayerStats {
  goals: number
  yellowCards: number
  redCards: number
  matchesPlayed: number
  matchHistory: PlayerMatchEntry[]
}

export interface PlayerMatchEntry {
  matchId: string
  matchDate: string
  opponent: { id: string; name: string; shortName: string }
  score: string
  result: 'W' | 'D' | 'L'
  goals: { minute: number; isOwnGoal: boolean }[]
  cards: { minute: number; type: 'YELLOW' | 'RED' }[]
}

export interface TeamStats {
  played: number
  won: number
  drawn: number
  lost: number
  points: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  yellowCards: number
  redCards: number
  cleanSheets: number
  form: ('W' | 'D' | 'L')[]
  topScorer: { playerId: string; playerName: string; goals: number } | null
}
```

- [ ] **Step 2: Create statistics queries**

Create `src/modules/statistics/queries.ts`:

```typescript
import prisma from '@/lib/db'
import { POINTS_WIN, POINTS_DRAW } from '@/lib/constants'
import type {
  CompetitionStats,
  TopScorer,
  MostCardedPlayer,
  TeamRanking,
  MatchRecord,
  PlayerStats,
  PlayerMatchEntry,
  TeamStats,
} from './types'

export async function getCompetitionStats(): Promise<CompetitionStats> {
  const [totalMatches, completedMatches, totalGoals, cards] = await Promise.all([
    prisma.match.count(),
    prisma.match.count({ where: { status: 'FULL_TIME' } }),
    prisma.goal.count(),
    prisma.card.groupBy({
      by: ['type'],
      _count: true,
    }),
  ])

  const yellowCards = cards.find((c) => c.type === 'YELLOW')?._count ?? 0
  const redCards = cards.find((c) => c.type === 'RED')?._count ?? 0
  const avgGoalsPerMatch = completedMatches > 0 ? Math.round((totalGoals / completedMatches) * 10) / 10 : 0

  return {
    totalMatches,
    completedMatches,
    scheduledMatches: totalMatches - completedMatches,
    totalGoals,
    totalYellowCards: yellowCards,
    totalRedCards: redCards,
    avgGoalsPerMatch,
  }
}

export async function getTopScorers(limit = 10): Promise<TopScorer[]> {
  const scorers = await prisma.goal.groupBy({
    by: ['playerId'],
    where: { isOwnGoal: false },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  })

  if (scorers.length === 0) return []

  const players = await prisma.player.findMany({
    where: { id: { in: scorers.map((s) => s.playerId) } },
    select: {
      id: true,
      name: true,
      number: true,
      photo: true,
      team: { select: { id: true, name: true, shortName: true, logo: true } },
    },
  })

  const playerMap = new Map(players.map((p) => [p.id, p]))

  return scorers
    .map((s) => {
      const player = playerMap.get(s.playerId)
      if (!player) return null
      return {
        playerId: player.id,
        playerName: player.name,
        playerNumber: player.number,
        playerPhoto: player.photo,
        teamId: player.team.id,
        teamName: player.team.name,
        teamShortName: player.team.shortName,
        teamLogo: player.team.logo,
        goals: s._count.id,
      }
    })
    .filter((s): s is TopScorer => s !== null)
}

export async function getMostCardedPlayers(limit = 10): Promise<MostCardedPlayer[]> {
  const carded = await prisma.card.groupBy({
    by: ['playerId', 'type'],
    _count: { id: true },
  })

  // Aggregate per player
  const playerCards = new Map<string, { yellow: number; red: number }>()
  for (const c of carded) {
    const existing = playerCards.get(c.playerId) ?? { yellow: 0, red: 0 }
    if (c.type === 'YELLOW') existing.yellow += c._count.id
    else existing.red += c._count.id
    playerCards.set(c.playerId, existing)
  }

  // Sort by total cards
  const sorted = Array.from(playerCards.entries())
    .map(([playerId, cards]) => ({
      playerId,
      total: cards.yellow + cards.red,
      ...cards,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)

  if (sorted.length === 0) return []

  const players = await prisma.player.findMany({
    where: { id: { in: sorted.map((s) => s.playerId) } },
    select: {
      id: true,
      name: true,
      number: true,
      team: { select: { id: true, name: true, shortName: true } },
    },
  })

  const playerMap = new Map(players.map((p) => [p.id, p]))

  return sorted
    .map((s) => {
      const player = playerMap.get(s.playerId)
      if (!player) return null
      return {
        playerId: player.id,
        playerName: player.name,
        playerNumber: player.number,
        teamId: player.team.id,
        teamName: player.team.name,
        teamShortName: player.team.shortName,
        yellowCards: s.yellow,
        redCards: s.red,
        totalCards: s.total,
      }
    })
    .filter((s): s is MostCardedPlayer => s !== null)
}

export async function getTeamRankings(): Promise<TeamRanking[]> {
  const teams = await prisma.team.findMany({
    select: { id: true, name: true, shortName: true, logo: true },
  })

  const matches = await prisma.match.findMany({
    where: { status: 'FULL_TIME' },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      matchDate: true,
    },
    orderBy: { matchDate: 'desc' },
  })

  return teams.map((team) => {
    const teamMatches = matches.filter(
      (m) => m.homeTeamId === team.id || m.awayTeamId === team.id
    )

    let won = 0, drawn = 0, lost = 0, goalsFor = 0, goalsAgainst = 0
    const form: ('W' | 'D' | 'L')[] = []

    for (const m of teamMatches) {
      const isHome = m.homeTeamId === team.id
      const scored = isHome ? m.homeScore : m.awayScore
      const conceded = isHome ? m.awayScore : m.homeScore

      goalsFor += scored
      goalsAgainst += conceded

      if (scored > conceded) { won++; if (form.length < 5) form.push('W') }
      else if (scored < conceded) { lost++; if (form.length < 5) form.push('L') }
      else { drawn++; if (form.length < 5) form.push('D') }
    }

    return {
      teamId: team.id,
      teamName: team.name,
      teamShortName: team.shortName,
      teamLogo: team.logo,
      played: teamMatches.length,
      won,
      drawn,
      lost,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      points: won * POINTS_WIN + drawn * POINTS_DRAW,
      form,
    }
  })
  .sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return a.teamName.localeCompare(b.teamName)
  })
}

export async function getMatchRecords(): Promise<{
  biggestWin: MatchRecord | null
  highestScoring: MatchRecord | null
}> {
  const matches = await prisma.match.findMany({
    where: { status: 'FULL_TIME' },
    select: {
      id: true,
      homeScore: true,
      awayScore: true,
      matchDate: true,
      homeTeam: { select: { id: true, name: true, shortName: true } },
      awayTeam: { select: { id: true, name: true, shortName: true } },
    },
    orderBy: { matchDate: 'desc' },
  })

  let biggestWin: MatchRecord | null = null
  let highestScoring: MatchRecord | null = null
  let maxDiff = 0
  let maxTotal = 0

  for (const m of matches) {
    if (!m.homeTeam || !m.awayTeam) continue

    const diff = Math.abs(m.homeScore - m.awayScore)
    const total = m.homeScore + m.awayScore

    if (diff > maxDiff) {
      maxDiff = diff
      biggestWin = {
        matchId: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        matchDate: m.matchDate.toISOString(),
        label: 'Biggest Win',
      }
    }

    if (total > maxTotal) {
      maxTotal = total
      highestScoring = {
        matchId: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        matchDate: m.matchDate.toISOString(),
        label: 'Highest Scoring',
      }
    }
  }

  return { biggestWin, highestScoring }
}

export async function getPlayerStats(playerId: string): Promise<PlayerStats> {
  const [goals, cards, lineupEntries] = await Promise.all([
    prisma.goal.findMany({
      where: { playerId },
      select: { matchId: true, minute: true, isOwnGoal: true },
    }),
    prisma.card.findMany({
      where: { playerId },
      select: { matchId: true, minute: true, type: true },
    }),
    prisma.lineupPlayer.findMany({
      where: { playerId },
      select: {
        lineup: {
          select: {
            matchId: true,
            teamId: true,
            match: {
              select: {
                id: true,
                matchDate: true,
                homeTeamId: true,
                awayTeamId: true,
                homeScore: true,
                awayScore: true,
                status: true,
                homeTeam: { select: { id: true, name: true, shortName: true } },
                awayTeam: { select: { id: true, name: true, shortName: true } },
              },
            },
          },
        },
      },
    }),
  ])

  // Build match history
  const matchHistory: PlayerMatchEntry[] = []
  const seenMatches = new Set<string>()

  for (const entry of lineupEntries) {
    const match = entry.lineup.match
    if (!match.homeTeam || !match.awayTeam || match.status !== 'FULL_TIME') continue
    if (seenMatches.has(match.id)) continue
    seenMatches.add(match.id)

    const isHome = entry.lineup.teamId === match.homeTeamId
    const opponent = isHome ? match.awayTeam : match.homeTeam
    const scored = isHome ? match.homeScore : match.awayScore
    const conceded = isHome ? match.awayScore : match.homeScore

    let result: 'W' | 'D' | 'L' = 'D'
    if (scored > conceded) result = 'W'
    else if (scored < conceded) result = 'L'

    matchHistory.push({
      matchId: match.id,
      matchDate: match.matchDate.toISOString(),
      opponent: { id: opponent.id, name: opponent.name, shortName: opponent.shortName },
      score: `${match.homeScore} - ${match.awayScore}`,
      result,
      goals: goals
        .filter((g) => g.matchId === match.id)
        .map((g) => ({ minute: g.minute, isOwnGoal: g.isOwnGoal })),
      cards: cards
        .filter((c) => c.matchId === match.id)
        .map((c) => ({ minute: c.minute, type: c.type })),
    })
  }

  matchHistory.sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())

  return {
    goals: goals.filter((g) => !g.isOwnGoal).length,
    yellowCards: cards.filter((c) => c.type === 'YELLOW').length,
    redCards: cards.filter((c) => c.type === 'RED').length,
    matchesPlayed: matchHistory.length,
    matchHistory,
  }
}

export async function getTeamStats(teamId: string): Promise<TeamStats> {
  const matches = await prisma.match.findMany({
    where: {
      status: 'FULL_TIME',
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      matchDate: true,
    },
    orderBy: { matchDate: 'desc' },
  })

  let won = 0, drawn = 0, lost = 0, goalsFor = 0, goalsAgainst = 0, cleanSheets = 0
  const form: ('W' | 'D' | 'L')[] = []

  for (const m of matches) {
    const isHome = m.homeTeamId === teamId
    const scored = isHome ? m.homeScore : m.awayScore
    const conceded = isHome ? m.awayScore : m.homeScore

    goalsFor += scored
    goalsAgainst += conceded
    if (conceded === 0) cleanSheets++

    if (scored > conceded) { won++; if (form.length < 5) form.push('W') }
    else if (scored < conceded) { lost++; if (form.length < 5) form.push('L') }
    else { drawn++; if (form.length < 5) form.push('D') }
  }

  const [yellowCards, redCards] = await Promise.all([
    prisma.card.count({ where: { teamId, type: 'YELLOW' } }),
    prisma.card.count({ where: { teamId, type: 'RED' } }),
  ])

  // Top scorer
  const topScorerData = await prisma.goal.groupBy({
    by: ['playerId'],
    where: { teamId, isOwnGoal: false },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 1,
  })

  let topScorer: TeamStats['topScorer'] = null
  if (topScorerData.length > 0) {
    const player = await prisma.player.findUnique({
      where: { id: topScorerData[0].playerId },
      select: { id: true, name: true },
    })
    if (player) {
      topScorer = {
        playerId: player.id,
        playerName: player.name,
        goals: topScorerData[0]._count.id,
      }
    }
  }

  return {
    played: matches.length,
    won,
    drawn,
    lost,
    points: won * POINTS_WIN + drawn * POINTS_DRAW,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    yellowCards,
    redCards,
    cleanSheets,
    form,
    topScorer,
  }
}

export async function getGroupStats(groupId: string) {
  const [totalGoals, topScorer, mostCarded] = await Promise.all([
    prisma.goal.count({
      where: { match: { groupId } },
    }),
    getTopScorersForGroup(groupId, 1),
    getMostCardedForGroup(groupId, 1),
  ])

  return {
    totalGoals,
    topScorer: topScorer[0] ?? null,
    mostCarded: mostCarded[0] ?? null,
  }
}

async function getTopScorersForGroup(groupId: string, limit: number) {
  const goals = await prisma.goal.findMany({
    where: { match: { groupId }, isOwnGoal: false },
    select: { playerId: true },
  })

  const counts = new Map<string, number>()
  for (const g of goals) {
    counts.set(g.playerId, (counts.get(g.playerId) ?? 0) + 1)
  }

  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)

  if (sorted.length === 0) return []

  const players = await prisma.player.findMany({
    where: { id: { in: sorted.map((s) => s[0]) } },
    select: {
      id: true,
      name: true,
      number: true,
      team: { select: { id: true, name: true, shortName: true } },
    },
  })

  return sorted.map((s) => {
    const player = players.find((p) => p.id === s[0])
    return player ? { ...player, goals: s[1] } : null
  }).filter(Boolean)
}

async function getMostCardedForGroup(groupId: string, limit: number) {
  const cards = await prisma.card.findMany({
    where: { match: { groupId } },
    select: { playerId: true, type: true },
  })

  const counts = new Map<string, { yellow: number; red: number }>()
  for (const c of cards) {
    const existing = counts.get(c.playerId) ?? { yellow: 0, red: 0 }
    if (c.type === 'YELLOW') existing.yellow++
    else existing.red++
    counts.set(c.playerId, existing)
  }

  const sorted = Array.from(counts.entries())
    .map(([playerId, c]) => ({ playerId, ...c, total: c.yellow + c.red }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)

  if (sorted.length === 0) return []

  const players = await prisma.player.findMany({
    where: { id: { in: sorted.map((s) => s.playerId) } },
    select: {
      id: true,
      name: true,
      number: true,
      team: { select: { id: true, name: true, shortName: true } },
    },
  })

  return sorted.map((s) => {
    const player = players.find((p) => p.id === s.playerId)
    return player ? { ...player, yellowCards: s.yellow, redCards: s.red, totalCards: s.total } : null
  }).filter(Boolean)
}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/modules/statistics/
git commit -m "feat: add statistics module with competition, team, player, and group queries"
```

---

## Chunk 3: Referee Match Management UI

### Task 4: MatchTimer Component

**Files:**
- Create: `src/modules/live/components/MatchTimer.tsx`

- [ ] **Step 1: Create the MatchTimer component**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'

interface MatchTimerProps {
  status: string
  timerStartedAt: string | null
  timerPausedAt: string | null
  pausedElapsed: number
  className?: string
}

export function MatchTimer({
  status,
  timerStartedAt,
  timerPausedAt,
  pausedElapsed,
  className,
}: MatchTimerProps) {
  const computeElapsed = useCallback(() => {
    if (!timerStartedAt) return 0

    const start = new Date(timerStartedAt).getTime()
    const now = timerPausedAt
      ? new Date(timerPausedAt).getTime()
      : Date.now()

    return Math.max(0, now - start - pausedElapsed)
  }, [timerStartedAt, timerPausedAt, pausedElapsed])

  const [elapsed, setElapsed] = useState(computeElapsed)

  useEffect(() => {
    setElapsed(computeElapsed())

    if (!timerStartedAt || timerPausedAt) return

    const interval = setInterval(() => {
      setElapsed(computeElapsed())
    }, 1000)

    return () => clearInterval(interval)
  }, [timerStartedAt, timerPausedAt, computeElapsed])

  const totalSeconds = Math.floor(elapsed / 1000)
  const rawMinutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  // Clamp to 30 min per half, add 30 for second half
  const clampedMinutes = Math.min(30, rawMinutes)
  const displayMinutes = status === 'SECOND_HALF' ? clampedMinutes + 30 : clampedMinutes

  const isOvertime = rawMinutes >= 30
  const isPaused = !!timerPausedAt
  const isLive = ['FIRST_HALF', 'SECOND_HALF'].includes(status)

  return (
    <div className={className}>
      <div className={`text-center font-mono text-5xl font-bold tabular-nums ${isOvertime && isLive ? 'text-red-400' : ''} ${isPaused ? 'animate-pulse' : ''}`}>
        {String(displayMinutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/live/components/MatchTimer.tsx
git commit -m "feat: add MatchTimer component with client-side timer"
```

---

### Task 5: Referee Match View — Main Screen

**Files:**
- Create: `src/modules/live/components/RefereeMatchView.tsx`
- Create: `src/modules/live/components/ActionChoiceView.tsx`
- Create: `src/modules/live/components/TeamSelectView.tsx`
- Create: `src/modules/live/components/PlayerSelectView.tsx`
- Create: `src/modules/live/components/GoalSteps.tsx`
- Create: `src/modules/live/components/CardSteps.tsx`
- Create: `src/modules/live/components/RefereeTimeline.tsx`

- [ ] **Step 1: Create ActionChoiceView**

Create `src/modules/live/components/ActionChoiceView.tsx`:

```typescript
'use client'

import { ArrowLeft } from 'lucide-react'

interface ActionChoiceViewProps {
  onSelectGoal: () => void
  onSelectCard: () => void
  onBack: () => void
}

export function ActionChoiceView({ onSelectGoal, onSelectCard, onBack }: ActionChoiceViewProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onBack} className="rounded-lg p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold">Select Action</h2>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <button
          onClick={onSelectGoal}
          className="flex flex-1 items-center justify-center rounded-2xl bg-emerald-600 text-white text-2xl font-bold transition-colors hover:bg-emerald-700 active:bg-emerald-800"
        >
          <div className="text-center">
            <div className="text-5xl mb-2">⚽</div>
            <div>Goal</div>
          </div>
        </button>

        <button
          onClick={onSelectCard}
          className="flex flex-1 items-center justify-center rounded-2xl bg-amber-500 text-white text-2xl font-bold transition-colors hover:bg-amber-600 active:bg-amber-700"
        >
          <div className="text-center">
            <div className="text-5xl mb-2">🟨</div>
            <div>Card</div>
          </div>
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create TeamSelectView**

Create `src/modules/live/components/TeamSelectView.tsx`:

```typescript
'use client'

import { ArrowLeft } from 'lucide-react'

interface TeamInfo {
  id: string
  name: string
  shortName: string
  logo: string | null
}

interface TeamSelectViewProps {
  title: string
  stepLabel: string
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  onSelect: (teamId: string) => void
  onBack: () => void
  showOwnGoalToggle?: boolean
  isOwnGoal?: boolean
  onToggleOwnGoal?: () => void
}

export function TeamSelectView({
  title,
  stepLabel,
  homeTeam,
  awayTeam,
  onSelect,
  onBack,
  showOwnGoalToggle,
  isOwnGoal,
  onToggleOwnGoal,
}: TeamSelectViewProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onBack} className="rounded-lg p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs text-muted-foreground">{stepLabel}</p>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <button
          onClick={() => onSelect(homeTeam.id)}
          className="flex flex-1 items-center justify-center gap-4 rounded-2xl border-2 border-border bg-card p-6 text-xl font-bold transition-colors hover:border-primary active:bg-accent"
        >
          {homeTeam.logo ? (
            <img src={homeTeam.logo} alt={homeTeam.name} className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-sm font-bold">{homeTeam.shortName}</div>
          )}
          <div>
            <div>{homeTeam.name}</div>
            <div className="text-sm font-normal text-muted-foreground">Home</div>
          </div>
        </button>

        <button
          onClick={() => onSelect(awayTeam.id)}
          className="flex flex-1 items-center justify-center gap-4 rounded-2xl border-2 border-border bg-card p-6 text-xl font-bold transition-colors hover:border-primary active:bg-accent"
        >
          {awayTeam.logo ? (
            <img src={awayTeam.logo} alt={awayTeam.name} className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-sm font-bold">{awayTeam.shortName}</div>
          )}
          <div>
            <div>{awayTeam.name}</div>
            <div className="text-sm font-normal text-muted-foreground">Away</div>
          </div>
        </button>
      </div>

      {showOwnGoalToggle && (
        <div className="border-t border-border p-4">
          <button
            onClick={onToggleOwnGoal}
            className={`w-full rounded-xl border-2 px-4 py-3 text-center font-medium transition-colors ${
              isOwnGoal
                ? 'border-red-500 bg-red-500/10 text-red-400'
                : 'border-border text-muted-foreground hover:border-red-500/50'
            }`}
          >
            {isOwnGoal ? '✓ Own Goal' : 'Own Goal'}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create PlayerSelectView**

Create `src/modules/live/components/PlayerSelectView.tsx`:

```typescript
'use client'

import { ArrowLeft } from 'lucide-react'

interface PlayerInfo {
  id: string
  name: string
  number: number
  position?: string
}

interface PlayerSelectViewProps {
  title: string
  stepLabel: string
  players: PlayerInfo[]
  onSelect: (playerId: string) => void
  onBack: () => void
  loading?: boolean
}

export function PlayerSelectView({
  title,
  stepLabel,
  players,
  onSelect,
  onBack,
  loading,
}: PlayerSelectViewProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onBack} className="rounded-lg p-2 hover:bg-accent" disabled={loading}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs text-muted-foreground">{stepLabel}</p>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {players.map((player) => (
            <button
              key={player.id}
              onClick={() => onSelect(player.id)}
              disabled={loading}
              className="flex items-center gap-3 rounded-xl border-2 border-border bg-card p-4 text-left transition-colors hover:border-primary active:bg-accent disabled:opacity-50"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                {player.number}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{player.name}</p>
                {player.position && (
                  <p className="text-xs text-muted-foreground">{player.position}</p>
                )}
              </div>
            </button>
          ))}
        </div>

        {players.length === 0 && (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            No players available
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create GoalSteps**

Create `src/modules/live/components/GoalSteps.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { TeamSelectView } from './TeamSelectView'
import { PlayerSelectView } from './PlayerSelectView'
import { addGoal } from '../actions'

interface TeamData {
  id: string
  name: string
  shortName: string
  logo: string | null
  players: { id: string; name: string; number: number; position: string }[]
}

interface GoalStepsProps {
  matchId: string
  homeTeam: TeamData
  awayTeam: TeamData
  lineupPlayers: Record<string, { id: string; name: string; number: number; position: string }[]>
  onComplete: () => void
  onBack: () => void
}

export function GoalSteps({
  matchId,
  homeTeam,
  awayTeam,
  lineupPlayers,
  onComplete,
  onBack,
}: GoalStepsProps) {
  const [step, setStep] = useState<'team' | 'player'>('team')
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [isOwnGoal, setIsOwnGoal] = useState(false)
  const [saving, setSaving] = useState(false)

  function handleTeamSelect(teamId: string) {
    setSelectedTeamId(teamId)
    setStep('player')
  }

  async function handlePlayerSelect(playerId: string) {
    setSaving(true)
    try {
      // For own goals: the benefiting team was selected, but we need the player's actual team
      const actualTeamId = isOwnGoal
        ? (selectedTeamId === homeTeam.id ? awayTeam.id : homeTeam.id)
        : selectedTeamId!

      await addGoal({
        matchId,
        teamId: actualTeamId,
        playerId,
        isOwnGoal,
      })
      toast.success('Goal added!')
      onComplete()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add goal')
      setSaving(false)
    }
  }

  if (step === 'team') {
    return (
      <TeamSelectView
        title="Which team scored?"
        stepLabel="Goal — Step 1 of 2"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onSelect={handleTeamSelect}
        onBack={onBack}
        showOwnGoalToggle
        isOwnGoal={isOwnGoal}
        onToggleOwnGoal={() => setIsOwnGoal(!isOwnGoal)}
      />
    )
  }

  // For own goals: show the OTHER team's players (the one who scored the OG)
  const playerTeamId = isOwnGoal
    ? (selectedTeamId === homeTeam.id ? awayTeam.id : homeTeam.id)
    : selectedTeamId!

  const teamForPlayers = playerTeamId === homeTeam.id ? homeTeam : awayTeam
  const players = lineupPlayers[playerTeamId]?.length > 0
    ? lineupPlayers[playerTeamId]
    : teamForPlayers.players

  return (
    <PlayerSelectView
      title="Which player?"
      stepLabel="Goal — Step 2 of 2"
      players={players}
      onSelect={handlePlayerSelect}
      onBack={() => setStep('team')}
      loading={saving}
    />
  )
}
```

- [ ] **Step 5: Create CardSteps**

Create `src/modules/live/components/CardSteps.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { TeamSelectView } from './TeamSelectView'
import { PlayerSelectView } from './PlayerSelectView'
import { addCard } from '../actions'

interface TeamData {
  id: string
  name: string
  shortName: string
  logo: string | null
  players: { id: string; name: string; number: number; position: string }[]
}

interface CardStepsProps {
  matchId: string
  homeTeam: TeamData
  awayTeam: TeamData
  lineupPlayers: Record<string, { id: string; name: string; number: number; position: string }[]>
  onComplete: () => void
  onBack: () => void
}

export function CardSteps({
  matchId,
  homeTeam,
  awayTeam,
  lineupPlayers,
  onComplete,
  onBack,
}: CardStepsProps) {
  const [step, setStep] = useState<'type' | 'team' | 'player'>('type')
  const [cardType, setCardType] = useState<'YELLOW' | 'RED' | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function handleTypeSelect(type: 'YELLOW' | 'RED') {
    setCardType(type)
    setStep('team')
  }

  function handleTeamSelect(teamId: string) {
    setSelectedTeamId(teamId)
    setStep('player')
  }

  async function handlePlayerSelect(playerId: string) {
    setSaving(true)
    try {
      await addCard({
        matchId,
        teamId: selectedTeamId!,
        playerId,
        type: cardType!,
      })
      toast.success(`${cardType === 'YELLOW' ? 'Yellow' : 'Red'} card added!`)
      onComplete()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add card')
      setSaving(false)
    }
  }

  if (step === 'type') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <button onClick={onBack} className="rounded-lg p-2 hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs text-muted-foreground">Card — Step 1 of 3</p>
            <h2 className="text-lg font-semibold">Card Type</h2>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <button
            onClick={() => handleTypeSelect('YELLOW')}
            className="flex flex-1 items-center justify-center rounded-2xl bg-yellow-500 text-black text-2xl font-bold transition-colors hover:bg-yellow-400 active:bg-yellow-600"
          >
            <div className="text-center">
              <div className="text-5xl mb-2">🟨</div>
              <div>Yellow Card</div>
            </div>
          </button>

          <button
            onClick={() => handleTypeSelect('RED')}
            className="flex flex-1 items-center justify-center rounded-2xl bg-red-600 text-white text-2xl font-bold transition-colors hover:bg-red-500 active:bg-red-700"
          >
            <div className="text-center">
              <div className="text-5xl mb-2">🟥</div>
              <div>Red Card</div>
            </div>
          </button>
        </div>
      </div>
    )
  }

  if (step === 'team') {
    return (
      <TeamSelectView
        title="Which team?"
        stepLabel="Card — Step 2 of 3"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onSelect={handleTeamSelect}
        onBack={() => setStep('type')}
      />
    )
  }

  const teamForPlayers = selectedTeamId === homeTeam.id ? homeTeam : awayTeam
  const players = lineupPlayers[selectedTeamId!]?.length > 0
    ? lineupPlayers[selectedTeamId!]
    : teamForPlayers.players

  return (
    <PlayerSelectView
      title="Which player?"
      stepLabel="Card — Step 3 of 3"
      players={players}
      onSelect={handlePlayerSelect}
      onBack={() => setStep('team')}
      loading={saving}
    />
  )
}
```

- [ ] **Step 6: Create RefereeTimeline**

Create `src/modules/live/components/RefereeTimeline.tsx`:

```typescript
'use client'

import { Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useState } from 'react'
import type { LiveEvent } from '../types'

interface RefereeTimelineProps {
  events: LiveEvent[]
  onDelete: (eventId: string, type: 'goal' | 'card') => void
  readOnly?: boolean
}

export function RefereeTimeline({ events, onDelete, readOnly }: RefereeTimelineProps) {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'goal' | 'card' } | null>(null)

  const sorted = [...events].sort((a, b) => a.minute - b.minute)

  if (sorted.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No events yet
      </p>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {sorted.map((event) => (
          <div
            key={event.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
              {event.type === 'goal' ? '⚽' : event.cardType === 'RED' ? '🟥' : '🟨'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {event.playerName}
                {event.isOwnGoal && <span className="ml-1 text-xs text-red-400">(OG)</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {event.teamName} · {event.minute}&apos;
              </p>
            </div>
            {!readOnly && (
              <button
                onClick={() => setDeleteTarget({ id: event.id, type: event.type })}
                className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Event"
        description="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) {
            onDelete(deleteTarget.id, deleteTarget.type)
            setDeleteTarget(null)
          }
        }}
      />
    </>
  )
}
```

- [ ] **Step 7: Create RefereeMatchView — the main orchestrator**

Create `src/modules/live/components/RefereeMatchView.tsx`:

```typescript
'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Play, Pause, Square, RotateCcw, Timer, TimerOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { MatchTimer } from './MatchTimer'
import { ActionChoiceView } from './ActionChoiceView'
import { GoalSteps } from './GoalSteps'
import { CardSteps } from './CardSteps'
import { RefereeTimeline } from './RefereeTimeline'
import {
  updateMatchStatus,
  pauseTimer,
  resumeTimer,
  removeGoal,
  removeCard,
} from '../actions'
import type { MatchWithEvents } from '@/modules/matches/types'
import type { LiveEvent } from '../types'

interface RefereeMatchViewProps {
  match: MatchWithEvents
}

type View = 'main' | 'action' | 'goal' | 'card'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function RefereeMatchView({ match: initialMatch }: RefereeMatchViewProps) {
  const { data: match, mutate } = useSWR<MatchWithEvents>(
    `/api/matches/${initialMatch.id}`,
    fetcher,
    { fallbackData: initialMatch, refreshInterval: 5000 }
  )

  const currentMatch = match ?? initialMatch
  const [view, setView] = useState<View>('main')
  const [loading, setLoading] = useState(false)
  const [confirmFullTime, setConfirmFullTime] = useState(false)
  const [confirmReopen, setConfirmReopen] = useState(false)

  const isLive = ['FIRST_HALF', 'HALF_TIME', 'SECOND_HALF'].includes(currentMatch.status)
  const isPaused = !!(currentMatch as Record<string, unknown>).timerPausedAt

  // Build events for timeline
  const events: LiveEvent[] = [
    ...currentMatch.goals.map((g) => ({
      id: g.id,
      type: 'goal' as const,
      minute: g.minute,
      playerName: g.player.name,
      playerNumber: g.player.number,
      teamName: g.team.name,
      teamId: g.team.id,
      isOwnGoal: g.isOwnGoal,
    })),
    ...currentMatch.cards.map((c) => ({
      id: c.id,
      type: 'card' as const,
      minute: c.minute,
      playerName: c.player.name,
      playerNumber: c.player.number,
      teamName: c.team.name,
      teamId: c.team.id,
      cardType: c.type,
    })),
  ]

  // Build lineup players map
  const lineupPlayers: Record<string, { id: string; name: string; number: number; position: string }[]> = {}
  for (const lineup of currentMatch.lineups ?? []) {
    lineupPlayers[lineup.teamId] = lineup.players?.map((lp: { player: { id: string; name: string; number: number; position: string } }) => lp.player) ?? []
  }

  const homeTeam = currentMatch.homeTeam!
  const awayTeam = currentMatch.awayTeam!

  const homeTeamData = {
    id: homeTeam.id,
    name: homeTeam.name,
    shortName: homeTeam.shortName,
    logo: homeTeam.logo ?? null,
    players: homeTeam.players?.map((p: { id: string; name: string; number: number; position: string }) => ({
      id: p.id, name: p.name, number: p.number, position: p.position,
    })) ?? [],
  }

  const awayTeamData = {
    id: awayTeam.id,
    name: awayTeam.name,
    shortName: awayTeam.shortName,
    logo: awayTeam.logo ?? null,
    players: awayTeam.players?.map((p: { id: string; name: string; number: number; position: string }) => ({
      id: p.id, name: p.name, number: p.number, position: p.position,
    })) ?? [],
  }

  async function handleStatusChange(newStatus: string) {
    setLoading(true)
    try {
      await updateMatchStatus(currentMatch.id, newStatus)
      toast.success(`Match status: ${newStatus.replace('_', ' ')}`)
      mutate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  async function handlePauseResume() {
    try {
      if (isPaused) {
        await resumeTimer(currentMatch.id)
      } else {
        await pauseTimer(currentMatch.id)
      }
      mutate()
    } catch {
      toast.error('Failed to update timer')
    }
  }

  const handleDeleteEvent = useCallback(async (eventId: string, type: 'goal' | 'card') => {
    try {
      if (type === 'goal') {
        await removeGoal(eventId)
        toast.success('Goal removed')
      } else {
        await removeCard(eventId)
        toast.success('Card removed')
      }
      mutate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete event')
    }
  }, [mutate])

  function handleActionComplete() {
    setView('main')
    mutate()
  }

  // Render sub-views
  if (view === 'action') {
    return (
      <ActionChoiceView
        onSelectGoal={() => setView('goal')}
        onSelectCard={() => setView('card')}
        onBack={() => setView('main')}
      />
    )
  }

  if (view === 'goal') {
    return (
      <GoalSteps
        matchId={currentMatch.id}
        homeTeam={homeTeamData}
        awayTeam={awayTeamData}
        lineupPlayers={lineupPlayers}
        onComplete={handleActionComplete}
        onBack={() => setView('action')}
      />
    )
  }

  if (view === 'card') {
    return (
      <CardSteps
        matchId={currentMatch.id}
        homeTeam={homeTeamData}
        awayTeam={awayTeamData}
        lineupPlayers={lineupPlayers}
        onComplete={handleActionComplete}
        onBack={() => setView('action')}
      />
    )
  }

  // Main view
  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      {/* Timer (only when live) */}
      {isLive && currentMatch.status !== 'HALF_TIME' && (
        <MatchTimer
          status={currentMatch.status}
          timerStartedAt={(currentMatch as Record<string, unknown>).timerStartedAt as string | null}
          timerPausedAt={(currentMatch as Record<string, unknown>).timerPausedAt as string | null}
          pausedElapsed={((currentMatch as Record<string, unknown>).pausedElapsed as number) ?? 0}
        />
      )}

      {/* Status badge */}
      <div className="text-center">
        <span className={`inline-block rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wider ${
          currentMatch.status === 'FULL_TIME' ? 'bg-muted text-muted-foreground' :
          currentMatch.status === 'HALF_TIME' ? 'bg-yellow-500/20 text-yellow-400' :
          isLive ? 'bg-emerald-500/20 text-emerald-400' :
          'bg-muted text-muted-foreground'
        }`}>
          {currentMatch.status.replace('_', ' ')}
        </span>
      </div>

      {/* Scoreboard */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-6">
        <div className="flex-1 text-center">
          {homeTeam.logo ? (
            <img src={homeTeam.logo} alt={homeTeam.name} className="mx-auto h-12 w-12 rounded-lg object-cover" />
          ) : (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-xs font-bold">{homeTeam.shortName}</div>
          )}
          <p className="mt-2 truncate text-sm font-medium">{homeTeam.name}</p>
        </div>

        <div className="px-4 text-center">
          <p className="text-4xl font-bold tabular-nums">
            {currentMatch.homeScore} — {currentMatch.awayScore}
          </p>
        </div>

        <div className="flex-1 text-center">
          {awayTeam.logo ? (
            <img src={awayTeam.logo} alt={awayTeam.name} className="mx-auto h-12 w-12 rounded-lg object-cover" />
          ) : (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-xs font-bold">{awayTeam.shortName}</div>
          )}
          <p className="mt-2 truncate text-sm font-medium">{awayTeam.name}</p>
        </div>
      </div>

      {/* SCHEDULED: Start Match */}
      {currentMatch.status === 'SCHEDULED' && (
        <Button
          className="h-16 w-full rounded-2xl bg-emerald-600 text-xl font-bold text-white hover:bg-emerald-700"
          onClick={() => handleStatusChange('FIRST_HALF')}
          disabled={loading}
        >
          <Play className="mr-2 h-6 w-6" />
          Start Match
        </Button>
      )}

      {/* LIVE: Action button */}
      {isLive && currentMatch.status !== 'HALF_TIME' && (
        <Button
          className="h-16 w-full rounded-2xl bg-primary text-xl font-bold hover:bg-primary/90"
          onClick={() => setView('action')}
        >
          ACTION
        </Button>
      )}

      {/* Status transitions */}
      {currentMatch.status === 'FIRST_HALF' && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-12 flex-1 rounded-xl"
            onClick={() => handleStatusChange('HALF_TIME')}
            disabled={loading}
          >
            <Pause className="mr-2 h-4 w-4" />
            Half Time
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-xl"
            onClick={handlePauseResume}
          >
            {isPaused ? <Timer className="h-4 w-4" /> : <TimerOff className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {currentMatch.status === 'HALF_TIME' && (
        <Button
          className="h-14 w-full rounded-2xl bg-emerald-600 text-lg font-bold text-white hover:bg-emerald-700"
          onClick={() => handleStatusChange('SECOND_HALF')}
          disabled={loading}
        >
          <Play className="mr-2 h-5 w-5" />
          Start 2nd Half
        </Button>
      )}

      {currentMatch.status === 'SECOND_HALF' && (
        <div className="flex gap-2">
          <Button
            variant="destructive"
            className="h-12 flex-1 rounded-xl"
            onClick={() => setConfirmFullTime(true)}
            disabled={loading}
          >
            <Square className="mr-2 h-4 w-4" />
            Full Time
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-xl"
            onClick={handlePauseResume}
          >
            {isPaused ? <Timer className="h-4 w-4" /> : <TimerOff className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {currentMatch.status === 'FULL_TIME' && (
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium text-muted-foreground">Match Ended</p>
          <Button
            variant="outline"
            className="h-12 w-full rounded-xl"
            onClick={() => setConfirmReopen(true)}
            disabled={loading}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reopen Match
          </Button>
        </div>
      )}

      {/* Event Timeline */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Match Events
        </h3>
        <RefereeTimeline
          events={events}
          onDelete={handleDeleteEvent}
          readOnly={currentMatch.status === 'FULL_TIME'}
        />
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmFullTime}
        onOpenChange={setConfirmFullTime}
        title="End Match"
        description="Are you sure you want to end this match?"
        confirmText="End Match"
        variant="destructive"
        onConfirm={() => {
          setConfirmFullTime(false)
          handleStatusChange('FULL_TIME')
        }}
      />

      <ConfirmDialog
        open={confirmReopen}
        onOpenChange={setConfirmReopen}
        title="Reopen Match"
        description="Are you sure you want to reopen this match?"
        confirmText="Reopen"
        variant="default"
        onConfirm={() => {
          setConfirmReopen(false)
          handleStatusChange('SECOND_HALF')
        }}
      />
    </div>
  )
}
```

- [ ] **Step 8: Update the live match page to use RefereeMatchView**

Modify `src/app/admin/matches/[id]/live/page.tsx`:

Replace `import { LiveControlPanel }` with `import { RefereeMatchView }` and replace `<LiveControlPanel match={match} />` with `<RefereeMatchView match={match} />`:

```typescript
"use client"

import { use } from "react"
import useSWR from "swr"
import { RefereeMatchView } from "@/modules/live/components/RefereeMatchView"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function LiveMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: match, error } = useSWR(`/api/matches/${id}`, fetcher, {
    refreshInterval: 3000,
  })

  if (error) return <div className="p-8 text-center text-red-500">Failed to load match</div>
  if (!match) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner /></div>

  return <RefereeMatchView match={match} />
}
```

- [ ] **Step 9: Update the matches API to include timer fields**

Check the match API response to ensure it includes `timerStartedAt`, `timerPausedAt`, `pausedElapsed`. Find the API route at `src/app/api/matches/[id]/route.ts` and add these fields to the select/include if they're not auto-included.

- [ ] **Step 10: Verify compilation**

Run: `npx next build --no-lint 2>&1 | head -30`

- [ ] **Step 11: Commit**

```bash
git add src/modules/live/components/ src/app/admin/matches/
git commit -m "feat: add mobile-first referee match view with step-based action flow"
```

---

## Chunk 4: Public Pages — Statistics, Groups, Players

### Task 6: Public Statistics Page

**Files:**
- Create: `src/app/(public)/statistics/page.tsx`
- Create: `src/modules/statistics/components/StatCard.tsx`
- Create: `src/modules/statistics/components/TopScorersTable.tsx`
- Create: `src/modules/statistics/components/MostCardedTable.tsx`
- Create: `src/modules/statistics/components/TeamRankingsTable.tsx`
- Create: `src/modules/statistics/components/MatchRecordsCard.tsx`
- Create: `src/modules/statistics/components/FormBadges.tsx`

- [ ] **Step 1: Create StatCard component**

Create `src/modules/statistics/components/StatCard.tsx`:

```typescript
import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
}

export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create FormBadges component**

Create `src/modules/statistics/components/FormBadges.tsx`:

```typescript
export function FormBadges({ form }: { form: ('W' | 'D' | 'L')[] }) {
  if (form.length === 0) return <span className="text-muted-foreground">—</span>

  return (
    <div className="flex gap-1">
      {form.map((result, i) => (
        <span
          key={i}
          className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${
            result === 'W' ? 'bg-emerald-500/20 text-emerald-400' :
            result === 'D' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}
        >
          {result}
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create TopScorersTable**

Create `src/modules/statistics/components/TopScorersTable.tsx`:

```typescript
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import type { TopScorer } from '../types'

export function TopScorersTable({ scorers }: { scorers: TopScorer[] }) {
  if (scorers.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-4">No goals scored yet</p>
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-lg font-semibold">Top Scorers</h3>
        </div>
        <div className="divide-y divide-border">
          {scorers.map((scorer, i) => (
            <div key={scorer.playerId} className="flex items-center gap-3 px-5 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/players/${scorer.playerId}`} className="font-medium hover:underline">
                  {scorer.playerName}
                </Link>
                <Link href={`/teams/${scorer.teamId}`} className="block text-xs text-muted-foreground hover:underline">
                  {scorer.teamName}
                </Link>
              </div>
              <span className="text-xl font-bold">{scorer.goals}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Create MostCardedTable**

Create `src/modules/statistics/components/MostCardedTable.tsx`:

```typescript
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import type { MostCardedPlayer } from '../types'

export function MostCardedTable({ players }: { players: MostCardedPlayer[] }) {
  if (players.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-4">No cards issued yet</p>
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-lg font-semibold">Most Carded Players</h3>
        </div>
        <div className="divide-y divide-border">
          {players.map((player, i) => (
            <div key={player.playerId} className="flex items-center gap-3 px-5 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/players/${player.playerId}`} className="font-medium hover:underline">
                  {player.playerName}
                </Link>
                <Link href={`/teams/${player.teamId}`} className="block text-xs text-muted-foreground hover:underline">
                  {player.teamName}
                </Link>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-yellow-400">{player.yellowCards}🟨</span>
                <span className="rounded bg-red-500/20 px-2 py-0.5 text-red-400">{player.redCards}🟥</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: Create TeamRankingsTable**

Create `src/modules/statistics/components/TeamRankingsTable.tsx`:

```typescript
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { FormBadges } from './FormBadges'
import type { TeamRanking } from '../types'

export function TeamRankingsTable({ rankings }: { rankings: TeamRanking[] }) {
  if (rankings.length === 0) return null

  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-lg font-semibold">Team Rankings</h3>
        </div>

        {/* Mobile view */}
        <div className="space-y-2 p-4 md:hidden">
          {rankings.map((team, i) => (
            <div key={team.teamId} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/teams/${team.teamId}`} className="font-medium hover:underline">
                  {team.teamName}
                </Link>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{team.played}P</span>
                  <span>{team.won}W</span>
                  <span>{team.drawn}D</span>
                  <span>{team.lost}L</span>
                  <span>GD:{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</span>
                </div>
                <div className="mt-1"><FormBadges form={team.form} /></div>
              </div>
              <span className="text-xl font-bold">{team.points}</span>
            </div>
          ))}
        </div>

        {/* Desktop view */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-3 py-2 text-center w-10">#</th>
                <th className="px-3 py-2 text-left">Team</th>
                <th className="px-3 py-2 text-center">P</th>
                <th className="px-3 py-2 text-center">W</th>
                <th className="px-3 py-2 text-center">D</th>
                <th className="px-3 py-2 text-center">L</th>
                <th className="px-3 py-2 text-center">GF</th>
                <th className="px-3 py-2 text-center">GA</th>
                <th className="px-3 py-2 text-center">GD</th>
                <th className="px-3 py-2 text-center">Pts</th>
                <th className="px-3 py-2 text-center">Form</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rankings.map((team, i) => (
                <tr key={team.teamId}>
                  <td className="px-3 py-2 text-center font-bold">{i + 1}</td>
                  <td className="px-3 py-2">
                    <Link href={`/teams/${team.teamId}`} className="font-medium hover:underline">
                      {team.teamName}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-center">{team.played}</td>
                  <td className="px-3 py-2 text-center">{team.won}</td>
                  <td className="px-3 py-2 text-center">{team.drawn}</td>
                  <td className="px-3 py-2 text-center">{team.lost}</td>
                  <td className="px-3 py-2 text-center">{team.goalsFor}</td>
                  <td className="px-3 py-2 text-center">{team.goalsAgainst}</td>
                  <td className="px-3 py-2 text-center">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                  <td className="px-3 py-2 text-center font-bold">{team.points}</td>
                  <td className="px-3 py-2 text-center"><FormBadges form={team.form} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 6: Create MatchRecordsCard**

Create `src/modules/statistics/components/MatchRecordsCard.tsx`:

```typescript
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import type { MatchRecord } from '../types'

interface MatchRecordsCardProps {
  biggestWin: MatchRecord | null
  highestScoring: MatchRecord | null
}

export function MatchRecordsCard({ biggestWin, highestScoring }: MatchRecordsCardProps) {
  if (!biggestWin && !highestScoring) {
    return <p className="text-center text-sm text-muted-foreground py-4">No match records yet</p>
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-lg font-semibold">Match Records</h3>
        </div>
        <div className="divide-y divide-border">
          {biggestWin && <RecordRow record={biggestWin} />}
          {highestScoring && highestScoring.matchId !== biggestWin?.matchId && (
            <RecordRow record={highestScoring} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function RecordRow({ record }: { record: MatchRecord }) {
  return (
    <Link href={`/matches/${record.matchId}`} className="flex items-center gap-3 px-5 py-3 hover:bg-accent transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{record.label}</p>
        <p className="font-medium">
          {record.homeTeam.name} {record.homeScore} — {record.awayScore} {record.awayTeam.name}
        </p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 7: Create the statistics page**

Create `src/app/(public)/statistics/page.tsx`:

```typescript
import type { Metadata } from 'next'
import { Target, AlertTriangle, CalendarDays, TrendingUp } from 'lucide-react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/modules/statistics/components/StatCard'
import { TopScorersTable } from '@/modules/statistics/components/TopScorersTable'
import { MostCardedTable } from '@/modules/statistics/components/MostCardedTable'
import { TeamRankingsTable } from '@/modules/statistics/components/TeamRankingsTable'
import { MatchRecordsCard } from '@/modules/statistics/components/MatchRecordsCard'
import {
  getCompetitionStats,
  getTopScorers,
  getMostCardedPlayers,
  getTeamRankings,
  getMatchRecords,
} from '@/modules/statistics/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Statistics | WBU 2026',
  description: 'WBU 2026 Championship competition statistics',
}

export default async function StatisticsPage() {
  const [stats, topScorers, mostCarded, rankings, records] = await Promise.all([
    getCompetitionStats(),
    getTopScorers(10),
    getMostCardedPlayers(10),
    getTeamRankings(),
    getMatchRecords(),
  ])

  return (
    <PublicLayout contentClassName="max-w-5xl">
      <div className="space-y-8">
        <PageHeader
          title="Statistics"
          description="Competition stats and records"
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Matches Played" value={stats.completedMatches} icon={CalendarDays} />
          <StatCard label="Total Goals" value={stats.totalGoals} icon={Target} />
          <StatCard label="Avg Goals/Match" value={stats.avgGoalsPerMatch} icon={TrendingUp} />
          <StatCard label="Total Cards" value={stats.totalYellowCards + stats.totalRedCards} icon={AlertTriangle} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <TopScorersTable scorers={topScorers} />
          <MostCardedTable players={mostCarded} />
        </div>

        <TeamRankingsTable rankings={rankings} />
        <MatchRecordsCard biggestWin={records.biggestWin} highestScoring={records.highestScoring} />
      </div>
    </PublicLayout>
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add src/modules/statistics/components/ src/app/(public)/statistics/
git commit -m "feat: add public statistics page with competition stats and records"
```

---

### Task 7: Group Detail Page

**Files:**
- Create: `src/app/(public)/groups/[id]/page.tsx`

- [ ] **Step 1: Create the group detail page**

Create `src/app/(public)/groups/[id]/page.tsx`:

```typescript
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/db'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { PageHeader } from '@/components/common/PageHeader'
import { StandingsTable } from '@/modules/standings/components/StandingsTable'
import { calculateStandings } from '@/modules/standings/utils'
import { StatusBadge } from '@/components/common/StatusBadge'
import { getGroupStats } from '@/modules/statistics/queries'

export const dynamic = 'force-dynamic'

interface GroupPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: GroupPageProps): Promise<Metadata> {
  const { id } = await params
  const group = await prisma.group.findUnique({ where: { id }, select: { name: true } })
  if (!group) return { title: 'Group Not Found' }
  return {
    title: `${group.name} | WBU 2026`,
    description: `${group.name} standings, matches, and statistics`,
  }
}

export default async function GroupDetailPage({ params }: GroupPageProps) {
  const { id } = await params
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      teams: { select: { id: true, name: true, shortName: true, logo: true } },
      matches: {
        orderBy: { matchDate: 'asc' },
        include: {
          homeTeam: { select: { id: true, name: true, shortName: true, logo: true } },
          awayTeam: { select: { id: true, name: true, shortName: true, logo: true } },
        },
      },
    },
  })

  if (!group) notFound()

  const completedMatches = group.matches.filter((m) => m.status === 'FULL_TIME')
  const standings = calculateStandings(
    group.teams,
    completedMatches.map((m) => ({
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
    }))
  )

  const groupStats = await getGroupStats(id)

  return (
    <PublicLayout contentClassName="max-w-5xl">
      <div className="space-y-8">
        <PageHeader title={group.name} description="Group standings, matches, and statistics" />

        <StandingsTable groupName={group.name} standings={standings} />

        {/* Group Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold">{groupStats.totalGoals}</p>
            <p className="text-xs text-muted-foreground">Total Goals</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-lg font-bold truncate">
              {groupStats.topScorer ? (
                <Link href={`/players/${groupStats.topScorer.id}`} className="hover:underline">
                  {groupStats.topScorer.name}
                </Link>
              ) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              Top Scorer {groupStats.topScorer ? `(${groupStats.topScorer.goals})` : ''}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-lg font-bold truncate">
              {groupStats.mostCarded ? (
                <Link href={`/players/${groupStats.mostCarded.id}`} className="hover:underline">
                  {groupStats.mostCarded.name}
                </Link>
              ) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              Most Carded {groupStats.mostCarded ? `(${groupStats.mostCarded.totalCards})` : ''}
            </p>
          </div>
        </div>

        {/* Group Matches */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Matches</h3>
          <div className="space-y-2">
            {group.matches.filter((m) => m.homeTeam && m.awayTeam).map((match) => (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent"
              >
                <div className="flex-1 text-right">
                  <span className="font-medium">{match.homeTeam!.shortName}</span>
                </div>
                <div className="text-center min-w-[60px]">
                  {match.status === 'FULL_TIME' || match.status !== 'SCHEDULED' ? (
                    <span className="font-bold">{match.homeScore} — {match.awayScore}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {new Date(match.matchDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <span className="font-medium">{match.awayTeam!.shortName}</span>
                </div>
                <StatusBadge status={match.status} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(public)/groups/
git commit -m "feat: add group detail page with standings, matches, and stats"
```

---

### Task 8: Player Detail Page

**Files:**
- Create: `src/app/(public)/players/[id]/page.tsx`

- [ ] **Step 1: Create the player detail page**

Create `src/app/(public)/players/[id]/page.tsx`:

```typescript
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/db'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { getPlayerStats } from '@/modules/statistics/queries'

export const dynamic = 'force-dynamic'

interface PlayerPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
  const { id } = await params
  const player = await prisma.player.findUnique({
    where: { id },
    select: { name: true, team: { select: { name: true } } },
  })
  if (!player) return { title: 'Player Not Found' }
  return {
    title: `${player.name} | WBU 2026`,
    description: `${player.name} - ${player.team.name} player profile`,
  }
}

export default async function PlayerDetailPage({ params }: PlayerPageProps) {
  const { id } = await params
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      team: { select: { id: true, name: true, shortName: true, logo: true } },
    },
  })

  if (!player) notFound()

  const stats = await getPlayerStats(id)

  return (
    <PublicLayout contentClassName="max-w-3xl">
      <div className="space-y-6">
        {/* Player Header */}
        <div className="flex items-center gap-4">
          {player.photo ? (
            <img src={player.photo} alt={player.name} className="h-20 w-20 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-3xl font-bold text-primary">
              {player.number}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{player.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="secondary">#{player.number}</Badge>
              <Badge variant="outline">{player.position}</Badge>
              <Link href={`/teams/${player.team.id}`} className="text-sm text-muted-foreground hover:underline">
                {player.team.name}
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{stats.goals}</p>
              <p className="text-xs text-muted-foreground">Goals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{stats.matchesPlayed}</p>
              <p className="text-xs text-muted-foreground">Matches</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-400">{stats.yellowCards}</p>
              <p className="text-xs text-muted-foreground">Yellow Cards</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-400">{stats.redCards}</p>
              <p className="text-xs text-muted-foreground">Red Cards</p>
            </CardContent>
          </Card>
        </div>

        {/* Match History */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Match History</h2>
          {stats.matchHistory.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No matches played yet</p>
          ) : (
            <div className="space-y-2">
              {stats.matchHistory.map((entry) => (
                <Link
                  key={entry.matchId}
                  href={`/matches/${entry.matchId}`}
                  className="block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">vs {entry.opponent.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.matchDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{entry.score}</p>
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${
                        entry.result === 'W' ? 'bg-emerald-500/20 text-emerald-400' :
                        entry.result === 'D' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {entry.result}
                      </span>
                    </div>
                  </div>
                  {(entry.goals.length > 0 || entry.cards.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {entry.goals.map((g, i) => (
                        <span key={i} className="rounded bg-muted px-2 py-0.5">
                          ⚽ {g.minute}&apos;{g.isOwnGoal ? ' (OG)' : ''}
                        </span>
                      ))}
                      {entry.cards.map((c, i) => (
                        <span key={i} className="rounded bg-muted px-2 py-0.5">
                          {c.type === 'YELLOW' ? '🟨' : '🟥'} {c.minute}&apos;
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(public)/players/
git commit -m "feat: add player detail page with stats and match history"
```

---

## Chunk 5: Enhanced Team Detail & Navigation

### Task 9: Enhanced Team Detail Page

**Files:**
- Modify: `src/app/(public)/teams/[id]/page.tsx`
- Create: `src/modules/statistics/components/TeamStatsSection.tsx`

- [ ] **Step 1: Create TeamStatsSection component**

Create `src/modules/statistics/components/TeamStatsSection.tsx`:

```typescript
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { FormBadges } from './FormBadges'
import type { TeamStats } from '../types'

export function TeamStatsSection({ stats }: { stats: TeamStats }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Team Statistics</h3>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats.won}</p><p className="text-[10px] text-muted-foreground">Won</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats.drawn}</p><p className="text-[10px] text-muted-foreground">Drawn</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats.lost}</p><p className="text-[10px] text-muted-foreground">Lost</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats.goalsFor}</p><p className="text-[10px] text-muted-foreground">Goals For</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats.goalsAgainst}</p><p className="text-[10px] text-muted-foreground">Goals Against</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats.goalDifference > 0 ? `+${stats.goalDifference}` : stats.goalDifference}</p><p className="text-[10px] text-muted-foreground">Goal Diff</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats.points}</p><p className="text-[10px] text-muted-foreground">Points</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats.cleanSheets}</p><p className="text-[10px] text-muted-foreground">Clean Sheets</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-yellow-400">{stats.yellowCards}</p><p className="text-[10px] text-muted-foreground">Yellow Cards</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-red-400">{stats.redCards}</p><p className="text-[10px] text-muted-foreground">Red Cards</p></CardContent></Card>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Form:</span>
        <FormBadges form={stats.form} />
      </div>

      {stats.topScorer && (
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Top Scorer</p>
          <Link href={`/players/${stats.topScorer.playerId}`} className="font-medium hover:underline">
            {stats.topScorer.playerName}
          </Link>
          <span className="ml-2 text-sm text-muted-foreground">({stats.topScorer.goals} goals)</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update team detail page to include stats and player links**

In `src/app/(public)/teams/[id]/page.tsx`, import and use `getTeamStats` and `TeamStatsSection`. Add after fetching the team and matches:

```typescript
import { getTeamStats } from '@/modules/statistics/queries'
import { TeamStatsSection } from '@/modules/statistics/components/TeamStatsSection'
```

After `const matchData = ...`, add:
```typescript
const teamStats = await getTeamStats(id)
```

Pass `teamStats` to `TeamDetail`:
```typescript
<TeamDetail team={teamData} matches={matchData} stats={teamStats} />
```

Then update the `TeamDetail` component to accept and render the stats prop. Find the TeamDetail component and add the `TeamStatsSection` section. Also make player names into links to `/players/[id]`.

- [ ] **Step 3: Commit**

```bash
git add src/modules/statistics/components/TeamStatsSection.tsx src/app/(public)/teams/ src/modules/teams/
git commit -m "feat: add team statistics section and player links to team detail page"
```

---

### Task 10: Navigation Updates & Cross-Linking

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/app/(public)/standings/page.tsx`

- [ ] **Step 1: Update Header navigation**

In `src/components/layout/Header.tsx`, replace `navLinks` array. Replace Bracket with Statistics on mobile but keep both on desktop:

```typescript
import {
  BarChart3,
  CalendarDays,
  GitBranch,
  House,
  Shield,
  TableProperties,
  Users,
} from "lucide-react"

const desktopNavLinks = [
  { href: "/", label: "Home", icon: House },
  { href: "/matches", label: "Matches", icon: CalendarDays },
  { href: "/standings", label: "Standings", icon: TableProperties },
  { href: "/bracket", label: "Bracket", icon: GitBranch },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/statistics", label: "Statistics", icon: BarChart3 },
]

const mobileNavLinks = [
  { href: "/", label: "Home", icon: House },
  { href: "/matches", label: "Matches", icon: CalendarDays },
  { href: "/standings", label: "Standings", icon: TableProperties },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/statistics", label: "Stats", icon: BarChart3 },
]
```

Update the desktop nav to use `desktopNavLinks` and mobile nav to use `mobileNavLinks`.

- [ ] **Step 2: Add group name links on standings page**

In `src/app/(public)/standings/page.tsx`, pass `groupId` to `StandingsTable`:

```typescript
<StandingsTable
  key={group.id}
  groupId={group.id}
  groupName={group.name}
  standings={standings}
/>
```

Then update `StandingsTable` to accept `groupId` prop and make the group name a link:

In `src/modules/standings/components/StandingsTable.tsx`, add `groupId?: string` to props and wrap the group name:

```typescript
{groupId ? (
  <Link href={`/groups/${groupId}`}>
    <h3 className="mt-2 text-2xl font-semibold text-foreground hover:underline">{groupName}</h3>
  </Link>
) : (
  <h3 className="mt-2 text-2xl font-semibold text-foreground">{groupName}</h3>
)}
```

- [ ] **Step 3: Verify compilation**

Run: `npx next build --no-lint 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Header.tsx src/app/(public)/standings/ src/modules/standings/
git commit -m "feat: update navigation with statistics link and add cross-linking"
```

---

## Chunk 6: Final Integration & Verification

### Task 11: API & Type Fixes

- [ ] **Step 1: Ensure match API returns timer fields**

Check `src/app/api/matches/[id]/route.ts`. If it uses a specific `select`, add `timerStartedAt`, `timerPausedAt`, `pausedElapsed` to it. If it uses `include` without select on Match fields, Prisma will auto-include the new fields.

- [ ] **Step 2: Update MatchWithEvents type if needed**

Check `src/modules/matches/types.ts`. If it explicitly lists fields, add the timer fields. If it's inferred from Prisma, no changes needed.

- [ ] **Step 3: Fix any remaining type errors**

Run: `npx tsc --noEmit 2>&1 | head -40`
Fix any issues found.

- [ ] **Step 4: Verify the app builds**

Run: `npx next build --no-lint`
Expected: Build succeeds

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve type errors and ensure API returns timer fields"
```

---

### Task 12: Manual Testing Verification

- [ ] **Step 1: Start the dev server and test**

Run: `npx next dev`

Test checklist:
1. Visit `/statistics` — page loads with stats sections
2. Visit `/groups/[id]` — standings, matches, stats display
3. Visit `/players/[id]` — player profile with stats
4. Visit `/teams/[id]` — team page now shows stats section
5. Navigate to admin → match → live view — new referee UI shows
6. "Start Match" button is prominent and easy to find
7. Test ACTION → Goal → Team → Player flow
8. Test ACTION → Card → Type → Team → Player flow
9. Timer counts up correctly
10. Header shows Statistics link
11. Standings page group names link to group detail
