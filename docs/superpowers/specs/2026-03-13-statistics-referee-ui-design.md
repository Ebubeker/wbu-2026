# Statistics, Detail Pages & Referee Match Management — Design Spec

## Overview

Add public statistics, group/player detail pages, enhanced team detail pages, and a mobile-first referee match management UI with auto-timer and step-based event entry.

---

## 1. Database Changes

### Match table additions
- `timerStartedAt` (DateTime, nullable) — timestamp when the current half's timer was started
- `timerPausedAt` (DateTime, nullable) — timestamp when timer was paused (null if running)
- `pausedElapsed` (Int, default 0) — accumulated paused milliseconds for current half

**Current minute calculation (derived, not stored):**
```
if timerPausedAt:
  elapsed = timerPausedAt - timerStartedAt - pausedElapsed
else if timerStartedAt:
  elapsed = now - timerStartedAt - pausedElapsed
else:
  elapsed = 0

currentMinute = floor(elapsed / 60000)
// Clamp to 0–30 per half. Add 30 if SECOND_HALF.
```

**`matchMinute` field (existing):** Kept as a snapshot. Timer actions (`startTimer`, `pauseTimer`, `resumeTimer`, status changes) update `matchMinute` as a side effect so that server-rendered pages and SSE broadcasts always have an approximate minute without needing client-side timer JS.

### Timer idempotency & safety
- `pauseTimer` is a no-op if `timerPausedAt` is already set (prevents double-tap issues)
- `resumeTimer` is a no-op if `timerPausedAt` is null
- Server timestamps are authoritative — client only computes display time from server-provided values
- If referee closes browser and returns, timer state is fully recoverable from DB fields

### Timer reset between halves
- **Half Time transition:** `timerStartedAt = null`, `timerPausedAt = null`, `pausedElapsed = 0`
- **Start 2nd Half:** `timerStartedAt = now`, `pausedElapsed = 0`
- Each half starts with a clean timer slate

### Database indexes (new)
- `Goal: @@index([playerId])` — for top scorer queries
- `Goal: @@index([teamId])` — for team goal stats
- `Card: @@index([playerId])` — for most carded player queries
- `Card: @@index([teamId])` — for team card stats

### No other schema changes needed
Goals, cards, players, teams, groups — all existing tables have the fields required for statistics. We just need new queries.

---

## 2. Referee Match Management (Mobile-First)

### Route
`/admin/matches/[id]/live` — existing route, **redesigned** for mobile.

### Main Screen (when match is SCHEDULED)
- **Scoreboard** — team logos/names, large and centered
- **Prominent "Start Match" button** — full-width, tall, green, impossible to miss. This is the primary call-to-action. No scrolling required to find it.
- **Match info** below (date, venue, lineups if submitted)

### Main Screen (when match is LIVE — FIRST_HALF, HALF_TIME, SECOND_HALF)
- **Large timer** at top center — auto-counting, derived from `timerStartedAt`
- **Match status badge** (FIRST_HALF, HALF_TIME, SECOND_HALF)
- **Scoreboard** — team logos/names + score, large and centered
- **"ACTION" button** — single large rectangular button, full-width, prominent. This is the only action entry point.
- **Status control button** — context-aware: "Half Time" / "Start 2nd Half" / "Full Time" (below the action button, secondary style)
- **Event timeline** — scrollable list of goals/cards below, each with delete/edit icons
- **Pause/Resume timer** button (small, secondary)

### Main Screen (when FULL_TIME)
- **Scoreboard** with final score
- **"Match Ended"** label
- **Reopen Match** button (secondary)
- **Event timeline** (read-only, no delete/edit)

### Action Flow — Step-by-Step Full Views

Tapping the **"ACTION"** button replaces the entire view with a choice screen:

**Action Choice View:**
- **"Goal"** — large box/card at the top half of the screen
- **"Card"** — large box/card at the bottom half of the screen
- **Back/X** button to return to main screen

**Goal Flow (each step is a full view replacement, not an overlay):**
1. **View 1: Which team?** — Two large cards showing team name + logo (Home / Away). Also an "Own Goal" toggle at bottom. "Which team scored?" means **which team benefits from the goal**.
2. **View 2: Which player?** — Scrollable list of player cards from that team's **lineup** (number + name displayed as cards, not a dropdown). If own goal is toggled, show the **other team's lineup** instead. Falls back to full squad if no lineup exists.
3. **Selecting a player immediately saves the event** — no confirm step. A success toast appears and the view returns to the main screen.

**Card Flow (each step is a full view replacement):**
1. **View 1: Card type?** — Two large cards: Yellow and Red (top/bottom layout)
2. **View 2: Which team?** — Two large team cards
3. **View 3: Which player?** — Scrollable list of player cards from that team's lineup (falls back to full squad if no lineup)
4. **Selecting a player immediately saves the event** — no confirm step. Toast + return to main.

**Data model mapping:** When own goal is toggled, the wizard sets `teamId` to the player's actual team and `isOwnGoal = true`. The existing `recalculateScores` logic then credits the benefiting team correctly.

### Step View UX Details
- Each step **replaces the entire view** (not an overlay/modal) — feels like navigating between pages
- **Back arrow** (top-left) to go to previous step
- **Step indicator** at top (e.g., "Step 1 of 3")
- **No dropdowns anywhere** — all options are visible as tappable cards/list items
- Tapping a card **auto-advances** to next step (no separate "Next" button)
- Selecting a player on the final step **immediately saves** (no confirm screen). Minute is auto-captured from the timer.
- For late/manual entries: accessible from the event timeline via an "Edit" action, where minute can be adjusted

### Timer Behavior
- **Start Match** → sets `timerStartedAt = now`, status → FIRST_HALF
- Timer counts up from 0:00 to 30:00
- At 30:00, timer stops but referee must manually tap "Half Time" (status → HALF_TIME, `timerStartedAt = null`)
- **Start 2nd Half** → sets `timerStartedAt = now`, status → SECOND_HALF
- Timer counts 30:00 to 60:00 (display adds 30 to elapsed)
- At 60:00 (30 min elapsed in 2nd half), timer stops, referee taps "Full Time"
- **Pause/Resume** — sets `timerPausedAt` / clears it and accumulates elapsed pause time
- Timer runs client-side using the stored timestamps — no server polling needed for display

### Event Timeline
- Chronological list of all goals and cards
- Each entry: icon (⚽/🟨/🟥) + minute + player name + team
- Swipe left or tap to reveal delete/edit actions
- Edit opens the wizard pre-filled with existing data

### Auto-lineup on match start
- Existing behavior: auto-fills lineups with first 6 players if no lineup submitted
- No changes needed

---

## 3. Public Statistics Page

### Route
`/(public)/statistics` — new page, added to header navigation.

### Sections

**Competition Overview**
- Total matches played / scheduled
- Total goals scored
- Total cards (yellow + red)
- Average goals per match

**Top Scorers**
- Table: rank, player name (linked), team (linked), goals count
- Top 10 by default, expandable

**Most Carded Players**
- Table: rank, player name (linked), team (linked), yellow cards, red cards, total
- Top 10

**Team Rankings**
- Table: rank, team name (linked), matches played, wins, draws, losses, GF, GA, GD, points
- Sorted by points → GD → GF (same as standings logic but across all stages)
- Includes a "form" column showing last 5 results (W/D/L badges)

**Match Records**
- Biggest win (match linked)
- Highest scoring match (match linked)
- Most goals by a single player in a match

---

## 4. Group Detail Page

### Route
`/(public)/groups/[id]` — new page.

### Content
- **Group name** as page title
- **Standings table** — full standings with W/D/L/GF/GA/GD/Pts (reuse existing StandingsTable component)
- **Group matches** — all matches in this group, grouped by date, with scores and status (reuse MatchCard)
- **Group statistics:**
  - Total goals in group
  - Top scorer in group (player linked)
  - Most carded player in group

### Navigation
- Link from `/standings` page — each group name becomes clickable
- Link from team detail pages

---

## 5. Player Detail Page

### Route
`/(public)/players/[id]` — new page.

### Content
- **Player header** — photo, name, shirt number, position badge, team name (linked)
- **Stats summary cards** — goals, yellow cards, red cards, matches played
- **Match history** — list of matches the player appeared in (from lineup entries), showing:
  - Date, opponent, score, result (W/D/L)
  - Events in that match (goals scored, cards received) with minute

### Navigation
- Player names link to this page from: team detail, match detail, statistics page, group detail

---

## 6. Enhanced Team Detail Page

### Route
`/(public)/teams/[id]` — existing page, **enhanced** with statistics tab/section.

### Additions
- **Stats section** (below or as tab alongside existing content):
  - Record: W-D-L, total points
  - Goals: scored, conceded, difference
  - Cards: yellow, red
  - Form: last 5 match results
  - Top scorer on the team
  - Clean sheets count
- **Player names** in squad list become links to player detail pages

---

## 7. Navigation Updates

### Public Header
- Add "Statistics" link to navigation — replaces "Bracket" in the mobile bottom nav (5-item limit). Bracket remains accessible from desktop header and standings page.
- Add "Groups" dropdown or link (if not already present)

### Linking Strategy
All player names, team names, and group names become clickable links throughout the app:
- Match detail → player names in timeline/lineups link to `/players/[id]`
- Match detail → team names link to `/teams/[id]`
- Statistics page → all names are links
- Standings → group names link to `/groups/[id]`
- Team detail → player names link to `/players/[id]`

---

## 8. New Queries Needed

### Statistics module (`src/modules/statistics/`)
- `getCompetitionStats()` — aggregate stats across all matches
- `getTopScorers(limit)` — players ranked by goal count
- `getMostCardedPlayers(limit)` — players ranked by card count
- `getTeamRankings()` — all teams ranked by points/GD/GF across all stages (distinct from per-group standings; uses a separate `calculateOverallRankings` utility)
- `getMatchRecords()` — biggest win, highest scoring, etc.
- `getTeamStats(teamId)` — W/D/L, goals, cards, form for one team
- `getPlayerStats(playerId)` — goals, cards, matches for one player
- `getGroupStats(groupId)` — goals, top scorer, cards for one group

### Player module additions
- `getPlayerWithStats(playerId)` — player + aggregated stats + match history

### Live module additions
- `startTimer(matchId)` — set `timerStartedAt = now`
- `pauseTimer(matchId)` — set `timerPausedAt = now`
- `resumeTimer(matchId)` — accumulate pause, clear `timerPausedAt`
- `getMatchTime(matchId)` — return timer state for client calculation
- Update `addGoal` / `addCard` to auto-calculate minute from timer if not provided

---

## 9. Component Summary

### New Components
- `RefereeMatchView` — mobile-optimized main screen (full replacement of current `LiveControlPanel`; works on desktop too but optimized for touch). Manages view state: main → action choice → goal/card steps
- `ActionChoiceView` — full-screen view with Goal (top) and Card (bottom) boxes
- `GoalSteps` — goal entry step views (team → player → save)
- `CardSteps` — card entry step views (type → team → player → save)
- `TeamSelectView` — full-view team selection (two large cards)
- `PlayerSelectView` — full-view scrollable player card list
- `MatchTimer` — client-side timer display using timestamps
- `EventTimeline` (referee) — editable timeline with delete/edit
- `StatisticsPage` — competition-wide stats
- `GroupDetailPage` — group page with standings + matches + stats
- `PlayerDetailPage` — player page with stats + match history
- `PlayerStatsCard` — reusable player stat display
- `TeamStatsSection` — stats section for team detail page
- `StatCard` — reusable stat number card (icon + label + value)

### Modified Components
- `TeamDetail` — add stats section, link player names
- `MatchDetail` — link player/team names
- `StandingsTable` — link group names
- `Header` — add Statistics nav link
- `PlayerList` / `PlayerCard` — make names clickable links

---

## 10. Technical Notes

- **Timer is client-side**: the server stores timestamps, the client computes elapsed time. No polling needed just for the clock.
- **SSE still used** for score/event updates to public viewers. Timer state changes (start, pause, resume) are broadcast via SSE so public match pages can also render a live `MatchTimer` component.
- **Public timer display**: public match detail pages include a client-side `MatchTimer` component fed by SSE-delivered timestamp data. Server-rendered pages fall back to the `matchMinute` snapshot.
- **Mobile detection**: the referee UI should be responsive — the full-screen wizard works on desktop too, but is optimized for mobile touch targets (min 48px tap areas).
- **No new auth role**: referees use the existing ADMIN role.
- **Minute auto-capture**: when adding a goal/card, default minute = current timer minute. Editable for corrections.
- **`updateMatchStatus` signature change**: the existing action currently accepts `matchMinute` as a parameter. This is replaced — status transitions now auto-compute the minute from timer state and manage timer fields internally.
- **No substitution system**: 6-a-side, no subs tracked.
- **Match records tie-breaking**: when multiple matches tie for "biggest win" or "highest scoring," show the most recent one.
