"use client"

import { use } from "react"
import useSWR from "swr"
import { LiveControlPanel } from "@/modules/live/components/LiveControlPanel"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function LiveMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: match, error } = useSWR(`/api/matches/${id}`, fetcher, {
    refreshInterval: 3000,
  })

  if (error) return <div className="p-8 text-center text-red-500">Failed to load match</div>
  if (!match) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner /></div>

  return <LiveControlPanel match={match} />
}
