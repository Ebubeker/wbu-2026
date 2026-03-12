"use client"

import { use, useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { PageHeader } from "@/components/common/PageHeader"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { EmptyState } from "@/components/common/EmptyState"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { TeamForm } from "@/modules/teams/components/TeamForm"
import { PlayerForm } from "@/modules/players/components/PlayerForm"
import { BulkPlayerImport } from "@/modules/players/components/BulkPlayerImport"
import { PhotoUpload } from "@/modules/players/components/PhotoUpload"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Users, Trash2, Camera, ArrowLeft } from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface PlayerItem {
  id: string
  name: string
  number: number
  position: string
  photo: string | null
  teamId: string
}

interface TeamDetailData {
  id: string
  name: string
  shortName: string
  logo: string | null
  description: string | null
  groupId: string | null
  group?: { id: string; name: string } | null
  captain?: { id: string; username: string } | null
  createdAt: string
  updatedAt: string
}

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const { data: team, error: teamError, mutate: mutateTeam } = useSWR<TeamDetailData>(
    `/api/teams/${id}`,
    fetcher
  )
  const { data: players, error: playersError, mutate: mutatePlayers } = useSWR<PlayerItem[]>(
    `/api/players?teamId=${id}`,
    fetcher
  )
  const { data: groups } = useSWR<Array<{ id: string; name: string }>>("/api/groups", fetcher)

  const [deleteTarget, setDeleteTarget] = useState<PlayerItem | null>(null)
  const [photoTarget, setPhotoTarget] = useState<PlayerItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDeletePlayer() {
    if (!deleteTarget) return
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/players/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to delete player")
      }
      toast.success("Player deleted successfully")
      mutatePlayers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete player")
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  if (teamError || playersError) {
    return <div className="p-8 text-center text-red-500">Failed to load team data</div>
  }

  if (!team || !players) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/teams">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>

      <PageHeader
        title={team.name}
        description={`Manage team details and roster for ${team.shortName}`}
      />

      {/* Section A: Team Info */}
      <TeamForm
        team={team as any}
        groups={groups}
        onSuccess={() => mutateTeam()}
      />

      <Separator />

      {/* Section B: Player Management */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Players ({players.length})</h2>
          <div className="flex items-center gap-2">
            <BulkPlayerImport
              teamId={id}
              teamShortName={team.shortName}
              onSuccess={() => { mutatePlayers(); mutateTeam() }}
            />
            <PlayerForm teamId={id} onSuccess={() => mutatePlayers()} />
          </div>
        </div>

        {players.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No players"
            description="Add players to this team's roster."
            action={<PlayerForm teamId={id} onSuccess={() => mutatePlayers()} />}
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Photo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players
                    .sort((a, b) => a.number - b.number)
                    .map((player) => (
                      <TableRow key={player.id}>
                        <TableCell>
                          {player.photo ? (
                            <img
                              src={player.photo}
                              alt={player.name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                              {player.name.charAt(0)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{player.number}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{player.position}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <PlayerForm
                              player={player as any}
                              teamId={id}
                              onSuccess={() => mutatePlayers()}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPhotoTarget(player)}
                            >
                              <Camera className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(player)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Photo Upload Dialog */}
      <Dialog open={!!photoTarget} onOpenChange={(open) => { if (!open) setPhotoTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Photo - {photoTarget?.name}</DialogTitle>
          </DialogHeader>
          {photoTarget && (
            <PhotoUpload
              playerId={photoTarget.id}
              playerName={photoTarget.name}
              currentPhoto={photoTarget.photo ?? undefined}
              onUpload={() => {
                mutatePlayers()
                setPhotoTarget(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Player Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Delete Player"
        description={`Are you sure you want to remove "${deleteTarget?.name}" from the roster? This cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeletePlayer}
      />
    </div>
  )
}
