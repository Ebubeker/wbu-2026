'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createTeam, updateTeam } from '../actions'
import type { TeamData, TeamFormValues } from '../types'

interface TeamFormProps {
  team?: TeamData
  groups?: Array<{ id: string; name: string }>
  onSuccess?: () => void
}

export function TeamForm({ team, groups, onSuccess }: TeamFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState(team?.name ?? '')
  const [shortName, setShortName] = useState(team?.shortName ?? '')
  const [description, setDescription] = useState(team?.description ?? '')
  const [groupId, setGroupId] = useState<string | null>(team?.groupId ?? null)

  const isEditing = !!team

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

    const data: TeamFormValues = {
      name,
      shortName,
      description: description || undefined,
      groupId: groupId || null,
    }

    try {
      if (isEditing) {
        const result = await updateTeam(team.id, data)
        if (result.success) {
          toast.success('Team updated successfully')
          onSuccess?.()
        } else {
          toast.error(result.error ?? 'Failed to update team')
        }
      } else {
        const result = await createTeam(data)
        if (result.success) {
          toast.success('Team created successfully')
          setName('')
          setShortName('')
          setDescription('')
          setGroupId(null)
          onSuccess?.()
        } else {
          toast.error(result.error ?? 'Failed to create team')
        }
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Team' : 'Create Team'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter team name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortName">Short Name</Label>
            <Input
              id="shortName"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="e.g. BRA"
              maxLength={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Team description (optional)"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {groups && groups.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="group">Group</Label>
              <Select
                value={groupId ?? ''}
                onValueChange={(value) => setGroupId(value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Group</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting
              ? isEditing
                ? 'Updating...'
                : 'Creating...'
              : isEditing
                ? 'Update Team'
                : 'Create Team'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
