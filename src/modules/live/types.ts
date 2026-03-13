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

export interface LiveEvent {
  id: string
  type: 'goal' | 'card'
  minute: number
  playerName: string
  playerNumber: number
  teamName: string
  teamId: string
  isOwnGoal?: boolean
  cardType?: 'YELLOW' | 'RED'
}
