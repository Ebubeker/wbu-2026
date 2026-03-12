# Team Features Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add match lineups (6v6), team kits, fan voting, and enhanced captain panel to the WBU 2026 Championship app.

**Architecture:** Four subsystems built incrementally — schema first, then kits (standalone visual component), lineups (depends on kits for visualization), voting (independent), and captain panel enhancements (ties everything together). All follow existing module patterns: server actions in `actions.ts`, queries in `queries.ts`, types in `types.ts`, components in `components/`.

**Tech Stack:** Next.js 16 App Router, Prisma 5, PostgreSQL, Tailwind CSS 4, Shadcn/Radix UI, SWR, Zod, date-fns, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-03-12-team-features-design.md`

---

## File Structure

### New Files
```
prisma/migrations/XXXXXX_team_features/migration.sql  (auto-generated)

src/lib/formations.ts                          — Formation constants & position mappings
src/lib/fingerprint.ts                         — Client-side device fingerprint utility

src/modules/kits/types.ts                      — Kit type definitions
src/modules/kits/actions.ts                    — Kit server actions (create/update)
src/modules/kits/queries.ts                    — Kit queries
src/modules/kits/components/KitPreview.tsx     — SVG jersey preview component
src/modules/kits/components/KitEditor.tsx      — Color picker + pattern selector form

src/modules/lineups/types.ts                   — Lineup type definitions
src/modules/lineups/actions.ts                 — Lineup server actions (save, auto-fill)
src/modules/lineups/queries.ts                 — Lineup queries
src/modules/lineups/components/PitchView.tsx   — Pitch SVG with formation positions
src/modules/lineups/components/LineupEditor.tsx — Captain lineup setup UI
src/modules/lineups/components/LineupDisplay.tsx — Read-only lineup for match detail

src/modules/voting/types.ts                    — Vote type definitions
src/modules/voting/actions.ts                  — Vote server actions
src/modules/voting/queries.ts                  — Vote queries (counts, user vote check)
src/modules/voting/components/VotePanel.tsx    — Voting UI with results bar

src/app/captain/kits/page.tsx                  — Captain kit manager page
src/app/captain/matches/page.tsx               — Captain match center page
src/app/captain/matches/[id]/lineup/page.tsx   — Captain lineup setup page

src/app/api/kits/route.ts                      — Kit CRUD API
src/app/api/matches/[id]/vote/route.ts         — Voting API
src/app/api/matches/[id]/lineup/route.ts       — Lineup API
```

### Modified Files
```
prisma/schema.prisma                           — Add Kit, Lineup, LineupPlayer, MatchVote models + enums
src/lib/validations.ts                         — Add kit, lineup, vote schemas
src/modules/matches/types.ts                   — Add lineup & vote fields to MatchData
src/modules/matches/queries.ts                 — Include lineups & votes in match queries
src/modules/live/actions.ts                    — Auto-fill lineups on match start
src/modules/teams/types.ts                     — Add kits & defaultFormation
src/modules/teams/queries.ts                   — Include kits in team queries
src/modules/matches/components/MatchDetail.tsx — Add lineup visualization & voting
src/modules/teams/components/TeamDetail.tsx    — Add kit display
src/components/layout/CaptainSidebar.tsx       — Add Kits & Matches nav items
src/app/captain/page.tsx                       — Add kits & matches action cards
src/app/captain/team/page.tsx                  — Add default formation selector

Note: src/app/captain/players/ already exists with player management functionality — no changes needed.
```

---

## Chunk 1: Schema & Foundations

### Task 1: Update Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add new enums to schema**

Add after the existing `CardType` enum:

```prisma
enum KitType {
  HOME
  AWAY
}

enum KitPattern {
  SOLID
  STRIPES
  CHECKERED
  GRADIENT
}

enum VoteChoice {
  HOME
  DRAW
  AWAY
}
```

- [ ] **Step 2: Add Kit model**

Add after the `Card` model:

```prisma
model Kit {
  id             String     @id @default(uuid())
  team           Team       @relation(fields: [teamId], references: [id], onDelete: Cascade)
  teamId         String
  type           KitType
  primaryColor   String
  secondaryColor String
  pattern        KitPattern @default(SOLID)
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  @@unique([teamId, type])
  @@index([teamId])
}
```

- [ ] **Step 3: Add Lineup model**

```prisma
model Lineup {
  id        String         @id @default(uuid())
  match     Match          @relation(fields: [matchId], references: [id], onDelete: Cascade)
  matchId   String
  team      Team           @relation(fields: [teamId], references: [id], onDelete: Cascade)
  teamId    String
  formation String
  players   LineupPlayer[]
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  @@unique([matchId, teamId])
  @@index([matchId])
  @@index([teamId])
}
```

- [ ] **Step 4: Add LineupPlayer model**

```prisma
model LineupPlayer {
  id           String   @id @default(uuid())
  lineup       Lineup   @relation(fields: [lineupId], references: [id], onDelete: Cascade)
  lineupId     String
  player       Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)
  playerId     String
  positionSlot Int
  createdAt    DateTime @default(now())

  @@unique([lineupId, positionSlot])
  @@unique([lineupId, playerId])
  @@index([lineupId])
}
```

- [ ] **Step 5: Add MatchVote model**

```prisma
model MatchVote {
  id                String     @id @default(uuid())
  match             Match      @relation(fields: [matchId], references: [id], onDelete: Cascade)
  matchId           String
  vote              VoteChoice
  ipAddress         String
  deviceFingerprint String
  createdAt         DateTime   @default(now())

  @@unique([matchId, deviceFingerprint])
  @@index([matchId])
}
```

- [ ] **Step 6: Update existing models with new relations**

Add to `Team` model:
```prisma
  kits             Kit[]
  lineups          Lineup[]
  defaultFormation String   @default("1-2-2-1")
```

Add to `Match` model:
```prisma
  lineups Lineup[]
  votes   MatchVote[]
```

Add to `Player` model:
```prisma
  lineupEntries LineupPlayer[]
```

- [ ] **Step 7: Run migration**

Run: `npx prisma migrate dev --name team_features`

Expected: Migration succeeds, Prisma Client regenerated.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Kit, Lineup, LineupPlayer, MatchVote schema models"
```

---

### Task 2: Add Validation Schemas & Formation Constants

**Files:**
- Modify: `src/lib/validations.ts`
- Create: `src/lib/formations.ts`

- [ ] **Step 1: Add formation constants**

Create `src/lib/formations.ts`:

```typescript
export const FORMATIONS = ['1-2-2-1', '1-1-3-1', '1-3-1-1', '1-2-1-2'] as const

export type Formation = (typeof FORMATIONS)[number]

/**
 * Maps each formation to the pitch positions for 6 slots.
 * Coordinates are percentages (0-100) relative to one half of the pitch.
 * x = horizontal (0=left, 100=right), y = vertical (0=goal line, 100=center line)
 */
export const FORMATION_POSITIONS: Record<Formation, Array<{ x: number; y: number; label: string }>> = {
  '1-2-2-1': [
    { x: 50, y: 10, label: 'GK' },
    { x: 30, y: 35, label: 'DEF' },
    { x: 70, y: 35, label: 'DEF' },
    { x: 30, y: 60, label: 'MID' },
    { x: 70, y: 60, label: 'MID' },
    { x: 50, y: 85, label: 'FWD' },
  ],
  '1-1-3-1': [
    { x: 50, y: 10, label: 'GK' },
    { x: 50, y: 30, label: 'DEF' },
    { x: 20, y: 55, label: 'MID' },
    { x: 50, y: 55, label: 'MID' },
    { x: 80, y: 55, label: 'MID' },
    { x: 50, y: 85, label: 'FWD' },
  ],
  '1-3-1-1': [
    { x: 50, y: 10, label: 'GK' },
    { x: 20, y: 35, label: 'DEF' },
    { x: 50, y: 35, label: 'DEF' },
    { x: 80, y: 35, label: 'DEF' },
    { x: 50, y: 60, label: 'MID' },
    { x: 50, y: 85, label: 'FWD' },
  ],
  '1-2-1-2': [
    { x: 50, y: 10, label: 'GK' },
    { x: 30, y: 35, label: 'DEF' },
    { x: 70, y: 35, label: 'DEF' },
    { x: 50, y: 55, label: 'MID' },
    { x: 35, y: 80, label: 'FWD' },
    { x: 65, y: 80, label: 'FWD' },
  ],
}

export const FORMATION_LABELS: Record<Formation, string> = {
  '1-2-2-1': '1-2-2-1 (GK, 2 DEF, 2 MID, 1 FWD)',
  '1-1-3-1': '1-1-3-1 (GK, 1 DEF, 3 MID, 1 FWD)',
  '1-3-1-1': '1-3-1-1 (GK, 3 DEF, 1 MID, 1 FWD)',
  '1-2-1-2': '1-2-1-2 (GK, 2 DEF, 1 MID, 2 FWD)',
}
```

- [ ] **Step 2: Add validation schemas to validations.ts**

Add to `src/lib/validations.ts`:

```typescript
export const kitSchema = z.object({
  teamId: z.string().uuid(),
  type: z.enum(['HOME', 'AWAY']),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  pattern: z.enum(['SOLID', 'STRIPES', 'CHECKERED', 'GRADIENT']),
})

export const lineupSchema = z.object({
  matchId: z.string().uuid(),
  teamId: z.string().uuid(),
  formation: z.enum(['1-2-2-1', '1-1-3-1', '1-3-1-1', '1-2-1-2']),
  players: z.array(z.object({
    playerId: z.string().uuid(),
    positionSlot: z.number().int().min(0).max(5),
  })).length(6),
})

export const voteSchema = z.object({
  vote: z.enum(['HOME', 'DRAW', 'AWAY']),
  fingerprint: z.string().min(1),
})
```

Add inferred types at the bottom:
```typescript
export type KitInput = z.infer<typeof kitSchema>
export type LineupInput = z.infer<typeof lineupSchema>
export type VoteInput = z.infer<typeof voteSchema>
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/formations.ts src/lib/validations.ts
git commit -m "feat: add formation constants and validation schemas for kits, lineups, votes"
```

---

## Chunk 2: Kit System

### Task 3: Kit Module — Types, Queries, Actions

**Files:**
- Create: `src/modules/kits/types.ts`
- Create: `src/modules/kits/queries.ts`
- Create: `src/modules/kits/actions.ts`

- [ ] **Step 1: Create kit types**

Create `src/modules/kits/types.ts`:

```typescript
export interface KitData {
  id: string
  teamId: string
  type: 'HOME' | 'AWAY'
  primaryColor: string
  secondaryColor: string
  pattern: 'SOLID' | 'STRIPES' | 'CHECKERED' | 'GRADIENT'
}

export const DEFAULT_KIT: Omit<KitData, 'id' | 'teamId' | 'type'> = {
  primaryColor: '#FFFFFF',
  secondaryColor: '#000000',
  pattern: 'SOLID',
}
```

- [ ] **Step 2: Create kit queries**

Create `src/modules/kits/queries.ts`:

```typescript
import prisma from '@/lib/db'
import type { KitData } from './types'

export async function getKitsByTeam(teamId: string): Promise<KitData[]> {
  const kits = await prisma.kit.findMany({
    where: { teamId },
  })
  return kits as KitData[]
}

export async function getKit(teamId: string, type: 'HOME' | 'AWAY'): Promise<KitData | null> {
  const kit = await prisma.kit.findUnique({
    where: { teamId_type: { teamId, type } },
  })
  return kit as KitData | null
}
```

- [ ] **Step 3: Create kit actions**

Create `src/modules/kits/actions.ts`:

```typescript
'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { kitSchema } from '@/lib/validations'

function revalidateKitPaths(teamId: string) {
  revalidatePath(`/teams/${teamId}`)
  revalidatePath('/captain/kits')
  revalidatePath('/matches')
}

export async function upsertKit(data: {
  teamId: string
  type: 'HOME' | 'AWAY'
  primaryColor: string
  secondaryColor: string
  pattern: 'SOLID' | 'STRIPES' | 'CHECKERED' | 'GRADIENT'
}) {
  const parsed = kitSchema.parse(data)

  const kit = await prisma.kit.upsert({
    where: {
      teamId_type: { teamId: parsed.teamId, type: parsed.type },
    },
    create: {
      teamId: parsed.teamId,
      type: parsed.type,
      primaryColor: parsed.primaryColor,
      secondaryColor: parsed.secondaryColor,
      pattern: parsed.pattern,
    },
    update: {
      primaryColor: parsed.primaryColor,
      secondaryColor: parsed.secondaryColor,
      pattern: parsed.pattern,
    },
  })

  revalidateKitPaths(parsed.teamId)
  return kit
}
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/kits/
git commit -m "feat: add kit module with types, queries, and upsert action"
```

---

### Task 4: Kit Preview SVG Component

**Files:**
- Create: `src/modules/kits/components/KitPreview.tsx`

- [ ] **Step 1: Create KitPreview component**

Create `src/modules/kits/components/KitPreview.tsx`:

```tsx
import * as React from 'react'

interface KitPreviewProps {
  primaryColor: string
  secondaryColor: string
  pattern: 'SOLID' | 'STRIPES' | 'CHECKERED' | 'GRADIENT'
  number?: number
  size?: number
  className?: string
}

export function KitPreview({
  primaryColor,
  secondaryColor,
  pattern,
  number,
  size = 120,
  className,
}: KitPreviewProps) {
  const id = React.useId()
  const patternId = `kit-pattern-${id}`
  const gradientId = `kit-gradient-${id}`

  function renderPattern() {
    switch (pattern) {
      case 'STRIPES':
        return (
          <defs>
            <pattern id={patternId} patternUnits="userSpaceOnUse" width="12" height="12">
              <rect width="6" height="12" fill={primaryColor} />
              <rect x="6" width="6" height="12" fill={secondaryColor} />
            </pattern>
          </defs>
        )
      case 'CHECKERED':
        return (
          <defs>
            <pattern id={patternId} patternUnits="userSpaceOnUse" width="16" height="16">
              <rect width="8" height="8" fill={primaryColor} />
              <rect x="8" width="8" height="8" fill={secondaryColor} />
              <rect y="8" width="8" height="8" fill={secondaryColor} />
              <rect x="8" y="8" width="8" height="8" fill={primaryColor} />
            </pattern>
          </defs>
        )
      case 'GRADIENT':
        return (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primaryColor} />
              <stop offset="100%" stopColor={secondaryColor} />
            </linearGradient>
          </defs>
        )
      default:
        return null
    }
  }

  function getFill() {
    switch (pattern) {
      case 'STRIPES':
      case 'CHECKERED':
        return `url(#${patternId})`
      case 'GRADIENT':
        return `url(#${gradientId})`
      default:
        return primaryColor
    }
  }

  function getNumberColor() {
    return pattern === 'GRADIENT' ? primaryColor : secondaryColor
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {renderPattern()}
      {/* Jersey body */}
      <path
        d="M30 20 L20 25 L10 35 L15 40 L22 35 L22 85 L78 85 L78 35 L85 40 L90 35 L80 25 L70 20 L60 25 Q50 30 40 25 Z"
        fill={getFill()}
        stroke={secondaryColor}
        strokeWidth="1.5"
      />
      {/* Collar */}
      <path
        d="M40 20 Q50 28 60 20"
        fill="none"
        stroke={secondaryColor}
        strokeWidth="1.5"
      />
      {/* Number */}
      {number !== undefined && (
        <text
          x="50"
          y="62"
          textAnchor="middle"
          dominantBaseline="central"
          fill={getNumberColor()}
          fontSize="22"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          {number}
        </text>
      )}
    </svg>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/kits/components/KitPreview.tsx
git commit -m "feat: add KitPreview SVG component with pattern rendering"
```

---

### Task 5: Kit Editor Component

**Files:**
- Create: `src/modules/kits/components/KitEditor.tsx`

- [ ] **Step 1: Create KitEditor component**

Create `src/modules/kits/components/KitEditor.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { KitPreview } from './KitPreview'
import type { KitData } from '../types'
import { DEFAULT_KIT } from '../types'

interface KitEditorProps {
  teamId: string
  type: 'HOME' | 'AWAY'
  kit: KitData | null
  onSave: (data: {
    teamId: string
    type: 'HOME' | 'AWAY'
    primaryColor: string
    secondaryColor: string
    pattern: 'SOLID' | 'STRIPES' | 'CHECKERED' | 'GRADIENT'
  }) => Promise<void>
}

export function KitEditor({ teamId, type, kit, onSave }: KitEditorProps) {
  const [primaryColor, setPrimaryColor] = useState(kit?.primaryColor ?? DEFAULT_KIT.primaryColor)
  const [secondaryColor, setSecondaryColor] = useState(kit?.secondaryColor ?? DEFAULT_KIT.secondaryColor)
  const [pattern, setPattern] = useState<KitData['pattern']>(kit?.pattern ?? DEFAULT_KIT.pattern)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({ teamId, type, primaryColor, secondaryColor, pattern })
      toast.success(`${type === 'HOME' ? 'Home' : 'Away'} kit saved`)
    } catch {
      toast.error('Failed to save kit')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{type === 'HOME' ? 'Home Kit' : 'Away Kit'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <KitPreview
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            pattern={pattern}
            number={10}
            size={140}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`${type}-primary`}>Primary Color</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id={`${type}-primary`}
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-9 p-1 cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`${type}-secondary`}>Secondary Color</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id={`${type}-secondary`}
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-12 h-9 p-1 cursor-pointer"
              />
              <Input
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor={`${type}-pattern`}>Pattern</Label>
          <Select value={pattern} onValueChange={(v) => setPattern(v as KitData['pattern'])}>
            <SelectTrigger id={`${type}-pattern`} className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SOLID">Solid</SelectItem>
              <SelectItem value="STRIPES">Stripes</SelectItem>
              <SelectItem value="CHECKERED">Checkered</SelectItem>
              <SelectItem value="GRADIENT">Gradient</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Kit'}
        </Button>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/kits/components/KitEditor.tsx
git commit -m "feat: add KitEditor component with color pickers and pattern selector"
```

---

### Task 6: Kit API Route

**Files:**
- Create: `src/app/api/kits/route.ts`

- [ ] **Step 1: Create kit API route**

Create `src/app/api/kits/route.ts`:

```typescript
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

    // Captains can only edit their own team's kits
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/kits/route.ts
git commit -m "feat: add kit API route for GET and POST"
```

---

## Chunk 3: Lineup System

### Task 7: Lineup Module — Types, Queries, Actions

**Files:**
- Create: `src/modules/lineups/types.ts`
- Create: `src/modules/lineups/queries.ts`
- Create: `src/modules/lineups/actions.ts`

- [ ] **Step 1: Create lineup types**

Create `src/modules/lineups/types.ts`:

```typescript
import type { Formation } from '@/lib/formations'

export interface LineupPlayerData {
  id: string
  playerId: string
  positionSlot: number
  player: {
    id: string
    name: string
    number: number
    position: string
  }
}

export interface LineupData {
  id: string
  matchId: string
  teamId: string
  formation: Formation
  players: LineupPlayerData[]
}
```

- [ ] **Step 2: Create lineup queries**

Create `src/modules/lineups/queries.ts`:

```typescript
import prisma from '@/lib/db'
import type { LineupData } from './types'

const lineupInclude = {
  players: {
    include: {
      player: {
        select: { id: true, name: true, number: true, position: true },
      },
    },
    orderBy: { positionSlot: 'asc' as const },
  },
} as const

export async function getLineup(matchId: string, teamId: string): Promise<LineupData | null> {
  const lineup = await prisma.lineup.findUnique({
    where: { matchId_teamId: { matchId, teamId } },
    include: lineupInclude,
  })
  return lineup as unknown as LineupData | null
}

export async function getLineupsForMatch(matchId: string): Promise<LineupData[]> {
  const lineups = await prisma.lineup.findMany({
    where: { matchId },
    include: lineupInclude,
  })
  return lineups as unknown as LineupData[]
}
```

- [ ] **Step 3: Create lineup actions**

Create `src/modules/lineups/actions.ts`:

```typescript
'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { lineupSchema } from '@/lib/validations'
import type { Formation } from '@/lib/formations'

function revalidateLineupPaths(matchId: string) {
  revalidatePath(`/matches/${matchId}`)
  revalidatePath('/captain/matches')
  revalidatePath('/matches')
}

export async function saveLineup(data: {
  matchId: string
  teamId: string
  formation: string
  players: Array<{ playerId: string; positionSlot: number }>
}) {
  const parsed = lineupSchema.parse(data)

  // Validate match exists, is SCHEDULED, and team is assigned
  const match = await prisma.match.findUnique({
    where: { id: parsed.matchId },
    select: { homeTeamId: true, awayTeamId: true, status: true },
  })

  if (!match) throw new Error('Match not found')
  if (match.status !== 'SCHEDULED') throw new Error('Lineup is locked — match has started')
  if (match.homeTeamId !== parsed.teamId && match.awayTeamId !== parsed.teamId) {
    throw new Error('Team is not assigned to this match')
  }

  // Validate all players belong to this team
  const playerIds = parsed.players.map((p) => p.playerId)
  const playerCount = await prisma.player.count({
    where: { id: { in: playerIds }, teamId: parsed.teamId },
  })
  if (playerCount !== 6) throw new Error('All 6 players must belong to your team')

  // Upsert lineup: delete existing players and recreate
  const existing = await prisma.lineup.findUnique({
    where: { matchId_teamId: { matchId: parsed.matchId, teamId: parsed.teamId } },
  })

  if (existing) {
    await prisma.$transaction([
      prisma.lineupPlayer.deleteMany({ where: { lineupId: existing.id } }),
      prisma.lineup.update({
        where: { id: existing.id },
        data: {
          formation: parsed.formation,
          players: {
            create: parsed.players.map((p) => ({
              playerId: p.playerId,
              positionSlot: p.positionSlot,
            })),
          },
        },
      }),
    ])
  } else {
    await prisma.lineup.create({
      data: {
        matchId: parsed.matchId,
        teamId: parsed.teamId,
        formation: parsed.formation,
        players: {
          create: parsed.players.map((p) => ({
            playerId: p.playerId,
            positionSlot: p.positionSlot,
          })),
        },
      },
    })
  }

  revalidateLineupPaths(parsed.matchId)
  return { success: true }
}

/**
 * Auto-fill lineup for a team when match goes live and no lineup was set.
 * Uses first 6 players by shirt number and team's default formation.
 */
export async function autoFillLineup(matchId: string, teamId: string) {
  const existing = await prisma.lineup.findUnique({
    where: { matchId_teamId: { matchId, teamId } },
  })

  if (existing) return // Already has a lineup

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { defaultFormation: true },
  })

  const players = await prisma.player.findMany({
    where: { teamId },
    orderBy: { number: 'asc' },
    take: 6,
    select: { id: true },
  })

  if (players.length < 6) return // Not enough players

  const formation = (team?.defaultFormation ?? '1-2-2-1') as Formation

  await prisma.lineup.create({
    data: {
      matchId,
      teamId,
      formation,
      players: {
        create: players.map((p, i) => ({
          playerId: p.id,
          positionSlot: i,
        })),
      },
    },
  })

  revalidateLineupPaths(matchId)
}
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/lineups/
git commit -m "feat: add lineup module with types, queries, save and auto-fill actions"
```

---

### Task 8: Integrate Auto-Fill Into Match Status Transition

**Files:**
- Modify: `src/modules/live/actions.ts`

- [ ] **Step 1: Add auto-fill call to updateMatchStatus**

In `src/modules/live/actions.ts`, add import at the top:

```typescript
import { autoFillLineup } from '@/modules/lineups/actions'
```

Then in the `updateMatchStatus` function, add auto-fill logic **before** the existing `prisma.match.update` call. When transitioning to `FIRST_HALF`, auto-fill any missing lineups:

```typescript
export async function updateMatchStatus(
  matchId: string,
  status: string,
  matchMinute: number
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

  const match = await prisma.match.update({
    where: { id: matchId },
    data: { status: status as MatchStatus, matchMinute },
  })

  // ... rest of existing code unchanged
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/live/actions.ts
git commit -m "feat: auto-fill missing lineups when match transitions to FIRST_HALF"
```

---

### Task 9: Lineup API Route

**Files:**
- Create: `src/app/api/matches/[id]/lineup/route.ts`

- [ ] **Step 1: Create lineup API route**

Create `src/app/api/matches/[id]/lineup/route.ts`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/matches/[id]/lineup/route.ts
git commit -m "feat: add lineup API route for GET and POST"
```

---

### Task 10: PitchView Component

**Files:**
- Create: `src/modules/lineups/components/PitchView.tsx`

- [ ] **Step 1: Create PitchView component**

Create `src/modules/lineups/components/PitchView.tsx`:

```tsx
import { FORMATION_POSITIONS } from '@/lib/formations'
import type { Formation } from '@/lib/formations'

interface PitchPlayerMarker {
  name: string
  number: number
  positionSlot: number
}

interface PitchViewProps {
  formation: Formation
  players: PitchPlayerMarker[]
  primaryColor?: string
  secondaryColor?: string
  side?: 'left' | 'right'
  className?: string
  onSlotClick?: (slot: number) => void
  selectedSlot?: number | null
}

export function PitchView({
  formation,
  players,
  primaryColor = '#FFFFFF',
  secondaryColor = '#000000',
  side = 'left',
  className,
  onSlotClick,
  selectedSlot,
}: PitchViewProps) {
  const positions = FORMATION_POSITIONS[formation]

  return (
    <div className={className}>
      <svg viewBox="0 0 200 300" className="w-full h-full">
        {/* Pitch background */}
        <rect width="200" height="300" fill="#2d8a4e" rx="4" />

        {/* Field markings */}
        <rect x="10" y="10" width="180" height="280" fill="none" stroke="#ffffff30" strokeWidth="1" />
        {/* Center line */}
        <line x1="10" y1="150" x2="190" y2="150" stroke="#ffffff30" strokeWidth="1" />
        {/* Center circle */}
        <circle cx="100" cy="150" r="30" fill="none" stroke="#ffffff30" strokeWidth="1" />
        {/* Goal areas */}
        <rect x="60" y="10" width="80" height="40" fill="none" stroke="#ffffff30" strokeWidth="1" />
        <rect x="60" y="250" width="80" height="40" fill="none" stroke="#ffffff30" strokeWidth="1" />
        {/* Penalty arcs */}
        <rect x="75" y="10" width="50" height="20" fill="none" stroke="#ffffff30" strokeWidth="1" />
        <rect x="75" y="270" width="50" height="20" fill="none" stroke="#ffffff30" strokeWidth="1" />

        {/* Players */}
        {positions.map((pos, slotIndex) => {
          const player = players.find((p) => p.positionSlot === slotIndex)
          // Map formation coordinates to pitch SVG
          // y: for "left" side, GK near bottom (y=10 maps to y=260), forward near center (y=85 maps to y=160)
          // for "right" side, GK near top, forward near center
          const px = (pos.x / 100) * 160 + 20
          let py: number
          if (side === 'left') {
            py = 280 - (pos.y / 100) * 140 // GK at bottom, FWD near center
          } else {
            py = 20 + (pos.y / 100) * 140 // GK at top, FWD near center
          }

          const isSelected = selectedSlot === slotIndex

          return (
            <g
              key={slotIndex}
              onClick={() => onSlotClick?.(slotIndex)}
              style={onSlotClick ? { cursor: 'pointer' } : undefined}
            >
              {/* Player circle */}
              <circle
                cx={px}
                cy={py}
                r="14"
                fill={primaryColor}
                stroke={isSelected ? '#FFD700' : secondaryColor}
                strokeWidth={isSelected ? 3 : 2}
              />
              {/* Number */}
              <text
                x={px}
                y={py}
                textAnchor="middle"
                dominantBaseline="central"
                fill={secondaryColor}
                fontSize="10"
                fontWeight="bold"
                fontFamily="system-ui"
              >
                {player?.number ?? '?'}
              </text>
              {/* Name */}
              {player && (
                <text
                  x={px}
                  y={py + 20}
                  textAnchor="middle"
                  fill="white"
                  fontSize="7"
                  fontFamily="system-ui"
                >
                  {player.name.length > 10 ? player.name.slice(0, 10) + '…' : player.name}
                </text>
              )}
              {/* Position label if no player */}
              {!player && (
                <text
                  x={px}
                  y={py + 20}
                  textAnchor="middle"
                  fill="#ffffff80"
                  fontSize="7"
                  fontFamily="system-ui"
                >
                  {pos.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/lineups/components/PitchView.tsx
git commit -m "feat: add PitchView SVG component for formation visualization"
```

---

### Task 11: LineupDisplay Component (Public Match Detail)

**Files:**
- Create: `src/modules/lineups/components/LineupDisplay.tsx`

- [ ] **Step 1: Create LineupDisplay component**

Create `src/modules/lineups/components/LineupDisplay.tsx`:

```tsx
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PitchView } from './PitchView'
import type { LineupData } from '../types'
import type { Formation } from '@/lib/formations'

interface LineupDisplayProps {
  homeLineup: LineupData | null
  awayLineup: LineupData | null
  homeKit?: { primaryColor: string; secondaryColor: string } | null
  awayKit?: { primaryColor: string; secondaryColor: string } | null
  homeTeamName?: string
  awayTeamName?: string
}

export function LineupDisplay({
  homeLineup,
  awayLineup,
  homeKit,
  awayKit,
  homeTeamName,
  awayTeamName,
}: LineupDisplayProps) {
  if (!homeLineup && !awayLineup) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Lineups not announced yet
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-2">
          {/* Home side */}
          <div className="border-r border-border">
            <div className="p-3 text-center border-b border-border">
              <p className="font-semibold text-sm">{homeTeamName ?? 'Home'}</p>
              {homeLineup && (
                <Badge variant="outline" className="mt-1">{homeLineup.formation}</Badge>
              )}
            </div>
            {homeLineup ? (
              <PitchView
                formation={homeLineup.formation as Formation}
                players={homeLineup.players.map((p) => ({
                  name: p.player.name,
                  number: p.player.number,
                  positionSlot: p.positionSlot,
                }))}
                primaryColor={homeKit?.primaryColor ?? '#FFFFFF'}
                secondaryColor={homeKit?.secondaryColor ?? '#000000'}
                side="left"
                className="aspect-[2/3]"
              />
            ) : (
              <div className="flex items-center justify-center aspect-[2/3] text-sm text-muted-foreground">
                Not announced
              </div>
            )}
          </div>

          {/* Away side */}
          <div>
            <div className="p-3 text-center border-b border-border">
              <p className="font-semibold text-sm">{awayTeamName ?? 'Away'}</p>
              {awayLineup && (
                <Badge variant="outline" className="mt-1">{awayLineup.formation}</Badge>
              )}
            </div>
            {awayLineup ? (
              <PitchView
                formation={awayLineup.formation as Formation}
                players={awayLineup.players.map((p) => ({
                  name: p.player.name,
                  number: p.player.number,
                  positionSlot: p.positionSlot,
                }))}
                primaryColor={awayKit?.primaryColor ?? '#FFFFFF'}
                secondaryColor={awayKit?.secondaryColor ?? '#000000'}
                side="right"
                className="aspect-[2/3]"
              />
            ) : (
              <div className="flex items-center justify-center aspect-[2/3] text-sm text-muted-foreground">
                Not announced
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/lineups/components/LineupDisplay.tsx
git commit -m "feat: add LineupDisplay component for match detail page"
```

---

### Task 12: LineupEditor Component (Captain)

**Files:**
- Create: `src/modules/lineups/components/LineupEditor.tsx`

- [ ] **Step 1: Create LineupEditor component**

Create `src/modules/lineups/components/LineupEditor.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lock, RotateCcw, Save } from 'lucide-react'
import { PitchView } from './PitchView'
import { FORMATIONS, FORMATION_LABELS } from '@/lib/formations'
import type { Formation } from '@/lib/formations'
import type { LineupData } from '../types'

interface SquadPlayer {
  id: string
  name: string
  number: number
  position: string
}

interface LineupEditorProps {
  matchId: string
  teamId: string
  squad: SquadPlayer[]
  existingLineup: LineupData | null
  isLocked: boolean
  kitColors?: { primaryColor: string; secondaryColor: string } | null
}

interface SlotAssignment {
  playerId: string
  positionSlot: number
}

export function LineupEditor({
  matchId,
  teamId,
  squad,
  existingLineup,
  isLocked,
  kitColors,
}: LineupEditorProps) {
  const [formation, setFormation] = useState<Formation>(
    (existingLineup?.formation as Formation) ?? '1-2-2-1'
  )
  const [assignments, setAssignments] = useState<SlotAssignment[]>(
    existingLineup?.players.map((p) => ({
      playerId: p.playerId,
      positionSlot: p.positionSlot,
    })) ?? []
  )
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const assignedPlayerIds = assignments.map((a) => a.playerId)
  const availablePlayers = squad.filter((p) => !assignedPlayerIds.includes(p.id))

  function handleSlotClick(slot: number) {
    if (isLocked) return
    // If slot already has a player, remove them
    const existing = assignments.find((a) => a.positionSlot === slot)
    if (existing) {
      setAssignments(assignments.filter((a) => a.positionSlot !== slot))
      return
    }
    setSelectedSlot(slot)
  }

  function handlePlayerClick(playerId: string) {
    if (isLocked || selectedSlot === null) return
    setAssignments([...assignments.filter((a) => a.positionSlot !== selectedSlot), { playerId, positionSlot: selectedSlot }])
    setSelectedSlot(null)
  }

  function handleReset() {
    setAssignments([])
    setSelectedSlot(null)
  }

  async function handleSave() {
    if (assignments.length !== 6) {
      toast.error('You must assign all 6 positions')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/matches/${matchId}/lineup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formation, players: assignments }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      toast.success('Lineup saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save lineup')
    } finally {
      setSaving(false)
    }
  }

  const pitchPlayers = assignments.map((a) => {
    const player = squad.find((p) => p.id === a.playerId)
    return {
      name: player?.name ?? '?',
      number: player?.number ?? 0,
      positionSlot: a.positionSlot,
    }
  })

  if (isLocked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Lineup Locked
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            The lineup is locked because the match has started.
          </p>
          <Badge variant="outline" className="mb-3">{formation}</Badge>
          <PitchView
            formation={formation}
            players={pitchPlayers}
            primaryColor={kitColors?.primaryColor}
            secondaryColor={kitColors?.secondaryColor}
            side="left"
            className="aspect-[2/3] max-w-sm mx-auto"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      {/* Pitch preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Formation & Positions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formation selector */}
          <div className="flex flex-wrap gap-2">
            {FORMATIONS.map((f) => (
              <Button
                key={f}
                variant={formation === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setFormation(f)
                  setAssignments([])
                  setSelectedSlot(null)
                }}
              >
                {f}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{FORMATION_LABELS[formation]}</p>

          {/* Pitch — click slots to assign/remove */}
          <div className="relative">
            <PitchView
              formation={formation}
              players={pitchPlayers}
              primaryColor={kitColors?.primaryColor}
              secondaryColor={kitColors?.secondaryColor}
              side="left"
              className="aspect-[2/3] max-w-sm mx-auto"
              onSlotClick={handleSlotClick}
              selectedSlot={selectedSlot}
            />
            {selectedSlot !== null && (
              <p className="text-center text-sm text-primary mt-2">
                Select a player from the squad to fill slot {selectedSlot}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving || assignments.length !== 6}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Saving...' : 'Save Lineup'}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {assignments.length}/6 positions filled. Click a position on the pitch to assign/remove a player.
          </p>
        </CardContent>
      </Card>

      {/* Squad list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Squad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 max-h-[500px] overflow-y-auto">
          {availablePlayers.length === 0 && assignments.length === 6 ? (
            <p className="text-sm text-muted-foreground">All positions filled</p>
          ) : selectedSlot === null ? (
            <p className="text-sm text-muted-foreground">Click a position on the pitch first</p>
          ) : null}
          {availablePlayers.map((player) => (
            <button
              key={player.id}
              onClick={() => handlePlayerClick(player.id)}
              disabled={selectedSlot === null}
              className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-secondary disabled:opacity-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary font-semibold text-xs">
                #{player.number}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{player.name}</p>
                <p className="text-xs text-muted-foreground">{player.position}</p>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/lineups/components/LineupEditor.tsx
git commit -m "feat: add LineupEditor component for captain lineup setup"
```

---

## Chunk 4: Voting System

### Task 13: Voting Module — Types, Queries, Actions

**Files:**
- Create: `src/modules/voting/types.ts`
- Create: `src/modules/voting/queries.ts`
- Create: `src/modules/voting/actions.ts`
- Create: `src/lib/fingerprint.ts`

- [ ] **Step 1: Create device fingerprint utility**

Create `src/lib/fingerprint.ts`:

```typescript
/**
 * Generate a simple device fingerprint client-side.
 * Not bulletproof but sufficient for casual anti-spam.
 */
export async function generateFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    screen.width + 'x' + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    screen.colorDepth?.toString() ?? '',
  ]

  const data = components.join('|')
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
```

- [ ] **Step 2: Create voting types**

Create `src/modules/voting/types.ts`:

```typescript
export interface VoteCounts {
  home: number
  draw: number
  away: number
  total: number
  userVote?: 'HOME' | 'DRAW' | 'AWAY' | null
}
```

- [ ] **Step 3: Create voting queries**

Create `src/modules/voting/queries.ts`:

```typescript
import prisma from '@/lib/db'
import type { VoteCounts } from './types'

export async function getVoteCounts(matchId: string, fingerprint?: string): Promise<VoteCounts> {
  const [home, draw, away, userVoteRecord] = await Promise.all([
    prisma.matchVote.count({ where: { matchId, vote: 'HOME' } }),
    prisma.matchVote.count({ where: { matchId, vote: 'DRAW' } }),
    prisma.matchVote.count({ where: { matchId, vote: 'AWAY' } }),
    fingerprint
      ? prisma.matchVote.findUnique({
          where: { matchId_deviceFingerprint: { matchId, deviceFingerprint: fingerprint } },
          select: { vote: true },
        })
      : null,
  ])

  return {
    home,
    draw,
    away,
    total: home + draw + away,
    userVote: (userVoteRecord?.vote as VoteCounts['userVote']) ?? null,
  }
}
```

- [ ] **Step 4: Create voting actions**

Create `src/modules/voting/actions.ts`:

```typescript
'use server'

import prisma from '@/lib/db'
import { voteSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'

export async function castVote(
  matchId: string,
  vote: string,
  fingerprint: string,
  ipAddress: string
) {
  const parsed = voteSchema.parse({ vote, fingerprint })

  // Check match exists and is not FULL_TIME
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { status: true },
  })

  if (!match) throw new Error('Match not found')
  if (match.status === 'FULL_TIME') throw new Error('Voting is closed for this match')

  // Check if device already voted
  const existing = await prisma.matchVote.findUnique({
    where: { matchId_deviceFingerprint: { matchId, deviceFingerprint: parsed.fingerprint } },
  })

  if (existing) {
    throw new Error('You have already voted on this match')
  }

  await prisma.matchVote.create({
    data: {
      matchId,
      vote: parsed.vote,
      ipAddress,
      deviceFingerprint: parsed.fingerprint,
    },
  })

  revalidatePath(`/matches/${matchId}`)
  return { success: true }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/fingerprint.ts src/modules/voting/
git commit -m "feat: add voting module with fingerprint utility, types, queries, and actions"
```

---

### Task 14: Vote API Route

**Files:**
- Create: `src/app/api/matches/[id]/vote/route.ts`

- [ ] **Step 1: Create vote API route**

Create `src/app/api/matches/[id]/vote/route.ts`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/matches/[id]/vote/route.ts
git commit -m "feat: add vote API route with fingerprint-based duplicate detection"
```

---

### Task 15: VotePanel Component

**Files:**
- Create: `src/modules/voting/components/VotePanel.tsx`

- [ ] **Step 1: Create VotePanel component**

Create `src/modules/voting/components/VotePanel.tsx`:

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { generateFingerprint } from '@/lib/fingerprint'
import type { VoteCounts } from '../types'

interface VotePanelProps {
  matchId: string
  homeTeamName: string
  awayTeamName: string
  isFinished: boolean
}

export function VotePanel({ matchId, homeTeamName, awayTeamName, isFinished }: VotePanelProps) {
  const [counts, setCounts] = useState<VoteCounts | null>(null)
  const [fingerprint, setFingerprint] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)

  const fetchCounts = useCallback(async (fp: string) => {
    const res = await fetch(`/api/matches/${matchId}/vote?fingerprint=${fp}`)
    if (res.ok) {
      setCounts(await res.json())
    }
  }, [matchId])

  useEffect(() => {
    generateFingerprint().then((fp) => {
      setFingerprint(fp)
      fetchCounts(fp)
    })
  }, [fetchCounts])

  async function handleVote(vote: 'HOME' | 'DRAW' | 'AWAY') {
    if (!fingerprint || voting) return
    setVoting(true)
    try {
      const res = await fetch(`/api/matches/${matchId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote, fingerprint }),
      })

      if (res.status === 409) {
        toast.info("You've already voted on this match")
        await fetchCounts(fingerprint)
        return
      }

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setCounts(await res.json())
      toast.success('Vote recorded!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to vote')
    } finally {
      setVoting(false)
    }
  }

  const hasVoted = counts?.userVote != null
  const total = counts?.total ?? 0

  function pct(n: number) {
    if (total === 0) return 0
    return Math.round((n / total) * 100)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fan Prediction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasVoted && !isFinished ? (
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={() => handleVote('HOME')}
              disabled={voting}
              className="flex flex-col py-4 h-auto"
            >
              <span className="text-xs text-muted-foreground">Home</span>
              <span className="font-semibold text-sm">{homeTeamName}</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleVote('DRAW')}
              disabled={voting}
              className="flex flex-col py-4 h-auto"
            >
              <span className="text-xs text-muted-foreground">Draw</span>
              <span className="font-semibold text-sm">X</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleVote('AWAY')}
              disabled={voting}
              className="flex flex-col py-4 h-auto"
            >
              <span className="text-xs text-muted-foreground">Away</span>
              <span className="font-semibold text-sm">{awayTeamName}</span>
            </Button>
          </div>
        ) : counts ? (
          <div className="space-y-3">
            {/* Results bars */}
            {[
              { label: homeTeamName, count: counts.home, vote: 'HOME' as const },
              { label: 'Draw', count: counts.draw, vote: 'DRAW' as const },
              { label: awayTeamName, count: counts.away, vote: 'AWAY' as const },
            ].map((item) => (
              <div key={item.vote}>
                <div className="flex justify-between text-sm mb-1">
                  <span className={counts.userVote === item.vote ? 'font-semibold text-primary' : ''}>
                    {item.label}
                  </span>
                  <span className="text-muted-foreground">{pct(item.count)}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      counts.userVote === item.vote ? 'bg-primary' : 'bg-muted-foreground/40'
                    }`}
                    style={{ width: `${pct(item.count)}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground text-center">
              {total} vote{total !== 1 ? 's' : ''}
              {hasVoted && ' — your vote is in!'}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/voting/components/VotePanel.tsx
git commit -m "feat: add VotePanel component with vote buttons and results bars"
```

---

## Chunk 5: Integration — Match Detail, Team Detail, Captain Panel

### Task 16: Update Match Queries to Include Lineups & Kits

**Files:**
- Modify: `src/modules/matches/queries.ts`

- [ ] **Step 1: Add lineup and kit includes to match queries**

In `src/modules/matches/queries.ts`, update `getMatchById` to include lineups and kits:

Add to the `include` block in `getMatchById` (after `cards`):

```typescript
      lineups: {
        include: {
          players: {
            include: {
              player: { select: { id: true, name: true, number: true, position: true } },
            },
            orderBy: { positionSlot: 'asc' as const },
          },
        },
      },
```

Also update the `homeTeam` and `awayTeam` includes in `getMatchById` to add kits:

```typescript
      homeTeam: {
        select: {
          ...teamWithPlayersSelect,
          kits: { where: { type: 'HOME' }, select: { primaryColor: true, secondaryColor: true, pattern: true } },
        },
      },
      awayTeam: {
        select: {
          ...teamWithPlayersSelect,
          kits: { where: { type: 'AWAY' }, select: { primaryColor: true, secondaryColor: true, pattern: true } },
        },
      },
```

- [ ] **Step 2: Update MatchWithEvents type**

In `src/modules/matches/types.ts`, add to `MatchWithEvents`:

```typescript
  lineups: Array<{
    id: string
    matchId: string
    teamId: string
    formation: string
    players: Array<{
      id: string
      playerId: string
      positionSlot: number
      player: { id: string; name: string; number: number; position: string }
    }>
  }>
```

Update the homeTeam/awayTeam types in `MatchWithEvents` to include:

```typescript
    kits: Array<{ primaryColor: string; secondaryColor: string; pattern: string }>
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/matches/queries.ts src/modules/matches/types.ts
git commit -m "feat: include lineups and kits in match detail queries and types"
```

---

### Task 17: Add Lineup & Voting to Match Detail Page

**Files:**
- Modify: `src/modules/matches/components/MatchDetail.tsx`

- [ ] **Step 1: Update MatchDetail component**

In `src/modules/matches/components/MatchDetail.tsx`, add imports:

```typescript
import { LineupDisplay } from '@/modules/lineups/components/LineupDisplay'
import { VotePanel } from '@/modules/voting/components/VotePanel'
```

Add a `lineups` section between the events timeline and the squad sections. Find the lineup data from the match prop:

```tsx
{/* After the events timeline card, before the squad grid */}

{/* Lineup visualization */}
{(() => {
  const homeLineup = match.lineups?.find((l) => l.teamId === match.homeTeam?.id) ?? null
  const awayLineup = match.lineups?.find((l) => l.teamId === match.awayTeam?.id) ?? null
  const homeKit = match.homeTeam?.kits?.[0] ?? null
  const awayKit = match.awayTeam?.kits?.[0] ?? null

  return (
    <LineupDisplay
      homeLineup={homeLineup}
      awayLineup={awayLineup}
      homeKit={homeKit}
      awayKit={awayKit}
      homeTeamName={match.homeTeam?.name ?? match.homePlaceholder ?? undefined}
      awayTeamName={match.awayTeam?.name ?? match.awayPlaceholder ?? undefined}
    />
  )
})()}

{/* Fan voting */}
{match.homeTeam && match.awayTeam && (
  <VotePanel
    matchId={match.id}
    homeTeamName={match.homeTeam.name}
    awayTeamName={match.awayTeam.name}
    isFinished={match.status === 'FULL_TIME'}
  />
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/matches/components/MatchDetail.tsx
git commit -m "feat: add lineup visualization and voting panel to match detail page"
```

---

### Task 18: Update Team Queries & Detail to Include Kits

**Files:**
- Modify: `src/modules/teams/queries.ts`
- Modify: `src/modules/teams/types.ts`
- Modify: `src/modules/teams/components/TeamDetail.tsx`

- [ ] **Step 1: Update team types**

In `src/modules/teams/types.ts`, add to `TeamWithPlayers`:

```typescript
  kits: Array<{
    id: string
    type: 'HOME' | 'AWAY'
    primaryColor: string
    secondaryColor: string
    pattern: string
  }>
  defaultFormation: string
```

- [ ] **Step 2: Update team queries**

In `src/modules/teams/queries.ts`, find `getTeamWithPlayersAndMatches` (or whichever query the team detail page uses) and add to the include/select:

```typescript
  kits: {
    select: { id: true, type: true, primaryColor: true, secondaryColor: true, pattern: true },
  },
```

Also select `defaultFormation: true` in the team fields.

- [ ] **Step 3: Add kit display to TeamDetail**

In `src/modules/teams/components/TeamDetail.tsx`, import KitPreview:

```typescript
import { KitPreview } from '@/modules/kits/components/KitPreview'
```

Add a kit display section in the team header area (after team description, before stats):

```tsx
{/* Kit display */}
{team.kits && team.kits.length > 0 && (
  <div className="flex gap-4 mt-4">
    {team.kits.map((kit) => (
      <div key={kit.id} className="text-center">
        <KitPreview
          primaryColor={kit.primaryColor}
          secondaryColor={kit.secondaryColor}
          pattern={kit.pattern as 'SOLID' | 'STRIPES' | 'CHECKERED' | 'GRADIENT'}
          size={80}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {kit.type === 'HOME' ? 'Home' : 'Away'}
        </p>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 4: Enhance captain highlight and squad section in TeamDetail**

In `src/modules/teams/components/TeamDetail.tsx`:

Ensure the captain name is shown prominently with a badge:
```tsx
{team.captain && (
  <div className="flex items-center gap-2 mt-2">
    <Badge variant="secondary" className="gap-1">
      <span className="text-xs">Captain:</span>
      <span className="font-semibold">{team.captain.username}</span>
    </Badge>
  </div>
)}
```

In the squad/roster section, highlight the captain player (if the captain user has a matching player entry) by checking if the player name matches. Also ensure number and position are shown prominently in each player card.

- [ ] **Step 5: Commit**

```bash
git add src/modules/teams/queries.ts src/modules/teams/types.ts src/modules/teams/components/TeamDetail.tsx
git commit -m "feat: add kit display and captain highlight to team detail page"
```

---

### Task 19: Captain Sidebar & Dashboard Updates

**Files:**
- Modify: `src/components/layout/CaptainSidebar.tsx`
- Modify: `src/app/captain/page.tsx`

- [ ] **Step 1: Add new nav items to CaptainSidebar**

In `src/components/layout/CaptainSidebar.tsx`, update the imports to add icons:

```typescript
import {
  LayoutDashboard,
  Users,
  Camera,
  LogOut,
  Menu,
  User,
  Shirt,
  Calendar,
} from "lucide-react"
```

Update `navItems` array:

```typescript
const navItems = [
  { href: "/captain", label: "Dashboard", icon: LayoutDashboard },
  { href: "/captain/team", label: "My Team", icon: Users },
  { href: "/captain/players", label: "Player Photos", icon: Camera },
  { href: "/captain/kits", label: "Kits", icon: Shirt },
  { href: "/captain/matches", label: "Matches", icon: Calendar },
]
```

- [ ] **Step 2: Add action cards to dashboard**

In `src/app/captain/page.tsx`, add Shirt and Calendar to imports:

```typescript
import { Users, Camera, Calendar, Trophy, TrendingUp, Shirt } from "lucide-react"
```

Add two more action cards in the grid (after "Manage Player Photos"):

```tsx
        <Card>
          <CardContent className="flex items-center gap-4 py-6">
            <div className="rounded-full bg-primary/10 p-3">
              <Shirt className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Team Kits</h3>
              <p className="text-sm text-muted-foreground">Design home and away kits</p>
            </div>
            <Button asChild>
              <Link href="/captain/kits">Design</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-6">
            <div className="rounded-full bg-primary/10 p-3">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Match Center</h3>
              <p className="text-sm text-muted-foreground">View matches and set lineups</p>
            </div>
            <Button asChild>
              <Link href="/captain/matches">View</Link>
            </Button>
          </CardContent>
        </Card>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/CaptainSidebar.tsx src/app/captain/page.tsx
git commit -m "feat: add Kits and Matches nav items to captain sidebar and dashboard"
```

---

### Task 20: Captain Kits Page

**Files:**
- Create: `src/app/captain/kits/page.tsx`

- [ ] **Step 1: Create captain kits page**

Create `src/app/captain/kits/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { PageHeader } from '@/components/common/PageHeader'
import { KitEditor } from '@/modules/kits/components/KitEditor'
import type { KitData } from '@/modules/kits/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function CaptainKitsPage() {
  const [teamId, setTeamId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((user) => setTeamId(user.teamId))
  }, [])

  const { data: kits, mutate } = useSWR<KitData[]>(
    teamId ? `/api/kits?teamId=${teamId}` : null,
    fetcher
  )

  if (!teamId) return null

  const homeKit = kits?.find((k) => k.type === 'HOME') ?? null
  const awayKit = kits?.find((k) => k.type === 'AWAY') ?? null

  async function handleSave(data: {
    teamId: string
    type: 'HOME' | 'AWAY'
    primaryColor: string
    secondaryColor: string
    pattern: 'SOLID' | 'STRIPES' | 'CHECKERED' | 'GRADIENT'
  }) {
    await fetch('/api/kits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    mutate()
  }

  return (
    <div>
      <PageHeader
        title="Team Kits"
        description="Design your home and away kits"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <KitEditor teamId={teamId} type="HOME" kit={homeKit} onSave={handleSave} />
        <KitEditor teamId={teamId} type="AWAY" kit={awayKit} onSave={handleSave} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/captain/kits/page.tsx
git commit -m "feat: add captain kits page with home and away kit editors"
```

---

### Task 21: Captain Matches Page

**Files:**
- Create: `src/app/captain/matches/page.tsx`

- [ ] **Step 1: Create captain matches page**

Create `src/app/captain/matches/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/db'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/PageHeader'
import { ClipboardList } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CaptainMatchesPage() {
  const session = await getSession()
  if (!session || !session.teamId) redirect('/login')

  const teamId = session.teamId

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    include: {
      homeTeam: { select: { id: true, name: true, shortName: true } },
      awayTeam: { select: { id: true, name: true, shortName: true } },
      lineups: { where: { teamId }, select: { id: true } },
    },
    orderBy: { matchDate: 'asc' },
  })

  const upcoming = matches.filter((m) => m.status === 'SCHEDULED')
  const live = matches.filter((m) => ['FIRST_HALF', 'HALF_TIME', 'SECOND_HALF'].includes(m.status))
  const completed = matches.filter((m) => m.status === 'FULL_TIME')

  function MatchRow({ match }: { match: typeof matches[0] }) {
    const isHome = match.homeTeamId === teamId
    const opponent = isHome ? match.awayTeam : match.homeTeam
    const hasLineup = match.lineups.length > 0
    const isScheduled = match.status === 'SCHEDULED'

    return (
      <Card key={match.id}>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Badge variant={isHome ? 'default' : 'outline'}>
              {isHome ? 'HOME' : 'AWAY'}
            </Badge>
            <div>
              <p className="font-medium">
                vs {opponent?.name ?? match.homePlaceholder ?? match.awayPlaceholder ?? 'TBD'}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(match.matchDate), "MMM d, yyyy 'at' HH:mm")}
                {' · '}
                {match.stage.replaceAll('_', ' ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {match.status === 'FULL_TIME' && (
              <span className="font-mono font-bold text-sm">
                {match.homeScore} - {match.awayScore}
              </span>
            )}
            {hasLineup && (
              <Badge variant="outline" className="text-xs">Lineup set</Badge>
            )}
            {isScheduled && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/captain/matches/${match.id}/lineup`}>
                  <ClipboardList className="h-4 w-4 mr-1" />
                  Lineup
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <PageHeader
        title="Match Center"
        description="View your matches and manage lineups"
      />

      {live.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Badge className="bg-red-500">Live</Badge>
          </h2>
          <div className="space-y-3">
            {live.map((match) => <MatchRow key={match.id} match={match} />)}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">Upcoming</h2>
          <div className="space-y-3">
            {upcoming.map((match) => <MatchRow key={match.id} match={match} />)}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">Completed</h2>
          <div className="space-y-3">
            {completed.map((match) => <MatchRow key={match.id} match={match} />)}
          </div>
        </div>
      )}

      {matches.length === 0 && (
        <p className="text-muted-foreground mt-6">No matches scheduled for your team yet.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/captain/matches/page.tsx
git commit -m "feat: add captain match center page with lineup status"
```

---

### Task 22: Captain Lineup Setup Page

**Files:**
- Create: `src/app/captain/matches/[id]/lineup/page.tsx`

- [ ] **Step 1: Create captain lineup page**

Create `src/app/captain/matches/[id]/lineup/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/db'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/PageHeader'
import { ArrowLeft } from 'lucide-react'
import { LineupEditor } from '@/modules/lineups/components/LineupEditor'
import { getLineup } from '@/modules/lineups/queries'
import { getKit } from '@/modules/kits/queries'

export const dynamic = 'force-dynamic'

export default async function CaptainLineupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: matchId } = await params
  const session = await getSession()
  if (!session || !session.teamId) redirect('/login')

  const teamId = session.teamId

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { select: { id: true, name: true, shortName: true } },
      awayTeam: { select: { id: true, name: true, shortName: true } },
    },
  })

  if (!match) redirect('/captain/matches')

  // Verify team is in this match
  if (match.homeTeamId !== teamId && match.awayTeamId !== teamId) {
    redirect('/captain/matches')
  }

  const isHome = match.homeTeamId === teamId
  const opponent = isHome ? match.awayTeam : match.homeTeam
  const isLocked = match.status !== 'SCHEDULED'

  // Get squad
  const players = await prisma.player.findMany({
    where: { teamId },
    orderBy: { number: 'asc' },
    select: { id: true, name: true, number: true, position: true },
  })

  // Get existing lineup
  const existingLineup = await getLineup(matchId, teamId)

  // Get kit for preview
  const kitType = isHome ? 'HOME' : 'AWAY'
  const kit = await getKit(teamId, kitType)

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/captain/matches">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Matches
          </Link>
        </Button>
      </div>

      <PageHeader
        title={`Lineup: vs ${opponent?.name ?? 'TBD'}`}
        description={isLocked ? 'Match has started — lineup is locked' : 'Select your formation and assign players'}
      />

      <div className="mt-6">
        <LineupEditor
          matchId={matchId}
          teamId={teamId}
          squad={players}
          existingLineup={existingLineup}
          isLocked={isLocked}
          kitColors={kit ? { primaryColor: kit.primaryColor, secondaryColor: kit.secondaryColor } : null}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/captain/matches/[id]/lineup/page.tsx
git commit -m "feat: add captain lineup setup page"
```

---

### Task 23: Captain Team Page — Add Default Formation

**Files:**
- Modify: `src/app/captain/team/page.tsx`

- [ ] **Step 1: Add default formation selector**

In `src/app/captain/team/page.tsx`, add a formation selector section. This page is a client component using SWR. Add a formation dropdown that saves via PUT to `/api/teams/[id]`.

Import the formations:
```typescript
import { FORMATIONS, FORMATION_LABELS } from '@/lib/formations'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
```

Add a section after the existing team form for default formation:

```tsx
{/* Default Formation */}
<Card className="mt-6">
  <CardHeader>
    <CardTitle className="text-base">Default Formation</CardTitle>
  </CardHeader>
  <CardContent>
    <Label htmlFor="defaultFormation">Used when no lineup is set before a match</Label>
    <Select
      value={team.defaultFormation ?? '1-2-2-1'}
      onValueChange={async (value) => {
        await fetch(`/api/teams/${teamId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ defaultFormation: value }),
        })
        mutate()
        toast.success('Default formation updated')
      }}
    >
      <SelectTrigger id="defaultFormation" className="mt-2">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FORMATIONS.map((f) => (
          <SelectItem key={f} value={f}>{FORMATION_LABELS[f]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </CardContent>
</Card>
```

Note: The team API PUT endpoint (`src/app/api/teams/[id]/route.ts`) needs to accept `defaultFormation` — add it to the update logic if not already present.

- [ ] **Step 2: Update team API to accept defaultFormation**

In `src/app/api/teams/[id]/route.ts`, in the PUT handler, add with validation:

```typescript
import { FORMATIONS } from '@/lib/formations'

// Inside the PUT handler, before applying updates:
if (body.defaultFormation !== undefined) {
  if (!FORMATIONS.includes(body.defaultFormation)) {
    return NextResponse.json({ error: 'Invalid formation' }, { status: 400 })
  }
  updateData.defaultFormation = body.defaultFormation
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/captain/team/page.tsx src/app/api/teams/[id]/route.ts
git commit -m "feat: add default formation selector to captain team page"
```

---

### Task 24: Final Integration Testing

- [ ] **Step 1: Run Prisma migration and generate**

```bash
npx prisma migrate dev --name team_features
npx prisma generate
```

- [ ] **Step 2: Start dev server and verify**

```bash
npm run dev
```

Verify these pages load without errors:
- `/captain` — dashboard with new action cards (Kits, Matches)
- `/captain/kits` — kit editor with color pickers and pattern selector
- `/captain/matches` — match center with lineup buttons
- `/captain/matches/[id]/lineup` — lineup editor with formation selector
- `/captain/team` — default formation selector
- `/matches/[id]` — match detail with lineup visualization and voting panel
- `/teams/[id]` — team detail with kit display

- [ ] **Step 3: Test lineup flow**

1. As captain, go to `/captain/matches` → click "Lineup" on a scheduled match
2. Select a formation → assign 6 players → save
3. View match detail page — lineup should appear on pitch visualization
4. Start the match (as admin) — lineup should lock
5. For a match with no lineup, start it — auto-fill should create one

- [ ] **Step 4: Test voting flow**

1. Open match detail page as anonymous user
2. Click a vote button (Home/Draw/Away)
3. See results bars appear
4. Try voting again — should see "already voted" message
5. Open in different browser — should allow voting again

- [ ] **Step 5: Test kit flow**

1. As captain, go to `/captain/kits`
2. Set colors and pattern for home/away kits
3. Save — preview should update
4. View team detail page — kits should appear
5. View match lineup — player circles should use kit colors

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration fixes for team features"
```
