"use client"

import { useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { PageHeader } from "@/components/common/PageHeader"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { BracketView } from "@/modules/bracket/components/BracketView"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { GitBranch, Play, Trophy, AlertTriangle, Settings, Trash2 } from "lucide-react"
import type { BracketRound, BracketMatch } from "@/modules/bracket/types"
import {
  initializeBracket,
  resolveSemifinals,
  resolveFinal,
  updateKnockoutMatch,
} from "@/modules/bracket/actions"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const STAGE_ORDER = ["QUARTERFINAL", "SEMIFINAL", "THIRD_PLACE", "FINAL"] as const
const STAGE_LABELS: Record<string, string> = {
  QUARTERFINAL: "Quarter-Finals",
  SEMIFINAL: "Semi-Finals",
  THIRD_PLACE: "Third Place",
  FINAL: "Final",
}

interface MatchItem {
  id: string
  homeTeam: { id: string; name: string; shortName: string; logo: string | null } | null
  awayTeam: { id: string; name: string; shortName: string; logo: string | null } | null
  homePlaceholder: string | null
  awayPlaceholder: string | null
  homeScore: number
  awayScore: number
  status: string
  stage: string
  matchDate: string
  venue: string | null
}

export default function BracketPage() {
  const { data: allMatches, error, isLoading, mutate } = useSWR<MatchItem[]>(
    "/api/matches",
    fetcher
  )

  const [initConfirmOpen, setInitConfirmOpen] = useState(false)
  const [resolveAction, setResolveAction] = useState<"semis" | "final" | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Edit match dialog
  const [editTarget, setEditTarget] = useState<MatchItem | null>(null)
  const [editDate, setEditDate] = useState("")
  const [editVenue, setEditVenue] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  if (error) return <div className="p-8 text-center text-red-500">Failed to load bracket data</div>
  if (isLoading || !allMatches) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  const knockoutMatches = allMatches.filter((m) => m.stage !== "GROUP")
  const groupMatches = allMatches.filter((m) => m.stage === "GROUP")
  const incompleteGroupMatches = groupMatches.filter((m) => m.status !== "FULL_TIME")
  const hasBracket = knockoutMatches.length > 0

  const semis = knockoutMatches.filter((m) => m.stage === "SEMIFINAL")
  const semisResolved = semis.length > 0 && semis.every((m) => m.homeTeam && m.awayTeam)
  const semisFinished = semis.length > 0 && semis.every((m) => m.status === "FULL_TIME")

  const finalMatch = knockoutMatches.find((m) => m.stage === "FINAL")
  const finalResolved = finalMatch?.homeTeam && finalMatch?.awayTeam

  const rounds: BracketRound[] = []
  for (const stageKey of STAGE_ORDER) {
    const stageMatches = knockoutMatches
      .filter((m) => m.stage === stageKey)
      .map((m) => ({
        ...m,
        homeTeam: m.homeTeam ?? null,
        awayTeam: m.awayTeam ?? null,
        matchDate: new Date(m.matchDate),
      }))
    if (stageMatches.length > 0) {
      rounds.push({
        stage: stageKey,
        label: STAGE_LABELS[stageKey] ?? stageKey,
        matches: stageMatches,
      })
    }
  }

  async function handleInitialize() {
    setIsProcessing(true)
    try {
      const res = await initializeBracket()
      if (!res.success) throw new Error(res.error)
      toast.success("Bracket initialized with placeholders")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to initialize")
    } finally {
      setIsProcessing(false)
      setInitConfirmOpen(false)
    }
  }

  async function handleResolve() {
    setIsProcessing(true)
    try {
      const res = resolveAction === "semis"
        ? await resolveSemifinals()
        : await resolveFinal()
      if (!res.success) throw new Error(res.error)
      toast.success(resolveAction === "semis" ? "Semifinal teams resolved" : "Final teams resolved")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resolve")
    } finally {
      setIsProcessing(false)
      setResolveAction(null)
    }
  }

  function openEdit(match: MatchItem) {
    setEditTarget(match)
    const d = new Date(match.matchDate)
    // Format as datetime-local value
    const pad = (n: number) => String(n).padStart(2, "0")
    setEditDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
    setEditVenue(match.venue ?? "")
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setIsSaving(true)
    try {
      const res = await updateKnockoutMatch(editTarget.id, {
        matchDate: editDate ? new Date(editDate).toISOString() : undefined,
        venue: editVenue,
      })
      if (!res.success) throw new Error(res.error)
      toast.success("Match updated")
      setEditTarget(null)
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Bracket" description="Knockout stage tournament bracket">
        <div className="flex flex-wrap gap-2">
          {!hasBracket && (
            <Button onClick={() => setInitConfirmOpen(true)}>
              <GitBranch className="h-4 w-4 mr-1" />
              Initialize Bracket
            </Button>
          )}
          {hasBracket && !semisResolved && incompleteGroupMatches.length === 0 && (
            <Button onClick={() => setResolveAction("semis")}>
              <Play className="h-4 w-4 mr-1" />
              Resolve Semifinals
            </Button>
          )}
          {semisFinished && !finalResolved && (
            <Button onClick={() => setResolveAction("final")}>
              <Trophy className="h-4 w-4 mr-1" />
              Resolve Final
            </Button>
          )}
          {hasBracket && (
            <Button variant="outline" onClick={() => setInitConfirmOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1" />
              Reset Bracket
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Status indicators */}
      {incompleteGroupMatches.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Group stage not complete</p>
              <p className="text-xs text-amber-700">
                {incompleteGroupMatches.length} group match(es) remaining. Semifinals can be resolved once all groups finish.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {hasBracket && semisResolved && !semisFinished && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center gap-3 p-4">
            <Play className="h-5 w-5 text-blue-600 shrink-0" />
            <p className="text-sm text-blue-800">
              Semifinals are set. The final will be resolved once both semifinals are finished.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bracket display */}
      <Card>
        <CardContent className="p-6">
          <BracketView rounds={rounds} />
        </CardContent>
      </Card>

      {/* Match details list for editing */}
      {knockoutMatches.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">Match Details</h3>
            {knockoutMatches.map((match) => {
              const homeLabel = match.homeTeam?.name ?? match.homePlaceholder ?? 'TBD'
              const awayLabel = match.awayTeam?.name ?? match.awayPlaceholder ?? 'TBD'
              return (
                <div key={match.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{homeLabel} vs {awayLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      <Badge variant="outline" className="mr-2 text-[10px]">
                        {STAGE_LABELS[match.stage] ?? match.stage}
                      </Badge>
                      {new Date(match.matchDate).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                      {match.venue && ` · ${match.venue}`}
                    </p>
                  </div>
                  {match.status === "SCHEDULED" && (
                    <Button variant="ghost" size="sm" onClick={() => openEdit(match)}>
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Initialize/Reset confirm */}
      <ConfirmDialog
        open={initConfirmOpen}
        onOpenChange={setInitConfirmOpen}
        title={hasBracket ? "Reset Bracket" : "Initialize Bracket"}
        description={
          hasBracket
            ? "This will delete all scheduled knockout matches and create new placeholders (A1 vs B2, B1 vs A2, Final). Are you sure?"
            : "This will create semifinal placeholders (A1 vs B2, B1 vs A2) and a final placeholder (W-SF1 vs W-SF2). Continue?"
        }
        confirmText={hasBracket ? "Reset" : "Initialize"}
        variant={hasBracket ? "destructive" : "default"}
        onConfirm={handleInitialize}
      />

      {/* Resolve confirm */}
      <ConfirmDialog
        open={!!resolveAction}
        onOpenChange={(open) => { if (!open) setResolveAction(null) }}
        title={resolveAction === "semis" ? "Resolve Semifinals" : "Resolve Final"}
        description={
          resolveAction === "semis"
            ? "This will assign actual teams to the semifinals based on current group standings (A1 vs B2, B1 vs A2). Continue?"
            : "This will assign the semifinal winners to the final match. Continue?"
        }
        confirmText="Resolve"
        variant="default"
        onConfirm={handleResolve}
      />

      {/* Edit match dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Match Details</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Venue</Label>
              <Input
                value={editVenue}
                onChange={(e) => setEditVenue(e.target.value)}
                placeholder="e.g., Main Stadium"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSaving} className="w-full">
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
