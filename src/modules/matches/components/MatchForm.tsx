'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Pencil } from 'lucide-react'
import { createMatch, updateMatch } from '../actions'
import type { MatchFormValues } from '../types'

interface MatchFormProps {
  match?: {
    id: string
    homeTeamId?: string
    awayTeamId?: string
    stage: string
    groupId?: string | null
    matchDate: Date | string
    venue?: string | null
  }
  teams: Array<{ id: string; name: string; shortName: string }>
  groups: Array<{ id: string; name: string }>
  onSuccess?: () => void
}

export function MatchForm({ match, teams, groups, onSuccess }: MatchFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const isEditing = !!match

  const [homeTeamId, setHomeTeamId] = useState(match?.homeTeamId ?? '')
  const [awayTeamId, setAwayTeamId] = useState(match?.awayTeamId ?? '')
  const [stage, setStage] = useState(match?.stage ?? 'GROUP')
  const [groupId, setGroupId] = useState(match?.groupId ?? '')
  const [matchDate, setMatchDate] = useState(() => {
    if (match?.matchDate) {
      const d = new Date(match.matchDate)
      return d.toISOString().slice(0, 16)
    }
    return ''
  })
  const [venue, setVenue] = useState(match?.venue ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (homeTeamId === awayTeamId) {
      toast.error('Home and away teams must be different')
      return
    }

    setLoading(true)

    try {
      const data: MatchFormValues = {
        homeTeamId,
        awayTeamId,
        stage,
        groupId: stage === 'GROUP' ? groupId || null : null,
        matchDate: new Date(matchDate).toISOString(),
        venue: venue || undefined,
      }

      if (isEditing) {
        await updateMatch(match.id, data)
        toast.success('Match updated successfully')
      } else {
        await createMatch(data)
        toast.success('Match created successfully')
      }

      setOpen(false)
      onSuccess?.()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save match'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            Add Match
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Match' : 'Create Match'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Home Team */}
          <div className="space-y-2">
            <Label htmlFor="homeTeamId">Home Team</Label>
            <Select value={homeTeamId} onValueChange={setHomeTeamId}>
              <SelectTrigger id="homeTeamId">
                <SelectValue placeholder="Select home team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name} ({team.shortName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Away Team */}
          <div className="space-y-2">
            <Label htmlFor="awayTeamId">Away Team</Label>
            <Select value={awayTeamId} onValueChange={setAwayTeamId}>
              <SelectTrigger id="awayTeamId">
                <SelectValue placeholder="Select away team" />
              </SelectTrigger>
              <SelectContent>
                {teams
                  .filter((t) => t.id !== homeTeamId)
                  .map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.shortName})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stage */}
          <div className="space-y-2">
            <Label htmlFor="stage">Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger id="stage">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GROUP">Group Stage</SelectItem>
                <SelectItem value="QUARTERFINAL">Quarterfinal</SelectItem>
                <SelectItem value="SEMIFINAL">Semifinal</SelectItem>
                <SelectItem value="THIRD_PLACE">Third Place</SelectItem>
                <SelectItem value="FINAL">Final</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Group (only if GROUP stage) */}
          {stage === 'GROUP' && (
            <div className="space-y-2">
              <Label htmlFor="groupId">Group</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger id="groupId">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date/Time */}
          <div className="space-y-2">
            <Label htmlFor="matchDate">Date &amp; Time</Label>
            <Input
              id="matchDate"
              type="datetime-local"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              required
            />
          </div>

          {/* Venue */}
          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g., Main Stadium"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? isEditing
                ? 'Updating...'
                : 'Creating...'
              : isEditing
                ? 'Update Match'
                : 'Create Match'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
