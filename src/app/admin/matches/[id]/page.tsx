"use client"

import { use } from "react"
import Link from "next/link"
import useSWR from "swr"
import { PageHeader } from "@/components/common/PageHeader"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { StatusBadge, type MatchStatus } from "@/components/common/StatusBadge"
import { MatchForm } from "@/modules/matches/components/MatchForm"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, PlayCircle } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface MatchDetailData {
  id: string
  homeTeam: { id: string; name: string; shortName: string; logo: string | null }
  awayTeam: { id: string; name: string; shortName: string; logo: string | null }
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
  status: string
  stage: string
  matchDate: string
  venue: string | null
  groupId: string | null
  group?: { id: string; name: string } | null
  matchMinute: number
}

export default function MatchEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const { data: match, error, mutate } = useSWR<MatchDetailData>(
    `/api/matches/${id}`,
    fetcher
  )
  const { data: teams } = useSWR<Array<{ id: string; name: string; shortName: string }>>(
    "/api/teams",
    fetcher
  )
  const { data: groups } = useSWR<Array<{ id: string; name: string }>>("/api/groups", fetcher)

  if (error) return <div className="p-8 text-center text-red-500">Failed to load match</div>
  if (!match || !teams || !groups) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/matches">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>

      <PageHeader
        title={`${match.homeTeam?.shortName ?? match.homePlaceholder ?? '—'} vs ${match.awayTeam?.shortName ?? match.awayPlaceholder ?? '—'}`}
        description={`Edit match details`}
      >
        <Button asChild>
          <Link href={`/admin/matches/${id}/live`}>
            <PlayCircle className="h-4 w-4 mr-1" />
            Go to Live Control
          </Link>
        </Button>
      </PageHeader>

      {/* Current Score */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="font-semibold">{match.homeTeam?.name ?? match.homePlaceholder ?? '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold font-mono">
                {match.homeScore} - {match.awayScore}
              </p>
              <div className="mt-2">
                <StatusBadge status={match.status as MatchStatus} />
              </div>
            </div>
            <div className="text-center">
              <p className="font-semibold">{match.awayTeam?.name ?? match.awayPlaceholder ?? '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <MatchForm
        match={{
          id: match.id,
          homeTeamId: match.homeTeam?.id ?? '',
          awayTeamId: match.awayTeam?.id ?? '',
          stage: match.stage,
          groupId: match.groupId,
          matchDate: match.matchDate,
          venue: match.venue,
        }}
        teams={teams}
        groups={groups}
        onSuccess={() => mutate()}
      />
    </div>
  )
}
