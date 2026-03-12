'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus } from 'lucide-react'
import { createPlayer, updatePlayer } from '../actions'
import type { PlayerData, PlayerFormValues } from '../types'

interface PlayerFormProps {
  player?: PlayerData
  teamId: string
  onSuccess?: () => void
}

const positions = [
  { value: 'GK', label: 'Goalkeeper' },
  { value: 'DEF', label: 'Defender' },
  { value: 'MID', label: 'Midfielder' },
  { value: 'FWD', label: 'Forward' },
] as const

export function PlayerForm({ player, teamId, onSuccess }: PlayerFormProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState(player?.name ?? '')
  const [number, setNumber] = useState<number>(player?.number ?? 1)
  const [position, setPosition] = useState<PlayerFormValues['position']>(
    player?.position ?? 'MID'
  )

  const isEditing = !!player

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

    const data: PlayerFormValues = {
      name,
      number,
      position,
      teamId,
    }

    try {
      if (isEditing) {
        const result = await updatePlayer(player.id, data)
        if (result.success) {
          toast.success('Player updated successfully')
          setOpen(false)
          onSuccess?.()
        } else {
          toast.error(result.error ?? 'Failed to update player')
        }
      } else {
        const result = await createPlayer(data)
        if (result.success) {
          toast.success('Player added successfully')
          setName('')
          setNumber(1)
          setPosition('MID')
          setOpen(false)
          onSuccess?.()
        } else {
          toast.error(result.error ?? 'Failed to add player')
        }
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isEditing ? 'outline' : 'default'} size="sm">
          <UserPlus className="h-4 w-4" />
          {isEditing ? 'Edit' : 'Add Player'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Player' : 'Add Player'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the player details below.'
              : 'Fill in the details to add a new player to the roster.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="playerName">Name</Label>
            <Input
              id="playerName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Player name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="playerNumber">Number</Label>
            <Input
              id="playerNumber"
              type="number"
              min={1}
              max={99}
              value={number}
              onChange={(e) => setNumber(parseInt(e.target.value, 10) || 1)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="playerPosition">Position</Label>
            <Select
              value={position}
              onValueChange={(val) =>
                setPosition(val as PlayerFormValues['position'])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((pos) => (
                  <SelectItem key={pos.value} value={pos.value}>
                    {pos.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditing
                  ? 'Updating...'
                  : 'Adding...'
                : isEditing
                  ? 'Update Player'
                  : 'Add Player'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
