"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { toast } from "sonner"
import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { TeamForm } from "@/modules/teams/components/TeamForm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Users, Search, Pencil, Trash2 } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface TeamListItem {
  id: string
  name: string
  shortName: string
  logo: string | null
  groupId: string | null
  group?: { id: string; name: string } | null
  captain?: { id: string; username: string } | null
  _count?: { players: number }
}

export default function TeamsPage() {
  const { data: teams, error, isLoading, mutate } = useSWR<TeamListItem[]>("/api/teams", fetcher)
  const { data: groups } = useSWR<Array<{ id: string; name: string }>>("/api/groups", fetcher)

  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TeamListItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredTeams = (teams ?? []).filter((team) =>
    team.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/teams/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to delete team")
      }
      toast.success("Team deleted successfully")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete team")
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  if (error) return <div className="p-8 text-center text-red-500">Failed to load teams</div>
  if (isLoading) return <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>

  return (
    <div className="space-y-6">
      <PageHeader title="Teams" description="Manage all championship teams">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
            </DialogHeader>
            <TeamForm
              groups={groups}
              onSuccess={() => {
                setCreateOpen(false)
                mutate()
              }}
            />
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredTeams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teams found"
          description={search ? "No teams match your search." : "Create your first team to get started."}
          action={
            !search ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create Team
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Logo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Short</TableHead>
                  <TableHead className="hidden md:table-cell">Group</TableHead>
                  <TableHead className="hidden md:table-cell">Players</TableHead>
                  <TableHead className="hidden lg:table-cell">Captain</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell>
                      {team.logo ? (
                        <img
                          src={team.logo}
                          alt={team.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                          {team.shortName.charAt(0)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{team.shortName}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {team.group?.name ?? <span className="text-muted-foreground">--</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {team._count?.players ?? 0}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {team.captain?.username ?? (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/teams/${team.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(team)}
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Delete Team"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone. All players on this team will also be deleted.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
