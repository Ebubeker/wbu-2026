'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, UserMinus, Swords } from 'lucide-react'
import { toast } from 'sonner'
import {
  createGroup,
  deleteGroup,
  assignTeamToGroup,
  removeTeamFromGroup,
  generateGroupMatches,
} from '../actions'
import type { GroupWithTeams } from '../types'

interface GroupManagerProps {
  groups: GroupWithTeams[]
  unassignedTeams: Array<{
    id: string
    name: string
    shortName: string
    logo: string | null
  }>
}

export function GroupManager({ groups, unassignedTeams }: GroupManagerProps) {
  const [isPending, startTransition] = useTransition()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupOrder, setNewGroupOrder] = useState('0')

  function handleCreateGroup() {
    if (!newGroupName.trim()) {
      toast.error('Group name is required')
      return
    }

    startTransition(async () => {
      try {
        await createGroup({
          name: newGroupName.trim(),
          order: parseInt(newGroupOrder, 10) || 0,
        })
        toast.success('Group created successfully')
        setCreateDialogOpen(false)
        setNewGroupName('')
        setNewGroupOrder('0')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to create group')
      }
    })
  }

  function handleDeleteGroup(groupId: string) {
    startTransition(async () => {
      try {
        await deleteGroup(groupId)
        toast.success('Group deleted successfully')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete group')
      }
    })
  }

  function handleAssignTeam(teamId: string, groupId: string) {
    startTransition(async () => {
      try {
        await assignTeamToGroup(teamId, groupId)
        toast.success('Team assigned to group')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to assign team')
      }
    })
  }

  function handleRemoveTeam(teamId: string) {
    startTransition(async () => {
      try {
        await removeTeamFromGroup(teamId)
        toast.success('Team removed from group')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to remove team')
      }
    })
  }

  function handleGenerateMatches(groupId: string) {
    startTransition(async () => {
      try {
        await generateGroupMatches(groupId)
        toast.success('Group matches generated successfully')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to generate matches')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Groups</h2>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Name</Label>
                <Input
                  id="group-name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Group A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-order">Order</Label>
                <Input
                  id="group-order"
                  type="number"
                  value={newGroupOrder}
                  onChange={(e) => setNewGroupOrder(e.target.value)}
                  placeholder="0"
                />
              </div>
              <Button onClick={handleCreateGroup} disabled={isPending} className="w-full">
                {isPending ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>{group.name}</span>
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Swords className="mr-1 h-4 w-4" />
                        Generate Matches
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Generate Group Matches</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will generate round-robin matches for {group.name}.
                          {(group._count?.matches ?? 0) > 0 &&
                            ' Existing scheduled matches will be replaced.'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleGenerateMatches(group.id)}
                          disabled={isPending}
                        >
                          Generate
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Group</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {group.name}? Teams will be
                          unassigned but not deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteGroup(group.id)}
                          disabled={isPending}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.teams.length === 0 ? (
                <p className="text-sm text-muted-foreground">No teams assigned</p>
              ) : (
                <ul className="space-y-2">
                  {group.teams.map((team) => (
                    <li
                      key={team.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        {team.logo ? (
                          <img
                            src={team.logo}
                            alt={team.name}
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                            {team.shortName.charAt(0)}
                          </div>
                        )}
                        <span className="text-sm font-medium">{team.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTeam(team.id)}
                        disabled={isPending}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              {unassignedTeams.length > 0 && (
                <div className="pt-2">
                  <Select
                    onValueChange={(teamId) => handleAssignTeam(teamId, group.id)}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add team to group..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name} ({team.shortName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {unassignedTeams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Unassigned Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unassignedTeams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  {team.logo ? (
                    <img
                      src={team.logo}
                      alt={team.name}
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                      {team.shortName.charAt(0)}
                    </div>
                  )}
                  <span>{team.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
