import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

export const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
  shortName: z.string().min(2, 'Short name must be at least 2 characters').max(4),
  description: z.string().optional(),
  logo: z.string().optional(),
  groupId: z.string().uuid().nullable().optional(),
})

export const playerSchema = z.object({
  name: z.string().min(1, 'Player name is required').max(100),
  number: z.coerce.number().int().min(1).max(99),
  position: z.enum(['GK', 'DEF', 'MID', 'FWD']),
  teamId: z.string().uuid(),
  photo: z.string().optional(),
})

export const matchSchema = z.object({
  homeTeamId: z.string().uuid(),
  awayTeamId: z.string().uuid(),
  stage: z.enum(['GROUP', 'QUARTERFINAL', 'SEMIFINAL', 'THIRD_PLACE', 'FINAL']),
  groupId: z.string().uuid().nullable().optional(),
  matchDate: z.string().datetime(),
  venue: z.string().optional(),
  homePlaceholder: z.string().nullable().optional(),
  awayPlaceholder: z.string().nullable().optional(),
})

export const goalSchema = z.object({
  matchId: z.string().uuid(),
  teamId: z.string().uuid(),
  playerId: z.string().uuid(),
  assistPlayerId: z.string().uuid().nullable().optional(),
  minute: z.coerce.number().int().min(0).max(150),
  isOwnGoal: z.boolean().default(false),
})

export const cardSchema = z.object({
  matchId: z.string().uuid(),
  teamId: z.string().uuid(),
  playerId: z.string().uuid(),
  type: z.enum(['YELLOW', 'RED']),
  minute: z.coerce.number().int().min(0).max(150),
})

export const competitionSchema = z.object({
  name: z.string().min(1, 'Competition name is required'),
  season: z.string().min(1, 'Season is required'),
  description: z.string().optional(),
})

export const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required'),
  order: z.coerce.number().int().min(0).default(0),
})

export const captainSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  teamId: z.string().uuid(),
})

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

// Inferred types for convenience
export type LoginInput = z.infer<typeof loginSchema>
export type TeamInput = z.infer<typeof teamSchema>
export type PlayerInput = z.infer<typeof playerSchema>
export type MatchInput = z.infer<typeof matchSchema>
export type GoalInput = z.infer<typeof goalSchema>
export type CardInput = z.infer<typeof cardSchema>
export type CompetitionInput = z.infer<typeof competitionSchema>
export type GroupInput = z.infer<typeof groupSchema>
export type CaptainInput = z.infer<typeof captainSchema>
export type KitInput = z.infer<typeof kitSchema>
export type LineupInput = z.infer<typeof lineupSchema>
export type VoteInput = z.infer<typeof voteSchema>
