"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { toast } from "sonner"
import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { StatusBadge, type MatchStatus } from "@/components/common/StatusBadge"
import { MatchForm } from "@/modules/matches/components/MatchForm"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Calendar, Pencil, PlayCircle, Trash2 } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface MatchListItem {
  id: string
  homeTeam: { id: string; name: string; shortName: string; logo: string | null }
  awayTeam: { id: string; name: string; shortName: string; logo: string | null }
  homeScore: number
  awayScore: number
  status: string
  stage: string
  matchDate: string
  venue: string | null
  groupId: string | null
  group?: { id: string; name: string } | null
}

const LIVE_STATUSES = ["FIRST_HALF", "HALF_TIME", "SECOND_HALF"]

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function MatchesPage() {
  const { data: matches, error, isLoading, mutate } = useSWR<MatchListItem[]>(
    "/api/matches",
    fetcher
  )
  const { data: teams } = useSWR<Array<{ id: string; name: string; shortName: string }>>(
    "/api/teams",
    fetcher
  )
  const { data: groups } = useSWR<Array<{ id: string; name: string }>>("/api/groups", fetcher)

  const [tab, setTab] = useState("all")
  const [deleteTarget, setDeleteTarget] = useState<MatchListItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredMatches = (matches ?? []).filter((match) => {
    if (tab === "all") return true
    if (tab === "scheduled") return match.status === "SCHEDULED"
    if (tab === "live") return LIVE_STATUSES.includes(match.status)
    if (tab === "completed") return match.status === "FULL_TIME"
    return true
  })

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/matches/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to delete match")
      }
      toast.success("Match deleted successfully")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete match")
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  if (error) return <div className="p-8 text-center text-red-500">Failed to load matches</div>
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Matches" description="Manage all championship matches">
        {teams && groups && (
          <MatchForm teams={teams} groups={groups} onSuccess={() => mutate()} />
        )}
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({matches?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled ({matches?.filter((m) => m.status === "SCHEDULED").length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="live">
            Live ({matches?.filter((m) => LIVE_STATUSES.includes(m.status)).length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({matches?.filter((m) => m.status === "FULL_TIME").length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {filteredMatches.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No matches found"
              description={
                tab === "all"
                  ? "Create your first match to get started."
                  : `No ${tab} matches found.`
              }
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Home</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead>Away</TableHead>
                      <TableHead className="hidden md:table-cell">Stage</TableHead>
                      <TableHead className="hidden md:table-cell">Group</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMatches.map((match) => (
                      <TableRow key={match.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(match.matchDate)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {match.homeTeam?.shortName ?? match.homePlaceholder ?? '—'}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold">
                          {match.homeScore} - {match.awayScore}
                        </TableCell>
                        <TableCell className="font-medium">
                          {match.awayTeam?.shortName ?? match.awayPlaceholder ?? '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm capitalize">
                          {match.stage.toLowerCase().replace("_", " ")}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {match.group?.name ?? (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={match.status as MatchStatus} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/admin/matches/${match.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                            {match.status !== "FULL_TIME" && (
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/admin/matches/${match.id}/live`}>
                                  <PlayCircle className="h-4 w-4 text-red-600" />
                                </Link>
                              </Button>
                            )}
                            {match.status === "SCHEDULED" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteTarget(match)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Delete Match"
        description={`Are you sure you want to delete ${deleteTarget?.homeTeam?.shortName ?? deleteTarget?.homePlaceholder ?? '—'} vs ${deleteTarget?.awayTeam?.shortName ?? deleteTarget?.awayPlaceholder ?? '—'}? This cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
