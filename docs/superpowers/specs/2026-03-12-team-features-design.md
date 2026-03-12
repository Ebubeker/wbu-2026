# Team Features Design Spec

**Date:** 2026-03-12
**Status:** Approved
**Scope:** Match Lineups, Team Kits, Fan Voting, Enhanced Captain Panel

## Overview

Four interconnected subsystems to enhance team management in the WBU 2026 Championship app:

1. **Match Lineups** — 6v6 formation-based lineup system managed by captains
2. **Team Kits** — Home/Away kit designer with colors and patterns
3. **Fan Voting** — Anonymous match predictions with anti-spam measures
4. **Enhanced Captain Panel** — Full team management dashboard for captains

## Data Model

### New Enums

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

### New Models

#### Kit

```prisma
model Kit {
  id             String     @id @default(uuid())
  team           Team       @relation(fields: [teamId], references: [id], onDelete: Cascade)
  teamId         String
  type           KitType
  primaryColor   String     // hex, e.g. "#FF0000"
  secondaryColor String     // hex
  pattern        KitPattern @default(SOLID)
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  @@unique([teamId, type])
}
```

One home kit and one away kit per team. Constraint enforced at DB level.

#### Lineup

```prisma
model Lineup {
  id        String         @id @default(uuid())
  match     Match          @relation(fields: [matchId], references: [id], onDelete: Cascade)
  matchId   String
  team      Team           @relation(fields: [teamId], references: [id], onDelete: Cascade)
  teamId    String
  formation String         // e.g. "1-2-2-1"
  players   LineupPlayer[]
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  @@unique([matchId, teamId])
}
```

One lineup per team per match. Formation stored as a string from predefined options.

#### LineupPlayer

```prisma
model LineupPlayer {
  id           String   @id @default(uuid())
  lineup       Lineup   @relation(fields: [lineupId], references: [id], onDelete: Cascade)
  lineupId     String
  player       Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)
  playerId     String
  positionSlot Int      // 0-5, maps to formation position on the pitch
  createdAt    DateTime @default(now())

  @@unique([lineupId, positionSlot])
  @@unique([lineupId, playerId])
}
```

Each of the 6 slots maps to a position on the pitch based on the formation.

#### MatchVote

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

One vote per device per match. Same IP with different fingerprints is allowed (shared networks).

### Modified Models

- **Team**: add `kits Kit[]`, `lineups Lineup[]`, `defaultFormation String @default("1-2-2-1")`
- **Match**: add `lineups Lineup[]`, `votes MatchVote[]`
- **Player**: add `lineupEntries LineupPlayer[]`

## 1. Match Lineup System

### Format

6v6 (6 players per team, including goalkeeper).

### Predefined Formations (app-level constant)

| Formation | Layout |
|-----------|--------|
| `1-2-2-1` | 1 GK, 2 DEF, 2 MID, 1 FWD |
| `1-1-3-1` | 1 GK, 1 DEF, 3 MID, 1 FWD |
| `1-3-1-1` | 1 GK, 3 DEF, 1 MID, 1 FWD |
| `1-2-1-2` | 1 GK, 2 DEF, 1 MID, 2 FWD |

### Position Slot Mapping

Each formation defines where the 6 slots appear on the pitch visualization:

```
Slot 0: Always GK (back of team's half)
Slots 1-N: Formation-dependent middle rows
Last slot: Furthest forward (closest to center line)
```

Example for `1-2-2-1`:
```
        [Slot 5]        <- FWD
     [Slot 3] [Slot 4]  <- MID
     [Slot 1] [Slot 2]  <- DEF
        [Slot 0]        <- GK
```

### Captain Lineup Flow

1. Captain navigates to `/captain/matches` and sees list of upcoming matches
2. Clicks a match to open `/captain/matches/[id]/lineup`
3. **Step 1:** Picks a formation from the 4 visual options
4. **Step 2:** Assigns players from their squad into the 6 formation slots (click player, click slot)
5. **Step 3:** Saves — can return and edit freely
6. Once match status changes from `SCHEDULED` to `FIRST_HALF`, lineup locks (read-only, no edit button)

### Who Can Set Lineups

Only the team captain via the captain panel. Admins cannot set or override lineups.

### Lineup Validation

- Lineups can only be created for matches where the team is assigned (`homeTeamId` or `awayTeamId` matches the captain's team)
- Matches with placeholder teams (knockout rounds before resolution) do not allow lineup creation
- The captain's match list only shows matches where their team is assigned

### Default Lineup (Auto-fill)

When a match goes live and no lineup was set:
- Use the team's `defaultFormation` field (defaults to `1-2-2-1`)
- Select the first 6 players ordered by shirt number ascending
- Assign to slots in order: slot 0 (lowest number) through slot 5 (6th lowest number)
- Auto-create `Lineup` + `LineupPlayer` records when match starts

### Lineup Locking

- Captain can edit freely while match status is `SCHEDULED`
- Once match transitions to `FIRST_HALF` (match goes live), lineup is locked
- Locked lineups display a "Locked" indicator, no edit controls shown

### Lineup Visualization

Displayed on the **public match detail page**:
- Green pitch background with field markings (SVG/CSS)
- Home team on the left half, away team on the right half
- Player circles at formation positions showing shirt number
- Player name below each circle
- Kit colors applied (primary fill, secondary border/number color)
- Formation label shown per team (e.g. "1-2-2-1")
- If no lineup exists, show "Lineup not announced" placeholder

Also visible in the captain's lineup setup page as a live preview.

## 2. Kit System

### Kit Management

- Each team has 2 kits: Home and Away
- Captains create/edit kits from `/captain/kits`
- Fields: primary color (hex color picker), secondary color (hex color picker), pattern (dropdown)
- Default kit if none created: white (`#FFFFFF`) primary, black (`#000000`) secondary, `SOLID` pattern

### Kit Preview Component

An SVG jersey component that renders the kit visually:
- **SOLID**: primary color fill
- **STRIPES**: vertical alternating stripes of primary and secondary
- **CHECKERED**: checkerboard grid of primary and secondary
- **GRADIENT**: top-to-bottom gradient from primary to secondary
- Player number rendered centered on the chest in contrasting color (secondary for solid/stripes/checkered, primary for gradient)

Used in:
- Captain kit editor (large preview)
- Lineup visualization (player circles with kit colors)
- Team detail page (kit display in header area)

### Kit Selection for Matches

Automatic, no manual selection:
- Home team wears Home kit
- Away team wears Away kit
- Missing kit falls back to default (white/black solid)

## 3. Fan Voting / Match Predictions

### Voting UI

Shown on the public match detail page, below match info:
- Three vote buttons: **Home Win** | **Draw** | **Away Win** (showing team names)
- After voting, buttons show live percentage breakdown (e.g., "45% | 20% | 35%")
- Bar chart visualization of vote distribution
- Total vote count displayed

### Voting Availability

- Open: as soon as the match is visible on the site
- Closed: when match reaches `FULL_TIME` status
- Fans can vote during live matches

### Anti-Spam Strategy

- **Device fingerprint**: generated client-side by hashing user agent + screen resolution + timezone + language
- **IP address**: captured server-side from request headers (`x-forwarded-for`)
- **Unique constraint**: `@@unique([matchId, deviceFingerprint])` prevents duplicate votes from same device
- **Same IP allowed**: different devices on the same network can each vote
- **Duplicate handling**: return friendly "You've already voted" message + show current results
- Not bulletproof, but sufficient for a fun tournament

### API Endpoints

- `POST /api/matches/[id]/vote` — body: `{ vote: "HOME" | "DRAW" | "AWAY", fingerprint: string }`, server captures IP
- `GET /api/matches/[id]/vote?fingerprint=xxx` — returns `{ home: number, draw: number, away: number, total: number, userVote?: string }`

## 4. Enhanced Captain Panel

### Page Structure

| Route | Purpose |
|-------|---------|
| `/captain` | Dashboard — overview with quick links |
| `/captain/team` | Team info (existing, enhanced with default formation) |
| `/captain/players` | Squad management — add/remove/edit players |
| `/captain/kits` | Kit manager — create/edit Home and Away kits |
| `/captain/matches` | Match center — all team matches with details |
| `/captain/matches/[id]/lineup` | Lineup setup for a specific match |

### `/captain` — Dashboard

- Team name, group, upcoming matches count, squad size
- Quick link cards to: Team Info, Squad, Kits, Matches

### `/captain/team` — Team Info (Enhanced)

- Existing: name, short name, description, logo upload
- New: default formation selector (dropdown of 4 formations with visual preview)

### `/captain/players` — Squad Management

- Table of all players with: photo, name, number, position
- Add new player (name, number, position)
- Edit player number and position
- Remove players
- Bulk import (reuse existing BulkPlayerImport component from admin)

### `/captain/kits` — Kit Manager

- Two sections: Home Kit and Away Kit
- Each section: color pickers (primary + secondary), pattern selector
- Live jersey SVG preview for each kit
- Save button per kit

### `/captain/matches` — Match Center

- List of all team matches grouped by status (upcoming, live, completed)
- Each row: opponent name/placeholder, date, stage, status, score
- Click to expand/navigate: see goals, cards, lineup status

### `/captain/matches/[id]/lineup` — Lineup Setup

- Formation picker: 4 visual options showing pitch layout
- Squad list sidebar: all players with number and position
- Pitch visualization: click a player from squad, click a slot to assign
- Save and Reset buttons
- Locked state: read-only view with "Lineup locked" message when match is live

## 5. Public Team Detail Enhancements

Additions to the existing `/teams/[id]` page:
- **Kit display**: Home and Away kit previews in team header area
- **Captain highlight**: captain name with badge icon, more prominent
- **Squad section**: position and number shown prominently, captain player highlighted
- **Match history**: lineup indicator for matches with lineups set
- **Voting results**: fan prediction percentages shown per match if votes exist

## Technical Notes

- All new server actions follow existing pattern (`'use server'` + `revalidatePath`)
- New API routes follow existing REST pattern
- SWR for client-side data fetching (consistent with existing captain pages)
- Zod validation for all new inputs
- Lineup auto-fill logic runs in the match status transition action (existing `updateMatchStatus`)
- Device fingerprint generated client-side using a lightweight hash function (no external library)
