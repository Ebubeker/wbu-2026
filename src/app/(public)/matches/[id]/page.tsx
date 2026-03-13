import type { Metadata } from "next"
import { notFound } from "next/navigation"
import prisma from "@/lib/db"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { MatchDetail } from "@/modules/matches/components/MatchDetail"

export const revalidate = 30

interface MatchPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: MatchPageProps): Promise<Metadata> {
  const { id } = await params
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
  })

  if (!match) {
    return { title: "Match Not Found" }
  }

  const home = match.homeTeam?.name ?? match.homePlaceholder ?? 'TBD'
  const away = match.awayTeam?.name ?? match.awayPlaceholder ?? 'TBD'

  return {
    title: `${home} vs ${away} | WBU 2026`,
    description: `${home} vs ${away} - WBU 2026 Championship`,
  }
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { id } = await params
  const { getMatchById } = await import("@/modules/matches/queries")
  const match = await getMatchById(id)

  if (!match) {
    notFound()
  }

  return (
    <PublicLayout maxWidthClassName="max-w-5xl">
      <div>
        <MatchDetail match={match} />
      </div>
    </PublicLayout>
  )
}
