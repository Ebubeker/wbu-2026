"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { PageHeader } from "@/components/common/PageHeader"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  UserPlus,
  KeyRound,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Bomb,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface TeamItem {
  id: string
  name: string
  shortName: string
  captain?: { id: string; username: string } | null
}

interface CaptainData {
  id: string
  username: string
  teamId: string | null
  team?: { id: string; name: string } | null
}

export default function SettingsPage() {
  const { data: teams, mutate: mutateTeams } = useSWR<TeamItem[]>("/api/teams", fetcher)

  // Captain management state
  const [captains, setCaptains] = useState<CaptainData[]>([])
  const [captainsLoading, setCaptainsLoading] = useState(true)
  const [createCaptainOpen, setCreateCaptainOpen] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newTeamId, setNewTeamId] = useState("")
  const [isCreatingCaptain, setIsCreatingCaptain] = useState(false)

  // Reset password state
  const [resetTarget, setResetTarget] = useState<CaptainData | null>(null)
  const [resetPassword, setResetPassword] = useState("")
  const [isResetting, setIsResetting] = useState(false)

  // Delete captain state
  const [deleteCaptainTarget, setDeleteCaptainTarget] = useState<CaptainData | null>(null)
  const [isDeletingCaptain, setIsDeletingCaptain] = useState(false)

  // Danger zone state
  const [resetMatchesOpen, setResetMatchesOpen] = useState(false)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)

  async function fetchCaptains() {
    setCaptainsLoading(true)
    try {
      const res = await fetch("/api/auth/captains")
      if (res.ok) {
        const data = await res.json()
        setCaptains(data)
      }
    } catch {
      // Silently fail - captains section will show empty
    } finally {
      setCaptainsLoading(false)
    }
  }

  useEffect(() => {
    fetchCaptains()
  }, [])

  const teamsWithoutCaptains = (teams ?? []).filter(
    (team) => !captains.some((c) => c.teamId === team.id)
  )

  async function handleCreateCaptain(e: React.FormEvent) {
    e.preventDefault()
    if (!newUsername.trim() || !newPassword.trim()) {
      toast.error("Username and password are required")
      return
    }

    setIsCreatingCaptain(true)
    try {
      const res = await fetch("/api/auth/captains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          teamId: newTeamId || undefined,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to create captain")
      }

      toast.success("Captain account created")
      setCreateCaptainOpen(false)
      setNewUsername("")
      setNewPassword("")
      setNewTeamId("")
      fetchCaptains()
      mutateTeams()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create captain")
    } finally {
      setIsCreatingCaptain(false)
    }
  }

  async function handleResetPassword() {
    if (!resetTarget || !resetPassword.trim()) return

    setIsResetting(true)
    try {
      const res = await fetch(`/api/auth/captains/${resetTarget.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to reset password")
      }

      toast.success(`Password reset for ${resetTarget.username}`)
      setResetTarget(null)
      setResetPassword("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password")
    } finally {
      setIsResetting(false)
    }
  }

  async function handleDeleteCaptain() {
    if (!deleteCaptainTarget) return

    setIsDeletingCaptain(true)
    try {
      const res = await fetch(`/api/auth/captains/${deleteCaptainTarget.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to delete captain")
      }

      toast.success("Captain account deleted")
      setDeleteCaptainTarget(null)
      fetchCaptains()
      mutateTeams()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete captain")
    } finally {
      setIsDeletingCaptain(false)
    }
  }

  async function handleResetMatches() {
    try {
      const res = await fetch("/api/admin/reset-matches", { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to reset matches")
      }
      toast.success("All match results have been reset")
      setResetMatchesOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset matches")
    }
  }

  async function handleDeleteAll() {
    try {
      const res = await fetch("/api/admin/delete-all", { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to delete all data")
      }
      toast.success("All data has been deleted")
      setDeleteAllOpen(false)
      mutateTeams()
      fetchCaptains()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete all data")
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage captain accounts and system settings"
      />

      {/* Captain Accounts Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Captain Accounts
              </CardTitle>
              <CardDescription className="mt-1">
                Manage team captain login credentials
              </CardDescription>
            </div>
            <Button onClick={() => setCreateCaptainOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" />
              Create Captain
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {captainsLoading ? (
            <div className="py-8">
              <LoadingSpinner />
            </div>
          ) : captains.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No captain accounts created yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Linked Team</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {captains.map((captain) => (
                  <TableRow key={captain.id}>
                    <TableCell className="font-medium">{captain.username}</TableCell>
                    <TableCell>
                      {captain.team ? (
                        <Badge variant="secondary">{captain.team.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">No team</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setResetTarget(captain)}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteCaptainTarget(captain)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions. Proceed with extreme caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-red-200 p-4">
            <div>
              <p className="text-sm font-medium">Reset All Match Results</p>
              <p className="text-xs text-muted-foreground">
                Sets all matches back to SCHEDULED, removes all goals and cards.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => setResetMatchesOpen(true)}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-md border border-red-200 p-4">
            <div>
              <p className="text-sm font-medium">Delete All Data</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete all teams, players, matches, groups, and results.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setDeleteAllOpen(true)}
            >
              <Bomb className="h-4 w-4 mr-1" />
              Delete All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Captain Dialog */}
      <Dialog open={createCaptainOpen} onOpenChange={setCreateCaptainOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Captain Account</DialogTitle>
            <DialogDescription>
              Create a login for a team captain to manage their roster.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCaptain} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="captain-username">Username</Label>
              <Input
                id="captain-username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g., captain_brazil"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="captain-password">Password</Label>
              <Input
                id="captain-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="captain-team">Team (optional)</Label>
              <Select value={newTeamId} onValueChange={setNewTeamId}>
                <SelectTrigger id="captain-team">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Team</SelectItem>
                  {teamsWithoutCaptains.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.shortName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isCreatingCaptain} className="w-full">
                {isCreatingCaptain ? "Creating..." : "Create Captain"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={!!resetTarget}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null)
            setResetPassword("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{resetTarget?.username}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">New Password</Label>
              <Input
                id="reset-password"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <DialogFooter>
              <Button
                onClick={handleResetPassword}
                disabled={isResetting || !resetPassword.trim()}
                className="w-full"
              >
                {isResetting ? "Resetting..." : "Reset Password"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Captain Confirm */}
      <ConfirmDialog
        open={!!deleteCaptainTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteCaptainTarget(null)
        }}
        title="Delete Captain Account"
        description={`Are you sure you want to delete the captain account "${deleteCaptainTarget?.username}"? The team will no longer have a captain assigned.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteCaptain}
      />

      {/* Reset Matches Confirm */}
      <ConfirmDialog
        open={resetMatchesOpen}
        onOpenChange={setResetMatchesOpen}
        title="Reset All Match Results"
        description="This will reset all match scores to 0-0, set statuses to SCHEDULED, and delete all goals and cards. This action cannot be undone."
        confirmText="Reset All"
        variant="destructive"
        requireConfirmText="CONFIRM"
        onConfirm={handleResetMatches}
      />

      {/* Delete All Confirm */}
      <ConfirmDialog
        open={deleteAllOpen}
        onOpenChange={setDeleteAllOpen}
        title="Delete All Data"
        description="This will permanently delete ALL teams, players, groups, matches, goals, and cards. This action cannot be undone."
        confirmText="Delete Everything"
        variant="destructive"
        requireConfirmText="CONFIRM"
        onConfirm={handleDeleteAll}
      />
    </div>
  )
}
